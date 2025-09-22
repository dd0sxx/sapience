'use client';

import type * as React from 'react';
import { Switch } from '@sapience/ui/components/ui/switch';
import CategoryChips from './CategoryChips';
import type { FocusArea } from '~/lib/constants/focusAreas';

interface Category {
  id: number;
  slug: string;
  name: string;
}

const selectedStatusClass = 'bg-secondary';
const hoverStatusClass = '';

interface FocusAreaFilterProps {
  selectedCategorySlug: string | null;
  handleCategoryClick: (categorySlug: string | null) => void;
  statusFilter: 'all' | 'active';
  handleStatusFilterClick: (filter: 'all' | 'active') => void;
  parlayMode: boolean;
  onParlayModeChange: (enabled: boolean) => void;
  isLoadingCategories: boolean;
  categories: Category[] | null | undefined;
  getCategoryStyle: (categorySlug: string) => FocusArea | undefined;
  containerClassName?: string;
}

const FocusAreaFilter: React.FC<FocusAreaFilterProps> = ({
  selectedCategorySlug,
  handleCategoryClick,
  statusFilter,
  handleStatusFilterClick,
  parlayMode,
  onParlayModeChange,
  isLoadingCategories,
  categories,
  getCategoryStyle,
  containerClassName,
}) => {
  return (
    <div className={containerClassName || 'px-0 py-0 w-full'}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center lg:justify-between gap-2 md:gap-4 lg:gap-2">
        {/* Categories Row */}
        <CategoryChips
          selectedCategorySlug={selectedCategorySlug}
          onCategoryClick={handleCategoryClick}
          isLoading={isLoadingCategories}
          categories={categories}
          getCategoryStyle={getCategoryStyle}
        />

        {/* Status on the right (stacks below on small screens) */}
        <div className="order-1 lg:order-2 w-full lg:w-auto flex-shrink-0 mb-1 lg:mb-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground mr-1.5">
              Status
            </span>
            <button
              type="button"
              className={`px-2.5 py-1 text-xs rounded-full ${statusFilter === 'active' ? selectedStatusClass : hoverStatusClass}`}
              onClick={() => handleStatusFilterClick('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 text-xs rounded-full ${statusFilter === 'all' ? selectedStatusClass : hoverStatusClass}`}
              onClick={() => handleStatusFilterClick('all')}
            >
              All
            </button>

            <div className="hidden lg:block h-4 w-px bg-border mx-1" />
            <div className="ml-auto lg:ml-0 flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground ml-2">
                Parlay Mode
              </span>
              <Switch
                checked={parlayMode}
                onCheckedChange={onParlayModeChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusAreaFilter;
