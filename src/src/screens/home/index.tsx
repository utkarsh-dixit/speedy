import React, { useState, useEffect } from 'react';
import Header from './layout/header';
import Sidebar from './layout/sidebar';
import DownloadList from './layout/downloadList';
import StatusBar from './layout/statusBar';
import { useDownloads } from '../../hooks/useDownloads';
import { initialSystemStats } from '../../data/mockData';
import type { SortOption, SortDirection } from '../../types/download';

function HomeScreen() {
  const {
    downloads,
    addDownload,
    togglePause,
    cancelDownload,
    toggleSelect,
    selectAll,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    sort,
    setSort,
    selectedDownloadIds,
  } = useDownloads();

  const [isGridView, setIsGridView] = useState(false);
  const [showOffer, setShowOffer] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(true); // Default to dark theme
  
  // Apply dark theme to document element
  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkTheme]);
  
  const handleSortChange = (option: SortOption, direction: SortDirection) => {
    setSort({ option, direction });
  };
  
  const stats = {
    all: downloads.length,
    active: downloads.filter(d => d.status === 'downloading').length,
    completed: downloads.filter(d => d.status === 'completed').length,
    paused: downloads.filter(d => d.status === 'paused').length,
    error: downloads.filter(d => d.status === 'error').length,
  };
  
  return (
    <div className={`flex flex-col h-screen ${isDarkTheme ? 'dark bg-black text-gray-100' : 'bg-white text-gray-900'}`}>
      <Header 
        title="Downloads"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isGridView={isGridView}
        onToggleView={() => setIsGridView(!isGridView)}
      />
      <div className="flex-grow flex overflow-hidden">
        <Sidebar 
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          stats={stats}
        />
        
        <div className="flex-grow flex flex-col overflow-hidden relative bg-black">
          <DownloadList
            downloads={downloads}
            onAddDownload={addDownload}
            onTogglePause={togglePause}
            onCancel={cancelDownload}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
            sort={sort}
            onSort={handleSortChange}
            selectedIds={selectedDownloadIds}
          />
        </div>
      </div>
      
      <StatusBar stats={initialSystemStats} />
    </div>
  );
}

export default HomeScreen;