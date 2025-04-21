import React from 'react';
import dynamic from 'next/dynamic';
import UrlInput from '../../../components/input/urlInput';
import { Download } from '../../../types/download';
import { SortOption, SortDirection, DownloadSort } from '../../../types/download';
import { ChevronDown, ChevronUp } from '../../../icons.v2';

// Use dynamic import with ssr: false to prevent hydration errors
const DownloadItem = dynamic(() => import('../downloadItems'), { ssr: false });

interface DownloadListProps {
  downloads: Download[];
  onAddDownload: (url: string) => void;
  onTogglePause: (id: string) => void;
  onCancel: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  sort: DownloadSort;
  onSort: (option: SortOption, direction: SortDirection) => void;
  selectedIds: string[];
}

const DownloadList: React.FC<DownloadListProps> = ({
  downloads, onAddDownload, onTogglePause, onCancel, onToggleSelect, 
  onSelectAll, sort, onSort, selectedIds
}) => {
  const handleSortClick = (option: SortOption) => {
    if (sort.option === option) {
      onSort(option, sort.direction === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(option, 'desc');
    }
  };
  
  const getSortIcon = (option: SortOption) => 
    sort.option !== option ? null : (sort.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />);
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 bg-black border-b border-gray-800">
        <UrlInput onAddDownload={onAddDownload} />
      </div>
      
      <div className="flex-grow overflow-x-hidden">
        {/* <div className="sticky top-0 bg-black z-10 border-b border-gray-800">
          <div className="flex items-center p-2 text-xs text-gray-400 font-medium">
            <div className="flex-shrink-0 w-6 mr-2">
              <input
                type="checkbox"
                checked={selectedIds.length === downloads.length && downloads.length > 0}
                onChange={onSelectAll}
                className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-1"
              />
            </div>
            
            <div className="flex-shrink-0 w-8 mr-2"></div>
            
            <button
              className="flex items-center flex-grow pl-0 py-1 hover:text-white"
              onClick={() => handleSortClick('name')}
            >
              <span>Name</span>
              {getSortIcon('name')}
            </button>
            
            <button
              className="flex items-center w-24 justify-end hover:text-white"
              onClick={() => handleSortClick('size')}
            >
              <span>Size</span>
              {getSortIcon('size')}
            </button>
            
            <div className="flex-shrink-0 w-28"></div>
          </div>
        </div> */}
        
        <div className="bg-black mt-2">
          {downloads.length > 0 ? (
            downloads.map((download) => (
              <DownloadItem
                key={download.id}
                download={download}
                onTogglePause={() => onTogglePause(download.id)}
                onCancel={() => onCancel(download.id)}
                onToggleSelect={() => onToggleSelect(download.id)}
                selected={selectedIds.includes(download.id)}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400">
              No downloads found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DownloadList;