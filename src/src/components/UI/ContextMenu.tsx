import React from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import styles from '../../assets/styles/components.module.scss';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
  type?: 'default' | 'danger';
}

export interface ContextMenuGroup {
  items: ContextMenuItem[];
}

interface ContextMenuProps {
  children: React.ReactNode;
  groups: ContextMenuGroup[];
  className?: string;
}

const ContextMenu = ({
  children,
  groups,
  className = '',
}: ContextMenuProps) => {
  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>
        {children}
      </ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
          className={`${styles.contextMenuContent} ${className}`}
          sideOffset={5}
          align="start"
          avoidCollisions
        >
          {groups.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {groupIndex > 0 && (
                <ContextMenuPrimitive.Separator className={styles.contextMenuSeparator} />
              )}
              {group.items.map((item, itemIndex) => (
                <ContextMenuPrimitive.Item
                  key={itemIndex}
                  className={`${styles.contextMenuItem} ${item.type === 'danger' ? styles.contextMenuItemDanger : ''}`}
                  onClick={item.onClick}
                  disabled={item.disabled}
                >
                  {item.icon && <span className={styles.contextMenuItemIcon}>{item.icon}</span>}
                  <span className={styles.contextMenuItemLabel}>{item.label}</span>
                  {item.shortcut && <span className={styles.contextMenuItemShortcut}>{item.shortcut}</span>}
                </ContextMenuPrimitive.Item>
              ))}
            </React.Fragment>
          ))}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
};

export default ContextMenu; 