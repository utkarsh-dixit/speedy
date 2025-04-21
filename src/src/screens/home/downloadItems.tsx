import React, { useState, useCallback } from 'react';
import { Download } from '../../types/download';
import ProgressBar from '../../components/progressBars/compactProgressBar';
import { formatSize, formatSpeed, formatTimeRemaining, formatDate } from '../../utils';
import { getFileTypeIcon } from '../../icons.v2';
import IconButton from '../../components/iconButton';
import { Pause, Play, Trash2, Folder, MoreVertical, RotateCcw } from '../../icons.v2';
import * as ContextMenu from '@radix-ui/react-context-menu';

interface DownloadItemProps {
  download: Download;
  onTogglePause: () => void;
  onCancel: () => void;
  onToggleSelect: () => void;
}

const DownloadItem: React.FC<DownloadItemProps> = ({
  download,
  onTogglePause,
  onCancel,
  onToggleSelect,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const { fileName, status, url, progress, speed, total_size, filename, downloaded_bytes, timeRemaining, lastModified, fileType, selected } = download;
  const FileIcon = getFileTypeIcon(fileType);
  
  const statusText = {
    downloading: 'Downloading',
    paused: 'Paused',
    completed: 'Completed',
    error: 'Error',
    queued: 'Queued',
    in_progress: 'In Progress'
  }[status] || 'Unknown';
  
  const handleCopyUrl = useCallback(() => {
    if (download.url) {
      navigator.clipboard.writeText(download.url);
    }
  }, [download.url]);
  
  const handleMoveToFolder = useCallback(() => {
    console.log('Move to folder');
  }, []);
  
  const handleDownloadInfo = useCallback(() => {
    console.log('Download info');
  }, []);

  console.log('download', download);
  
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div className={`flex items-center border-b border-app-surface-light p-1.5 hover:bg-app-surface-light
          transition-colors duration-150 cursor-default select-none ${selected ? 'bg-app-surface-light bg-opacity-70' : ''}`}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="w-4 h-4 ml-[2px] rounded bg-app-surface border-app-surface-light text-app-primary focus:ring-app-primary focus:ring-1 mr-3"
          />
          
          <FileIcon size={16} className="text-app-text-secondary mr-2" />
          
          <div className="flex-grow min-w-0 mr-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-app-text truncate mr-2" title={filename || url}>{filename || url}</span>
              <span className="text-xs text-app-text-secondary whitespace-nowrap">{formatSize(downloaded_bytes)}/{formatSize(total_size)}</span>
            </div>
            
            <ProgressBar progress={(downloaded_bytes / total_size) * 100} status={status} />
            
            <div className="flex justify-between items-center text-xs text-app-text-secondary mt-1">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{statusText}</span>
                {status === 'downloading' && (
                  <>
                    <span>{formatSpeed(speed)}</span>
                    <span>{formatTimeRemaining(timeRemaining)}</span>
                  </>
                )}
              </div>
              {/* <span className="text-2xs">{formatDate(lastModified)}</span> */}
            </div>
          </div>
          
          <div className="flex items-center space-x-0.5">
            {status === 'downloading' ? (
              <IconButton icon={<Pause size={16} />} onClick={onTogglePause} tooltipText="Pause" />
            ) : status === 'paused' ? (
              <IconButton icon={<Play size={16} />} onClick={onTogglePause} tooltipText="Resume" />
            ) : status === 'error' ? (
              <IconButton icon={<RotateCcw size={16} />} onClick={onTogglePause} tooltipText="Retry" />
            ) : (
              <IconButton icon={<Folder size={16} />} onClick={() => {}} tooltipText="Open folder" />
            )}
            
            <IconButton icon={<Trash2 size={16} />} onClick={onCancel} tooltipText="Remove" />
            
            <div className="relative">
              <IconButton icon={<MoreVertical size={16} />} onClick={() => setShowMenu(!showMenu)} tooltipText="More options" />
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-app-surface-light rounded-md shadow-app-lg p-0.5"
                     onMouseLeave={() => setShowMenu(false)}>
                  <button className="block w-full text-left px-3 py-1 text-2xs text-app-text hover:bg-app-surface rounded"
                          onClick={() => setShowMenu(false)}>Copy URL</button>
                  <button className="block w-full text-left px-3 py-1 text-2xs text-app-text hover:bg-app-surface rounded"
                          onClick={() => setShowMenu(false)}>Move to folder</button>
                  <button className="block w-full text-left px-3 py-1 text-2xs text-app-text hover:bg-app-surface rounded"
                          onClick={() => setShowMenu(false)}>Download info</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </ContextMenu.Trigger>
      
      <ContextMenu.Portal>
        <ContextMenu.Content 
          className="min-w-[160px] bg-app-surface-light rounded-md shadow-app-lg p-0.5 z-50 animate-fadeIn"
          sideOffset={5}
        >
          <ContextMenu.Item 
            className="flex items-center px-3 py-1.5 text-xs text-app-text hover:bg-app-surface rounded outline-none cursor-default"
            onClick={handleCopyUrl}
          >
            Copy URL
          </ContextMenu.Item>
          <ContextMenu.Item 
            className="flex items-center px-3 py-1.5 text-xs text-app-text hover:bg-app-surface rounded outline-none cursor-default"
            onClick={handleMoveToFolder}
          >
            Move to folder
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-px bg-app-surface-light my-1" />
          <ContextMenu.Item 
            className="flex items-center px-3 py-1.5 text-xs text-app-text hover:bg-app-surface rounded outline-none cursor-default"
            onClick={handleDownloadInfo}
          >
            Download info
          </ContextMenu.Item>
          {status === 'downloading' && (
            <ContextMenu.Item 
              className="flex items-center px-3 py-1.5 text-xs text-app-text hover:bg-app-surface rounded outline-none cursor-default"
              onClick={onTogglePause}
            >
              Pause download
            </ContextMenu.Item>
          )}
          {status === 'paused' && (
            <ContextMenu.Item 
              className="flex items-center px-3 py-1.5 text-xs text-app-text hover:bg-app-surface rounded outline-none cursor-default"
              onClick={onTogglePause}
            >
              Resume download
            </ContextMenu.Item>
          )}
          <ContextMenu.Separator className="h-px bg-app-surface-light my-1" />
          <ContextMenu.Item 
            className="flex items-center px-3 py-1.5 text-xs text-red-500 hover:bg-app-surface rounded outline-none cursor-default"
            onClick={onCancel}
          >
            Remove download
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

export default DownloadItem;