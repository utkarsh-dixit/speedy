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

/// Module containing the API functions
pub mod api;

/// Module containing download state tracking
pub mod state;

