import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../assets/styles/manager.module.scss';

interface DownloadTask {
  id: number;
  url: string;
  parts: number;
}

const DownloadManager = () => {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [url, setUrl] = useState('');
  const [parts, setParts] = useState<number>(5);

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
    const id = Date.now();
    setTasks(prev => [...prev, { id, url, parts }]);
    setUrl('');
    setParts(5);
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

  return (
    <div className={styles.managerContainer}>
      <h1>Download Manager</h1>
      <div className={styles.form}>
        <input
          type="text"
          placeholder="File URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <input
          type="number"
          min={1}
          placeholder="Parts"
          value={parts}
          onChange={e => setParts(Number(e.target.value))}
        />
        <button type="button" onClick={handleAdd}>Add Download</button>
      </div>
      <div className={styles.downloadList}>
        {tasks.map(task => (
          <div key={task.id} className={styles.downloadItem}>
            <h3>{getFileName(task.url)}</h3>
            <p className={styles.url}>{formatUrl(task.url)}</p>
            <p>Segments: {task.parts}</p>
            <div className={styles.actions}>
              <Link href={`/download/${task.id}`}>
                View Details
              </Link>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className={styles.emptyState}>
            <p>No downloads yet. Add a URL to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadManager; 