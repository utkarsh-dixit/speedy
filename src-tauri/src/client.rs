use std::{
    collections::HashMap,
    io::Write,
    path::PathBuf,
    sync::{mpsc::Sender, Arc},
};
use serde::{Deserialize, Serialize};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    sync::Mutex,
    task::JoinSet,
};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum DownloadEvent {
    /// Initial information about total file size and segments
    Initialize {
        file_size: u64,
        segments: HashMap<u64, u64>, // segment_id -> segment_size
    },
    /// A chunk of data was received
    BytesReceived {
        segment_id: u64,
        bytes: u64,
        speed: f64,
    },
    /// An error occurred
    Error {
        segment_id: u64,
        message: String,
    },
    /// Download completed
    Complete,
}

pub struct Client {
    url: String,
    parts: u64,
    progress: Arc<Mutex<ClientProgress>>,
}

#[derive(Clone)]
pub struct ClientProgress {
    pub file_size: u64,
    pub total_bytes: HashMap<u64, u64>,
    pub chunks: HashMap<u64, (u64, u64)>, // (downloaded_bytes, segment_id)
    pub bytes_per_second: HashMap<u64, f64>,
    pub segment_ids: HashMap<u64, u64>, // Map from chunk index to consistent segment ID (1-based)
}

impl ClientProgress {
    pub fn set_total_bytes(&mut self, total_bytes: u64, index: &u64) {
        self.total_bytes.insert(*index, total_bytes);
    }

    pub fn set_chunks(&mut self, chunk: u64, index: &u64) {
        let segment_id = self.get_segment_id(index);
        
        // Only update if the new value is greater than the existing one
        if let Some((existing_bytes, _)) = self.chunks.get(index) {
            if chunk > *existing_bytes {
                self.chunks.insert(*index, (chunk, segment_id));
            }
        } else {
            self.chunks.insert(*index, (chunk, segment_id));
        }
    }

    pub fn set_bytes_per_second(&mut self, bytes_per_second: f64, index: &u64) {
        self.bytes_per_second.insert(*index, bytes_per_second);
    }

    pub fn set_segment_id(&mut self, segment_id: u64, index: &u64) {
        self.segment_ids.insert(*index, segment_id);
        // Update the segment_id in chunks as well if it exists
        if let Some((bytes, _)) = self.chunks.get(index) {
            self.chunks.insert(*index, (*bytes, segment_id));
        }
    }

    pub fn get_segment_id(&self, index: &u64) -> u64 {
        *self.segment_ids.get(index).unwrap_or(index)
    }

    pub fn set_file_size(&mut self, file_size: u64) {
        self.file_size = file_size;
    }

    pub fn get_total_bytes(&self, index: &u64) -> u64 {
        *self.total_bytes.get(index).unwrap_or(&0)
    }

    pub fn get_chunks(&self, index: &u64) -> u64 {
        self.chunks.get(index).map(|(bytes, _)| *bytes).unwrap_or(0)
    }

    pub fn get_bytes_per_second(&self, index: &u64) -> f64 {
        *self.bytes_per_second.get(index).unwrap_or(&0.0)
    }

    pub fn get_file_size(&self) -> u64 {
        self.file_size
    }
}

impl Client {
    /// Create a new download client
    pub fn new(url: String, parts: u64) -> Self {
        let mut progress = ClientProgress { 
            file_size: 0, 
            total_bytes: HashMap::new(), 
            chunks: HashMap::new(), 
            bytes_per_second: HashMap::new(),
            segment_ids: HashMap::new(),
        };
        
        // Initialize all segment maps with zeroes and assign consistent segment IDs (1-based)
        for i in 0..parts {
            progress.total_bytes.insert(i, 0);
            progress.chunks.insert(i, (0, i + 1)); // (bytes, segment_id)
            progress.bytes_per_second.insert(i, 0.0);
            progress.segment_ids.insert(i, i + 1); // Assign 1-based segment IDs
        }
        
        Self { 
            url, 
            parts, 
            progress: Arc::new(Mutex::new(progress)),
        }
    }

    pub fn get_progress(&self) -> Arc<Mutex<ClientProgress>> {
        self.progress.clone()
    }

    /// Extract file name from URL, removing query parameters
    pub fn get_file_name(url: &str) -> String {
        url.split('/')
            .last()
            .unwrap_or("download")
            .split('?')
            .next()
            .unwrap_or("download")
            .to_string()
    }
    
