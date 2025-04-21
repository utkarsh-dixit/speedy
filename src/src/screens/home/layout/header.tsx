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
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

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
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer relative" 
              onClick={handleClose}
              onMouseEnter={() => setHoveredButton('close')}
              onMouseLeave={() => setHoveredButton(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleClose();
                }
              }}
              aria-label="Close window"
            >
              {hoveredButton === 'close' && (
                <X className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-black" size={6} />
              )}
            </div>
            <div 
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer relative" 
              onClick={handleMinimize}
              onMouseEnter={() => setHoveredButton('minimize')}
              onMouseLeave={() => setHoveredButton(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMinimize();
                }
              }}
              aria-label="Minimize window"
            >
              {hoveredButton === 'minimize' && (
                <Minimize2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-black" size={6} />
              )}
            </div>
            <div 
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 cursor-pointer relative" 
              onClick={handleMaximize}
              onMouseEnter={() => setHoveredButton('maximize')}
              onMouseLeave={() => setHoveredButton(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMaximize();
                }
              }}
              aria-label="Maximize window"
            >
              {hoveredButton === 'maximize' && (
                <Maximize2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-black" size={6} />
              )}
            </div>
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