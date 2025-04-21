import React from 'react';
import styles from '../../assets/styles/components.module.scss';

type ButtonVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const Button = ({
  children,
  variant = 'default',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) => {
  const classNames = [
    styles.button,
    styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    styles[`button${size.toUpperCase()}`],
    fullWidth ? styles.buttonFullWidth : '',
    isLoading ? styles.buttonLoading : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classNames}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className={styles.buttonSpinner} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path
              opacity="0.75"
              d="M12 2a10 10 0 0 1 10 10"
            />
          </svg>
        </span>
      )}
      {leftIcon && !isLoading && <span className={styles.buttonLeftIcon}>{leftIcon}</span>}
      <span className={styles.buttonContent}>{children}</span>
      {rightIcon && !isLoading && <span className={styles.buttonRightIcon}>{rightIcon}</span>}
    </button>
  );
};

export default Button; 