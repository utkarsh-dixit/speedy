import type React from 'react';
import { useEffect, useState } from 'react';
import { Search, Grid, List, Minimize2, Maximize2, X } from '../../../icons.v2';
import IconButton from '../../../components/iconButton';
import type { WebviewWindow } from '@tauri-apps/api/window';

interface HeaderProps {
  title: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isGridView: boolean;
  onToggleView: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  searchQuery, 
  onSearchChange, 
  isGridView, 
  onToggleView 
}) => {
  const [isTauriAvailable, setIsTauriAvailable] = useState(false);
  const [appWindowInstance, setAppWindowInstance] = useState<WebviewWindow | null>(null);

  useEffect(() => {
    // Check if we're running in a Tauri environment
    const checkTauri = async () => {
      try {
        // Dynamically import appWindow
        const { appWindow } = await import('@tauri-apps/api/window');
        if (appWindow.label) {
          setIsTauriAvailable(true);
          setAppWindowInstance(appWindow);
        }
      } catch (e) {
        setIsTauriAvailable(false);
      }
    };
    
    checkTauri();
  }, []);

  const handleMinimize = async () => {
    if (isTauriAvailable && appWindowInstance) {
      await appWindowInstance.minimize();
    }
  };
  
  const handleMaximize = async () => {
    if (isTauriAvailable && appWindowInstance) {
      await appWindowInstance.toggleMaximize();
    }
  };
  
  const handleClose = async () => {
    if (isTauriAvailable && appWindowInstance) {
      await appWindowInstance.close();
    }
  };

  return (
    <div className="flex flex-col">
      <div 
        className="flex items-center justify-between px-4 py-1 bg-gradient-header"
        data-tauri-drag-region
      >
        <div className="flex items-center" data-tauri-drag-region>
          <div className="flex space-x-2 mr-4">
            <div 
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer" 
              onClick={handleClose}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleClose();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Close window"
            />
            <div 
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer" 
              onClick={handleMinimize}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMinimize();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Minimize window"
            />
            <div 
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 cursor-pointer" 
              onClick={handleMaximize}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMaximize();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Maximize window"
            />
          </div>
          <span className="text-sm font-medium" data-tauri-drag-region>{title}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search downloads..."
              className="bg-gray-800 text-white text-sm rounded-md px-8 py-1 w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
          
          <IconButton
            icon={isGridView ? <List /> : <Grid />}
            onClick={onToggleView}
            aria-label={isGridView ? "List view" : "Grid view"}
          />
        </div>
      </div>
    </div>
  );
};

export default Header;