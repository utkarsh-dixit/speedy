import { useState, useEffect } from 'react';
import Link from 'next/link';
import { invoke } from "@tauri-apps/api/tauri";
import styles from '../assets/styles/manager.module.scss';

// Icons
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Download icon">
    <title>Download icon</title>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Delete icon">
    <title>Delete icon</title>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

interface DownloadTask {
  id: number;
  url: string;
  parts: number;
  fileName?: string;
  progress?: number;
  status?: 'queued' | 'downloading' | 'paused' | 'completed' | 'error';
  createdAt: number;
}

const DownloadManager = () => {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [url, setUrl] = useState('');
  const [parts, setParts] = useState<number>(5);
  const [dragActive, setDragActive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');

  // Load tasks from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTasks = localStorage.getItem('downloadTasks');
      if (savedTasks) {
        try {
          setTasks(JSON.parse(savedTasks));
        } catch (e) {
          console.error('Error parsing tasks from localStorage', e);
        }
      }
    }
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('downloadTasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  const handleAdd = () => {
    if (!url.trim()) return;
    
    const fileName = getFileName(url);
    const id = Date.now();
    
    setTasks(prev => [
      ...prev, 
      { 
        id, 
        url, 
        parts, 
        fileName, 
        progress: 0, 
        status: 'queued',
        createdAt: Date.now()
      }
    ]);
    
    // Start the download in Tauri
    invoke("start_download", { url, parts, downloadId: id }).catch(console.error);
    
    // Reset form
    setUrl('');
    setParts(5);
    setShowForm(false);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this download?')) {
      // Cancel the download in Tauri if it's active
      invoke("cancel_download", { downloadId: id }).catch(console.error);
      
      // Remove from state
      setTasks(prev => prev.filter(task => task.id !== id));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const items = e.dataTransfer.items;
    
    if (items) {
      // Process the dropped URLs
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'string' && items[i].type.match('^text/uri-list')) {
          items[i].getAsString((droppedUrl) => {
            setUrl(droppedUrl);
            setShowForm(true);
          });
        }
      }
    }
  };

  const formatUrl = (url: string) => {
    // Truncate long URLs for display
    return url.length > 50 ? `${url.substring(0, 47)}...` : url;
  };

  // Format file name from URL
  const getFileName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/');
      const fileName = pathSegments[pathSegments.length - 1];
      return fileName || 'Unknown File';
    } catch (e) {
      return 'Unknown File';
    }
  };

  // Filter tasks based on search query
  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.fileName?.toLowerCase().includes(query) ||
      task.url.toLowerCase().includes(query)
    );
  });

  // Sort tasks based on the selected order
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortOrder === 'newest') {
      return b.createdAt - a.createdAt;
    } 
    if (sortOrder === 'oldest') {
      return a.createdAt - b.createdAt;
    }
    return (a.fileName || '').localeCompare(b.fileName || '');
  });

  const handleViewDetails = (id: number) => {
    // Create a new window using the Rust backend
    invoke("open_details_window", { 
      downloadId: id,
      url: `/download/${id}`, 
      title: 'Download Details'
    })
    .catch(err => {
      console.error('Failed to open details window:', err);
    });
  };

  return (
    <div 
      className={`${styles.managerContainer} ${dragActive ? styles.dragActive : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.header}>
        <h1 className={styles.title}>
          <DownloadIcon />
          Download Manager
        </h1>
        <div className={styles.actions}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search downloads..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <select 
            className={styles.sortSelect}
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest' | 'name')}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name</option>
          </select>
          <button 
            type="button" 
            className={styles.addButton}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : 'Add Download'}
          </button>
        </div>
      </div>
      
      {showForm && (
        <div className={styles.form}>
          <input
            type="text"
            placeholder="File URL"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className={styles.urlInput}
          />
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="parts">Connections:</label>
              <input
                id="parts"
                type="number"
                min={1}
                max={32}
                placeholder="Parts"
                value={parts}
                onChange={e => setParts(Math.max(1, Math.min(32, Number(e.target.value))))}
                className={styles.partsInput}
              />
            </div>
            <button type="button" onClick={handleAdd} className={styles.startButton}>
              Start Download
            </button>
          </div>
        </div>
      )}
      
      {dragActive && (
        <div className={styles.dropOverlay}>
          <div className={styles.dropMessage}>
            <DownloadIcon />
            <p>Drop URL here to download</p>
          </div>
        </div>
      )}
      
      <div className={styles.downloadList}>
        {sortedTasks.map(task => (
          <div key={task.id} className={styles.downloadItem}>
            <div className={styles.downloadContent}>
              <h3 className={styles.downloadName}>{task.fileName || getFileName(task.url)}</h3>
              <p className={styles.url}>{formatUrl(task.url)}</p>
              <div className={styles.downloadMeta}>
                <span>Segments: {task.parts}</span>
                {task.status && (
                  <span className={`${styles.status} ${styles[task.status]}`}>
                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </span>
                )}
              </div>
              {task.progress !== undefined && task.progress > 0 && (
                <div className={styles.progressWrapper}>
                  <div 
                    className={styles.progressBar}
                    style={{ width: `${task.progress}%` }}
                  />
                  <span className={styles.progressText}>{task.progress.toFixed(1)}%</span>
                </div>
              )}
            </div>
            <div className={styles.downloadActions}>
              <button 
                type="button"
                onClick={() => handleViewDetails(task.id)}
                className={styles.viewButton}
              >
                View Details
              </button>
              <button 
                type="button" 
                onClick={() => handleDelete(task.id)}
                className={styles.deleteButton}
                aria-label="Delete download"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className={styles.emptyState}>
            <DownloadIcon />
            <p>No downloads yet. Add a URL to get started.</p>
            <button 
              type="button" 
              className={styles.addButton}
              onClick={() => setShowForm(true)}
            >
              Add Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadManager; 