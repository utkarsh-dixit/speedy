// Re-export all types from download.ts for backward compatibility
export * from './download';

// Include any other bindings-specific types
// For the download progress event from Tauri
export interface DownloadProgressEvent {
  downloadId: string;
  progress: number;
  completed: string;
  fileSize: string;
  speed: number;
  estimatedTimeLeft: number;
  segments: Array<{
    id: string;
    totalBytes: string;
    downloaded: string;
    progress: number;
    speed: number;
  }>;
}

// Interface for file existence check result
export interface ExistingFileCheckResult {
  exists: boolean;
  type?: 'in_progress' | 'completed';
  original_filename: string;
  suggested_filename: string;
  part_files?: number;
  location?: string;
  file_path?: string;
}

// Helper to convert API Download to UI Downloads
export { convertApiDownloadToUiDownload as convertToUIDownload } from './download'; 