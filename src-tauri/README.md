# Speedy Download Manager

A multi-threaded download accelerator built with Tauri, Rust, and web technologies.

## Features

- **Multi-threaded downloads**: Speeds up downloads by splitting files into multiple segments
- **Resume support**: Continue interrupted downloads from where they left off
- **Real-time progress**: Track download progress and speed for each segment
- **Modern UI**: Clean, responsive interface built with web technologies
- **Local database**: SQLite database for tracking download history and status

## Development

### Prerequisites

- [Rust](https://www.rust-lang.org/) (1.57 or later)
- [Node.js](https://nodejs.org/) (16 or later)
- [pnpm](https://pnpm.io/) (7 or later)

### Setup

1. Clone the repository
   ```
   git clone https://github.com/utkarsh-dixit/speedy.git
   cd speedy
   ```

2. Install dependencies
   ```
   pnpm install
   ```

3. Run in development mode
   ```
   pnpm tauri dev
   ```

### Building for Production

```
pnpm tauri build
```

This will create optimized binaries for your platform in the `src-tauri/target/release` directory.

## Architecture

The application is built with a Rust backend (using Tauri) and a web-based frontend:

- **Backend**: Rust code handling the actual downloading logic with multiple threads
- **Frontend**: Web UI that displays download progress and controls

### Key Components

- `client.rs`: Core download logic with support for splitting downloads into segments
- `db.rs`: SQLite database implementation for download persistence
- `db_manager.rs`: Async wrapper for database operations
- `main.rs`: Tauri application setup and communication between UI and backend

## Database Integration

The application uses a local SQLite database to track and manage downloads:

- Database is stored in the user's data directory at `<user_data_dir>/speedy/downloads.db`
- Schema includes tables for download tracking with fields such as URL, filename, status, etc.
- Provides persistence across application restarts
- Enables download history management

## API Commands

### Start a download
```javascript
// Start a download with the specified number of parts
invoke('start_download', { 
  url: 'https://example.com/file.zip', 
  parts: 8,
  download_id: generateUniqueId()
})
```

### List all downloads
```javascript
// Get all downloads from the database
invoke('list_downloads').then(downloads => {
  console.log(downloads);
})
```

### Get download by ID
```javascript
// Get a specific download by its ID
invoke('get_download', { download_id: 123 }).then(download => {
  console.log(download);
})
```

### Delete a download
```javascript
// Delete a download from the database
invoke('delete_download', { download_id: 123 }).then(() => {
  console.log('Download deleted');
})
```

### Get downloads by status
```javascript
// Get downloads filtered by status
// Status can be "in_progress", "paused", "completed", or "error"
invoke('get_downloads_by_status', { status: 'completed' }).then(downloads => {
  console.log(downloads);
})
```

## License

MIT 