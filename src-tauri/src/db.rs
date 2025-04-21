use rusqlite::{params, Connection, Result};
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

// Define our Download struct that will represent a row in the database
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Download {
    pub id: Option<i64>,            // SQLite primary key, None for new downloads
    pub download_id: u64,           // Application-level ID for the download
    pub url: String,                // URL being downloaded
    pub filename: String,           // Filename for the download
    pub total_size: u64,            // Total file size in bytes
    pub downloaded_bytes: u64,      // Currently downloaded bytes
    pub status: String,             // Status: "in_progress", "paused", "completed", "error"
    pub error_message: Option<String>, // Error message if status is "error"
    pub parts: u64,                 // Number of parallel download parts
    pub created_at: DateTime<Utc>,  // When the download was started
    pub updated_at: DateTime<Utc>,  // Last update time
    pub completed_at: Option<DateTime<Utc>>, // When the download completed
    pub save_path: Option<String>,  // Where the file is saved after completion
}

impl Download {
    // Create a new download entry
    pub fn new(download_id: u64, url: String, filename: String, total_size: u64, parts: u64) -> Self {
        let now = Utc::now();
        Self {
            id: None,
            download_id,
            url,
            filename,
            total_size,
            downloaded_bytes: 0,
            status: "in_progress".to_string(),
            error_message: None,
            parts,
            created_at: now,
            updated_at: now,
            completed_at: None,
            save_path: None,
        }
    }
}

// Define our database handler
pub struct DownloadDb {
    conn: Connection,
}

impl DownloadDb {
    // Initialize the database
    pub fn new(db_path: Option<PathBuf>) -> Result<Self> {
        // Use user data directory or provided path
        let db_path = match db_path {
            Some(path) => path,
            None => {
                let mut path = dirs::data_dir()
                    .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
                path.push("speedy");
                std::fs::create_dir_all(&path).unwrap_or_else(|_| ());
                path.push("downloads.db");
                path
            }
        };

        println!("Using database at: {}", db_path.display());
        
        let conn = Connection::open(db_path)?;
        
        // Create the downloads table if it doesn't exist
        conn.execute(
            "CREATE TABLE IF NOT EXISTS downloads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                download_id INTEGER NOT NULL,
                url TEXT NOT NULL,
                filename TEXT NOT NULL,
                total_size INTEGER NOT NULL,
                downloaded_bytes INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL,
                error_message TEXT,
                parts INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed_at TEXT,
                save_path TEXT
            )",
            [],
        )?;
        
        // Create indices for faster lookup
        conn.execute("CREATE INDEX IF NOT EXISTS idx_download_id ON downloads(download_id)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_status ON downloads(status)", [])?;

