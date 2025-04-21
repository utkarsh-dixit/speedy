import React from 'react';
import { Search } from '../../icons.v2';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
}) => {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search size={18} className="text-app-text-secondary" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          pl-10 pr-4 py-2 w-full bg-app-surface rounded-full
          border border-app-surface-light text-app-text placeholder-app-text-secondary
          focus:outline-none focus:border-app-primary transition-colors duration-200
        "
      />
    </div>
  );
};

export default SearchInput;