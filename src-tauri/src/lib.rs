#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

// This is the main library file for the Tauri application

/// Module containing the download client functionality
pub mod client;

/// Module containing the database functionality for downloads
pub mod db;

/// Module containing the async database manager
pub mod db_manager;

/// Re-export commonly used types for easier imports by consumers
pub use client::{Client, ClientProgress, DownloadEvent};
pub use db::{Download, DownloadDb, get_db};

// Re-export the modules we want to make accessible from the build script
pub mod api;