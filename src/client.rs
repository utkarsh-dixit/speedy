use std::{io::{stdout, Write}, sync::{Arc}, collections::HashMap};
use tokio::{sync::{Mutex, futures}, task::JoinSet};
use std::sync::mpsc::channel;
use std::sync::mpsc::Sender;

// Create client impl which takes `url` and `parts` as parameters
use tokio::io::{AsyncWriteExt, AsyncReadExt};

pub struct Client {
    url: String,
    parts: u64,

    progress: Arc<Mutex<ClientProgress>>
}

#[derive(Clone)]
pub struct ClientProgress {
    pub file_size: u64,
    pub total_bytes: HashMap<u64, u64>,
    pub chunks: HashMap<u64, u64>,
    pub bytes_per_second: HashMap<u64, f64>
}

impl ClientProgress {
    pub fn set_total_bytes(&mut self, total_bytes: u64, index: &u64) {
        self.total_bytes.insert(index.clone(), total_bytes);
    }

    pub fn set_chunks(&mut self, chunk: u64, index: &u64) {
        self.chunks.insert(index.clone(), chunk);
    }

    pub fn set_bytes_per_second(&mut self, bytes_per_second: f64, index: &u64) {
        *self.bytes_per_second.get_mut(index).unwrap() = bytes_per_second;
    }

    pub fn set_file_size(&mut self, file_size: u64) {
        self.file_size = file_size;
    }

    pub fn get_total_bytes(&self, index: &u64) -> u64 {
        self.chunks[index]
    }

    pub fn get_chunks(&self, index: &u64) -> u64 {
        self.chunks[index]
    }

    pub fn get_bytes_per_second(&self, index: &u64) -> f64 {
        self.bytes_per_second[index]
    }

    pub fn get_file_size(&self) -> u64 {
        self.file_size
    }
}

impl Client {
    // Functions to create a new client
    pub fn new(url: String, parts: u64) -> Self {
        Self { url, parts, progress: Arc::new(Mutex::new(ClientProgress { file_size: 0, total_bytes: HashMap::new(), chunks: HashMap::new(), bytes_per_second: HashMap::new() })) }
    }

    pub fn get_progress(&self) -> Arc<Mutex<ClientProgress>> {
        self.progress.clone()
    }

    // Get file name from url. Remove all query parameters
    pub fn get_file_name(url: &str) -> String {
        let file_name = url.split("/").collect::<Vec<&str>>().last().unwrap().split("?").collect::<Vec<&str>>()[0];
        file_name.to_string()
    }
 
    // Create async function
    pub async fn download(&mut self, clientTransmitter: Sender<ClientProgress>) -> Result<(), Box<dyn std::error::Error>> {
        let url = self.url.clone();
        let parts = self.parts;

        let headers = reqwest::get(url).await?.headers().clone();
        println!("{:?}", headers);

        // Check if accept-ranges header is present
        if headers.contains_key("accept-ranges") {
            println!("Accept-Ranges header is present");
        } else {
            println!("Accept-Ranges header is not present");
        }

        let content_length = headers.get("content-length").unwrap().to_str().unwrap().parse::<u64>().unwrap();
        let fileName = Self::get_file_name(self.url.clone().as_str());

        let chunk_size = content_length / parts;


        let mut threads = JoinSet:: new();

        self.progress.lock().await.set_file_size(content_length);

        // ARc for progress

        for i in 0..parts {
 
            let start = i * chunk_size;
            let end = if i == parts - 1 {
                content_length - 1
            } else {
                start + chunk_size - 1
            };

            let url = self.url.clone();
            let _finalName = fileName.clone();
            
            // Create shared memory for each thread

            let shared_progress_arc = self.progress.clone();


            let mut transmitterClone = clientTransmitter.clone();
            threads.spawn(async move {
                // println!("Downloading part {} of {}", i, parts);
                let startTime = std::time::Instant::now();

                let client = reqwest::Client::new();

                let mut response = client.get(&url)
                    .header("Range", format!("bytes={}-{}", start, end))
                    .send()
                    .await;


                match response {
                    Ok(mut response) => {
                        let mut file = tokio::fs::File::create(format!("{}.{}", _finalName, i)).await.unwrap();
                        let mut totalChunks = response.content_length().unwrap();
                        let mut bytesDownloaded = 0;
                        

                        while let Some(chunk) = response.chunk().await.unwrap() {
                            let progress_arc = shared_progress_arc.clone();

                            bytesDownloaded += chunk.len() as u64;

                            let bytes_per_second = bytesDownloaded as f64 / startTime.elapsed().as_secs_f64();
                            // println!("\rDownloaded {} of {} MB at {} MB/s", totalBytes as f64 / 1000000.0, totalChunks as f64 / 1000000.0, bytes_per_second as f64 / 1000000.0);
                            // stdout
                            file.write_all(&chunk).await.unwrap();

                            // Update using mutex
                            let mut progress = progress_arc.lock().await;
                            progress.set_total_bytes(totalChunks, &i);
                            progress.set_chunks(bytesDownloaded, &i);

                            transmitterClone.send(progress.clone()).unwrap();
                        }

                    },
                    Err(e) => {
                        println!("Error: {:?}", e);
                    }
                }

            
            });

        }

        println!("Waiting for all threads to finish");
        while let Some(res) = threads.join_next().await {
            let out = res?;
        }

        // Merge all parts into one file
        let mut file = tokio::fs::File::create(fileName.clone()).await.unwrap();
        for i in 0..parts {
            let mut part = tokio::fs::File::open(format!("{}.{}", fileName, i)).await.unwrap();
            let mut buffer = Vec::new();
            part.read_to_end(buffer.as_mut()).await.unwrap();
            file.write_all(&buffer).await.unwrap();
        }

        // Delete all parts
        for i in 0..parts {
            tokio::fs::remove_file(format!("{}.{}", fileName, i)).await.unwrap();
        }
        
        Ok(())
    }
}

