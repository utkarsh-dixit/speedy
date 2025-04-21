import { useState, useCallback, useMemo } from 'react';
import { 
  Download, 
  SortOption, 
  SortDirection, 
  DownloadSort, 
  CategoryFilter 
} from '../types/download';
import { initialDownloads } from '../data/mockData';

export const useDownloads = () => {
  const [downloads, setDownloads] = useState<Download[]>(initialDownloads);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedDownloadIds, setSelectedDownloadIds] = useState<string[]>([]);
  const [sort, setSort] = useState<DownloadSort>({ option: 'date', direction: 'desc' });
  
  // Filter downloads based on search query and category
  const filteredDownloads = useMemo(() => {
    return downloads
      .filter(download => {
        // Apply category filter
        if (categoryFilter === 'all') return true;
        if (categoryFilter === 'active') return download.status === 'downloading';
        if (categoryFilter === 'completed') return download.status === 'completed';
        if (categoryFilter === 'paused') return download.status === 'paused';
        if (categoryFilter === 'error') return download.status === 'error';
        return true;
      })
      .filter(download => {
        // Apply search filter
        if (!searchQuery) return true;
        return download.fileName.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [downloads, searchQuery, categoryFilter]);
  
  // Sort downloads
  const sortedDownloads = useMemo(() => {
    return [...filteredDownloads].sort((a, b) => {
      const direction = sort.direction === 'asc' ? 1 : -1;
      
      switch (sort.option) {
        case 'name':
          return a.fileName.localeCompare(b.fileName) * direction;
        case 'size':
          return (a.size - b.size) * direction;
        case 'date':
          return (a.dateAdded.getTime() - b.dateAdded.getTime()) * direction;
        case 'status': {
          // Define status order: downloading, queued, paused, completed, error
          const statusOrder: Record<Download['status'], number> = {
            downloading: 0,
            queued: 1,
            paused: 2,
            completed: 3,
            error: 4,
          };
          return (statusOrder[a.status] - statusOrder[b.status]) * direction;
        }
        default:
          return 0;
      }
    });
  }, [filteredDownloads, sort]);
  
  // Add a new download
  const addDownload = useCallback((url: string) => {
    if (!url.trim()) return;
    
    // Extract filename from URL
    const fileName = url.split('/').pop() || 'unknown.file';
    
    const newDownload: Download = {
      id: Math.random().toString(36).substring(2, 9),
      fileName,
      url,
      status: 'downloading',
      progress: 0,
      speed: Math.random() * 1024 * 1024 * 2, // Random speed up to 2 MB/s
      size: Math.random() * 1024 * 1024 * 100, // Random size up to 100 MB
      downloaded: 0,
      timeRemaining: Math.random() * 600, // Random time up to 10 minutes
      dateAdded: new Date(),
      lastModified: new Date(),
      filePath: `C:/Downloads/${fileName}`,
      fileType: 'other',
    };
    
    setDownloads(prev => [newDownload, ...prev]);
  }, []);
  
  // Pause/resume download
  const togglePause = useCallback((id: string) => {
    setDownloads(prev =>
      prev.map(download => {
        if (download.id === id) {
          const newStatus = download.status === 'downloading' ? 'paused' : 'downloading';
          return { ...download, status: newStatus };
        }
        return download;
      })
    );
  }, []);
  
  // Cancel download
  const cancelDownload = useCallback((id: string) => {
    setDownloads(prev => prev.filter(download => download.id !== id));
  }, []);
  
  // Select/deselect download
  const toggleSelect = useCallback((id: string) => {
    setDownloads(prev =>
      prev.map(download => {
        if (download.id === id) {
          return { ...download, selected: !download.selected };
        }
        return download;
      })
    );
    
    setSelectedDownloadIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
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
    addDownload,
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
  };
};