    /// Download the file with the specified number of parallel segments
    pub async fn download(&mut self, event_sender: Sender<DownloadEvent>) -> Result<(), Box<dyn std::error::Error>> {
        let url = self.url.clone();
        let parts = self.parts;

        // Get file information
        let response = reqwest::get(url.clone()).await?;
        let headers = response.headers().clone();
        
        let supports_range = headers.contains_key("accept-ranges");
        if !supports_range {
            return Err("Server doesn't support range requests".into());
        }

        let content_length = headers
            .get("content-length")
            .ok_or("Content-Length header not found")?
            .to_str()?
            .parse::<u64>()?;
            
        let file_name = Self::get_file_name(&self.url);

        // Create temp directory
        let temp_dir = PathBuf::from("/tmp/speedy");
        tokio::fs::create_dir_all(&temp_dir).await?;

        // Initialize progress tracking
        self.progress.lock().await.set_file_size(content_length);
        
        // Calculate segment sizes
        let chunk_size = content_length / parts;
        let mut segment_sizes = HashMap::new();
        
        for i in 0..parts {
            let (start, end) = self.calculate_range(i, parts, chunk_size, content_length);
            let segment_size = end - start + 1;
            
            // Store segment size by segment ID (1-based)
            segment_sizes.insert(i + 1, segment_size);
            
            // Update local progress info
            let mut progress = self.progress.lock().await;
            progress.set_total_bytes(segment_size, &i);
        }

        // Check for existing part files and update progress
        self.resume_existing_parts(&temp_dir, &file_name, parts).await;

        // Send initialization event
        event_sender.send(DownloadEvent::Initialize { 
            file_size: content_length,
            segments: segment_sizes.clone(),
        })?;

        // Start download tasks
        let mut threads = JoinSet::new();
        
        for i in 0..parts {
            let (start, end) = self.calculate_range(i, parts, chunk_size, content_length);
            
            let url = self.url.clone();
            let file_name = file_name.clone();
            let temp_dir = temp_dir.clone();
            let progress_arc = self.progress.clone();
            let event_tx = event_sender.clone();
            let segment_id = i + 1; // 1-based segment ID
            let segment_size = segment_sizes[&segment_id];

            // Get existing downloaded bytes for this part
            let part_path = temp_dir.join(format!("{}.{}", file_name, i));
            let existing_bytes = if let Ok(metadata) = tokio::fs::metadata(&part_path).await {
                metadata.len()
            } else {
                0
            };

            threads.spawn(async move {
                // Only download if we haven't completed this segment
                let range_start = start + existing_bytes;
                
                if range_start <= end {
                    self.download_segment(
                        &url,
                        range_start,
                        end,
                        &part_path,
                        existing_bytes,
                        segment_size,
                        i,
                        segment_id,
                        progress_arc,
                        event_tx,
                    ).await?;
                } else {
                    // This segment is already fully downloaded
                    event_tx.send(DownloadEvent::BytesReceived {
                        segment_id,
                        bytes: 0, // No new bytes
                        speed: 0.0,
                    })?;
                }
                
                Ok::<(), Box<dyn std::error::Error + Send + Sync>>(())
            });
        }

        // Wait for all download tasks to complete
        while let Some(res) = threads.join_next().await {
            res??;
        }

        // Merge files and clean up
        self.merge_part_files(&file_name, &temp_dir, parts).await?;
        
        // Send complete event
        event_sender.send(DownloadEvent::Complete)?;
        
        Ok(())
    }
    
    /// Calculate start and end byte range for a segment
    fn calculate_range(&self, index: u64, parts: u64, chunk_size: u64, content_length: u64) -> (u64, u64) {
        let start = index * chunk_size;
        let end = if index == parts - 1 {
            content_length - 1
        } else {
            start + chunk_size - 1
        };
        (start, end)
    }
    
    /// Check for existing part files and update progress
    async fn resume_existing_parts(&self, temp_dir: &PathBuf, file_name: &str, parts: u64) {
        for i in 0..parts {
            let part_path = temp_dir.join(format!("{}.{}", file_name, i));
            if let Ok(metadata) = tokio::fs::metadata(&part_path).await {
                let file_size = metadata.len();
                if file_size > 0 {
                    // Update progress with existing file size
                    let mut progress = self.progress.lock().await;
                    progress.set_chunks(file_size, &i);
                }
            }
        }
    }
    
