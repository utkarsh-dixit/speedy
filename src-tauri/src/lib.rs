// This is the main library file for the Tauri application

/// Module containing the download client functionality
pub mod client;

/// Re-export commonly used types for easier imports by consumers
pub use client::{Client, ClientProgress, DownloadEvent};