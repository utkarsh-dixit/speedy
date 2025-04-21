import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import styles from '../../assets/styles/components.module.scss';

interface DialogProps {
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const Dialog = ({
  trigger,
  title,
  description,
  children,
  footer,
  open,
  onOpenChange,
  maxWidth = 'md'
}: DialogProps) => {
  const isControlled = open !== undefined && onOpenChange !== undefined;
  
  return (
    <DialogPrimitive.Root 
      open={isControlled ? open : undefined} 
      onOpenChange={isControlled ? onOpenChange : undefined}
    >
      {trigger && (
        <DialogPrimitive.Trigger asChild>
          {trigger}
        </DialogPrimitive.Trigger>
      )}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.dialogOverlay} />
        <DialogPrimitive.Content 
          className={`${styles.dialogContent} ${styles[`dialogMaxWidth${maxWidth.toUpperCase()}`]}`}
        >
          <div className={styles.dialogHeader}>
            <DialogPrimitive.Title className={styles.dialogTitle}>
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className={styles.dialogDescription}>
                {description}
              </DialogPrimitive.Description>
            )}
            <DialogPrimitive.Close className={styles.dialogCloseButton}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
            </DialogPrimitive.Close>
          </div>
          <div className={styles.dialogBody}>
            {children}
          </div>
          {footer && (
            <div className={styles.dialogFooter}>
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default Dialog; 