import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import styles from '../assets/styles/button.module.scss';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className={styles.spinner} aria-hidden="true" />
      )}
      
      {!loading && icon && iconPosition === 'left' && (
        <span className={styles.leftIcon}>{icon}</span>
      )}
      
      <span className={loading ? styles.invisible : ''}>
        {children}
      </span>
      
      {!loading && icon && iconPosition === 'right' && (
        <span className={styles.rightIcon}>{icon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
