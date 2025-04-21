import { useState, useCallback, useMemo, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import type { 
  SortOption,  
  DownloadSort, 
  CategoryFilter 
} from '../types/download';

// Update to match our Rust backend schema
export interface Download {
  id?: number;
  download_id: number;
  url: string;
  filename: string;
  total_size: number;
  downloaded_bytes: number;
  status: string; // "in_progress", "paused", "completed", "error"
  error_message?: string;
  parts: number;
  created_at: Date;   // Changed from string to Date
  updated_at: Date;   // Changed from string to Date
  completed_at?: Date; // Changed from string to Date
  save_path?: string;
  selected?: boolean; // UI-only property
}

// Type for download progress events from Tauri
interface DownloadProgressEvent {
  downloadId: number;
  progress: number;
  completed: number;
  fileSize: number;
  speed: number;
  estimatedTimeLeft: number;
  segments: Array<{
    id: number;
    totalBytes: number;
    downloaded: number;
    progress: number;
    speed: number;
  }>;
}

// Type for raw download data from Rust backend
interface RawDownload {
  id?: number;
  download_id: number;
  url: string;
  filename: string;
  total_size: number;
  downloaded_bytes: number;
  status: string;
  error_message: string | null;
  parts: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  save_path: string | null;
}

// Interface for file existence check result
interface ExistingFileCheckResult {
  exists: boolean;
  type?: 'in_progress' | 'completed';
  original_filename: string;
  suggested_filename: string;
  part_files?: number;
  location?: string;
  file_path?: string;
}

// Helper function to convert date strings to Date objects
const convertDates = (download: RawDownload): Download => {
  return {
    ...download,
    created_at: download.created_at ? new Date(download.created_at) : new Date(),
    updated_at: download.updated_at ? new Date(download.updated_at) : new Date(),
    completed_at: download.completed_at ? new Date(download.completed_at) : undefined
  };
};

export const useDownloads = () => {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedDownloadIds, setSelectedDownloadIds] = useState<number[]>([]);
  const [sort, setSort] = useState<DownloadSort>({ option: 'date', direction: 'desc' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New state for file existence dialog
  const [fileCheckResult, setFileCheckResult] = useState<ExistingFileCheckResult | null>(null);
  const [pendingDownload, setPendingDownload] = useState<{ url: string, parts: number } | null>(null);
  
  // Fetch all downloads from database
  const fetchDownloads = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await invoke<RawDownload[]>('list_downloads');
      // Transform RawDownload to Download objects
      const transformedDownloads = result.map(rawDownload => ({
        ...convertDates(rawDownload),
        selected: selectedDownloadIds.includes(rawDownload.download_id),
        download_id: rawDownload.download_id,
        url: rawDownload.url,
        filename: rawDownload.filename,
        total_size: rawDownload.total_size,
        downloaded_bytes: rawDownload.downloaded_bytes,
        status: rawDownload.status,
        error_message: rawDownload.error_message,
        parts: rawDownload.parts,
        save_path: rawDownload.save_path,
        size: rawDownload.total_size,
        speed: rawDownload.downloaded_bytes,
        timeRemaining: rawDownload.downloaded_bytes,
        lastModified: rawDownload.created_at,
        fileType: rawDownload.filename.split('.').pop()
      }));
      setDownloads(transformedDownloads);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch downloads:', err);
      setError('Failed to load downloads');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDownloadIds]);
  
  // Fetch filtered downloads
  const fetchFilteredDownloads = useCallback(async () => {
    try {
      setIsLoading(true);
      let downloads: RawDownload[];
      
      if (categoryFilter === 'all') {
        downloads = await invoke<RawDownload[]>('list_downloads');
      } else {
        // Map our UI categories to backend statuses
        const status = categoryFilter === 'active' ? 'in_progress' : 
                        categoryFilter === 'completed' ? 'completed' : 
                        categoryFilter === 'paused' ? 'paused' : 
                        categoryFilter === 'error' ? 'error' : 'in_progress';
        
        downloads = await invoke<RawDownload[]>('get_downloads_by_status', { status });
      }
      
      // Convert date strings to Date objects and preserve selection state
      const downloadsWithDates = downloads.map(download => ({
        ...convertDates(download),
        selected: selectedDownloadIds.includes(download.download_id)
      }));
      
      setDownloads(downloadsWithDates);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch filtered downloads:', err);
      setError('Failed to load downloads');
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
        if (download.download_id === progress.downloadId) {
          return {
            ...download,
            downloaded_bytes: progress.completed || download.downloaded_bytes,
            // Convert fractional progress (0-100) to status if we're at 100%
            status: progress.progress >= 100 ? 'completed' : download.status
          };
        }
        return download;
      }));
    });
    
    return () => {
      unlistenProgress.then(unlisten => unlisten());
    };
  }, [fetchDownloads]);
  
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
  
  // Refetch downloads when filter changes
  useEffect(() => {
    fetchFilteredDownloads();
  }, [fetchFilteredDownloads]);
  
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
          return (a.total_size - b.total_size) * direction;
        case 'date':
          // No need to convert to Date as we've already done that
          return (a.created_at.getTime() - b.created_at.getTime()) * direction;
        case 'status': {
          // Define status order: in_progress, paused, completed, error
          const statusOrder = {
            'in_progress': 0,
            'paused': 1,
            'completed': 2,
            'error': 3,
          };
          return (statusOrder[a.status] - statusOrder[b.status]) * direction;
        }
        default:
          return 0;
      }
    });
  }, [filteredDownloads, sort]);
  
  // Check if a file already exists before starting download
  const checkExistingDownload = useCallback(async (url: string): Promise<ExistingFileCheckResult> => {
    try {
      const result = await invoke<ExistingFileCheckResult>('check_existing_download', { url });
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
      
      // If a custom filename was provided, we'll need to handle that in the backend
      // For now, just pass the URL and parts
      await invoke('start_download', {
        url,
        parts,
        name: filename,
        // TODO: Add filename parameter to the backend API if needed
      });
      
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
  
  // Generate a unique download ID
  const generateDownloadId = useCallback(() => Date.now(), []);
  
  // Pause/resume download - Note: This would need to be implemented in the Rust backend
  const togglePause = useCallback(async (downloadId: number) => {
    const download = downloads.find(d => d.download_id === downloadId);
    if (!download) return;
    
    try {
      // This would need a corresponding Tauri command in your Rust backend
      // await invoke('toggle_pause_download', { download_id: downloadId });
      
      // For now, just update the UI state - you would replace this with actual backend call
      setDownloads(prev =>
        prev.map(d => {
          if (d.download_id === downloadId) {
            const newStatus = d.status === 'in_progress' ? 'paused' : 'in_progress';
            return { ...d, status: newStatus };
          }
          return d;
        })
      );
    } catch (err) {
      console.error('Failed to toggle pause state:', err);
      setError('Failed to update download');
    }
  }, [downloads]);
  
  // Cancel download
  const cancelDownload = useCallback(async (downloadId: number) => {
    try {
      await invoke('delete_download', { download_id: downloadId });
      
      // Update local state after successful deletion
      setDownloads(prev => prev.filter(d => d.download_id !== downloadId));
      setSelectedDownloadIds(prev => prev.filter(id => id !== downloadId));
    } catch (err) {
      console.error('Failed to cancel download:', err);
      setError('Failed to cancel download');
    }
  }, []);
  
  // Select/deselect download
  const toggleSelect = useCallback((downloadId: number) => {
    setDownloads(prev =>
      prev.map(download => {
        if (download.download_id === downloadId) {
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
    const allIds = filteredDownloads.map(d => d.download_id);
    
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
          if (allIds.includes(download.download_id)) {
            return { ...download, selected: true };
          }
          return download;
        })
      );
    }
  }, [filteredDownloads, selectedDownloadIds]);
  

  console.log('sortedDownloads', sortedDownloads);
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