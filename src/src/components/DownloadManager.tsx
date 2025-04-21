import { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/tauri";
import styles from '../assets/styles/manager.module.scss';
import { Dialog, Button, Select, Tabs, DropdownMenu, ContextMenuWrapper, CommandMenu } from './UI';
import type { SelectItem } from './UI';
import { Search, Download, Plus, MoreHorizontal, ChevronDown, Command } from 'lucide-react';

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

const SortIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5h4"></path>
    <path d="M11 9h7"></path>
    <path d="M11 13h10"></path>
    <path d="M3 17h18"></path>
    <path d="M3 21h18"></path>
    <path d="M3 13V3h4v10"></path>
    <path d="M3 8l4-5"></path>
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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

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
    setShowAddDialog(false);
  };

  const confirmDelete = (id: number) => {
    setSelectedTaskId(id);
    setShowDeleteDialog(true);
  };

  const handleDelete = () => {
    if (!selectedTaskId) return;
    
    // Cancel the download in Tauri if it's active
    invoke("cancel_download", { downloadId: selectedTaskId }).catch(console.error);
    
    // Remove from state
    setTasks(prev => prev.filter(task => task.id !== selectedTaskId));
    
    // Close dialog and reset selected task
    setShowDeleteDialog(false);
    setSelectedTaskId(null);
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
            setShowAddDialog(true);
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

  const handlePauseResume = (id: number) => {
    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        const newStatus = task.status === 'downloading' ? 'paused' : 'downloading';
        
        // Call Tauri backend to pause/resume
        if (newStatus === 'paused') {
          invoke("pause_download", { downloadId: id }).catch(console.error);
        } else {
          invoke("resume_download", { downloadId: id }).catch(console.error);
        }
        
        return {
          ...task,
          status: newStatus
        };
      }
      return task;
    }));
  };

  // Sort options for the Select component
  const sortOptions: SelectItem[] = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'name', label: 'Name' }
  ];

  return (
    <div 
      className={`${styles.managerContainer} ${dragActive ? styles.dragActive : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Download size={18} />
          Downloads
        </h1>
        <div className={styles.actions}>
          <div className={styles.searchWrapper}>
            <Search size={16} className="text-app-text-secondary absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search downloads..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <div className={styles.keyboardShortcut}>
              <kbd className={styles.keyboardKey}>S</kbd>
            </div>
          </div>
          
          <CommandMenu 
            onAddDownload={() => setShowAddDialog(true)}
            onSearch={(query) => setSearchQuery(query)}
            onPauseDownload={handlePauseResume}
            onResumeDownload={handlePauseResume}
            onDeleteDownload={confirmDelete}
            onCopyDownloadUrl={(id) => {
              const task = tasks.find(t => t.id === id);
              if (task) {
                navigator.clipboard.writeText(task.url);
              }
            }}
            onEditDownload={(id) => {
              const task = tasks.find(t => t.id === id);
              if (task) {
                setUrl(task.url);
                setParts(task.parts);
                setShowAddDialog(true);
              }
            }}
            downloadItems={tasks.map(task => ({
              id: task.id,
              name: task.fileName || getFileName(task.url),
              status: task.status
            }))}
          />
          
          <Select
            items={sortOptions}
            value={sortOrder}
            onValueChange={(value) => setSortOrder(value as 'newest' | 'oldest' | 'name')}
            placeholder="Sort by"
            className={styles.sortSelect}
          />
          
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowAddDialog(true)}
            leftIcon={<Plus size={16} />}
          >
            Add Download
          </Button>
        </div>
      </div>
      
      {dragActive && (
        <div className={styles.dropOverlay}>
          <div className={styles.dropMessage}>
            <Download size={24} />
            <p>Drop URL here to download</p>
          </div>
        </div>
      )}
      
      <div className={styles.downloadList}>
        {sortedTasks.map(task => (
          <ContextMenuWrapper
            key={task.id}
            onDelete={() => confirmDelete(task.id)}
            onPause={task.status === 'downloading' ? () => handlePauseResume(task.id) : undefined}
            onResume={task.status === 'paused' ? () => handlePauseResume(task.id) : undefined}
            onCopy={() => {
              navigator.clipboard.writeText(task.url);
            }}
            onEdit={() => {
              setUrl(task.url);
              setParts(task.parts);
              setShowAddDialog(true);
            }}
          >
            <div className={styles.downloadItem}>
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
                {task.progress !== undefined && (
                  <div className={styles.progressWrapper}>
                    <div 
                      className={styles.progressBar}
                      style={{ width: `${task.progress}%` }}
                    />
                    <span className={styles.progressText}>{Math.round(task.progress)}%</span>
                  </div>
                )}
              </div>
              <div className={styles.downloadActions}>
                <DropdownMenu
                  trigger={
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal size={16} />
                    </Button>
                  }
                  items={[
                    {
                      label: 'View Details',
                      onClick: () => handleViewDetails(task.id)
                    },
                    task.status === 'downloading' ? {
                      label: 'Pause',
                      onClick: () => handlePauseResume(task.id)
                    } : task.status === 'paused' ? {
                      label: 'Resume',
                      onClick: () => handlePauseResume(task.id)
                    } : null,
                    {
                      label: 'Copy URL',
                      onClick: () => navigator.clipboard.writeText(task.url)
                    },
                    {
                      label: 'Edit',
                      onClick: () => {
                        setUrl(task.url);
                        setParts(task.parts);
                        setShowAddDialog(true);
                      }
                    },
                    {
                      label: 'Delete',
                      onClick: () => confirmDelete(task.id)
                    }
                  ].filter(Boolean)}
                />
              </div>
            </div>
          </ContextMenuWrapper>
        ))}
        {tasks.length === 0 && (
          <div className={styles.emptyState}>
            <Download size={24} />
            <p>No downloads yet</p>
            <Button 
              variant="primary"
              size="md"
              onClick={() => setShowAddDialog(true)}
              leftIcon={<Plus size={16} />}
            >
              Add Download
            </Button>
          </div>
        )}
      </div>

      {/* Add Download Dialog */}
      <Dialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        title="Add New Download"
        description="Enter the URL of the file you want to download"
        footer={
          <>
            <Button variant="default" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdd}>
              Start Download
            </Button>
          </>
        }
      >
        <div className={styles.dialogForm}>
          <div className={styles.formGroup}>
            <label htmlFor="url" className={styles.formLabel}>Download URL</label>
            <input
              id="url"
              type="text"
              placeholder="https://example.com/file.zip"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className={styles.formInput}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="parts" className={styles.formLabel}>Number of Connections</label>
            <input
              id="parts"
              type="number"
              min={1}
              max={32}
              value={parts}
              onChange={e => setParts(Math.max(1, Math.min(32, Number(e.target.value))))}
              className={styles.formInput}
            />
            <small className={styles.formHelp}>More connections may improve download speed</small>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Download"
        description="Are you sure you want to delete this download? This action cannot be undone."
        footer={
          <>
            <Button variant="default" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>This will permanently remove the download and cancel any in-progress tasks.</p>
      </Dialog>
    </div>
  );
};

export default DownloadManager; 