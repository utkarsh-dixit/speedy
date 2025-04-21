use specta::Type;
use tauri::{Window, AppHandle};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use std::time::{Duration, Instant};
use std::sync::{Arc, Mutex};
use serde_json::{json, Value};
use serde::{Serialize, Deserialize};
use serde_with::{serde_as, DisplayFromStr};
use dirs;
use tokio::time;
use crate::db;
use crate::client;
use crate::state;
use crate::db_manager;

// Helper function to convert string parameter to u64 if needed
fn parse_u64_param(param: &str) -> u64 {
    match param.parse::<u64>() {
        Ok(value) => value,
        Err(_) => 0, // Default to 0 if parsing fails
    }
}

// Re-export Rust types as Specta types
#[serde_as]
#[derive(Type, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    #[serde_as(as = "DisplayFromStr")]
    pub download_id: u64,
    
    pub progress: f64,
    
    #[serde_as(as = "DisplayFromStr")]
    pub file_size: u64,
    
    #[serde_as(as = "DisplayFromStr")]
    pub completed: u64,
    
    pub speed: f64,
    pub estimated_time_left: f64,
    pub segments: Vec<SegmentProgress>,
}

#[serde_as]
#[derive(Type, Clone, Serialize, Deserialize)]
pub struct SegmentProgress {
    #[serde_as(as = "DisplayFromStr")]
    pub id: u64,
    
    #[serde_as(as = "DisplayFromStr")]
    pub total_bytes: u64,
    
    #[serde_as(as = "DisplayFromStr")]
    pub downloaded: u64, 
    
    pub progress: f64,
    pub speed: f64,
}

// Define custom event type
#[serde_as]
#[derive(Type, Clone, Serialize, Deserialize)]
pub struct DownloadProgressEvent {
    #[serde_as(as = "DisplayFromStr")]
    pub download_id: u64,
    
    pub progress: f64,
}

/// Starts a download process and tracks its progress
#[tauri::command]
#[specta::specta]
pub async fn start_download(url: String, name: String, parts: String, download_id: Option<u64>, window: Window) -> Result<(), String> {
    // Convert parts from string to u64
    let parts = parse_u64_param(&parts);
    
    let (tx, rx) = std::sync::mpsc::channel::<client::DownloadEvent>();

    // Create shared download state
    let download_state = Arc::new(Mutex::new(state::DownloadState::new()));
    
    // Get the filename from the URL
    let filename = client::Client::get_file_name(&url);
    
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
    let download = db::Download::new(download_id, url.clone(), filename.clone(), 0, parts);
    if let Err(e) = db_manager::insert_download(&download).await {
        eprintln!("Failed to insert download into database: {}", e);
    }
    
    // Start the download process
    let url_clone = url.clone();
    let download_id_clone = download_id;
    tokio::spawn(async move {
        let mut client = client::Client::new(url_clone, parts);
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
                client::DownloadEvent::Initialize { file_size, segments } => {
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
                client::DownloadEvent::BytesReceived { segment_id, bytes, speed } => {
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
                client::DownloadEvent::Error { segment_id, message } => {
                    eprintln!("Error in segment {}: {}", segment_id, message);
                    
                    // Update database with error
                    let error_message = message.clone();
                    if let Err(e) = db_manager::mark_error(download_id_clone, &error_message).await {
                        eprintln!("Failed to update database with error: {}", e);
                    }
                },
                client::DownloadEvent::Complete => {
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
        let mut high_water_mark = state::HighWaterMarkTracker::new();
        
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
#[tauri::command]
#[specta::specta]
pub async fn list_downloads() -> Result<Vec<db::Download>, String> {
    match db_manager::list_downloads().await {
        Ok(downloads) => Ok(downloads),
        Err(e) => Err(format!("Failed to list downloads: {}", e)),
    }
}

/// Get a download by ID from the database
#[tauri::command]
#[specta::specta]
pub async fn get_download(download_id: String) -> Result<Option<db::Download>, String> {
    let download_id = parse_u64_param(&download_id);
    match db_manager::get_download(download_id).await {
        Ok(download) => Ok(download),
        Err(e) => Err(format!("Failed to get download: {}", e)),
    }
}

/// Delete a download from the database
#[tauri::command]
#[specta::specta]
pub async fn delete_download(download_id: String, should_also_delete_file: Option<bool>) -> Result<(), String> {
    println!("Deleting download: {}", download_id);
    let download_id = parse_u64_param(&download_id);
    
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
pub async fn delete_from_database(download_id: u64) -> Result<(), String> {
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
#[tauri::command]
#[specta::specta]
pub async fn get_downloads_by_status(status: String) -> Result<Vec<db::Download>, String> {
    match db_manager::get_downloads_by_status(&status).await {
        Ok(downloads) => Ok(downloads),
        Err(e) => Err(format!("Failed to get downloads by status: {}", e)),
    }
}

/// Opens a new window to display download details
#[tauri::command]
#[specta::specta]
pub async fn open_details_window(
    download_id: String,
    url: String,
    title: String,
    app_handle: AppHandle
) -> Result<(), String> {
    let download_id = parse_u64_param(&download_id);
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
#[specta::specta]
pub async fn greet(_name: &str, window: Window) -> Result<(), String> {
    let url = "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4".to_string();
    let parts = 5;
    let download_id = 0; // Default ID for the greet command
    let name = "test".to_string();
    start_download(url, name, parts.to_string(), Some(download_id), window).await
}

/// Checks if a file is already being downloaded or exists in parts
/// Returns information about any existing download with the same filename
#[tauri::command]
#[specta::specta]
pub async fn check_existing_download(url: String) -> Result<serde_json::Value, String> {
    // Get the filename from the URL
    let filename = client::Client::get_file_name(&url);
    
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
#[tauri::command]
#[specta::specta]
pub async fn pause_download(download_id: String) -> Result<(), String> {
    println!("Pausing download: {}", download_id);
    let download_id = parse_u64_param(&download_id);
    
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
#[tauri::command]
#[specta::specta]
pub async fn resume_download(download_id: String, window: Window) -> Result<(), String> {
    println!("Resuming download: {}", download_id);
    let download_id = parse_u64_param(&download_id);
    
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
        download.parts.to_string(),
        Some(download_id),
        window
    ).await
}

#[tauri::command]
#[specta::specta]
pub async fn debug_commands() -> Result<String, String> {
    // Return information about registered commands
    let info = "Available commands: start_download, open_details_window, greet, list_downloads, get_download, delete_download, get_downloads_by_status, check_existing_download, pause_download, resume_download";
    Ok(info.to_string())
} 