    /// Download a single segment of the file
    async fn download_segment(
        &self,
        url: &str,
        range_start: u64,
        range_end: u64,
        part_path: &PathBuf,
        existing_bytes: u64,
        total_chunks: u64,
        index: u64,
        segment_id: u64,
        progress_arc: Arc<Mutex<ClientProgress>>,
        event_tx: Sender<DownloadEvent>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let start_time = std::time::Instant::now();
        let client = reqwest::Client::new();

        let response = client.get(url)
            .header("Range", format!("bytes={}-{}", range_start, range_end))
            .send()
            .await?;

        // Open file in append mode if resuming, otherwise create new
        let mut file = if existing_bytes > 0 {
            tokio::fs::OpenOptions::new()
                .write(true)
                .append(true)
                .open(part_path).await?
        } else {
            tokio::fs::File::create(part_path).await?
        };

        // Report initial progress if resuming
        if existing_bytes > 0 {
            let bytes_per_second = 0.0; // Initial speed is 0 when resuming
            
            // Update progress tracker with existing bytes
            {
                let mut progress = progress_arc.lock().await;
                progress.set_chunks(existing_bytes, &index);
                progress.set_bytes_per_second(bytes_per_second, &index);
            }
            
            // Send initial bytes received event for existing bytes
            event_tx.send(DownloadEvent::BytesReceived {
                segment_id,
                bytes: existing_bytes,
                speed: bytes_per_second,
            })?;
        }
        
        let mut bytes_downloaded = existing_bytes;
        let mut last_reported_bytes = existing_bytes;
        
        let mut response = response;
        while let Some(chunk) = response.chunk().await? {
            let chunk_size = chunk.len() as u64;
            bytes_downloaded += chunk_size;
            
            // Ensure bytes_downloaded never exceeds total_chunks
            bytes_downloaded = std::cmp::min(bytes_downloaded, total_chunks);
            
            let bytes_per_second = (bytes_downloaded - existing_bytes) as f64 / start_time.elapsed().as_secs_f64();
            
            // Write chunk to file
            file.write_all(&chunk).await?;
            
            // Only report progress if enough has changed (avoid too frequent updates)
            let bytes_change = bytes_downloaded - last_reported_bytes;
            if bytes_change >= 16 * 1024 || bytes_downloaded == total_chunks {
                // Update progress tracker
                {
                    let mut progress = progress_arc.lock().await;
                    progress.set_chunks(bytes_downloaded, &index);
                    progress.set_bytes_per_second(bytes_per_second, &index);
                }
                
                // Send bytes received event - ONLY send the delta (newly downloaded bytes)
                event_tx.send(DownloadEvent::BytesReceived {
                    segment_id,
                    bytes: bytes_change, // Only the newly downloaded bytes
                    speed: bytes_per_second,
                })?;
                
                last_reported_bytes = bytes_downloaded;
                
                // If we've reached 100%, break to avoid any potential overruns
                if bytes_downloaded >= total_chunks {
                    break;
                }
            }
        }
        
        // Ensure we send a final update with exactly 100% progress
        if last_reported_bytes < total_chunks {
            let final_bytes = total_chunks - last_reported_bytes;
            let final_speed = (total_chunks - existing_bytes) as f64 / start_time.elapsed().as_secs_f64();
            
            // Update local tracker with final value
            {
                let mut progress = progress_arc.lock().await;
                progress.set_chunks(total_chunks, &index);
                progress.set_bytes_per_second(final_speed, &index);
            }
            
            // Send final update
            event_tx.send(DownloadEvent::BytesReceived {
                segment_id,
                bytes: final_bytes,
                speed: final_speed,
            })?;
        }
        
        Ok(())
    }
    
    /// Merge all part files into the final output file
    async fn merge_part_files(&self, file_name: &str, temp_dir: &PathBuf, parts: u64) -> Result<(), Box<dyn std::error::Error>> {
        let output_path = PathBuf::from(file_name);
        let mut output_file = tokio::fs::File::create(&output_path).await?;
        
        for i in 0..parts {
            let part_path = temp_dir.join(format!("{}.{}", file_name, i));
            
            let mut part_file = tokio::fs::File::open(&part_path).await?;
            let mut buffer = Vec::new();
            part_file.read_to_end(&mut buffer).await?;
            output_file.write_all(&buffer).await?;
            
            // Delete part file after merging
            if let Err(e) = tokio::fs::remove_file(&part_path).await {
                // Just log error but continue with other parts
                eprintln!("Error removing part {}: {}", i, e);
            }
        }
        
        Ok(())
    }
}
