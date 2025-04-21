export type DownloadStatus = 'downloading' | 'paused' | 'completed' | 'error' | 'queued';

export type FileType = 'audio' | 'video' | 'document' | 'archive' | 'image' | 'program' | 'app' | 'other';

export interface Download {
  id: string;
  fileName: string;
  url: string;
  status: DownloadStatus;
  progress: number;
  speed: number; // in bytes per second
  size: number; // in bytes
  downloaded: number; // in bytes
  timeRemaining: number; // in seconds
  dateAdded: Date;
  lastModified: Date;
  filePath: string;
  fileType: FileType;
  selected?: boolean;
}

export type SortOption = 'name' | 'size' | 'date' | 'status';
export type SortDirection = 'asc' | 'desc';

export type CategoryFilter = 'all' | 'active' | 'completed' | 'paused' | 'error';

export interface DownloadSort {
  option: SortOption;
  direction: SortDirection;
}

export interface DiskSpace {
  total: number;
  used: number;
  free: number;
  percentage: number;
}

export interface NetworkStatus {
  downloadSpeed: number;
  uploadSpeed: number;
  connected: boolean;
}

export interface SystemStats {
  activeDownloads: number;
  completedDownloads: number;
  pausedDownloads: number;
  totalDownloads: number;
  diskSpace: DiskSpace;
  networkStatus: NetworkStatus;
}