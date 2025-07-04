import React from 'react';
import * as Progress from '@radix-ui/react-progress';

// Define DownloadStatus enum here since we're having trouble with imports
enum DownloadStatus {
  DOWNLOADING = 'downloading',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error'
}

interface ProgressBarProps {
  progress: number;
  status: DownloadStatus;
}

const getStatusColor = (status: DownloadStatus): string => {
  switch (status) {
    case DownloadStatus.DOWNLOADING:
      return 'bg-gradient-to-r from-app-primary to-app-accent';
    case DownloadStatus.COMPLETED:
      return 'bg-app-success';
    case DownloadStatus.PAUSED:
      return 'bg-app-warning';
    case DownloadStatus.ERROR:
      return 'bg-app-error';
    case 'queued' as any:
      return 'bg-app-text-secondary';
    default:
      return 'bg-app-primary';
  }
};

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status }) => {
  const barColor = getStatusColor(status);
  
  return (
    <Progress.Root
      className="w-full h-2 bg-app-surface-light rounded-full overflow-hidden"
      value={progress}
    >
      <Progress.Indicator
        className={`h-full transition-all duration-300 ease-out ${barColor}`}
        style={{ transform: `translateX(-${100 - progress}%)` }}
      />
    </Progress.Root>
  );
};

export default ProgressBar;
export { DownloadStatus };