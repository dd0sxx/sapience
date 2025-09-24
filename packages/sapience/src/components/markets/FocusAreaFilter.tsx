'use client';

import type * as React from 'react';
import { Switch } from '@sapience/ui/components/ui/switch';
import { SquareStack as SquareStackIcon } from 'lucide-react';
import CategoryChips from './CategoryChips';
import type { FocusArea } from '~/lib/constants/focusAreas';

interface Category {
  id: number;
  slug: string;
  name: string;
}

const DEFAULT_CATEGORY_COLOR = '#71717a';
const selectedStatusClass =
  'bg-[var(--chip-bg-strong)] border border-transparent ring-1 ring-[var(--chip-ring)]';
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
      <div className="flex flex-col min-[1400px]:flex-row items-start min-[1400px]:items-center gap-2">
        {/* Controls row: Parlay left, Status right (mobile). On largest, Status moves to centered sibling */}
        <div className="w-full min-[1400px]:w-auto flex items-center gap-2">
          {/* Parlay toggle */}
          <div className="relative flex items-center gap-2 min-[1400px]:mr-5">
            <SquareStackIcon
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap mr-0.5">
              Parlay Mode
            </span>
            <Switch checked={parlayMode} onCheckedChange={onParlayModeChange} />
          </div>

          {/* Status buttons (mobile/tablet): aligned right within controls row; hidden on >=1400px */}
          <div className="ml-auto min-[1400px]:hidden flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground mr-1.5">
              Status
            </span>
            <button
              type="button"
              className={`inline-flex items-center px-2.5 py-1 text-xs rounded-full md:h-6 md:py-0 ${statusFilter === 'active' ? selectedStatusClass : hoverStatusClass}`}
              style={
                statusFilter === 'active'
                  ? ({
                      ['--chip-bg-strong' as any]: `${DEFAULT_CATEGORY_COLOR}33`,
                      ['--chip-ring' as any]: `${DEFAULT_CATEGORY_COLOR}66`,
                    } as React.CSSProperties)
                  : undefined
              }
              onClick={() => handleStatusFilterClick('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={`inline-flex items-center px-2.5 py-1 text-xs rounded-full md:h-6 md:py-0 ${statusFilter === 'all' ? selectedStatusClass : hoverStatusClass}`}
              style={
                statusFilter === 'all'
                  ? ({
                      ['--chip-bg-strong' as any]: `${DEFAULT_CATEGORY_COLOR}33`,
                      ['--chip-ring' as any]: `${DEFAULT_CATEGORY_COLOR}66`,
                    } as React.CSSProperties)
                  : undefined
              }
              onClick={() => handleStatusFilterClick('all')}
            >
              All
            </button>
          </div>
        </div>

        {/* Status buttons (desktop >=1400px): centered between Parlay and Category chips */}
        <div className="hidden min-[1400px]:flex flex-1 justify-center items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1.5">
            Status
          </span>
          <button
            type="button"
            className={`inline-flex items-center px-2.5 py-1 text-xs rounded-full md:h-6 md:py-0 ${statusFilter === 'active' ? selectedStatusClass : hoverStatusClass}`}
            style={
              statusFilter === 'active'
                ? ({
                    ['--chip-bg-strong' as any]: `${DEFAULT_CATEGORY_COLOR}33`,
                    ['--chip-ring' as any]: `${DEFAULT_CATEGORY_COLOR}66`,
                  } as React.CSSProperties)
                : undefined
            }
            onClick={() => handleStatusFilterClick('active')}
          >
            Active
          </button>
          <button
            type="button"
            className={`inline-flex items-center px-2.5 py-1 text-xs rounded-full md:h-6 md:py-0 ${statusFilter === 'all' ? selectedStatusClass : hoverStatusClass}`}
            style={
              statusFilter === 'all'
                ? ({
                    ['--chip-bg-strong' as any]: `${DEFAULT_CATEGORY_COLOR}33`,
                    ['--chip-ring' as any]: `${DEFAULT_CATEGORY_COLOR}66`,
                  } as React.CSSProperties)
                : undefined
            }
            onClick={() => handleStatusFilterClick('all')}
          >
            All
          </button>
        </div>

        {/* Category chips: below controls on small; inline and right-aligned on largest */}
        <div className="w-full min-[1400px]:flex-1 min-[1400px]:flex min-[1400px]:justify-end">
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
