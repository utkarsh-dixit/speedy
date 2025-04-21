import React from 'react';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
  tooltipText?: string;
  disabled?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  className = '',
  tooltipText,
  disabled = false,
}) => {
  return (
    <div className="relative group">
      <button
        className={`
          p-2 rounded-md transition-all duration-200
          ${disabled ? 'text-gray-500 cursor-not-allowed' : 'hover:bg-app-surface-light text-app-text'}
          ${className}
        `}
        onClick={onClick}
        disabled={disabled}
        aria-label={tooltipText}
      >
        {icon}
      </button>
      
      {tooltipText && (
        <div className="
          absolute left-1/2 -bottom-8 transform -translate-x-1/2 px-2 py-1 
          bg-app-surface text-app-text text-xs rounded shadow-app 
          opacity-0 group-hover:opacity-100 transition-opacity duration-200
          whitespace-nowrap z-10
        ">
          {tooltipText}
        </div>
      )}
    </div>
  );
};

export default IconButton;