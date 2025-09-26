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
  Scatter,
} from 'recharts';

import type { MarketGroup as MarketGroupType } from '@sapience/ui/types/graphql';
import LottieLoader from '../shared/LottieLoader';
import ChartLegend from './ChartLegend';
import { useMarketGroupChartData } from '~/hooks/graphql/useMarketGroupChartData';
import {
  useForecasts,
  type FormattedAttestation,
} from '~/hooks/graphql/useForecasts';
import {
  transformMarketGroupChartData,
  type MultiMarketChartDataPoint,
  getEffectiveMinTimestampFromData,
} from '~/lib/utils/chartUtils'; // Added for type safety and transformer
import { getYAxisConfig, sqrtPriceX96ToPriceD18 } from '~/lib/utils/util'; // Import moved functions
import {
  CHART_INDEX_COLOR,
  CHART_SERIES_COLORS,
  getSeriesColorByIndex,
} from '~/lib/theme/chartColors';
import { YES_SQRT_X96_PRICE } from '~/lib/constants/numbers';
import { getMarketGroupClassification } from '~/lib/utils/marketUtils';
import { MarketGroupClassification as MarketGroupClassificationEnum } from '~/lib/types';

// Colors come from centralized theme

interface MarketGroupChartProps {
  chainShortName: string;
  marketAddress: string;
  marketIds: number[];
  market: MarketGroupType | null | undefined; // Use GraphQL type
  minTimestamp?: number;
  optionNames?: string[] | null;
  showForecastDots?: boolean;
  forecastAttester?: string;
}

const MarketGroupChart: React.FC<MarketGroupChartProps> = ({
  chainShortName,
  marketAddress,
  marketIds,
  market,
  minTimestamp,
  optionNames,
  showForecastDots,
  forecastAttester,
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

  // Forecasts: fetch (before any early returns to keep hooks order stable)
  const { data: forecasts } = useForecasts({
    marketAddress,
    attesterAddress: forecastAttester,
    options: {
      staleTime: 10000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  });

  // Compute effective min timestamp via shared helper (starts at first trade and respects provided min)
  const effectiveMinTimestamp = useMemo(
    () => getEffectiveMinTimestampFromData(chartData, minTimestamp),
    [chartData, minTimestamp]
  );

  // Filter and scale chartData via shared transformer
  const scaledAndFilteredChartData = useMemo(
    () =>
      transformMarketGroupChartData(chartData, {
        minTimestamp,
        startAtFirstTrade: true,
      }),
    [chartData, minTimestamp]
  );

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

  // Prepare forecast dots BEFORE any early returns so hooks order is stable
  // Compute classification once; guard against undefined by passing empty object
  const classification = useMemo(
    () => getMarketGroupClassification(market || {}),
    [market]
  );

  const dotsByMarketId = useMemo(() => {
    if (!forecasts || forecasts.length === 0)
      return {} as Record<
        number,
        { timestamp: number; y: number; att: FormattedAttestation }[]
      >;

    const result: Record<
      number,
      { timestamp: number; y: number; att: FormattedAttestation }[]
    > = {};

    for (const att of forecasts) {
      if (!att.marketId) continue;
      const marketIdNum = parseInt(att.marketId, 16);
      if (!marketIds.includes(marketIdNum)) continue;

      let y: number | null = null;
      if (
        classification === MarketGroupClassificationEnum.YES_NO ||
        market?.baseTokenName === 'Yes' ||
        classification === MarketGroupClassificationEnum.MULTIPLE_CHOICE
      ) {
        const priceD18 = sqrtPriceX96ToPriceD18(BigInt(att.value));
        const yesPriceD18 = sqrtPriceX96ToPriceD18(YES_SQRT_X96_PRICE);
        const percentageTimes100 =
          Number((priceD18 * 10000n) / yesPriceD18) / 100; // 0..100
        y = percentageTimes100 / 100; // 0..1
      } else {
        const numericD18 = sqrtPriceX96ToPriceD18(BigInt(att.value));
        // For numeric markets, sqrtPriceX96ToPriceD18 returns a value scaled by 1e36 of the raw unit.
        // The chart lines are scaled to raw units (Wei / 1e18) by transformMarketGroupChartData,
        // so here we must divide by 1e36 to place dots in the same scale as the lines.
        y = Number(numericD18) / 1e36;
      }

      if (y == null || Number.isNaN(y)) continue;
      const point = { timestamp: att.rawTime, y, att };
      if (!result[marketIdNum]) result[marketIdNum] = [];
      result[marketIdNum].push(point);
    }

    return result;
  }, [forecasts, marketIds, market, classification]);

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

  // duplicate declaration leftover from refactor — remove to avoid redeclaration

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
              domain={
                effectiveMinTimestamp
                  ? [effectiveMinTimestamp, 'auto']
                  : ['auto', 'auto']
              }
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

            {showForecastDots !== false &&
              marketIds.map((marketId, index) => (
                <Scatter
                  key={`forecast-dots-${marketId}`}
                  data={dotsByMarketId[marketId] || []}
                  dataKey="y"
                  fill={getSeriesColorByIndex(index)}
                  shape={(props: any) => <circle {...props} r={2} />}
                  fillOpacity={0.9}
                  stroke="none"
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
