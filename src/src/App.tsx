import { useState, useEffect, useRef } from 'react';
import { invoke } from "@tauri-apps/api/tauri";
import { emit, listen } from '@tauri-apps/api/event';
import { throttle } from "./utils";
import styles from './assets/styles/downloader.module.scss';
import DownloadProgressBar from './components/downloadProgressBar';

// Import components for the UI
const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby="linkTitle">
    <title id="linkTitle">URL Link</title>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby="pauseTitle">
    <title id="pauseTitle">Pause download</title>
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby="resumeTitle">
    <title id="resumeTitle">Resume download</title>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const CancelIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby="cancelTitle">
    <title id="cancelTitle">Cancel download</title>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby="downloadTitle">
    <title id="downloadTitle">Download icon</title>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const MoreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby="moreTitle">
    <title id="moreTitle">More options</title>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby="closeTitle">
    <title id="closeTitle">Close</title>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Pretty time left function
const prettyTimeLeft = (timeLeft: number) => {
  const days = Math.floor(timeLeft / (60 * 60 * 24));
  const hours = Math.floor((timeLeft % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
  const seconds = Math.floor(timeLeft % 60);
  
  if (days > 0) {
    return `${days} days ${hours} hours left`;
  }
  if (hours > 0) {
    return `${hours} hours ${minutes} minutes left`;
  }
  if (minutes > 0) {
    return `${minutes} minutes ${seconds} seconds left`;
  }
  return `${seconds} seconds left`;
};

// Calculate human-readable file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Number.parseFloat((bytes / (k ** i)).toFixed(2))} ${sizes[i]}`;
};

// Calculate download percentage
const calculatePercentage = (downloaded: number, total: number): number => {
  if (total === 0) return 0;
  return (downloaded / total) * 100;
};

interface DownloadSegment {
  id: number;
  downloaded: string;
  rawBytes: number;
  totalBytes: number;
  progress: number;
  speed: number;
  status: string;
}

interface DownloadPayload {
  progress: number;
  fileSize: number;
  completed: number;
  speed: number;
  estimatedTimeLeft: number;
  downloadId: number;
  segments: Array<{
    id: number;
    totalBytes: number;
    downloaded: number;
    progress: number;
    speed: number;
  }>;
}

interface DownloadScreenProps {
  downloadId: number;
  url: string;
  parts: number;
  isDetailView?: boolean;
}

const DownloadScreen: React.FC<DownloadScreenProps> = ({ 
  downloadId, 
  url, 
  parts, 
  isDetailView = false 
}) => {
  const [activeTab, setActiveTab] = useState('download');
  const [showDetails, setShowDetails] = useState(true);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // State variables from the original implementation
  const [progress, setProgress] = useState(0);
  const [fileSize, setFileSize] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(0);
  const [downloadedSize, setDownloadedSize] = useState(0);
  
  // Speed limit settings
  const [speedLimit, setSpeedLimit] = useState(0); // 0 means unlimited
  const [speedLimitUnit, setSpeedLimitUnit] = useState('KB/s');
  
  // Completion options
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [openFolderOnComplete, setOpenFolderOnComplete] = useState(false);
  const [runOnComplete, setRunOnComplete] = useState(false);
  const [runCommand, setRunCommand] = useState('');
  
  // Store a static record of segment IDs to ensure consistent ordering
  const segmentOrder = useRef(Array.from({ length: parts }, (_, i) => i + 1));
  
  // Segments data from Rust backend
  const [segmentsMap, setSegmentsMap] = useState<Record<number, DownloadSegment>>(
    Object.fromEntries(
      segmentOrder.current.map(id => [
        id, 
        { 
          id, 
          downloaded: '0 KB', 
          rawBytes: 0, 
          totalBytes: 0, 
          progress: 0, 
          speed: 0, 
          status: 'Initializing...' 
        }
      ])
    )
  );

  useEffect(() => {
    // Invoke greet function (from original code)
    invoke("start_download", { url, parts, downloadId }).catch(console.error);

    // Store the high water mark for each segment's data to ensure values never decrease
    const highWaterMarks = {
      progress: 0,
      downloadedSize: 0,
      segments: {
        ...Object.fromEntries(
          segmentOrder.current.map(id => [id, { bytes: 0, progress: 0 }])
        )
      }
    };

    // Throttle listener to update download progress
    const updateDownloadProgress = throttle((event: { payload: DownloadPayload }) => {
      const { payload } = event;
      
      // Only process this event if it's for our download ID
      if (payload.downloadId !== downloadId) {
        return;
      }
      
      const { fileSize: size, progress: prog, speed: spd, estimatedTimeLeft: etl, segments: segmentsData } = payload;

      // Ensure progress only increases
      const newProgress = Math.max(prog, highWaterMarks.progress);
      highWaterMarks.progress = newProgress;
      setProgress(newProgress);

      setFileSize(size);
      setSpeed(spd);
      setEstimatedTimeLeft(etl);
      
      // Calculate downloaded size, ensuring it never decreases
      const newDownloadedSize = Math.max(size * (prog / 100), highWaterMarks.downloadedSize);
      highWaterMarks.downloadedSize = newDownloadedSize;
      setDownloadedSize(newDownloadedSize);
      
      // Animate progress bar
      setCurrentProgress(newProgress);
      
      // Update segments from the Rust backend data
      if (segmentsData && segmentsData.length > 0) {
        // Update segments Map instead of replacing the whole array
        setSegmentsMap(prevSegmentsMap => {
          const newSegmentsMap = { ...prevSegmentsMap };
          
          for (const segment of segmentsData) {
            const { id, downloaded, totalBytes, progress: segmentProgress, speed: segmentSpeed } = segment;
            
            // Only update if segment ID is in our expected range
            if (id >= 1 && id <= parts) {
              // Get the current high water mark for this segment
              const segmentWaterMark = highWaterMarks.segments[id];
              
              // Ensure bytes and progress only increase
              const newBytes = Math.max(downloaded, segmentWaterMark.bytes);
              const newSegmentProgress = Math.max(segmentProgress, segmentWaterMark.progress);
              
              // Update high water marks
              segmentWaterMark.bytes = newBytes;
              segmentWaterMark.progress = newSegmentProgress;
              
              let status = 'Initializing...';
              if (newSegmentProgress >= 100) {
                status = 'Complete';
              } else if (newSegmentProgress > 0) {
                status = 'Receiving data...';
              } else if (newBytes > 0) {
                status = 'Send GET...';
              }
              
              newSegmentsMap[id] = {
                id,
                downloaded: formatFileSize(newBytes),
                rawBytes: newBytes,
                totalBytes,
                progress: newSegmentProgress,
                speed: segmentSpeed,
                status
              };
            }
          }
          
          return newSegmentsMap;
        });
      }

      // Notify when download completes
      if (newProgress >= 100 && notifyOnComplete) {
        // Using native notification API
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Download Complete', {
            body: `Your download of ${extractFileName(url)} has completed.`,
            icon: '/icon.png'
          });
        }
        
        // If openFolderOnComplete is true, we would invoke a Tauri command here
        if (openFolderOnComplete) {
          invoke("open_download_folder").catch(console.error);
        }
        
        // If runOnComplete is true and we have a command
        if (runOnComplete && runCommand.trim()) {
          invoke("run_command", { command: runCommand }).catch(console.error);
        }
      }
    }, 50);

    // Listen to download-progress event
    const unlistenFn = listen("download-progress", updateDownloadProgress);

    // Request notification permission if needed
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    // Cleanup listener on component unmount
    return () => {
      unlistenFn.then(unlisten => unlisten());
    };
  }, [url, parts, downloadId, notifyOnComplete, openFolderOnComplete, runOnComplete, runCommand]);
  
  // Function to handle pause/resume
  const handlePauseResume = () => {
    setIsPaused(prevPaused => {
      const newState = !prevPaused;
      invoke(newState ? "pause_download" : "resume_download", { downloadId })
        .catch(console.error);
      return newState;
    });
  };
  
  // Function to handle cancel
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this download?')) {
      invoke("cancel_download", { downloadId })
        .catch(console.error);
    }
  };

  // Apply speed limit
  const applySpeedLimit = () => {
    const multiplier = speedLimitUnit === 'MB/s' ? 1024 : 1;
    const limitInKBps = speedLimit * multiplier;
    invoke("set_speed_limit", { downloadId, limitKBps: limitInKBps })
      .catch(console.error);
  };
  
  // Extract filename from URL
  const extractFileName = (url: string) => {
    try {
      const path = new URL(url).pathname;
      const segments = path.split('/');
      return segments[segments.length - 1] || 'Unknown file';
    } catch {
      return 'Unknown file';
    }
  };

  const percentText = progress > 0 ? `(${progress.toFixed(2)}%)` : '';
  
  const tabs = [
    { id: 'download', label: 'Download status' },
    { id: 'speed', label: 'Speed Limiter' },
    { id: 'options', label: 'Options on completion' }
  ];
  
  // Create a stable ordered array from the segments map
  const orderedSegments = segmentOrder.current.map(id => segmentsMap[id]);

  // Dropdown menu for more options
  const renderMoreMenu = () => (
    <div className={`${styles.moreMenu} ${showMoreMenu ? styles.show : ''}`}>
      <button 
        type="button" 
        className={styles.menuItem}
        onClick={() => {
          invoke("copy_url", { url }).catch(console.error);
          setShowMoreMenu(false);
        }}
      >
        Copy URL
      </button>
      <button 
        type="button" 
        className={styles.menuItem}
        onClick={() => {
          invoke("save_download_as", { downloadId }).catch(console.error);
          setShowMoreMenu(false);
        }}
      >
        Save As...
      </button>
      <button 
        type="button" 
        className={styles.menuItem}
        onClick={() => {
          setShowMoreMenu(false);
          if (window.confirm('Are you sure you want to delete this download?')) {
            invoke("delete_download", { downloadId }).catch(console.error);
          }
        }}
      >
        Delete Download
      </button>
    </div>
  );
  
  return (
    <div className={styles.container}>
      <div className={styles.downloadCard}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <DownloadIcon />
            <span>{extractFileName(url)}</span>
          </div>
          <div className={styles.headerActions}>
            <button 
              type="button" 
              className={styles.iconButton} 
              aria-label="More options"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
            >
              <MoreIcon />
            </button>
            {renderMoreMenu()}
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {activeTab === 'download' && (
            <>
              {/* URL */}
              <div className={styles.urlBar}>
                <LinkIcon />
                <div className={styles.urlText} title={url}>
                  {url}
                </div>
              </div>

              {/* Download Stats */}
              <div className={styles.statsGrid}>
                <div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>File size</div>
                    <div className={styles.statValue}>
                      {formatFileSize(fileSize)}
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Downloaded</div>
                    <div className={styles.statValue}>
                      {formatFileSize(downloadedSize)} {percentText}
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Resume capability</div>
                    <div className={styles.statValue}>
                      Yes
                    </div>
                  </div>
                </div>
                <div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Transfer rate</div>
                    <div className={styles.statValue}>
                      {formatFileSize(speed)}/sec
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Time left</div>
                    <div className={styles.statValue}>
                      {progress >= 100 ? 'Complete' : prettyTimeLeft(estimatedTimeLeft)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar - using aria-hidden for the visual part */}
              <DownloadProgressBar 
                progress={currentProgress} 
                isPaused={isPaused} 
                showText={false}
                size="medium"
              />

              {/* Action Buttons */}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? 'Hide details' : 'Show details'}
                </button>
                <div className={styles.buttonGroup}>
                  <button 
                    type="button" 
                    className={`${styles.button} ${isPaused ? styles.resumeBtn : styles.pauseBtn}`} 
                    onClick={handlePauseResume}
                    disabled={progress >= 100}
                    aria-label={isPaused ? "Resume download" : "Pause download"}
                  >
                    {isPaused ? <PlayIcon /> : <PauseIcon />}
                    <span>{isPaused ? 'Resume' : 'Pause'}</span>
                  </button>
                  <button 
                    type="button" 
                    className={`${styles.button} ${styles.cancelBtn}`} 
                    onClick={handleCancel}
                    disabled={progress >= 100}
                    aria-label="Cancel download"
                  >
                    <CancelIcon />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>

              {/* Segments Progress */}
              {showDetails && (
                <div>
                  <h3 className={styles.detailsHeading}>
                    Start positions and download progress by connections
                  </h3>
                  <div className={styles.tableWrapper}>
                    <table className={styles.segmentTable}>
                      <thead className={styles.tableHead}>
                        <tr>
                          <th className={styles.tableHeadCell}>N.</th>
                          <th className={styles.tableHeadCell}>Downloaded</th>
                          <th className={styles.tableHeadCell}>Progress</th>
                          <th className={styles.tableHeadCell}>Speed</th>
                          <th className={styles.tableHeadCell}>Info</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Use the stably ordered segments array */}
                        {orderedSegments.map((segment) => (
                          <tr key={segment.id} className={styles.tableRow}>
                            <td className={styles.tableCell}>{segment.id}</td>
                            <td className={styles.tableCell}>{segment.downloaded}</td>
                            <td className={styles.tableCell}>
                              <div className={styles.miniProgressContainer}>
                                <div 
                                  className={styles.miniProgressBar} 
                                  style={{ width: `${segment.progress}%` }}
                                />
                                <span>{segment.progress.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className={styles.tableCell}>{formatFileSize(segment.speed)}/s</td>
                            <td className={`${styles.tableCell} ${styles.muted}`}>{segment.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'speed' && (
            <div className={styles.tabContent}>
              <h3 className={styles.tabTitle}>Speed Limiter</h3>
              <div className={styles.speedLimiter}>
                <div className={styles.formGroup}>
                  <label htmlFor="speedLimit" className={styles.formLabel}>
                    Limit download speed:
                  </label>
                  <div className={styles.inputGroup}>
                    <input
                      type="number"
                      id="speedLimit"
                      className={styles.formInput}
                      value={speedLimit}
                      onChange={(e) => setSpeedLimit(Math.max(0, Number.parseInt(e.target.value) || 0))}
                      min="0"
                      placeholder="No limit"
                    />
                    <select
                      className={styles.formSelect}
                      value={speedLimitUnit}
                      onChange={(e) => setSpeedLimitUnit(e.target.value)}
                    >
                      <option value="KB/s">KB/s</option>
                      <option value="MB/s">MB/s</option>
                    </select>
                  </div>
                  <p className={styles.helperText}>
                    Set to 0 for unlimited speed
                  </p>
                </div>
                
                <button 
                  type="button" 
                  className={`${styles.button} ${styles.primaryBtn}`}
                  onClick={applySpeedLimit}
                >
                  Apply Limit
                </button>
              </div>
            </div>
          )}

          {activeTab === 'options' && (
            <div className={styles.tabContent}>
              <h3 className={styles.tabTitle}>Options on Completion</h3>
              
              <div className={styles.optionGroup}>
                <div className={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="notifyOnComplete"
                    checked={notifyOnComplete}
                    onChange={(e) => setNotifyOnComplete(e.target.checked)}
                  />
                  <label htmlFor="notifyOnComplete">
                    Send notification when download completes
                  </label>
                </div>
                
                <div className={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="openFolderOnComplete"
                    checked={openFolderOnComplete}
                    onChange={(e) => setOpenFolderOnComplete(e.target.checked)}
                  />
                  <label htmlFor="openFolderOnComplete">
                    Open destination folder when download completes
                  </label>
                </div>
                
                <div className={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="runOnComplete"
                    checked={runOnComplete}
                    onChange={(e) => setRunOnComplete(e.target.checked)}
                  />
                  <label htmlFor="runOnComplete">
                    Run command when download completes
                  </label>
                </div>
                
                {runOnComplete && (
                  <div className={styles.formGroup}>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={runCommand}
                      onChange={(e) => setRunCommand(e.target.value)}
                      placeholder="Command to run"
                    />
                    <p className={styles.helperText}>
                      Use {'{file}'} to insert the downloaded file path
                    </p>
                  </div>
                )}
                
                <button 
                  type="button" 
                  className={`${styles.button} ${styles.primaryBtn}`}
                  onClick={() => {
                    invoke("save_completion_options", { 
                      downloadId, 
                      notifyOnComplete, 
                      openFolderOnComplete, 
                      runOnComplete, 
                      runCommand 
                    }).catch(console.error);
                  }}
                >
                  Save Options
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DownloadScreen;
