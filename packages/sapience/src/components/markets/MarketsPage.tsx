'use client';

import { useIsMobile } from '@sapience/ui/hooks/use-mobile';
import {
  useMarketsData,
  type GroupedMarketGroup,
} from '@sapience/ui/hooks/useMarketsData';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { FrownIcon } from 'lucide-react';
import dynamic from 'next/dynamic'; // Import dynamic
import { useSearchParams, useRouter } from 'next/navigation';
import type { ChangeEvent } from 'react';
import { useEffect, useState, useMemo } from 'react';

import { SearchBar } from '@sapience/ui';
import MarketGroupsRow from './MarketGroupsRow';
import ParlayModeRow from './ParlayModeRow';
import FocusAreaFilter from './FocusAreaFilter';
// Focus areas are now handled by the category utility functions
import type { MarketGroupClassification } from '~/lib/types';
import Betslip from '~/components/markets/Betslip';
import { getCategoryColor, getCategoryStyle } from '~/lib/utils/category';

// Extended type for Sapience that includes color
type GroupedMarketGroupWithColor = GroupedMarketGroup & {
  color: string;
};

// Custom hook for debouncing values
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Dynamically import LottieLoader
const LottieLoader = dynamic(() => import('~/components/shared/LottieLoader'), {
  ssr: false,
  // Use a simple div as placeholder during load
  loading: () => <div className="w-8 h-8" />,
});

const DEFAULT_CATEGORY_COLOR = '#71717a';

// Helper to format end date display using date-fns
const formatEndDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return format(date, 'MMMM d, yyyy');
};

const MarketsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get the category SLUG from the URL query parameter, default to null (all)
  const categorySlugParam = searchParams.get('category');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<
    string | null
  >(categorySlugParam);

  // Add state for the active/settled toggle
  const [statusFilter, setStatusFilter] = useState<'all' | 'active'>('active');

  // State for text filter
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Parlay Mode toggle
  const [parlayMode, setParlayMode] = useState<boolean>(false);

  // Initialize parlay mode from URL hash unconditionally
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#parlays') {
      setParlayMode(true);
    }
  }, []);

  // Update the state when the URL parameter changes
  useEffect(() => {
    const currentCategorySlug = searchParams.get('category');
    // Basic validation: just set if it exists or is null
    setSelectedCategorySlug(currentCategorySlug);
  }, [searchParams]);

  // Get mobile status
  const isMobile = useIsMobile();

  // Use the new markets data hook
  const {
    data: rawMarketsData,
    isLoading: isLoadingMarketsData,
    error: marketsDataError,
  } = useMarketsData({
    selectedCategorySlug,
    statusFilter,
    searchTerm: debouncedSearchTerm,
    conditionsTake: 200,
    conditionsSkip: 0,
  });

  // Enrich market groups with colors and extract data from the hook
  const {
    groupedMarketGroups,
    marketGroupsByDay,
    sortedMarketDays,
    filteredConditions,
    conditionsByDay,
    sortedConditionDays,
  } = useMemo(() => {
    if (!rawMarketsData) {
      return {
        groupedMarketGroups: [],
        marketGroupsByDay: {} as Record<string, GroupedMarketGroupWithColor[]>,
        sortedMarketDays: [],
        filteredConditions: [],
        conditionsByDay: {},
        sortedConditionDays: [],
      };
    }

    // Enrich market groups with colors
    const enrichedGroupedMarketGroups = rawMarketsData.groupedMarketGroups.map(
      (group): GroupedMarketGroupWithColor => ({
        ...group,
        color: getCategoryColor(group.categorySlug),
      })
    );

    // Enrich marketGroupsByDay with colors
    const enrichedMarketGroupsByDay: Record<
      string,
      GroupedMarketGroupWithColor[]
    > = {};
    Object.entries(rawMarketsData.marketGroupsByDay).forEach(
      ([dayKey, marketGroups]) => {
        enrichedMarketGroupsByDay[dayKey] = marketGroups.map(
          (group): GroupedMarketGroupWithColor => ({
            ...group,
            color: getCategoryColor(group.categorySlug),
          })
        );
      }
    );

    return {
      groupedMarketGroups: enrichedGroupedMarketGroups,
      marketGroupsByDay: enrichedMarketGroupsByDay,
      sortedMarketDays: rawMarketsData.sortedMarketDays,
      filteredConditions: rawMarketsData.filteredConditions,
      conditionsByDay: rawMarketsData.conditionsByDay,
      sortedConditionDays: rawMarketsData.sortedConditionDays,
    };
  }, [rawMarketsData]);

  // Calculate day end times for display
  const dayEndTimes = useMemo(() => {
    const result: Record<string, number> = {};

    Object.entries(marketGroupsByDay).forEach(([dayKey, marketGroups]) => {
      // Get all active markets from all market groups in this day
      const now = Math.floor(Date.now() / 1000);
      const allActiveMarkets = marketGroups.flatMap((marketGroup) =>
        marketGroup.markets.filter((market) => now < market.endTimestamp!)
      );

      if (allActiveMarkets.length > 0) {
        const nextEndingMarket = [...allActiveMarkets].sort(
          (a, b) => a.endTimestamp! - b.endTimestamp!
        )[0];

        result[dayKey] = nextEndingMarket.endTimestamp!;
      } else {
        const allMarketsInDay = marketGroups.flatMap(
          (marketGroup) => marketGroup.markets
        );
        if (allMarketsInDay.length > 0) {
          const latestEndingMarket = [...allMarketsInDay].sort(
            (a, b) => b.endTimestamp! - a.endTimestamp!
          )[0];
          result[dayKey] = latestEndingMarket.endTimestamp!;
        } else {
          result[dayKey] = now;
        }
      }
    });

    return result;
  }, [marketGroupsByDay]);

  // Calculate RFQ day end times for display
  const rfqDayEndTimes = useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(conditionsByDay).forEach(([dayKey, list]) => {
      const withEnds = list.filter(
        (c) => typeof c.endTime === 'number' && c.endTime > 0
      ) as Array<{ endTime: number }>;
      if (withEnds.length > 0) {
        if (statusFilter === 'all') {
          const latest = [...withEnds].sort((a, b) => b.endTime - a.endTime)[0]
            .endTime;
          result[dayKey] = latest;
        } else {
          const earliest = [...withEnds].sort(
            (a, b) => a.endTime - b.endTime
          )[0].endTime;
          result[dayKey] = earliest;
        }
      } else {
        result[dayKey] = Math.floor(Date.now() / 1000);
      }
    });
    return result;
  }, [conditionsByDay, statusFilter]);

  // Create a key that changes whenever filters change to force complete re-render
  const filterKey = useMemo(() => {
    return `${selectedCategorySlug || 'all'}-${statusFilter}-${debouncedSearchTerm}`;
  }, [selectedCategorySlug, statusFilter, debouncedSearchTerm]);

  // Update click handler for focus areas
  const handleCategoryClick = (categorySlug: string | null) => {
    setSelectedCategorySlug(categorySlug);
    const params = new URLSearchParams(searchParams);
    if (categorySlug === null) {
      params.delete('category');
    } else {
      params.set('category', categorySlug);
    }
    router.replace(`/markets?${params.toString()}`);
  };

  const handleStatusFilterClick = (filter: 'all' | 'active') => {
    setStatusFilter(filter);
  };

  // Handle parlay mode toggle and keep URL hash in sync
  const handleParlayModeChange = (enabled: boolean) => {
    setParlayMode(enabled);
    if (typeof window === 'undefined') return;
    if (enabled) {
      const newHash = '#parlays';
      if (window.location.hash !== newHash) {
        // Update hash without scrolling or adding a new history entry
        window.history.replaceState(null, '', newHash);
      }
    } else {
      // Clear hash entirely
      const url = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', url);
    }
  };

  // Handler for text filter changes
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Helper to find FocusArea data by category slug for UI styling
  // (now using the utility function from ~/lib/utils/category)

  // Show error state if there's an error
  if (marketsDataError) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-theme(spacing.20))] w-full">
        <div className="text-center text-muted-foreground">
          <FrownIcon className="h-9 w-9 mx-auto mb-2 opacity-20" />
          Error loading markets data. Please try again.
        </div>
      </div>
    );
  }

  // Render content once both are loaded
  return (
    <div className="relative w-full max-w-full overflow-x-hidden flex flex-col lg:flex-row items-start">
      {/* Render only one betslip instance based on viewport */}
      {isMobile ? (
        <div className="block lg:hidden">
          <Betslip
            isParlayMode={parlayMode}
            onParlayModeChange={handleParlayModeChange}
          />
        </div>
      ) : null}

      {/* Main Content */}
      <div className="flex-1 min-w-0 max-w-full overflow-x-hidden flex flex-col gap-6 pr-0 lg:pr-6">
        {/* Top controls section with simplified spacing */}
        <div className="bg-background/90 w-full max-w-full box-border py-3 md:py-2 px-0 md:px-0 min-w-0">
          <SearchBar
            isMobile={isMobile}
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <motion.div
            className="mt-3"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <FocusAreaFilter
              selectedCategorySlug={selectedCategorySlug}
              handleCategoryClick={handleCategoryClick}
              statusFilter={statusFilter}
              handleStatusFilterClick={handleStatusFilterClick}
              parlayMode={parlayMode}
              onParlayModeChange={handleParlayModeChange}
              isLoadingCategories={isLoadingMarketsData && !rawMarketsData}
              categories={rawMarketsData?.categories || []}
              getCategoryStyle={getCategoryStyle}
              containerClassName="px-0 md:px-0 py-0 w-full max-w-full box-border"
            />
          </motion.div>
        </div>

        {/* Results area */}
        <div className="relative w-full max-w-full overflow-x-hidden min-h-[300px]">
          {isLoadingMarketsData && !rawMarketsData ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <LottieLoader width={32} height={32} />
            </div>
          ) : !parlayMode ? (
            <AnimatePresence mode="wait" key={filterKey}>
              {groupedMarketGroups.length === 0 && (
                <motion.div
                  key="zero-state"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="w-full pt-48 text-center text-muted-foreground"
                >
                  <FrownIcon className="h-9 w-9 mx-auto mb-2 opacity-20" />
                  No questions match the selected filters.
                </motion.div>
              )}

              {groupedMarketGroups.length > 0 && (
                <motion.div
                  key="results-container"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="relative"
                >
                  {isLoadingMarketsData && rawMarketsData && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/30 rounded-full overflow-hidden z-10">
                      <div className="h-full bg-primary animate-pulse" />
                    </div>
                  )}
                  {sortedMarketDays.map((dayKey) => (
                    <motion.div
                      key={dayKey}
                      className="mb-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="flex flex-col mb-2">
                        <h3 className="font-medium text-sm text-muted-foreground mb-2">
                          {formatEndDate(dayEndTimes[dayKey])}
                        </h3>
                        <div className="border border-muted rounded shadow-sm bg-card overflow-hidden">
                          {marketGroupsByDay[dayKey]?.map((marketGroup) => (
                            <motion.div
                              layout
                              key={marketGroup.key}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="border-b last:border-b-0 border-border"
                            >
                              <MarketGroupsRow
                                marketAddress={marketGroup.marketAddress}
                                chainId={marketGroup.chainId}
                                displayQuestion={
                                  marketGroup.displayQuestion || 'Loading...'
                                }
                                color={marketGroup.color}
                                market={marketGroup.markets}
                                isActive={marketGroup.isActive}
                                marketClassification={
                                  marketGroup.marketClassification as
                                    | MarketGroupClassification
                                    | undefined
                                }
                                displayUnit={marketGroup.displayUnit}
                              />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <AnimatePresence mode="wait" key="parlay-mode">
              {filteredConditions.length === 0 ? (
                <motion.div
                  key="empty-rfq"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="w-full pt-48 text-center text-muted-foreground"
                >
                  No public conditions found.
                </motion.div>
              ) : (
                <motion.div
                  key="rfq-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {sortedConditionDays.map((dayKey) => (
                    <motion.div
                      key={`rfq-day-${dayKey}`}
                      className="mb-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="flex flex-col mb-2">
                        <h3 className="font-medium text-sm text-muted-foreground mb-2">
                          {dayKey === 'No end time'
                            ? 'No end time'
                            : formatEndDate(rfqDayEndTimes[dayKey])}
                        </h3>
                        <div className="border border-muted rounded shadow-sm bg-card overflow-hidden">
                          {[...(conditionsByDay[dayKey] || [])]
                            .sort((a, b) => {
                              const aT = a.endTime ?? 0;
                              const bT = b.endTime ?? 0;
                              return statusFilter === 'all' ? bT - aT : aT - bT;
                            })
                            .map((c) => {
                              const categorySlug = c.category?.slug || '';
                              const styleInfo = categorySlug
                                ? getCategoryStyle(categorySlug)
                                : undefined;
                              const color =
                                styleInfo?.color || DEFAULT_CATEGORY_COLOR;
                              return (
                                <ParlayModeRow
                                  key={c.id}
                                  condition={c}
                                  color={color}
                                />
                              );
                            })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Desktop/Tablet sticky betslip sidebar */}
      {!isMobile ? (
        <div className="hidden lg:block w-[24rem] shrink-0 self-start sticky top-0">
          <div className="border border-muted-foreground/30 rounded shadow-lg bg-card overflow-hidden h-[calc(100dvh-120px)]">
            <div className="h-full overflow-y-auto">
              <Betslip
                variant="panel"
                isParlayMode={parlayMode}
                onParlayModeChange={handleParlayModeChange}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MarketsPage;
