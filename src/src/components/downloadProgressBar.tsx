import { useEffect, useState } from 'react';
import styles from '../assets/styles/downloader.module.scss';

interface DownloadProgressBarProps {
  progress: number;
  isPaused?: boolean;
  indeterminate?: boolean;
  className?: string;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

const DownloadProgressBar = ({
  progress,
  isPaused = false,
  indeterminate = false,
  className = '',
  showText = true,
  size = 'medium',
  animated = true
}: DownloadProgressBarProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  useEffect(() => {
    // Animate the progress smoothly
    if (!animated) {
      setAnimatedProgress(progress);
      return;
    }
    
    const animationFrame = requestAnimationFrame(() => {
      if (Math.abs(animatedProgress - progress) < 0.5) {
        setAnimatedProgress(progress);
      } else {
        setAnimatedProgress(animatedProgress + (progress - animatedProgress) * 0.1);
      }
    });
    
    return () => cancelAnimationFrame(animationFrame);
  }, [progress, animatedProgress, animated]);
  
  // Determine the container and bar classes based on size
  const containerClass = `${styles.progressContainer} ${styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`]} ${className}`;
  const barClass = `${styles.progressBar} ${isPaused ? styles.paused : ''} ${indeterminate ? styles.indeterminate : ''}`;
  
  return (
    <div className={styles.progressWrapper}>
      <div className={containerClass} aria-hidden="true">
        <div 
          className={barClass}
          style={{ 
            width: indeterminate ? '50%' : `${animatedProgress}%`,
            animationPlayState: isPaused ? 'paused' : 'running'
          }}
        />
      </div>
      {showText && (
        <div className={styles.progressText}>
          {indeterminate ? 'Loading...' : `${Math.round(progress)}%`}
        </div>
      )}
      {/* Hidden text for screen readers */}
      <div className="sr-only" aria-live="polite">
        {indeterminate ? 'Loading in progress' : `Download progress: ${Math.round(progress)}%`}
      </div>
    </div>
  );
};

export default DownloadProgressBar;
