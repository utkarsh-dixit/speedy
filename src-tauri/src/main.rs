#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod api;
mod state;
mod db;
mod client;
mod db_manager;

use std::fs;
use std::path::PathBuf;
use specta::collect_types;
use tauri::generate_handler;
use tauri_specta::ts;
use specta::ts::{BigIntExportBehavior, ExportConfiguration};

#[tokio::main]
async fn main() {
    // Initialize the database
    tauri_app::db_manager::init_db().await;
    
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
            api::greet, // Keep the legacy function for backward compatibility
            api::debug_commands,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
