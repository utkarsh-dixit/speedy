import React from 'react';
import { Settings, Download, Minimize2, Maximize2, X, List, Grid } from '../../../icons.v2';
import IconButton from '../../../components/iconButton';
import SearchInput from '../../../components/input/searchInput';

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
  onToggleView,
}) => {
  return (
    <div className="flex flex-col">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-header">
        <div className="flex items-center">
          <Download className="text-app-accent mr-2" size={22} />
          <h1 className="text-app-text text-lg font-medium">{title}</h1>
        </div>
        
        <div className="flex items-center">
          <IconButton 
            icon={<Minimize2 size={18} />} 
            className="text-app-text-secondary" 
            tooltipText="Minimize"
          />
          <IconButton 
            icon={<Maximize2 size={18} />} 
            className="text-app-text-secondary"
            tooltipText="Maximize"
          />
          <IconButton 
            icon={<X size={18} />} 
            className="text-app-text-secondary hover:text-app-error"
            tooltipText="Close"
          />
        </div>
      </div>
      
      {/* Menu bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-app-surface border-b border-app-surface-light">
        <div className="flex space-x-4">
          {['Tasks', 'File', 'Downloads', 'View', 'Help'].map((item) => (
            <button 
              key={item} 
              className="text-sm text-app-text-secondary hover:text-app-text"
            >
              {item}
            </button>
          ))}
        </div>
        
        <div className="flex-grow flex justify-end">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search in the List"
          />
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-app-surface border-b border-app-surface-light">
        <div className="flex items-center space-x-2">
          <IconButton
            icon={isGridView ? <List size={18} /> : <Grid size={18} />}
            onClick={onToggleView}
            tooltipText={isGridView ? "List View" : "Grid View"}
          />
          
          <IconButton
            icon={<Settings size={18} />}
            tooltipText="Settings"
          />
        </div>
      </div>
    </div>
  );
};

export default Header;