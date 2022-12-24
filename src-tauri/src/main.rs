#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Window;
use tauri_app::client::{Client, ClientProgress};

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str, window: Window) {

    let url = "https://r1---sn-5jucgv5qc5oq-w5pe.gvt1.com/edgedl/android/studio/install/2021.3.1.17/android-studio-2021.3.1.17-windows.exe?cms_redirect=yes&mh=P9&mip=49.204.160.195&mm=28&mn=sn-5jucgv5qc5oq-w5pe&ms=nvh&mt=1671386431&mv=m&mvi=1&pl=22&shardbypass=sd".to_string();
    let parts = 5;

    println!("Downloading file: {}", url);
    let (tx, rx) = std::sync::mpsc::channel::<ClientProgress>();

    let clientTransmitter = tx.clone();
    let clientThread = tokio::spawn(async move {
        // Process each socket concurrently.
        let mut client = Client::new(url.clone(), parts.clone());
        println!("Client created");
        let downloadTask = client.download(clientTransmitter).await;
        println!("Download task completed");
    });

    println!("Download started");

    // Rx iter but break

    let waitThread = tokio::spawn(async move {
        loop {
            let x = rx.recv().unwrap();
    
            // Get keys for chunks
            let keys = x.chunks.keys().collect::<Vec<&u64>>();
            print!("\x1B[2J\x1B[1;1H");
    
            let file_size = x.file_size;
    
            let mut completed: u64 = 0;
            // Loop
            for key in keys {
                // Get chunk
                let totalBytes = x.total_bytes[key];
                let chunk = x.chunks[key];
                let downloadProgress = (chunk as f64 / totalBytes as f64) * 100.0;
                completed += chunk;
                println!("Download progress {}: {}%",key, downloadProgress);
            }
    
            let downloadProgress = (completed as f64 / file_size as f64) * 100.0;
            if downloadProgress == 100.0 {
                println!("Download complete");
                break;
            } else {
                // Send tauri event

                window.emit("download-progress", downloadProgress).unwrap();
                println!("Download progress: {}%", downloadProgress);
            }
        }
    });

   
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    Ok(())
}
