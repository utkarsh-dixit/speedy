import type { Download as ApiDownload } from '../bindings/commands';

// Enum for download status
export enum DownloadStatus {
  DOWNLOADING = 'downloading',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// Enum for file types
export enum FileType {
  VIDEO = 'video',
  AUDIO = 'audio',
  IMAGE = 'image',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  EXECUTABLE = 'executable',
  OTHER = 'other'
}

// Download types

// Sort options
export type SortOption = 'name' | 'size' | 'date' | 'status';

// Download sort configuration
export interface DownloadSort {
  option: SortOption;
  direction: 'asc' | 'desc';
}

// Category filter options
export type CategoryFilter = 'all' | 'active' | 'completed' | 'paused' | 'error';

// Download interface for the frontend
export interface Download {
  id: string;
  url: string;
  filename: string;
  status: string;
  total_size: string;
  downloaded: string;
  parts: number;
  save_path?: string;
  error?: string;
  created_at: string;
  updated_at: string;
  
  // Additional UI-specific fields
  fileName: string;
  progress: number;
  speed: number;
  downloaded_bytes: string;
  timeRemaining: number;
  lastModified: string;
  fileType: string;
  selected: boolean;
}

// Export UI Download as UIDownload for backward compatibility
export type UIDownload = Download;

// Frontend Download type that extends the API Download type
export interface Download extends ApiDownload {
  // Make sure all required fields from frontend components are non-optional
  fileName: string;      // Display name
  progress: number;      // Download progress (0-100)
  speed: number;         // Download speed in bytes/sec
  downloaded_bytes: string; // Downloaded bytes as string
  timeRemaining: number; // Time remaining in seconds
  lastModified: string;  // Last modified timestamp
  fileType: FileType;    // File type derived from extension
  selected: boolean;     // UI selection state
}

// Helper to convert API Download to frontend Download
export function convertApiDownloadToUiDownload(apiDownload: ApiDownload): Download {
  // Calculate derived values
  const total = Number.parseInt(apiDownload.total_size) || 0;
  const downloaded = Number.parseInt(apiDownload.downloaded) || 0;
  const progress = total > 0 ? (downloaded / total) * 100 : 0;
  
  // Determine file type
  let fileType = FileType.OTHER;
  const ext = apiDownload.filename.split('.').pop()?.toLowerCase() || '';
  
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
    fileType = FileType.VIDEO;
  } else if (['mp3', 'wav', 'flac', 'ogg', 'aac'].includes(ext)) {
    fileType = FileType.AUDIO;
  } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    fileType = FileType.IMAGE;
  } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) {
    fileType = FileType.DOCUMENT;
  } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    fileType = FileType.ARCHIVE;
  } else if (['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm'].includes(ext)) {
    fileType = FileType.EXECUTABLE;
  }
  
  return {
    ...apiDownload,
    fileName: apiDownload.filename,
    progress: progress,
    speed: 0, // Default value - will be set by progress updates
    downloaded_bytes: apiDownload.downloaded,
    timeRemaining: 0, // Default value - will be set by progress updates
    lastModified: apiDownload.updated_at,
    fileType,
    selected: false
  };
}

// Helper to convert an array of API downloads to UI downloads
export function convertApiDownloadsToUiDownloads(apiDownloads: ApiDownload[]): Download[] {
  return apiDownloads.map(convertApiDownloadToUiDownload);
} 