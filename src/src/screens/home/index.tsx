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
    fileCheckResult,
    handleExistingFileDecision
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
  
  // Convert number IDs to strings for compatibility with DownloadList
  const stringSelectedIds = selectedDownloadIds.map(id => id.toString());
  
  // Handler functions that convert string IDs to numbers
  const handleTogglePause = (id: string) => togglePause(Number(id));
  const handleCancel = (id: string) => cancelDownload(Number(id));
  const handleToggleSelect = (id: string) => toggleSelect(Number(id));
  
  return (
    <div className={`flex flex-col h-screen ${isDarkTheme ? 'dark bg-black text-gray-100' : 'bg-white text-gray-900'}`}>
      <Header 
        title="Downloads"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isGridView={isGridView}
        onToggleView={() => setIsGridView(!isGridView)}
      />
      <div className="flex-grow flex overflow-hidden mt-1">
        <Sidebar 
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          stats={stats}
        />
        
        <div className="flex-grow flex flex-col overflow-hidden relative bg-black">
          <DownloadList
            downloads={downloads}
            onAddDownload={addDownload}
            onTogglePause={handleTogglePause}
            onCancel={handleCancel}
            onToggleSelect={handleToggleSelect}
            onSelectAll={selectAll}
            sort={sort}
            onSort={handleSortChange}
            selectedIds={stringSelectedIds}
          />
        </div>
      </div>
      
      <StatusBar stats={initialSystemStats} />
      
      {/* File Exists Dialog */}
      {fileCheckResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">File Already Exists</h3>
            
            {fileCheckResult.type === 'in_progress' ? (
              <p className="mb-4">
                This file is already being downloaded in parts. Would you like to resume the existing download or start a new one with a different name?
              </p>
            ) : (
              <p className="mb-4">
                A file with this name already exists. Would you like to download it with a new name?
              </p>
            )}
            
            <div className="flex flex-col space-y-2 text-sm text-gray-400 mb-4">
              <div>Original filename: <span className="text-white">{fileCheckResult.original_filename}</span></div>
              {fileCheckResult.type === 'in_progress' && (
                <div>Parts found: <span className="text-white">{fileCheckResult.part_files}</span></div>
              )}
              <div>Suggested filename: <span className="text-white">{fileCheckResult.suggested_filename}</span></div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => handleExistingFileDecision('cancel')}
                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                type="button"
              >
                Cancel
              </button>
              
              {fileCheckResult.type === 'in_progress' && (
                <button 
                  onClick={() => handleExistingFileDecision('resume')}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
                  type="button"
                >
                  Resume Existing
                </button>
              )}
              
              <button 
                onClick={() => handleExistingFileDecision('new')}
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-500"
                type="button"
              >
                {fileCheckResult.type === 'in_progress' ? 'Start New' : 'Use New Name'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomeScreen;