use crate::db::{Download, DownloadDb};
use rusqlite::Result;
use std::sync::{Arc, Mutex};
use tokio::sync::OnceCell;

static DB_INSTANCE: OnceCell<Arc<Mutex<DownloadDb>>> = OnceCell::const_new();

/// Initialize the database and return a reference to it
pub async fn init_db() -> Arc<Mutex<DownloadDb>> {
    DB_INSTANCE
        .get_or_init(|| async {
            match DownloadDb::new(None) {
                Ok(db) => Arc::new(Mutex::new(db)),
                Err(e) => {
                    eprintln!("Failed to initialize database: {}", e);
                    panic!("Database initialization failed");
                }
            }
        })
        .await
        .clone()
}

/// Get the database instance
pub async fn get_db_instance() -> Arc<Mutex<DownloadDb>> {
    match DB_INSTANCE.get() {
        Some(db) => db.clone(),
        None => init_db().await,
    }
}

/// Insert a new download into the database
pub async fn insert_download(download: &Download) -> Result<i64> {
    let db = get_db_instance().await;
    let db_guard = db.lock().unwrap();
    db_guard.insert_download(download)
}

/// Update an existing download in the database
pub async fn update_download(download: &Download) -> Result<()> {
    let db = get_db_instance().await;
    let db_guard = db.lock().unwrap();
    db_guard.update_download(download)
}

/// Update download progress in the database
pub async fn update_progress(download_id: u64, bytes: u64) -> Result<()> {
    let db = get_db_instance().await;
    let db_guard = db.lock().unwrap();
    db_guard.update_progress(download_id, bytes)
}

/// Mark a download as complete in the database
pub async fn mark_complete(download_id: u64, save_path: &str) -> Result<()> {
    let db = get_db_instance().await;
    let db_guard = db.lock().unwrap();
    db_guard.mark_complete(download_id, save_path)
}

/// Mark a download as error in the database
pub async fn mark_error(download_id: u64, error_message: &str) -> Result<()> {
    let db = get_db_instance().await;
    let db_guard = db.lock().unwrap();
    db_guard.mark_error(download_id, error_message)
}

/// Get a download by ID from the database
pub async fn get_download(download_id: u64) -> Result<Option<Download>> {
    let db = get_db_instance().await;
    let db_guard = db.lock().unwrap();
    db_guard.get_download(download_id)
}

/// List all downloads from the database
pub async fn list_downloads() -> Result<Vec<Download>> {
    let db = get_db_instance().await;
    let db_guard = db.lock().unwrap();
    db_guard.list_downloads()
}

/// Get downloads with a specific status from the database
pub async fn get_downloads_by_status(status: &str) -> Result<Vec<Download>> {
    let db = get_db_instance().await;
    let db_guard = db.lock().unwrap();
    db_guard.get_downloads_by_status(status)
}

/// Delete a download from the database
pub async fn delete_download(download_id: u64) -> Result<()> {
    let db = get_db_instance().await;
    let db_guard = db.lock().unwrap();
    db_guard.delete_download(download_id)
}

/// Update the status of a download in the database
pub async fn update_status(download_id: u64, status: &str) -> Result<()> {
    let db = get_db_instance().await;
    let db_guard = db.lock().unwrap();
    db_guard.update_status(download_id, status)
} 