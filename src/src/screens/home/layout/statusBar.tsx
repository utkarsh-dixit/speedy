import React from 'react';
import { formatSize, formatSpeed } from '../../../utils';
import { SystemStats } from '../../../types/download';
import { ArrowDown, ArrowUp, Wifi, WifiOff } from '../../../icons.v2';

interface StatusBarProps {
  stats: SystemStats;
}

const StatusBar: React.FC<StatusBarProps> = ({ stats }) => {
  const { 
    activeDownloads, 
    completedDownloads, 
    diskSpace, 
    networkStatus 
  } = stats;
  
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-app-surface border-t border-app-surface-light text-xs text-app-text-secondary">
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <ArrowDown size={14} className="mr-1.5 text-app-primary" />
          <span>{formatSpeed(networkStatus.downloadSpeed)}</span>
        </div>
        
        <div className="flex items-center">
          <ArrowUp size={14} className="mr-1.5 text-app-accent" />
          <span>{formatSpeed(networkStatus.uploadSpeed)}</span>
        </div>
        
        {networkStatus.connected ? (
          <Wifi size={14} className="text-app-success" />
        ) : (
          <WifiOff size={14} className="text-app-error" />
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        <div>Active: {activeDownloads}</div>
        <div>Completed: {completedDownloads}</div>
        <div>
          Disk: {formatSize(diskSpace.free)} free of {formatSize(diskSpace.total)}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;