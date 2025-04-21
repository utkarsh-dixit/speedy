import React from 'react';
import ContextMenu, { ContextMenuGroup } from './ContextMenu';
import { Copy, Trash, Play, Pause, Save, Share, Edit } from 'lucide-react';

interface ContextMenuWrapperProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onCopy?: () => void;
  onResume?: () => void;
  onPause?: () => void;
  onSave?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  disabledActions?: string[];
}

const ContextMenuWrapper: React.FC<ContextMenuWrapperProps> = ({
  children,
  onDelete,
  onCopy,
  onResume,
  onPause,
  onSave,
  onEdit,
  onShare,
  disabledActions = [],
}) => {
  const groups: ContextMenuGroup[] = [
    {
      items: [
        {
          label: 'Copy',
          onClick: onCopy || (() => {}),
          icon: <Copy size={16} />,
          disabled: disabledActions.includes('copy') || !onCopy,
          shortcut: '⌘C',
        },
        {
          label: 'Edit',
          onClick: onEdit || (() => {}),
          icon: <Edit size={16} />,
          disabled: disabledActions.includes('edit') || !onEdit,
        },
      ]
    },
    {
      items: [
        {
          label: 'Resume',
          onClick: onResume || (() => {}),
          icon: <Play size={16} />,
          disabled: disabledActions.includes('resume') || !onResume,
        },
        {
          label: 'Pause',
          onClick: onPause || (() => {}),
          icon: <Pause size={16} />,
          disabled: disabledActions.includes('pause') || !onPause,
        },
      ]
    },
    {
      items: [
        {
          label: 'Save',
          onClick: onSave || (() => {}),
          icon: <Save size={16} />,
          disabled: disabledActions.includes('save') || !onSave,
          shortcut: '⌘S',
        },
        {
          label: 'Share',
          onClick: onShare || (() => {}),
          icon: <Share size={16} />,
          disabled: disabledActions.includes('share') || !onShare,
        },
      ]
    },
    {
      items: [
        {
          label: 'Delete',
          onClick: onDelete || (() => {}),
          icon: <Trash size={16} />,
          disabled: disabledActions.includes('delete') || !onDelete,
          type: 'danger',
          shortcut: '⌫',
        },
      ]
    }
  ];

  // Filter out groups with all disabled items
  const filteredGroups = groups.filter(group => 
    group.items.some(item => !item.disabled)
  );

  return (
    <ContextMenu groups={filteredGroups}>
      {children}
    </ContextMenu>
  );
};

export default ContextMenuWrapper; 