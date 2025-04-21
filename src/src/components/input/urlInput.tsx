import React, { useState } from 'react';
import { Download } from '../../icons.v2';
import Button from '../buttons/button.v2';
import * as Form from '@radix-ui/react-form';

interface UrlInputProps {
  onAddDownload: (url: string) => void;
}

const UrlInput: React.FC<UrlInputProps> = ({ onAddDownload }) => {
  const [url, setUrl] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddDownload(url);
    setUrl('');
  };
  
  return (
    <Form.Root onSubmit={handleSubmit} className="flex items-center w-full gap-2">
      <Form.Field name="url" className="flex-grow">
        <Form.Control asChild>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL..."
            className="w-full py-1.5 px-2 bg-app-surface border border-app-surface-light rounded-md text-app-text placeholder-app-text-secondary focus:outline-none focus:border-app-primary transition-colors"
            aria-label="Download URL"
          />
        </Form.Control>
      </Form.Field>
      <Button 
        type="submit" 
        disabled={!url.trim()}
        icon={<Download size={16} />}
        className="py-1.5 px-2 text-sm"
      >
        Add
      </Button>
    </Form.Root>
  );
};

export default UrlInput;