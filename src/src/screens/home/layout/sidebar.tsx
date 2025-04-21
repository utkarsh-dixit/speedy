import React from 'react';
import { 
  Download, Music, FileArchive, Video, Package, FileText, 
  Smartphone, Image, Clock, Check, Pause, X
} from '../../../icons.v2';
import { CategoryFilter } from '../../../types/download';

interface SidebarProps {
  categoryFilter: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  stats: {
    all: number;
    active: number;
    completed: number;
    paused: number;
    error: number;
  };
}

const Sidebar: React.FC<SidebarProps> = ({
  categoryFilter,
  onCategoryChange,
  stats,
}) => {
  const categories = [
    { id: 'all', label: 'All Downloads', icon: <Download size={16} />, count: stats.all },
    { id: 'active', label: 'Active', icon: <Clock size={16} />, count: stats.active },
    { id: 'completed', label: 'Completed', icon: <Check size={16} />, count: stats.completed },
    { id: 'paused', label: 'Paused', icon: <Pause size={16} />, count: stats.paused },
    { id: 'error', label: 'Error', icon: <X size={16} />, count: stats.error },
  ];
  
  const fileTypes = [
    { id: 'music', label: 'Music', icon: <Music size={16} /> },
    { id: 'compressed', label: 'Compressed', icon: <FileArchive size={16} /> },
    { id: 'videos', label: 'Videos', icon: <Video size={16} /> },
    { id: 'programs', label: 'Programs', icon: <Package size={16} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={16} /> },
    { id: 'apks', label: 'APKs', icon: <Smartphone size={16} /> },
    { id: 'images', label: 'Images', icon: <Image size={16} /> },
  ];
  
  return (
    <div className="w-48 h-full bg-black flex flex-col border-r border-gray-800">
      <div className="p-2">
        <div className="mb-4">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md mb-0.5 text-xs transition-colors
                ${categoryFilter === category.id ? 'bg-app-primary bg-opacity-20 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
              onClick={() => onCategoryChange(category.id as CategoryFilter)}
            >
              <div className="flex items-center">
                <span className="mr-1.5">{category.icon}</span>
                <span>{category.label}</span>
              </div>
              <span className="text-xs bg-gray-800 px-1.5 py-0.5 rounded-full">{category.count}</span>
            </button>
          ))}
        </div>
        
        <div>
          <h3 className="text-xs uppercase text-gray-400 font-medium px-2 mb-1">File Types</h3>
          {fileTypes.map((type) => (
            <button
              key={type.id}
              className="flex items-center w-full px-2 py-1.5 rounded-md mb-0.5 text-xs text-gray-400 hover:bg-gray-800 transition-colors"
            >
              <span className="mr-1.5">{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;