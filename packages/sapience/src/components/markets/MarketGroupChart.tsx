'use client';

import { useMemo, useState } from 'react'; // <-- Import useMemo and useState
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { MarketGroup as MarketGroupType } from '@sapience/ui/types/graphql';
import LottieLoader from '../shared/LottieLoader';
import ChartLegend from './ChartLegend';
import { useMarketGroupChartData } from '~/hooks/graphql/useMarketGroupChartData';
import type { MultiMarketChartDataPoint } from '~/lib/utils/chartUtils'; // Added for type safety
import { getYAxisConfig } from '~/lib/utils/util'; // Import moved functions
import {
  CHART_INDEX_COLOR,
  CHART_SERIES_COLORS,
  getSeriesColorByIndex,
} from '~/lib/theme/chartColors';

// Colors come from centralized theme

interface MarketGroupChartProps {
  chainShortName: string;
  marketAddress: string;
  marketIds: number[];
  market: MarketGroupType | null | undefined; // Use GraphQL type
  minTimestamp?: number;
  optionNames?: string[] | null;
}

const MarketGroupChart: React.FC<MarketGroupChartProps> = ({
  chainShortName,
  marketAddress,
  marketIds,
  market,
  minTimestamp,
  optionNames,
}) => {
  const { chartData, isLoading, isError, error } = useMarketGroupChartData({
    chainShortName,
    marketAddress,
    activeMarketIds: marketIds,
    quoteTokenName: market?.quoteTokenName ?? undefined,
    hasResource: !!market?.resource,
  });
  const [hoveredChartData, setHoveredChartData] =
    useState<MultiMarketChartDataPoint | null>(null); // New state for hovered data

  // Filter and scale chartData
  const scaledAndFilteredChartData = useMemo(() => {
    const filteredByTimestamp = minTimestamp
      ? chartData.filter((dataPoint) => dataPoint.timestamp >= minTimestamp)
      : chartData;

    const scaledData = filteredByTimestamp.map((point) => {
      const scaledIndexClose =
        typeof point.indexClose === 'number'
          ? point.indexClose / 1e18 // Scale Wei down by 10^18
          : point.indexClose; // Keep null/undefined as is

      const scaledMarkets: { [marketId: string]: number | undefined } = {};
      if (point.markets) {
        Object.entries(point.markets).forEach(([marketId, value]) => {
          scaledMarkets[marketId] =
            typeof value === 'number' ? value / 1e18 : value;
        });
      }

      return {
        ...point, // Preserves original timestamp
        indexClose: scaledIndexClose,
        markets: scaledMarkets,
      };
    });

    // If scaledData is empty after initial filtering and scaling, return it early
    if (scaledData.length === 0) {
      return [];
    }

    // Find the index of the first data point that has at least one non-zero market value
    let firstNonZeroMarketDataIndex = -1;
    for (let i = 0; i < scaledData.length; i++) {
      const point = scaledData[i];
      if (point.markets && Object.keys(point.markets).length > 0) {
        const marketValues = Object.values(point.markets);
        const hasNonZeroMarket = marketValues.some(
          (value) => typeof value === 'number' && value !== 0
        );
        if (hasNonZeroMarket) {
          firstNonZeroMarketDataIndex = i;
          break;
        }
      }
    }

    // Map over scaledData to produce the final chart data.
    // For points in the leading segment (before firstNonZeroMarketDataIndex or all if none found),
    // convert market values of 0 to undefined.
    return scaledData.map((point, index) => {
      const isLeadingSegment =
        firstNonZeroMarketDataIndex === -1 ||
        index < firstNonZeroMarketDataIndex;

      if (isLeadingSegment && point.markets) {
        const updatedMarkets: { [marketId: string]: number | undefined } = {};
        Object.entries(point.markets).forEach(([marketId, value]) => {
          // If the value is 0 in the leading segment, set to undefined
          // Otherwise, keep the original value (could be non-zero, null, or already undefined)
          updatedMarkets[marketId] = value === 0 ? undefined : value;
        });
        return {
          ...point,
          markets: updatedMarkets,
        };
      }
      // If not in the leading segment, or if the point has no markets, return as is
      return point;
    });
  }, [chartData, minTimestamp]);

  // Find the latest data point that has a valid indexClose value
  const latestIndexValue = useMemo(() => {
    // Search backwards through the scaled data
    for (let i = scaledAndFilteredChartData.length - 1; i >= 0; i--) {
      const point = scaledAndFilteredChartData[i];
      // Use the scaled value for the check
      if (
        point &&
        typeof point.indexClose === 'number' &&
        !Number.isNaN(point.indexClose)
      ) {
        return point.indexClose;
      }
    }
    return null; // Return null if no valid indexClose found
  }, [scaledAndFilteredChartData]);

  // Compute ticks for X-axis: only the first timestamp per calendar day
  const dailyTicks = useMemo(() => {
    const seenDays = new Set<string>();
    const ticks: number[] = [];
    for (const point of scaledAndFilteredChartData) {
      // Use local date parts to match formatTimestamp
      const date = new Date(point.timestamp * 1000);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      if (!seenDays.has(key)) {
        seenDays.add(key);
        ticks.push(point.timestamp);
      }
    }
    return ticks;
  }, [scaledAndFilteredChartData]);

  // Local formatter for non-padded dates like 9/10
  const formatTimestampCompact = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  if (isLoading) {
    return (
      <div className="w-full md:flex-1 h-full flex items-center justify-center">
        <LottieLoader width={32} height={32} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full md:flex-1 h-full flex items-center justify-center text-destructive">
        Error loading chart data: {error?.message || 'Unknown error'}
      </div>
    );
  }

  // Check if there's any data to display AFTER processing and filtering
  const hasMarketData = scaledAndFilteredChartData.some(
    (d) =>
      d.markets &&
      Object.keys(d.markets).length > 0 &&
      Object.values(d.markets).some((v) => v != null)
  );
  if (!hasMarketData) {
    return (
      <div className="w-full md:flex-1 h-full flex items-center justify-center text-muted-foreground border border-muted rounded bg-secondary/20">
        <div className="flex flex-col items-center justify-center gap-2">
          <LottieLoader width={40} height={40} className="opacity-80" />
          <span>No wagers yet...</span>
        </div>
      </div>
    );
  }

  // Determine Y-axis configuration based on the market prop
  const yAxisConfig = getYAxisConfig(market);

  // Determine if index data exists to potentially show a second line
  const hasIndexData = scaledAndFilteredChartData.some(
    (d) => d.indexClose != null
  );

  // Get the latest data point overall (for market values and timestamp)
  const overallLatestDataPoint =
    scaledAndFilteredChartData.length > 0
      ? scaledAndFilteredChartData[scaledAndFilteredChartData.length - 1]
      : null;

  return (
    // Adjust main container for flex column layout and height
    // Ensure this component tries to fill the height allocated by the parent flex container
    <div className="w-full h-full flex flex-col p-4">
      {/* Render the custom legend */}
      <ChartLegend
        latestDataPoint={overallLatestDataPoint}
        latestIndexValue={latestIndexValue}
        marketIds={marketIds}
        hasIndexData={hasIndexData}
        showIndexLine
        lineColors={CHART_SERIES_COLORS}
        indexLineColor={CHART_INDEX_COLOR}
        yAxisConfig={yAxisConfig}
        optionNames={optionNames}
        hoveredDataPoint={hoveredChartData} // Pass hovered data to legend
      />
      {/* This div should grow to fill remaining space */}
      <div className="flex-1 w-full">
        {/* Let ResponsiveContainer determine height based on parent */}
        <ResponsiveContainer>
          <ComposedChart
            data={scaledAndFilteredChartData}
            margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
            onMouseMove={(state) => {
              if (
                state.isTooltipActive &&
                state.activePayload &&
                state.activePayload.length > 0
              ) {
                // The payload here is the raw data point from scaledAndFilteredChartData
                const currentHoveredData = state.activePayload[0]
                  .payload as MultiMarketChartDataPoint;
                setHoveredChartData(currentHoveredData);
              } else if (hoveredChartData !== null) {
                // Clear only if it was previously set, to avoid needless re-renders
                setHoveredChartData(null);
              }
            }}
            onMouseLeave={() => {
              setHoveredChartData(null);
            }}
          >
            <defs>
              {marketIds.map((marketId, index) => {
                const color = getSeriesColorByIndex(index);
                const gradientId = `marketGradient-${marketId}`;
                return (
                  <linearGradient
                    key={gradientId}
                    id={gradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.2}
            />
            <XAxis
              dataKey="timestamp"
              ticks={dailyTicks}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={formatTimestampCompact}
              fontSize={12}
              dy={10} // Adjust vertical position of ticks
              domain={minTimestamp ? [minTimestamp, 'auto'] : ['auto', 'auto']}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={yAxisConfig.tickFormatter}
              fontSize={12}
              dx={0}
              domain={yAxisConfig.domain}
              width={40}
            />
            {/* Tooltip configured to show a custom cursor line */}
            <Tooltip
              content={() => null} // Still render no actual tooltip content
              wrapperStyle={{ display: 'none' }} // Ensure no wrapper is rendered
              cursor={{
                stroke: 'hsl(var(--muted-foreground) / 0.4)',
                strokeDasharray: '3 3',
              }} // Show a dashed vertical line
            />

            {/* Dynamically render a Line for each marketId */}
            {marketIds.map((marketId) => (
              <Area
                key={`area-${marketId}`}
                type="monotone"
                dataKey={`markets.${marketId}`}
                fill={`url(#marketGradient-${marketId})`}
                stroke="none"
                connectNulls
                isAnimationActive={false}
              />
            ))}
            {marketIds.map((marketId, index) => (
              <Line
                key={marketId} // Use marketId as key
                type="monotone"
                dataKey={`markets.${marketId}`} // Dynamic dataKey
                name="Prediction Market" // Updated general name
                stroke={getSeriesColorByIndex(index)} // Cycle through colors
                strokeWidth={2}
                dot={false}
                connectNulls // Connect lines across null data points
                isAnimationActive={false}
              />
            ))}

            {/* Render index line if data exists and toggle is on */}
            {hasIndexData && (
              <Line
                key="indexClose"
                type="monotone"
                dataKey="indexClose"
                name="Index"
                stroke={CHART_INDEX_COLOR}
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MarketGroupChart;
