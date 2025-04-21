#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod api;

use serde_json::{Map, Value};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::Window;
use tauri_app::client::{Client, DownloadEvent};
use tauri_app::db::Download;
use tauri_app::db_manager;
use tokio::time;
use tauri::generate_handler;

// For runtime type generation
use specta::collect_types;
use tauri_specta::{ts};

// Import Specta TypeScript settings to configure BigInt behavior
use specta::ts::{BigIntExportBehavior, ExportConfiguration};

// Use i32 instead of u64 for external API to avoid TypeScript binding issues
// Internal Rust code can still use u64 with safe conversions
type ApiNumber = i32;

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
async fn start_download(url: String, name: String, parts: u64, download_id: Option<u64>, window: Window) -> Result<(), String> {
    let (tx, rx) = std::sync::mpsc::channel::<DownloadEvent>();

    // Create shared download state
    let download_state = Arc::new(Mutex::new(DownloadState::new()));
    
    // Get the filename from the URL
    let filename = Client::get_file_name(&url);
    
    // Use provided download_id or generate a new one
    let download_id = download_id.unwrap_or_else(|| {
        // Generate a unique ID based on current timestamp
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_secs();
        timestamp
    });
    
    // Create a database entry for this download
    let download = Download::new(download_id, url.clone(), filename.clone(), 0, parts);
    if let Err(e) = db_manager::insert_download(&download).await {
        eprintln!("Failed to insert download into database: {}", e);
    }
    
    // Start the download process
    let url_clone = url.clone();
    let download_id_clone = download_id;
    tokio::spawn(async move {
        let mut client = Client::new(url_clone, parts);
        if let Err(e) = client.download(tx.clone()).await {
            let error_message = e.to_string();
            eprintln!("Download error: {}", error_message);
            // Update database with error - avoid using the error directly across await
            if let Err(db_err) = db_manager::mark_error(download_id_clone, &error_message).await {
                eprintln!("Failed to update database with error: {}", db_err);
            }
        }
    });

    // Create a thread to process events and update the download state
    let state = download_state.clone();
    let download_id_clone = download_id;
    let filename_clone = filename.clone();
    
    tokio::spawn(async move {
        while let Ok(event) = rx.recv() {
            match event {
                DownloadEvent::Initialize { file_size, segments } => {
                    // Use a block to limit the scope of the mutex guard
                    {
                        let mut state_guard = state.lock().unwrap();
                        state_guard.initialize(file_size, segments.clone());
                    }
                    
                    // Update the database with the file size
                    if let Ok(Some(mut download)) = db_manager::get_download(download_id_clone).await {
                        download.total_size = file_size;
                        if let Err(e) = db_manager::update_download(&download).await {
                            eprintln!("Failed to update download size in database: {}", e);
                        }
                    }
                },
                DownloadEvent::BytesReceived { segment_id, bytes, speed } => {
                    // Use a block to limit the scope of the mutex guard
                    {
                        let mut state_guard = state.lock().unwrap();
                        state_guard.add_bytes(segment_id, bytes, speed);
                    }
                    
                    // Update the database with progress
                    if let Err(e) = db_manager::update_progress(download_id_clone, bytes).await {
                        eprintln!("Failed to update download progress in database: {}", e);
                    }
                },
                DownloadEvent::Error { segment_id, message } => {
                    eprintln!("Error in segment {}: {}", segment_id, message);
                    
                    // Update database with error
                    let error_message = message.clone();
                    if let Err(e) = db_manager::mark_error(download_id_clone, &error_message).await {
                        eprintln!("Failed to update database with error: {}", e);
                    }
                },
                DownloadEvent::Complete => {
                    // Mark the state as complete
                    {
                        let mut state_guard = state.lock().unwrap();
                        state_guard.mark_complete();
                    }
                    
                    // Try to get the output path for the completed download
                    let output_dir = dirs::download_dir().unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from(".")));
                    let output_path = output_dir.join(&filename_clone);
                    let path_str = output_path.to_string_lossy().to_string();
                    
                    // Update database with completion
                    if let Err(e) = db_manager::mark_complete(download_id_clone, &path_str).await {
                        eprintln!("Failed to mark download as complete in database: {}", e);
                    }
                    
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

/// List all downloads from the database
async fn list_downloads() -> Result<Vec<Download>, String> {
    match db_manager::list_downloads().await {
        Ok(downloads) => Ok(downloads),
        Err(e) => Err(format!("Failed to list downloads: {}", e)),
    }
}

/// Get a download by ID from the database
async fn get_download(download_id: u64) -> Result<Option<Download>, String> {
    match db_manager::get_download(download_id).await {
        Ok(download) => Ok(download),
        Err(e) => Err(format!("Failed to get download: {}", e)),
    }
}

/// Delete a download from the database
async fn delete_download(download_id: u64, should_also_delete_file: Option<bool>) -> Result<(), String> {
    println!("Deleting download: {}", download_id);
    
    let should_delete_file = should_also_delete_file.unwrap_or(false);
    
    // If we don't need to delete the file, we can proceed directly to database deletion
    if !should_delete_file {
        return delete_from_database(download_id).await;
    }
    
    // If we need to delete the file, first get the download to find the file path
    match db_manager::get_download(download_id).await {
        Ok(Some(download)) => {
            // Check if we have a valid save path
            if let Some(save_path) = download.save_path.filter(|path| !path.is_empty()) {
                // Try to delete the file
                match std::fs::remove_file(&save_path) {
                    Ok(_) => {
                        println!("Successfully deleted file: {}", save_path);
                        delete_from_database(download_id).await
                    },
                    Err(e) => {
                        println!("Warning: Could not delete file at {}: {}", save_path, e);
                        Err(format!("File deletion failed, not removing from database"))
                    }
                }
            } else {
                // No valid save path, proceed with database deletion
                println!("No valid save path found, proceeding with database deletion");
                delete_from_database(download_id).await
            }
        },
        Ok(None) => {
            println!("Download not found, cannot delete file");
            Err(format!("Download not found in database"))
        },
        Err(e) => {
            println!("Error retrieving download for file deletion: {}", e);
            Err(format!("Error retrieving download: {}", e))
        },
    }
}

// Helper function to delete a download from the database
async fn delete_from_database(download_id: u64) -> Result<(), String> {
    match db_manager::delete_download(download_id).await {
        Ok(_) => {
            println!("Successfully deleted download: {}", download_id);
            Ok(())
        },
        Err(e) => {
            println!("Failed to delete download: {}", e);
            Err(format!("Failed to delete download: {}", e))
        },
    }
}

/// Get downloads with a specific status from the database
async fn get_downloads_by_status(status: String) -> Result<Vec<Download>, String> {
    match db_manager::get_downloads_by_status(&status).await {
        Ok(downloads) => Ok(downloads),
        Err(e) => Err(format!("Failed to get downloads by status: {}", e)),
    }
}

/// Opens a new window to display download details
async fn open_details_window(
    download_id: u64,
    url: String,
    title: String,
    app_handle: tauri::AppHandle
) -> Result<(), String> {
    let label = format!("download-{}-{}", download_id, chrono::Utc::now().timestamp());
    
    match tauri::WindowBuilder::new(
        &app_handle,
        label,
        tauri::WindowUrl::App(url.into())
    )
    .title(title)
    .inner_size(800.0, 600.0)
    .center()
    .build() {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open window: {}", e))
    }
}

/// For backward compatibility with the previous "greet" command
#[tauri::command]
async fn greet(_name: &str, window: Window) -> Result<(), String> {
    let url = "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4".to_string();
    let parts = 5;
    let download_id = 0; // Default ID for the greet command
    let name = "test".to_string();
    start_download(url, name, parts, Some(download_id), window).await
}

/// Checks if a file is already being downloaded or exists in parts
/// Returns information about any existing download with the same filename
async fn check_existing_download(url: String) -> Result<serde_json::Value, String> {
    // Get the filename from the URL
    let filename = Client::get_file_name(&url);
    
    // Get the downloads directory and temp directory
    let downloads_dir = dirs::download_dir().unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from(".")));
    let temp_dir = std::env::temp_dir();
    
    // Check if the complete file already exists in the downloads folder
    let complete_file_path = downloads_dir.join(&filename);
    let complete_file_exists = complete_file_path.exists();
    
    // Check for part files in the temp directory
    let mut part_files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&temp_dir) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                // Look for part files with pattern: filename.part1, filename.part2, etc.
                if file_name.starts_with(&filename) && file_name.contains(".part") {
                    part_files.push(path);
                }
            }
        }
    }
    
    // Generate a unique filename regardless of whether we found existing files
    let file_stem = std::path::Path::new(&filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("file");
        
    let extension = std::path::Path::new(&filename)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    
    // Try to find a non-colliding filename
    let mut counter = 1;
    let mut new_filename = if extension.is_empty() {
        format!("{} ({})", file_stem, counter)
    } else {
        format!("{} ({}).{}", file_stem, counter, extension)
    };
    
    let mut new_path = downloads_dir.join(&new_filename);
    
    // Keep incrementing until we find a name that doesn't exist
    while new_path.exists() {
        counter += 1;
        new_filename = if extension.is_empty() {
            format!("{} ({})", file_stem, counter)
        } else {
            format!("{} ({}).{}", file_stem, counter, extension)
        };
        new_path = downloads_dir.join(&new_filename);
    }
    
    if part_files.is_empty() && !complete_file_exists {
        // No existing files found
        return Ok(serde_json::json!({
            "exists": false,
            "original_filename": filename,
            "suggested_filename": filename
        }));
    }
    
    if !part_files.is_empty() {
        // We found part files, suggesting a download is in progress or was interrupted
        return Ok(serde_json::json!({
            "exists": true,
            "type": "in_progress",
            "original_filename": filename,
            "part_files": part_files.len(),
            "location": temp_dir.to_string_lossy(),
            "suggested_filename": new_filename
        }));
    }
    
    if complete_file_exists {
        // The file already exists
        return Ok(serde_json::json!({
            "exists": true,
            "type": "completed",
            "original_filename": filename,
            "suggested_filename": new_filename,
            "file_path": complete_file_path.to_string_lossy()
        }));
    }
    
    // This should never happen as we've handled all cases above
    Ok(serde_json::json!({
        "exists": false,
        "original_filename": filename,
        "suggested_filename": filename
    }))
}

