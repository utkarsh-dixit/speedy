#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde_json::{Map, Value};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::Window;
use tauri_app::client::{Client, DownloadEvent};
use tokio::time;

/// Represents the current state of a download operation
#[derive(Debug)]
struct DownloadState {
    file_size: u64,
    segment_sizes: HashMap<u64, u64>,     // segment_id -> total_size
    segment_progress: HashMap<u64, u64>,  // segment_id -> downloaded_bytes
    segment_speeds: HashMap<u64, f64>,    // segment_id -> bytes_per_second
    total_downloaded: u64,
    start_time: Instant,
    last_update_time: Instant,
    is_complete: bool,
}

impl DownloadState {
    /// Creates a new empty DownloadState
    fn new() -> Self {
        Self {
            file_size: 0,
            segment_sizes: HashMap::new(),
            segment_progress: HashMap::new(),
            segment_speeds: HashMap::new(),
            total_downloaded: 0,
            start_time: Instant::now(),
            last_update_time: Instant::now(),
            is_complete: false,
        }
    }

    /// Initializes the download state with file size and segment information
    fn initialize(&mut self, file_size: u64, segments: HashMap<u64, u64>) {
        self.file_size = file_size;
        self.segment_sizes = segments;
        
        // Initialize progress for each segment to 0
        for (&segment_id, _) in &self.segment_sizes {
            self.segment_progress.insert(segment_id, 0);
            self.segment_speeds.insert(segment_id, 0.0);
        }
    }

    /// Updates the state with newly downloaded bytes
    fn add_bytes(&mut self, segment_id: u64, bytes: u64, speed: f64) {
        // Get current downloaded bytes for this segment
        let current_bytes = self.segment_progress.get(&segment_id).cloned().unwrap_or(0);
        
        // Calculate new total - ONLY ADD the new bytes, don't replace
        let new_total = current_bytes + bytes;
        
        // Update segment progress - ensure it never decreases
        self.segment_progress.insert(segment_id, new_total);
        
        // Update total downloaded with the difference
        self.total_downloaded += bytes;
        
        // Update speed - only if the new speed is greater than the current
        let current_speed = self.segment_speeds.get(&segment_id).cloned().unwrap_or(0.0);
        if speed > current_speed {
            self.segment_speeds.insert(segment_id, speed);
        }
        
        // Update last update time
        self.last_update_time = Instant::now();
    }

    /// Marks the download as complete
    fn mark_complete(&mut self) {
        self.is_complete = true;
    }

    /// Gets the progress percentage for a specific segment
    fn get_segment_progress(&self, segment_id: u64) -> f64 {
        let downloaded = self.segment_progress.get(&segment_id).cloned().unwrap_or(0);
        let total = self.segment_sizes.get(&segment_id).cloned().unwrap_or(1); // Avoid div by zero
        (downloaded as f64 / total as f64) * 100.0
    }

    /// Gets the overall download progress percentage
    fn get_total_progress(&self) -> f64 {
        if self.file_size == 0 {
            return 0.0;
        }
        (self.total_downloaded as f64 / self.file_size as f64) * 100.0
    }

    /// Calculates the average download speed in bytes per second
    fn get_average_speed(&self) -> f64 {
        let duration = self.start_time.elapsed().as_secs_f64();
        if duration > 0.0 {
            self.total_downloaded as f64 / duration
        } else {
            0.0
        }
    }

    /// Estimates the remaining download time in seconds
    fn get_estimated_time_left(&self) -> f64 {
        let speed = self.get_average_speed();
        if speed > 0.0 {
            let remaining_bytes = self.file_size.saturating_sub(self.total_downloaded);
            remaining_bytes as f64 / speed
        } else {
            0.0
        }
    }

    /// Creates a JSON representation of the current state for the frontend
    fn create_progress_json(&self) -> Map<String, Value> {
        let mut map = Map::new();
        let progress = if self.is_complete { 100.0 } else { self.get_total_progress() };
        let speed = self.get_average_speed();
        let estimated_time_left = self.get_estimated_time_left();
        
        map.insert("progress".to_string(), Value::from(progress));
        map.insert("fileSize".to_string(), Value::from(self.file_size));
        map.insert("completed".to_string(), Value::from(self.total_downloaded));
        map.insert("speed".to_string(), Value::from(speed));
        map.insert("estimatedTimeLeft".to_string(), Value::from(estimated_time_left));
        
        // Add segments data
        let mut segments = Vec::new();
        for (&segment_id, &size) in &self.segment_sizes {
            let downloaded = self.segment_progress.get(&segment_id).cloned().unwrap_or(0);
            let segment_progress = self.get_segment_progress(segment_id);
            let segment_speed = self.segment_speeds.get(&segment_id).cloned().unwrap_or(0.0);
            
            let mut segment_map = Map::new();
            segment_map.insert("id".to_string(), Value::from(segment_id));
            segment_map.insert("totalBytes".to_string(), Value::from(size));
            segment_map.insert("downloaded".to_string(), Value::from(downloaded));
            segment_map.insert("progress".to_string(), Value::from(segment_progress));
            segment_map.insert("speed".to_string(), Value::from(segment_speed));
            
            segments.push(Value::Object(segment_map));
        }
        
        // Sort segments by ID for consistent UI display
        segments.sort_by(|a, b| {
            let a_id = a.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
            let b_id = b.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
            a_id.cmp(&b_id)
        });
        
        map.insert("segments".to_string(), Value::Array(segments));
        map
    }
}

