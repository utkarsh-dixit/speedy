import { Download, FileType, SystemStats } from '../types/download';
import { getFileTypeFromName } from '../utils';

// Generate a random download
const createDownload = (
  id: string,
  fileName: string,
  size: number,
  status: Download['status'],
  progress: number,
  dateString: string
): Download => {
  const fileType = getFileTypeFromName(fileName);
  const date = new Date(dateString);
  
  return {
    id,
    fileName,
    url: `https://example.com/downloads/${fileName}`,
    status,
    progress,
    speed: status === 'downloading' ? Math.random() * 1024 * 1024 * 5 : 0, // Random speed up to 5 MB/s
    size,
    downloaded: Math.floor(size * (progress / 100)),
    timeRemaining: status === 'downloading' ? Math.random() * 600 : 0, // Random time up to 10 minutes
    dateAdded: date,
    lastModified: date,
    filePath: `C:/Downloads/${fileName}`,
    fileType,
    selected: false,
  };
};

export const initialDownloads: Download[] = [
  createDownload('1', 'UIUXMonster.jpg', 745 * 1024, 'completed', 100, '2023/08/09'),
  createDownload('2', '2pacCover.mp3', 3 * 1024 * 1024, 'downloading', 80, '2023/08/09'),
  createDownload('3', 'UIUXMonster.zip', 12 * 1024 * 1024, 'completed', 100, '2023/08/09'),
  createDownload('4', 'Document.pdf', 2 * 1024 * 1024, 'downloading', 50, '2023/08/09'),
  createDownload('5', 'BetterCall.mp4', 2.5 * 1024 * 1024 * 1024, 'error', 0, '2023/08/09'),
  createDownload('6', 'Call Of Duty.apk', 12 * 1024 * 1024, 'paused', 0, '2023/08/09'),
  createDownload('7', '2pacCover.zip', 12 * 1024 * 1024, 'downloading', 10, '2023/08/09'),
  createDownload('8', 'Mima.exe', 32 * 1024 * 1024, 'completed', 100, '2023/08/09'),
];

export const initialSystemStats: SystemStats = {
  activeDownloads: 3,
  completedDownloads: 3,
  pausedDownloads: 1,
  totalDownloads: 8,
  diskSpace: {
    total: 1000 * 1024 * 1024 * 1024, // 1TB
    used: 900 * 1024 * 1024 * 1024, // 900GB
    free: 100 * 1024 * 1024 * 1024, // 100GB
    percentage: 90,
  },
  networkStatus: {
    downloadSpeed: 10.55 * 1024 * 1024, // 10.55 MB/s
    uploadSpeed: 6.3 * 1024 * 1024, // 6.3 MB/s
    connected: true,
  }
};