/// Pauses a download by its ID
async fn pause_download(download_id: u64) -> Result<(), String> {
    println!("Pausing download: {}", download_id);
    
    // Update the download status to paused in the database
    match db_manager::update_status(download_id, "paused").await {
        Ok(_) => {
            println!("Successfully paused download: {}", download_id);
            Ok(())
        },
        Err(e) => {
            println!("Failed to pause download: {}", e);
            Err(format!("Failed to pause download: {}", e))
        },
    }
}

/// Resumes a download by its ID
async fn resume_download(download_id: u64, window: Window) -> Result<(), String> {
    println!("Resuming download: {}", download_id);
    
    // Get the download information from the database
    let download = match db_manager::get_download(download_id).await {
        Ok(Some(download)) => download,
        Ok(None) => return Err("Download not found".to_string()),
        Err(e) => return Err(format!("Error retrieving download: {}", e)),
    };
    
    // Update the download status to in_progress
    if let Err(e) = db_manager::update_status(download_id, "downloading").await {
        return Err(format!("Failed to update download status: {}", e));
    }
    
    // Restart the download with the same parameters
    start_download(
        download.url,
        download.filename,
        download.parts,
        Some(download_id),
        window
    ).await
}

#[tauri::command]
async fn debug_commands() -> Result<String, String> {
    // Return information about registered commands
    let info = "Available commands: start_download, open_details_window, greet, list_downloads, get_download, delete_download, get_downloads_by_status, check_existing_download, pause_download, resume_download";
    Ok(info.to_string())
}

