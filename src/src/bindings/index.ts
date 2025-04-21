import { invoke } from '@tauri-apps/api/tauri';
import { 
  startDownload,
  listDownloads,
  getDownload,
  deleteDownload,
  pauseDownload,
  resumeDownload,
  getDownloadsByStatus,
  checkExistingDownload,
  openDetailsWindow
} from './commands';

export {
  startDownload,
  listDownloads,
  getDownload,
  deleteDownload,
  pauseDownload,
  resumeDownload,
  getDownloadsByStatus,
  checkExistingDownload,
  openDetailsWindow
};

// Type export for frontend usage
export type { 
  Download,
  DownloadProgress,
  SegmentProgress,
  DownloadProgressEvent
} from './commands';

// Helper function to invoke commands with better error handling
export async function invokeCommand<T>(
  command: string, 
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.error(`Error invoking ${command}:`, error);
    throw error;
  }
} 