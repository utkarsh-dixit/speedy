// Type augmentation for bigint serialization
// This file ensures that u64 types from Rust are represented as strings in TypeScript

import { Download } from '../bindings/commands';

// Frontend version of the Download type
export interface UIDownload extends Omit<Download, 'id' | 'total_size' | 'downloaded'> {
  id: string;
  total_size: string;
  downloaded: string;
  
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

export enum DownloadStatus {
  DOWNLOADING = 'downloading',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export enum FileType {
  VIDEO = 'video',
  AUDIO = 'audio',
  IMAGE = 'image',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  EXECUTABLE = 'executable',
  OTHER = 'other'
}

// Helper functions for converting between API and UI types
export function convertToUIDownload(download: Download): UIDownload {
  // Calculate derived values
  const total = parseInt(download.total_size as unknown as string) || 0;
  const downloaded = parseInt(download.downloaded as unknown as string) || 0;
  const progress = total > 0 ? (downloaded / total) * 100 : 0;
  
  // Determine file type
  let fileType = FileType.OTHER;
  const ext = download.filename.split('.').pop()?.toLowerCase() || '';
  
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
    ...download,
    id: download.id as unknown as string,
    total_size: download.total_size as unknown as string,
    downloaded: download.downloaded as unknown as string,
    fileName: download.filename,
    progress,
    speed: 0,
    downloaded_bytes: download.downloaded as unknown as string,
    timeRemaining: 0,
    lastModified: download.updated_at,
    fileType,
    selected: false
  };
}

// Helper to convert string ID to the correct format for API calls
export function formatId(id: string | number): string {
  return typeof id === 'number' ? id.toString() : id;
}
