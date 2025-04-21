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
    // but only if necessary (if file doesn't exist or api.rs was modified more recently)
    #[cfg(debug_assertions)]
    {
        let mut export_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        export_path.pop(); // Move up to the workspace root
        export_path.push("src/src/bindings");
        
        // Create the directory if it doesn't exist
        fs::create_dir_all(&export_path).expect("Failed to create bindings directory");
        
        let ts_file_path = export_path.join("commands.ts");
        let api_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/api.rs");
        
        // Check if we need to regenerate types
        let should_generate = if !ts_file_path.exists() {
            println!("TypeScript bindings don't exist, generating...");
            true
        } else {
            // Compare modification times
            match (fs::metadata(&ts_file_path), fs::metadata(&api_file_path)) {
                (Ok(ts_meta), Ok(api_meta)) => {
                    match (ts_meta.modified(), api_meta.modified()) {
                        (Ok(ts_time), Ok(api_time)) => {
                            if api_time > ts_time {
                                println!("API file was modified, regenerating TypeScript bindings...");
                                true
        } else {
                                println!("TypeScript bindings are up to date.");
                                false
                            }
                        },
                        _ => {
                            println!("Couldn't compare file times, regenerating TypeScript bindings to be safe...");
                            true
                        }
                    }
                },
                _ => {
                    println!("Couldn't read file metadata, regenerating TypeScript bindings to be safe...");
                    true
                }
            }
        };
        
        if should_generate {
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

            let specta_config = ExportConfiguration::new().bigint(BigIntExportBehavior::String);
            
            // Configure TypeScript export to handle BigInt values properly
            ts::export_with_cfg(type_collection, specta_config, ts_file_path).unwrap();
            println!("Successfully generated TypeScript bindings.");
        }
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
