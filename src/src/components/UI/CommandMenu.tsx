import React, { useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Search, Command, Plus, Download, Trash, Pause, Play, Edit, Copy } from 'lucide-react';
import styles from '../../assets/styles/components.module.scss';
import managerStyles from '../../assets/styles/manager.module.scss';

interface CommandItem {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  action: () => void;
}

interface CommandSection {
  id: string;
  name: string;
  items: CommandItem[];
}

interface CommandMenuProps {
  onAddDownload?: () => void;
  onSearch?: (query: string) => void;
  onPauseDownload?: (id: number) => void;
  onResumeDownload?: (id: number) => void;
  onDeleteDownload?: (id: number) => void;
  onCopyDownloadUrl?: (id: number) => void;
  onEditDownload?: (id: number) => void;
  downloadItems?: Array<{ id: number; name: string; status?: string }>;
}

const CommandMenu: React.FC<CommandMenuProps> = ({
  onAddDownload,
  onSearch,
  onPauseDownload,
  onResumeDownload,
  onDeleteDownload,
  onCopyDownloadUrl,
  onEditDownload,
  downloadItems = []
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [sections, setSections] = useState<CommandSection[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    // Register keyboard shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Build command sections
  useEffect(() => {
    const generalCommands: CommandItem[] = [
      {
        id: 'add-download',
        name: 'Add Download',
        description: 'Add a new download',
        icon: <Plus size={16} />,
        shortcut: ['A'],
        action: () => {
          if (onAddDownload) {
            onAddDownload();
            setOpen(false);
          }
        }
      },
      {
        id: 'search',
        name: 'Search Downloads',
        description: 'Search through your downloads',
        icon: <Search size={16} />,
        shortcut: ['S'],
        action: () => {
          if (onSearch) {
            onSearch(searchValue);
            setOpen(false);
          }
        }
      }
    ];

    // Add download-specific commands
    const downloadCommands: CommandItem[] = downloadItems.flatMap(item => {
      const commands: CommandItem[] = [];
      
      if (item.status === 'downloading') {
        commands.push({
          id: `pause-${item.id}`,
          name: `Pause: ${item.name}`,
          icon: <Pause size={16} />,
          action: () => {
            if (onPauseDownload) {
              onPauseDownload(item.id);
              setOpen(false);
            }
          }
        });
      } else if (item.status === 'paused') {
        commands.push({
          id: `resume-${item.id}`,
          name: `Resume: ${item.name}`,
          icon: <Play size={16} />,
          action: () => {
            if (onResumeDownload) {
              onResumeDownload(item.id);
              setOpen(false);
            }
          }
        });
      }
      
      commands.push({
        id: `edit-${item.id}`,
        name: `Edit: ${item.name}`,
        icon: <Edit size={16} />,
        action: () => {
          if (onEditDownload) {
            onEditDownload(item.id);
            setOpen(false);
          }
        }
      });
      
      commands.push({
        id: `copy-${item.id}`,
        name: `Copy URL: ${item.name}`,
        icon: <Copy size={16} />,
        action: () => {
          if (onCopyDownloadUrl) {
            onCopyDownloadUrl(item.id);
            setOpen(false);
          }
        }
      });
      
      commands.push({
        id: `delete-${item.id}`,
        name: `Delete: ${item.name}`,
        icon: <Trash size={16} />,
        action: () => {
          if (onDeleteDownload) {
            onDeleteDownload(item.id);
            setOpen(false);
          }
        }
      });
      
      return commands;
    });

    const commandSections: CommandSection[] = [
      {
        id: 'general',
        name: 'General',
        items: generalCommands
      }
    ];
    
    if (downloadCommands.length > 0) {
      commandSections.push({
        id: 'downloads',
        name: 'Downloads',
        items: downloadCommands
      });
    }

    setSections(commandSections);
    
    // Select the first item by default
    if (commandSections.length > 0 && commandSections[0].items.length > 0) {
      setSelectedItemId(commandSections[0].items[0].id);
    }
  }, [downloadItems, onAddDownload, onCopyDownloadUrl, onDeleteDownload, onEditDownload, onPauseDownload, onResumeDownload, onSearch, searchValue]);

  // Filter items based on search
  const filteredSections = searchValue.trim() === '' 
    ? sections 
    : sections.map(section => ({
        ...section,
        items: section.items.filter(item => 
          item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchValue.toLowerCase()))
        )
      })).filter(section => section.items.length > 0);
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allItems = filteredSections.flatMap(section => section.items);
    const currentIndex = selectedItemId ? allItems.findIndex(item => item.id === selectedItemId) : -1;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < allItems.length - 1) {
          setSelectedItemId(allItems[currentIndex + 1].id);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          setSelectedItemId(allItems[currentIndex - 1].id);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedItemId) {
          const selectedItem = allItems.find(item => item.id === selectedItemId);
          if (selectedItem) {
            selectedItem.action();
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button className={managerStyles.commandMenuTrigger}>
          <span>Command Menu</span>
          <div className={managerStyles.keyboardShortcut}>
            <kbd className={managerStyles.keyboardKey}>⌘</kbd>
            <kbd className={managerStyles.keyboardKey}>K</kbd>
          </div>
        </button>
      </DialogPrimitive.Trigger>
      
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.dialogOverlay} />
        <DialogPrimitive.Content
          className={`${styles.dialogContent} ${styles.dialogMaxWidthMD}`}
          style={{ maxWidth: '600px' }}
          onKeyDown={handleKeyDown}
        >
          <div className={styles.commandMenuSearch}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search commands..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              autoFocus
            />
            <div className={managerStyles.keyboardShortcut}>
              <kbd className={managerStyles.keyboardKey}>Esc</kbd>
            </div>
          </div>
          
          <div className={styles.commandMenuContent}>
            {filteredSections.map((section) => (
              <div key={section.id} className={styles.commandMenuSection}>
                <div className={styles.commandMenuSectionHeader}>
                  {section.name}
                </div>
                <div className={styles.commandMenuItems}>
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className={`${styles.commandMenuItem} ${selectedItemId === item.id ? styles.commandMenuItemSelected : ''}`}
                      onClick={() => item.action()}
                      onMouseEnter={() => setSelectedItemId(item.id)}
                    >
                      {item.icon && <div className={styles.commandMenuItemIcon}>{item.icon}</div>}
                      <div className={styles.commandMenuItemContent}>
                        <div className={styles.commandMenuItemName}>{item.name}</div>
                        {item.description && <div className={styles.commandMenuItemDescription}>{item.description}</div>}
                      </div>
                      {item.shortcut && (
                        <div className={styles.commandMenuItemShortcut}>
                          {item.shortcut.map((key, i) => (
                            <kbd key={i} className={managerStyles.keyboardKey}>{key}</kbd>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {filteredSections.length === 0 && (
              <div className={styles.commandMenuEmpty}>
                No commands found
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default CommandMenu; 