        Ok(Self { conn })
    }
    
    // Insert a new download record
    pub fn insert_download(&self, download: &Download) -> Result<i64> {
        self.conn.execute(
            "INSERT INTO downloads (
                download_id, url, filename, total_size, downloaded_bytes, 
                status, error_message, parts, created_at, updated_at, 
                completed_at, save_path
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                download.download_id,
                download.url,
                download.filename,
                download.total_size,
                download.downloaded_bytes,
                download.status,
                download.error_message,
                download.parts,
                download.created_at.to_rfc3339(),
                download.updated_at.to_rfc3339(),
                download.completed_at.map(|dt| dt.to_rfc3339()),
                download.save_path,
            ],
        )?;
        
        Ok(self.conn.last_insert_rowid())
    }
    
    // Update an existing download
    pub fn update_download(&self, download: &Download) -> Result<()> {
        if download.id.is_none() {
            return Err(rusqlite::Error::InvalidParameterName("Download id is None".to_string()));
        }
        
        self.conn.execute(
            "UPDATE downloads SET
                download_id = ?1,
                url = ?2,
                filename = ?3,
                total_size = ?4,
                downloaded_bytes = ?5,
                status = ?6,
                error_message = ?7,
                parts = ?8,
                updated_at = ?9,
                completed_at = ?10,
                save_path = ?11
            WHERE id = ?12",
            params![
                download.download_id,
                download.url,
                download.filename,
                download.total_size,
                download.downloaded_bytes,
                download.status,
                download.error_message,
                download.parts,
                Utc::now().to_rfc3339(),
                download.completed_at.map(|dt| dt.to_rfc3339()),
                download.save_path,
                download.id,
            ],
        )?;
        
        Ok(())
    }
    
    // Update download progress
    pub fn update_progress(&self, download_id: u64, bytes: u64) -> Result<()> {
        self.conn.execute(
            "UPDATE downloads SET
                downloaded_bytes = downloaded_bytes + ?1,
                updated_at = ?2
            WHERE download_id = ?3",
            params![
                bytes,
                Utc::now().to_rfc3339(),
                download_id,
            ],
        )?;
        
        Ok(())
    }
    
    // Mark a download as complete
    pub fn mark_complete(&self, download_id: u64, save_path: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE downloads SET
                status = 'completed',
                completed_at = ?1,
                updated_at = ?1,
                save_path = ?2
            WHERE download_id = ?3",
            params![
                Utc::now().to_rfc3339(),
                save_path,
                download_id,
            ],
        )?;
        
        Ok(())
    }
    
    // Mark a download as errored
    pub fn mark_error(&self, download_id: u64, error_message: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE downloads SET
                status = 'error',
                error_message = ?1,
                updated_at = ?2
            WHERE download_id = ?3",
            params![
                error_message,
                Utc::now().to_rfc3339(),
                download_id,
            ],
        )?;
        
        Ok(())
    }
    
    // Get a download by ID
    pub fn get_download(&self, download_id: u64) -> Result<Option<Download>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, download_id, url, filename, total_size, downloaded_bytes, 
                    status, error_message, parts, created_at, updated_at, 
                    completed_at, save_path
             FROM downloads
             WHERE download_id = ?1"
        )?;
        
        let download = stmt.query_row(params![download_id], |row| {
            Ok(Download {
                id: Some(row.get(0)?),
                download_id: row.get(1)?,
                url: row.get(2)?,
                filename: row.get(3)?,
                total_size: row.get(4)?,
                downloaded_bytes: row.get(5)?,
                status: row.get(6)?,
                error_message: row.get(7)?,
                parts: row.get(8)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(9)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                completed_at: row.get::<_, Option<String>>(11)?
                    .map(|dt_str| chrono::DateTime::parse_from_rfc3339(&dt_str)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now())),
                save_path: row.get(12)?,
            })
        });
        
        match download {
            Ok(download) => Ok(Some(download)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(err) => Err(err),
        }
    }
    
    // List all downloads
    pub fn list_downloads(&self) -> Result<Vec<Download>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, download_id, url, filename, total_size, downloaded_bytes, 
                    status, error_message, parts, created_at, updated_at, 
                    completed_at, save_path
             FROM downloads
             ORDER BY created_at DESC"
        )?;
        
        let download_iter = stmt.query_map([], |row| {
            Ok(Download {
                id: Some(row.get(0)?),
                download_id: row.get(1)?,
                url: row.get(2)?,
                filename: row.get(3)?,
                total_size: row.get(4)?,
                downloaded_bytes: row.get(5)?,
                status: row.get(6)?,
                error_message: row.get(7)?,
                parts: row.get(8)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(9)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                completed_at: row.get::<_, Option<String>>(11)?
                    .map(|dt_str| chrono::DateTime::parse_from_rfc3339(&dt_str)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now())),
                save_path: row.get(12)?,
            })
        })?;
        
        let mut downloads = Vec::new();
        for download in download_iter {
            downloads.push(download?);
        }
        
        Ok(downloads)
    }
    
    // Get downloads with a specific status
    pub fn get_downloads_by_status(&self, status: &str) -> Result<Vec<Download>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, download_id, url, filename, total_size, downloaded_bytes, 
                    status, error_message, parts, created_at, updated_at, 
                    completed_at, save_path
             FROM downloads
             WHERE status = ?1
             ORDER BY created_at DESC"
        )?;
        
        let download_iter = stmt.query_map(params![status], |row| {
            Ok(Download {
                id: Some(row.get(0)?),
                download_id: row.get(1)?,
                url: row.get(2)?,
                filename: row.get(3)?,
                total_size: row.get(4)?,
                downloaded_bytes: row.get(5)?,
                status: row.get(6)?,
                error_message: row.get(7)?,
                parts: row.get(8)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(9)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                completed_at: row.get::<_, Option<String>>(11)?
                    .map(|dt_str| chrono::DateTime::parse_from_rfc3339(&dt_str)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now())),
                save_path: row.get(12)?,
            })
        })?;
        
        let mut downloads = Vec::new();
        for download in download_iter {
            downloads.push(download?);
        }
        
        Ok(downloads)
    }
    
    // Delete a download
    pub fn delete_download(&self, download_id: u64) -> Result<()> {
        let affected_rows = self.conn.execute(
            "DELETE FROM downloads WHERE download_id = ?1",
            params![download_id],
        )?;
        
        if affected_rows != 1 {
            return Err(rusqlite::Error::QueryReturnedNoRows.into());
        }
        
        Ok(())
    }
    
    // Update download status
    pub fn update_status(&self, download_id: u64, status: &str) -> Result<()> {
        let affected_rows = self.conn.execute(
            "UPDATE downloads SET
                status = ?1,
                updated_at = ?2
            WHERE download_id = ?3",
            params![
                status,
                Utc::now().to_rfc3339(),
                download_id,
            ],
        )?;
        
        if affected_rows != 1 {
            return Err(rusqlite::Error::QueryReturnedNoRows.into());
        }
        
        Ok(())
    }
}

// Create a singleton database connection
pub fn get_db() -> Result<DownloadDb> {
    DownloadDb::new(None)
} 