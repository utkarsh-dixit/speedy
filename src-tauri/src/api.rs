use specta::Type;
use tauri::{Window, AppHandle};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use std::sync::mpsc::channel;
use std::time::{Duration, Instant};
use std::collections::HashMap;
use std::fs;
use std::sync::{Arc, Mutex};
use serde_json::{json, Value};
use serde::{Serialize, Deserialize};
use serde_with::{serde_as, DisplayFromStr};
use dirs;

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

// Use direct imports from the local modules
#[tauri::command]
#[specta::specta]
pub async fn start_download(url: String, name: String, parts: u64, download_id: Option<u64>, window: Window) -> Result<(), String> {
    // Access the crate::start_download function declared in main.rs
    // For now, return an error instructing to run the app from CLI
    Err("Please run the application from the command line with 'pnpm tauri dev'".to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn list_downloads() -> Result<Vec<crate::Download>, String> {
    Err("Please run the application from the command line with 'pnpm tauri dev'".to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_download(download_id: u64) -> Result<Option<crate::Download>, String> {
    Err("Please run the application from the command line with 'pnpm tauri dev'".to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_download(download_id: u64, should_also_delete_file: Option<bool>) -> Result<(), String> {
    Err("Please run the application from the command line with 'pnpm tauri dev'".to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn pause_download(download_id: u64) -> Result<(), String> {
    Err("Please run the application from the command line with 'pnpm tauri dev'".to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn resume_download(download_id: u64, window: Window) -> Result<(), String> {
    Err("Please run the application from the command line with 'pnpm tauri dev'".to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_downloads_by_status(status: String) -> Result<Vec<crate::Download>, String> {
    Err("Please run the application from the command line with 'pnpm tauri dev'".to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn check_existing_download(url: String) -> Result<serde_json::Value, String> {
    // Implement directly rather than calling crate::check_existing_download
    // This is a placeholder that will allow building but tell users to run from CLI
    Err("Please run the application from the command line with 'pnpm tauri dev'".to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn open_details_window(
    download_id: u64,
    url: String,
    title: String,
    app_handle: AppHandle
) -> Result<(), String> {
    Err("Please run the application from the command line with 'pnpm tauri dev'".to_string())
} 