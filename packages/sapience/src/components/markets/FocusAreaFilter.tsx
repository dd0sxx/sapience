'use client';

import type * as React from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@sapience/sdk/ui/components/ui/tabs';
import { Button } from '@sapience/sdk/ui/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sapience/sdk/ui/components/ui/tooltip';
import { LayoutGridIcon, ListIcon } from 'lucide-react';
import CategoryChips from './CategoryChips';
import type { FocusArea } from '~/lib/constants/focusAreas';

interface Category {
  id: number;
  slug: string;
  name: string;
}

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
  viewMode: 'list' | 'grid';
  onToggleViewMode: () => void;
  showViewToggle?: boolean;
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
  viewMode,
  onToggleViewMode,
  showViewToggle,
}) => {
  const visibleViewToggle = showViewToggle ?? true;
  return (
    <div className={containerClassName || 'px-0 py-0 w-full'}>
      <div className="w-full min-w-0 flex flex-col min-[1400px]:flex-row items-start min-[1400px]:items-center gap-2">
        {/* Controls row: moves to the right on large screens */}
        <div className="w-full min-w-0 min-[1400px]:w-auto flex items-center gap-2 min-[1400px]:order-2 min-[1400px]:justify-end">
          {/* View mode segmented control: Perps (parlay) | Spot */}
          <div className="relative flex items-center gap-2 min-[1400px]:mr-2">
            <Tabs
              value={parlayMode ? 'perps' : 'spot'}
              onValueChange={(v) => onParlayModeChange(v === 'perps')}
            >
              <TabsList className="inline-flex items-center p-1">
                <TabsTrigger
                  value="perps"
                  className="text-sm px-3 h-8 leading-none rounded-md"
                >
                  Parlays
                </TabsTrigger>
                <TabsTrigger
                  value="spot"
                  className="text-sm px-3 h-8 leading-none rounded-md"
                >
                  Spot
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Status tabs: visible on all sizes; right-aligned on large */}
          <div className="ml-auto flex flex-nowrap items-center mr-0 gap-2">
            <Tabs
              value={statusFilter}
              onValueChange={(v) =>
                handleStatusFilterClick((v as 'active' | 'all') || 'active')
              }
            >
              <TabsList className="inline-flex items-center p-1">
                <TabsTrigger
                  value="active"
                  className="text-sm px-3 h-8 leading-none rounded-md"
                >
                  Active
                </TabsTrigger>
                <TabsTrigger
                  value="all"
                  className="text-sm px-3 h-8 leading-none rounded-md"
                >
                  All
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {visibleViewToggle ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="ml-2 h-10 w-10 hidden md:inline-flex"
                      aria-label={
                        viewMode === 'grid'
                          ? 'Switch to list view'
                          : 'Switch to grid view'
                      }
                      aria-pressed={viewMode === 'grid'}
                      onClick={onToggleViewMode}
                    >
                      {viewMode === 'grid' ? (
                        <ListIcon className="h-5 w-5" />
                      ) : (
                        <LayoutGridIcon className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {viewMode === 'grid' ? 'Toggle rows' : 'Toggle cards'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
        </div>

        {/* Category chips: left on large; below controls on small */}
        <div className="w-full min-w-0 min-[1400px]:order-1 min-[1400px]:flex-1 min-[1400px]:flex min-[1400px]:items-center min-[1400px]:justify-start min-[1400px]:gap-2">
          <CategoryChips
            selectedCategorySlug={selectedCategorySlug}
            onCategoryClick={handleCategoryClick}
            isLoading={isLoadingCategories}
            categories={categories}
            getCategoryStyle={getCategoryStyle}
          />
        </div>
      </div>
    </div>
  );
};

export default FocusAreaFilter;
