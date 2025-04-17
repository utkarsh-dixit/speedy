import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DownloadScreen from '../../src/App';
import Link from 'next/link';

interface DownloadTask {
  id: number;
  url: string;
  parts: number;
}

const DownloadDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const [downloadId, setDownloadId] = useState<number | null>(null);
  const [url, setUrl] = useState<string>('');
  const [parts, setParts] = useState<number>(5);

  useEffect(() => {
    if (typeof id === 'string') {
      // Parse the ID from the URL
      const parsedId = Number.parseInt(id, 10);
      if (!Number.isNaN(parsedId)) {
        setDownloadId(parsedId);
        
        // In a real app, we would fetch the download details from storage or context
        // For now, we'll simulate it with localStorage if available
        if (typeof window !== 'undefined') {
          const savedTasks = localStorage.getItem('downloadTasks');
          if (savedTasks) {
            try {
              const tasks = JSON.parse(savedTasks);
              const task = tasks.find((t: DownloadTask) => t.id === parsedId);
              if (task) {
                setUrl(task.url);
                setParts(task.parts);
              }
            } catch (e) {
              console.error('Error parsing tasks from localStorage', e);
            }
          }
        }
      }
    }
  }, [id]);

  if (!downloadId) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'
    }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: '#0070f3',
            marginBottom: '1rem',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
              <title>Back arrow</title>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Download Manager
          </div>
        </Link>
        <h1 style={{ margin: '0.5rem 0 1rem', fontSize: '1.8rem', color: '#333' }}>Download Details</h1>
        
        <div style={{ 
          background: '#f8f9fa', 
          padding: '1rem', 
          borderRadius: '6px',
          border: '1px solid #eee',
          marginBottom: '1.5rem'
        }}>
          <div style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>URL</div>
          <div style={{ 
            wordBreak: 'break-all', 
            padding: '0.75rem', 
            background: '#fff', 
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            {url}
          </div>
          
          <div style={{ 
            display: 'flex', 
            marginTop: '1rem', 
            fontSize: '0.9rem',
            color: '#666'
          }}>
            <div style={{ marginRight: '2rem' }}>
              <div>Download ID</div>
              <div style={{ fontWeight: 'bold', color: '#333' }}>{downloadId}</div>
            </div>
            <div>
              <div>Segments</div>
              <div style={{ fontWeight: 'bold', color: '#333' }}>{parts}</div>
            </div>
          </div>
        </div>
      </div>
      
      {downloadId && url && parts > 0 && (
        // @ts-ignore: We'll update DownloadScreen to accept these props
        <DownloadScreen downloadId={downloadId} url={url} parts={parts} isDetailView={true} />
      )}
    </div>
  );
};

export default DownloadDetail; 