import React, { useState, useCallback } from 'react';
import { Download } from '../../types/download';
import ProgressBar from '../../components/progressBars/compactProgressBar';
import { formatSize, formatSpeed, formatTimeRemaining, formatDate } from '../../utils';
import { getFileTypeIcon } from '../../icons.v2';
import IconButton from '../../components/iconButton';
import { Pause, Play, Trash2, Folder, MoreVertical, RotateCcw } from '../../icons.v2';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { invoke } from '@tauri-apps/api/tauri';

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [shouldDeleteFile, setShouldDeleteFile] = useState(false);
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
  
  const handleDeleteWithFile = useCallback(async (shouldDeleteFile: boolean) => {
    try {
      // Call the Tauri delete_download command with the option to delete the file
      await invoke('delete_download', { 
        downloadId: download.download_id,
        shouldAlsoDeleteFile: shouldDeleteFile
      });
      // Then call the original onCancel callback
      onCancel();
    } catch (error) {
      console.error('Failed to delete download:', error);
    }
  }, [download.id, onCancel]);

  const handleDelete = useCallback(() => {
    // Show the dialog to confirm if the user wants to delete the file as well
    setShowDeleteDialog(true);
  }, []);

  console.log('download', download);
  
  return (
    <>
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
              
              <IconButton icon={<Trash2 size={16} />} onClick={handleDelete} tooltipText="Remove" />
              
              <div className="relative">
                <IconButton icon={<MoreVertical size={16} />} onClick={() => setShowMenu(!showMenu)} tooltipText="More options" />
                
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 z-10 bg-app-surface-light rounded-md shadow-app-lg p-0.5"
                       onMouseLeave={() => setShowMenu(false)}>
                    <button type="button" className="block w-full text-left px-3 py-1 text-2xs text-app-text hover:bg-app-surface rounded"
                            onClick={() => {
                              handleCopyUrl();
                              setShowMenu(false);
                            }}>Copy URL</button>
                    <button type="button" className="block w-full text-left px-3 py-1 text-2xs text-app-text hover:bg-app-surface rounded"
                            onClick={() => {
                              handleMoveToFolder();
                              setShowMenu(false);
                            }}>Move to folder</button>
                    <button type="button" className="block w-full text-left px-3 py-1 text-2xs text-app-text hover:bg-app-surface rounded"
                            onClick={() => {
                              handleDownloadInfo();
                              setShowMenu(false);
                            }}>Download info</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ContextMenu.Trigger>
        
        <ContextMenu.Portal>
          <ContextMenu.Content 
            className="min-w-[160px] bg-app-surface-light rounded-md shadow-app-lg p-0.5 z-50 animate-fadeIn"
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
              onClick={handleDelete}
            >
              Remove download
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      <AlertDialog.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-app-surface-light rounded-lg shadow-app-lg p-6 max-w-md w-[90vw] z-50 focus:outline-none border border-app-surface">
            <AlertDialog.Title className="text-base font-semibold text-app-text mb-3">
            Are you sure you want to delete this download?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-app-text-secondary mb-4">
             Deleting this download will remove it from the list and the downloaded file from your device. This action cannot be undone.
            </AlertDialog.Description>
            <div className="flex items-center mb-6">
              <input
                type="checkbox"
                id="delete-file-checkbox"
                checked={shouldDeleteFile}
                onChange={(e) => setShouldDeleteFile(e.target.checked)}
                className="w-4 h-4 rounded bg-app-surface border-app-surface-light text-app-primary focus:ring-app-primary focus:ring-1 mr-3"
              />
              <label htmlFor="delete-file-checkbox" className="text-sm text-app-text">
                Also delete the downloaded file from my device
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <button 
                  type="button"
                  className="px-4 py-2 text-sm font-medium bg-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.4)] rounded-md transition-colors duration-150"
                >
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button 
                  type="button"
                  className="px-4 py-2 text-sm font-medium bg-red-500 text-white hover:bg-red-600 rounded-md transition-colors duration-150"
                  onClick={() => handleDeleteWithFile(shouldDeleteFile)}
                >
                  Delete
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
};

export default DownloadItem;