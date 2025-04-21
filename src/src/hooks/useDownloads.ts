import { useState, useCallback, useMemo, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { 
  listDownloads, 
  getDownloadsByStatus, 
  startDownload as startDownloadCmd,
  checkExistingDownload as checkExistingDownloadCmd,
  pauseDownload as pauseDownloadCmd,
  resumeDownload as resumeDownloadCmd,
  deleteDownload as deleteDownloadCmd,
  type Download as ApiDownload
} from '../bindings';

// Define UI-specific types
type SortOption = 'name' | 'size' | 'date' | 'status';
type SortDirection = 'asc' | 'desc';
type DownloadSort = { option: SortOption; direction: SortDirection };
type CategoryFilter = 'all' | 'active' | 'completed' | 'paused' | 'error';

// Define UI download status enum
enum DownloadStatus {
  DOWNLOADING = 'downloading',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// Define UI download type - based on the API Download type but with UI-specific fields
interface UIDownload {
  id: string;
  url: string;
  filename: string;
  total_size: string;
  downloaded_bytes: string;
  status: string;
  progress: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  save_path: string | null;
  selected?: boolean;
}

type Download = UIDownload;

// Interface for download progress events from Tauri
interface DownloadProgressEvent {
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

// Properly type the return value from checkExistingDownload
interface ExistingFileCheckResult {
  exists: boolean;
  type?: 'in_progress' | 'completed';
  original_filename: string;
  suggested_filename: string;
  part_files?: number;
  location?: string;
  file_path?: string;
}

// Helper function to convert API download to UI download
function convertToUIDownload(apiDownload: ApiDownload): UIDownload {
  // Convert the download_id to a string for UI consistency
  const id = String(apiDownload.download_id);
  
  // Calculate progress percentage
  const total = Number(apiDownload.total_size);
  const downloaded = Number(apiDownload.downloaded_bytes);
  const progress = total > 0 ? (downloaded / total) * 100 : 0;
  
  return {
    id,
    url: apiDownload.url,
    filename: apiDownload.filename,
    total_size: String(apiDownload.total_size),
    downloaded_bytes: String(apiDownload.downloaded_bytes),
    status: apiDownload.status,
    progress,
    error_message: apiDownload.error_message,
    created_at: apiDownload.created_at,
    updated_at: apiDownload.updated_at,
    completed_at: apiDownload.completed_at,
    save_path: apiDownload.save_path,
    selected: false
  };
}

export const useDownloads = () => {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedDownloadIds, setSelectedDownloadIds] = useState<string[]>([]);
  const [sort, setSort] = useState<DownloadSort>({ option: 'date', direction: 'desc' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for file existence dialog
  const [fileCheckResult, setFileCheckResult] = useState<ExistingFileCheckResult | null>(null);
  const [pendingDownload, setPendingDownload] = useState<{ url: string, parts: number } | null>(null);
  
  // Fetch all downloads from database
  const fetchDownloads = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await listDownloads();
      
      // Transform API downloads to UI downloads
      const transformedDownloads = result.map(apiDownload => {
        const uiDownload = convertToUIDownload(apiDownload);
        return {
          ...uiDownload,
          selected: selectedDownloadIds.includes(uiDownload.id)
        };
      });
      
      setDownloads(transformedDownloads);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch downloads:', err);
      setError(`Failed to load downloads: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDownloadIds]);
  
  // Fetch filtered downloads
  const fetchFilteredDownloads = useCallback(async () => {
    try {
      setIsLoading(true);
      let apiDownloads: ApiDownload[];
      
      if (categoryFilter === 'all') {
        apiDownloads = await listDownloads();
      } else {
        // Map our UI categories to backend statuses
        const status = categoryFilter === 'active' ? 'downloading' : 
                        categoryFilter === 'completed' ? 'completed' : 
                        categoryFilter === 'paused' ? 'paused' : 
                        categoryFilter === 'error' ? 'error' : 'downloading';
        
        apiDownloads = await getDownloadsByStatus(status);
      }
      
      // Convert API downloads to UI downloads
      const uiDownloads = apiDownloads.map(apiDownload => {
        const uiDownload = convertToUIDownload(apiDownload);
        return {
          ...uiDownload,
          selected: selectedDownloadIds.includes(uiDownload.id)
        };
      });
      
      setDownloads(uiDownloads);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch filtered downloads:', err);
      setError(`Failed to load downloads: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, selectedDownloadIds]);
  
  // Initial fetch on mount
  useEffect(() => {
    fetchDownloads();
    
    // Listen for download progress updates
    const unlistenProgress = listen<DownloadProgressEvent>('download-progress', (event) => {
      const progress = event.payload;
      
      setDownloads(current => current.map(download => {
        if (download.id === progress.downloadId) {
          return {
            ...download,
            downloaded_bytes: progress.completed,
            // Convert fractional progress (0-100) to status if we're at 100%
            status: progress.progress >= 100 ? DownloadStatus.COMPLETED : download.status
          };
        }
        return download;
      }));
    });
    
    return () => {
      unlistenProgress.then(unlisten => unlisten());
    };
  }, [fetchDownloads]);
  
  // Refetch downloads when filter changes
  // Refetch downloads every 50ms
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (categoryFilter === 'all') {
        fetchDownloads();
      } else {
        fetchFilteredDownloads();
      }
    }, 50);
    
    return () => clearInterval(intervalId);
  }, [fetchDownloads, fetchFilteredDownloads, categoryFilter]);
  
  // Filter downloads based on search query
  const filteredDownloads = useMemo(() => {
    return downloads.filter(download => {
      if (!searchQuery) return true;
      return download.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
             download.url.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [downloads, searchQuery]);
  
  // Sort downloads
  const sortedDownloads = useMemo(() => {
    return [...filteredDownloads].sort((a, b) => {
      const direction = sort.direction === 'asc' ? 1 : -1;
      
      switch (sort.option) {
        case 'name':
          return a.filename.localeCompare(b.filename) * direction;
        case 'size':
          return (Number.parseInt(a.total_size, 10) - Number.parseInt(b.total_size, 10)) * direction;
        case 'date':
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
        case 'status': {
          // Define status order: downloading, paused, completed, error
          const statusOrder = {
            [DownloadStatus.DOWNLOADING]: 0,
            [DownloadStatus.PAUSED]: 1,
            [DownloadStatus.COMPLETED]: 2,
            [DownloadStatus.ERROR]: 3,
          };
          return (statusOrder[a.status as DownloadStatus] - statusOrder[b.status as DownloadStatus]) * direction;
        }
        default:
          return 0;
      }
    });
  }, [filteredDownloads, sort]);
  
  // Check if a file already exists before starting download
  const checkExistingDownload = useCallback(async (url: string): Promise<ExistingFileCheckResult> => {
    try {
      // Use type assertion to convert the 'any' response to our typed interface
      const result = await checkExistingDownloadCmd(url) as ExistingFileCheckResult;
      console.log('File existence check result:', result);
      return result;
    } catch (err) {
      console.error('Failed to check existing download:', err);
      throw new Error(`Failed to check for existing download: ${err}`);
    }
  }, []);
  
  // Actually start the download
  const startDownload = useCallback(async (url: string, filename: string, parts = 4) => {
    try {
      console.log('Starting download for URL:', url, 'with filename:', filename);
      
      // Start the download with the Tauri command
      await startDownloadCmd(url, filename, parts.toString(), null);
      
      // Refresh download list after adding new download
      await fetchDownloads();
      
      // Clear any pending download state
      setFileCheckResult(null);
      setPendingDownload(null);
      
      return true;
    } catch (err) {
      console.error('Failed to start download:', err);
      setError(`Failed to start download: ${err}`);
      return false;
    }
  }, [fetchDownloads]);
  
  // Prepare download by checking if file exists first
  const prepareDownload = useCallback(async (url: string, parts = 4) => {
    if (!url.trim()) return false;
    
    try {
      // Check if the file already exists
      const result = await checkExistingDownload(url);
      console.log('result', result);
      if (result.exists) {
        // Store the file check result and pending download info for the dialog
        setFileCheckResult(result);
        setPendingDownload({ url, parts });
        return false; // Don't start download yet, wait for user decision
      }
      
      // No existing file, proceed with normal download
      return startDownload(url, result.suggested_filename || result.original_filename, parts);
    } catch (err) {
      console.error('Failed to prepare download:', err);
      setError(`Failed to prepare download: ${err}`);
      return false;
    }
  }, [checkExistingDownload, startDownload]);
  
  // Handle user decision from the dialog
  const handleExistingFileDecision = useCallback((decision: 'resume' | 'new' | 'cancel') => {
    if (!pendingDownload || !fileCheckResult) {
      return;
    }
    
    const { url, parts } = pendingDownload;
    
    if (decision === 'resume' && fileCheckResult.type === 'in_progress') {
      // TODO: Implement resume functionality with the in_progress download
      console.log('Resuming existing download...');
      // For now, just clear the dialog state
      setFileCheckResult(null);
      setPendingDownload(null);
    } else if (decision === 'new') {
      // Start new download with the suggested filename
      startDownload(url, fileCheckResult.suggested_filename, parts);
    } else {
      // User canceled, just clear the dialog state
      setFileCheckResult(null);
      setPendingDownload(null);
    }
  }, [pendingDownload, fileCheckResult, startDownload]);
  
  // Pause/resume download
  const togglePause = useCallback(async (downloadId: string) => {
    const download = downloads.find(d => d.id === downloadId);
    if (!download) return;
    
    try {
      if (download.status === DownloadStatus.DOWNLOADING) {
        await pauseDownloadCmd(downloadId);
      } else if (download.status === DownloadStatus.PAUSED) {
        await resumeDownloadCmd(downloadId);
      }
      
      // Refresh the downloads list after changing state
      await fetchDownloads();
    } catch (err) {
      console.error('Failed to toggle pause state:', err);
      setError(`Failed to update download: ${err}`);
    }
  }, [downloads, fetchDownloads]);
  
  // Cancel download
  const cancelDownload = useCallback(async (downloadId: string) => {
    try {
      await deleteDownloadCmd((downloadId), false);
      
      // Update local state after successful deletion
      setDownloads(prev => prev.filter(d => d.id !== downloadId));
      setSelectedDownloadIds(prev => prev.filter(id => id !== downloadId));
      
      // Refresh downloads list
      await fetchDownloads();
    } catch (err) {
      console.error('Failed to cancel download:', err);
      setError(`Failed to cancel download: ${err}`);
    }
  }, [fetchDownloads]);
  
  // Select/deselect download
  const toggleSelect = useCallback((downloadId: string) => {
    setDownloads(prev =>
      prev.map(download => {
        if (download.id === downloadId) {
          return { ...download, selected: !download.selected };
        }
        return download;
      })
    );
    
    setSelectedDownloadIds(prev => {
      if (prev.includes(downloadId)) {
        return prev.filter(id => id !== downloadId);
      }
      return [...prev, downloadId];
    });
  }, []);
  
  // Select all downloads
  const selectAll = useCallback(() => {
    const allIds = filteredDownloads.map(d => d.id);
    
    // If all are selected, deselect all
    if (allIds.length === selectedDownloadIds.length) {
      setSelectedDownloadIds([]);
      setDownloads(prev =>
        prev.map(download => ({ ...download, selected: false }))
      );
    } else {
      // Otherwise select all
      setSelectedDownloadIds(allIds);
      setDownloads(prev =>
        prev.map(download => {
          if (allIds.includes(download.id)) {
            return { ...download, selected: true };
          }
          return download;
        })
      );
    }
  }, [filteredDownloads, selectedDownloadIds]);
  
  return {
    downloads: sortedDownloads,
    isLoading,
    error,
    addDownload: prepareDownload,  // Replace direct addDownload with prepareDownload
    startDownload,                 // Expose direct startDownload for advanced use
    togglePause,
    cancelDownload,
    toggleSelect,
    selectAll,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    sort,
    setSort,
    selectedDownloadIds,
    // Add new exports for file existence dialog
    fileCheckResult,
    handleExistingFileDecision
  };
};