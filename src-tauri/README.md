# Speedy Download Manager

A multi-threaded download accelerator built with Tauri, Rust, and web technologies.

## Features

- **Multi-threaded downloads**: Speeds up downloads by splitting files into multiple segments
- **Resume support**: Continue interrupted downloads from where they left off
- **Real-time progress**: Track download progress and speed for each segment
- **Modern UI**: Clean, responsive interface built with web technologies

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
- `main.rs`: Tauri application setup and communication between UI and backend

## License

MIT 