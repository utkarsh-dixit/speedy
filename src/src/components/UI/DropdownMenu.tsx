import React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import styles from '../../assets/styles/components.module.scss';

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

const DropdownMenu = ({
  trigger,
  items,
  align = 'end',
  side = 'bottom',
  className = '',
}: DropdownMenuProps) => {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        {trigger}
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          className={`${styles.dropdownMenuContent} ${className}`}
          align={align}
          side={side}
          sideOffset={5}
          avoidCollisions
        >
          {items.map((item, index) => (
            <DropdownMenuPrimitive.Item
              key={index}
              className={styles.dropdownMenuItem}
              onClick={item.onClick}
              disabled={item.disabled}
            >
              {item.icon && <span className={styles.dropdownMenuItemIcon}>{item.icon}</span>}
              <span className={styles.dropdownMenuItemLabel}>{item.label}</span>
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
};

export default DropdownMenu; 