/// Tracks the highest values seen to ensure UI values never decrease
#[derive(Debug)]
struct HighWaterMarkTracker {
    segment_progress: HashMap<u64, u64>, // segment_id -> max_bytes_seen
    total_downloaded: u64,
    total_progress: f64,
}

impl HighWaterMarkTracker {
    /// Creates a new empty tracker
    fn new() -> Self {
        Self {
            segment_progress: HashMap::new(),
            total_downloaded: 0,
            total_progress: 0.0,
        }
    }

    /// Ensures progress values never decrease by applying high water marks
    fn ensure_monotonic_progress(&mut self, progress_json: &mut Map<String, Value>) {
        // Handle total progress
        if let Some(progress_value) = progress_json.get("progress").and_then(|v| v.as_f64()) {
            if progress_value > self.total_progress {
                self.total_progress = progress_value;
            } else {
                // Replace with high water mark
                progress_json.insert("progress".to_string(), Value::from(self.total_progress));
            }
        }
        
        // Handle total downloaded bytes
        if let Some(completed_value) = progress_json.get("completed").and_then(|v| v.as_u64()) {
            if completed_value > self.total_downloaded {
                self.total_downloaded = completed_value;
            } else {
                // Replace with high water mark
                progress_json.insert("completed".to_string(), Value::from(self.total_downloaded));
            }
        }
        
        // Handle segment progress
        if let Some(segments_array) = progress_json.get_mut("segments").and_then(|v| v.as_array_mut()) {
            for segment in segments_array {
                if let Some(segment_obj) = segment.as_object_mut() {
                    // Get segment ID
                    let segment_id = segment_obj.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
                    
                    // Get downloaded bytes for this segment
                    if let Some(downloaded_value) = segment_obj.get("downloaded").and_then(|v| v.as_u64()) {
                        let current_max = self.segment_progress.entry(segment_id).or_insert(0);
                        
                        // Update if new value is higher
                        if downloaded_value > *current_max {
                            *current_max = downloaded_value;
                        } else {
                            // Replace with high water mark
                            segment_obj.insert("downloaded".to_string(), Value::from(*current_max));
                            
                            // Also update progress percentage to match
                            if let Some(total_bytes) = segment_obj.get("totalBytes").and_then(|v| v.as_u64()) {
                                if total_bytes > 0 {
                                    let segment_progress = (*current_max as f64 / total_bytes as f64) * 100.0;
                                    segment_obj.insert("progress".to_string(), Value::from(segment_progress));
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/// Starts a download process and tracks its progress
#[tauri::command]
async fn start_download(url: String, parts: u64, download_id: u64, window: Window) -> Result<(), String> {
    let (tx, rx) = std::sync::mpsc::channel::<DownloadEvent>();

    // Create shared download state
    let download_state = Arc::new(Mutex::new(DownloadState::new()));
    
    // Start the download process
    let event_sender = tx.clone();
    tokio::spawn(async move {
        let mut client = Client::new(url, parts);
        if let Err(e) = client.download(event_sender).await {
            eprintln!("Download error: {}", e);
        }
    });

    // Create a thread to process events and update the download state
    let state = download_state.clone();
    tokio::spawn(async move {
        while let Ok(event) = rx.recv() {
            match event {
                DownloadEvent::Initialize { file_size, segments } => {
                    let mut state_guard = state.lock().unwrap();
                    state_guard.initialize(file_size, segments);
                },
                DownloadEvent::BytesReceived { segment_id, bytes, speed } => {
                    let mut state_guard = state.lock().unwrap();
                    state_guard.add_bytes(segment_id, bytes, speed);
                },
                DownloadEvent::Error { segment_id, message } => {
                    eprintln!("Error in segment {}: {}", segment_id, message);
                    // Additional error handling could be added here
                },
                DownloadEvent::Complete => {
                    let mut state_guard = state.lock().unwrap();
                    state_guard.mark_complete();
                    break;
                }
            }
        }
    });

    // Create a UI update thread to send progress to the frontend
    let watcher_state = download_state.clone();
    let watcher_window = window.clone();
    let download_id_clone = download_id;
    tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_millis(50));
        let mut high_water_mark = HighWaterMarkTracker::new();
        
        loop {
            interval.tick().await;
            
            let download_complete;
            let mut progress_json;
            
            {
                let state_guard = watcher_state.lock().unwrap();
                download_complete = state_guard.is_complete;
                progress_json = state_guard.create_progress_json();
            }
            
            // Ensure progress values never decrease
            high_water_mark.ensure_monotonic_progress(&mut progress_json);
            
            // Add the download ID to the payload
            progress_json.insert("downloadId".to_string(), Value::from(download_id_clone));
            
            // Send update to the frontend
            let total_progress = progress_json.get("progress").and_then(|v| v.as_f64()).unwrap_or(0.0);
            
            if let Err(e) = watcher_window.emit("download-progress", progress_json) {
                eprintln!("Error sending update to frontend: {:?}", e);
            }
            
            // If download is complete and we've sent the 100% update, break the loop
            if download_complete && total_progress >= 100.0 {
                break;
            }
        }
    });

    Ok(())
}

/// For backward compatibility with the previous "greet" command
#[tauri::command]
async fn greet(_name: &str, window: Window) -> Result<(), String> {
    let url = "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4".to_string();
    let parts = 5;
    let download_id = 0; // Default ID for the greet command
    
    start_download(url, parts, download_id, window).await
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, start_download])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
