export const throttle = <T extends (...args: unknown[]) => void>(func: T, limit: number) => {
  let lastRun = 0;
  let throttled = false;
  
  return function(...args: Parameters<T>) {
    if (!throttled) {
      func.apply(this, args);
      lastRun = Date.now();
      throttled = true;
      
      setTimeout(() => {
        throttled = false;
      }, limit);
    }
  };
};


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


// Calculate download percentage
const calculatePercentage = (downloaded: number, total: number): number => {
  if (total === 0) return 0;
  return (downloaded / total) * 100;
};
  
// Calculate human-readable file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Number.parseFloat((bytes / (k ** i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format bytes to a human-readable string (KB, MB, GB)
 */
export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/**
 * Format download speed to a human-readable string
 */
export const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatSize(bytesPerSecond)}/s`;
};

/**
 * Format time remaining in seconds to a human-readable string
 */
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes} min ${remainingSeconds} sec`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hr ${minutes} min`;
  }
};

/**
 * Format a date to a readable string
 */
export const formatDate = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
};

/**
 * Get file type icon based on file extension
 */
export const getFileTypeFromName = (fileName: string): FileType => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const fileTypeMap: Record<string, FileType> = {
    // Audio files
    mp3: 'audio', wav: 'audio', flac: 'audio', aac: 'audio', ogg: 'audio',
    
    // Video files
    mp4: 'video', mkv: 'video', avi: 'video', mov: 'video', wmv: 'video',
    
    // Document files
    pdf: 'document', doc: 'document', docx: 'document', txt: 'document',
    xls: 'document', xlsx: 'document', ppt: 'document', pptx: 'document',
    
    // Archive files
    zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
    
    // Image files
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', svg: 'image',
    
    // Program files
    exe: 'program', msi: 'program', dmg: 'program', pkg: 'program',
    
    // App files
    apk: 'app', ipa: 'app',
  };
  
  return fileTypeMap[extension] || 'other';
};