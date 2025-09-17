'use client';

import type * as React from 'react';
import { SearchIcon } from 'lucide-react';
import { Input } from '@sapience/ui/components/ui/input';

interface SearchBarProps {
  isMobile: boolean;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ isMobile, value, onChange }) => {
  return (
    <div className="relative flex items-center">
      <SearchIcon
        className="absolute left-1 md:left-0 top-1/2 md:top-0 md:bottom-0 -translate-y-1/2 md:translate-y-0 h-5 w-5 md:h-full md:w-auto md:p-3 text-muted-foreground opacity-40 z-10 pointer-events-none"
        strokeWidth={1}
      />
      <div className="flex-1 relative border-b border-border/80">
        <Input
          type="text"
          placeholder={isMobile ? 'Search' : 'Search questions...'}
          value={value}
          onChange={onChange}
          className="w-full text-lg md:text-3xl font-heading font-normal bg-transparent rounded-none border-0 placeholder:text-foreground placeholder:opacity-20 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto py-1.5 md:py-3 pl-8 md:pl-14"
        />
      </div>
    </div>
  );
};

export default SearchBar;