#[tokio::main]
async fn main() {
    // Initialize the database
    db_manager::init_db().await;
    
    // Generate TypeScript bindings at runtime in debug mode
    #[cfg(debug_assertions)]
    {
        println!("Generating TypeScript bindings...");
        
        let mut export_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        export_path.pop(); // Move up to the workspace root
        export_path.push("src/src/bindings");
        
        // Create the directory if it doesn't exist
        fs::create_dir_all(&export_path).expect("Failed to create bindings directory");
        
        export_path.push("commands.ts");
        
        // Generate TypeScript bindings for all API functions
        let type_collection = collect_types![
            api::start_download,
            api::list_downloads,
            api::get_download,
            api::delete_download,
            api::pause_download,
            api::resume_download,
            api::get_downloads_by_status,
            api::check_existing_download,
            api::open_details_window
        ].unwrap();

        let specta_config = ExportConfiguration::new().bigint(BigIntExportBehavior::Number);
        
        // Configure TypeScript export to handle BigInt values properly
        ts::export_with_cfg(type_collection, specta_config, export_path).unwrap()
    }
    
    tauri::Builder::default()
        .invoke_handler(generate_handler![
            api::start_download,
            api::list_downloads,
            api::get_download,
            api::delete_download,
            api::pause_download,
            api::resume_download,
            api::get_downloads_by_status,
            api::check_existing_download,
            api::open_details_window,
            greet, // Keep the legacy function for backward compatibility
            debug_commands,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
