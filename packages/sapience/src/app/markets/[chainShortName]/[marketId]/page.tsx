'use client';

import {
  IntervalSelector,
  PriceSelector,
} from '@sapience/ui/components/charts';
import { Button } from '@sapience/ui/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@sapience/ui/components/ui/tabs';
import { ChevronLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Market as GqlMarketType } from '@sapience/ui/types/graphql';
import { LineType, TimeInterval } from '@sapience/ui/types/charts';
import { getSeriesColorByIndex, withAlpha } from '~/lib/theme/chartColors';

import OrderBookChart from '~/components/markets/charts/OrderBookChart';
import PriceChart from '~/components/markets/charts/PriceChart';
import MarketDataTables from '~/components/markets/DataDrawer';
import MarketHeader from '~/components/markets/MarketHeader';
import PositionSelector from '~/components/markets/PositionSelector';

import { useOrderBookData } from '~/hooks/charts/useOrderBookData';
import { useUniswapPool } from '~/hooks/charts/useUniswapPool';
import { PositionKind } from '~/hooks/contract/usePositions';

import {
  MarketPageProvider,
  useMarketPage,
} from '~/lib/context/MarketPageProvider';
import { MarketGroupClassification } from '~/lib/types';
import { parseUrlParameter } from '~/lib/utils/util';

// Dynamically import LottieLoader
const LottieLoader = dynamic(() => import('~/components/shared/LottieLoader'), {
  ssr: false,
  // Use a simple div as placeholder during load
  loading: () => <div className="w-8 h-8" />,
});

const SimpleTradeWrapper = dynamic(
  () =>
    import('~/components/markets/SimpleTradeWrapper').then(
      (mod) => mod.default
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 animate-pulse bg-muted/40 rounded" />
    ),
  }
);

const SimpleLiquidityWrapper = dynamic(
  () => import('~/components/markets/SimpleLiquidityWrapper'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 animate-pulse bg-muted/40 rounded" />
    ),
  }
);

// Helper component for displaying market loading/error states
const MarketStatusDisplay = ({
  isLoadingMarket,
  isLoadingMarketContract,
  marketData,
  chainId,
  marketAddress,
  numericMarketId,
}: {
  isLoadingMarket: boolean;
  isLoadingMarketContract: boolean;
  marketData: GqlMarketType | null | undefined;
  chainId: number | null | undefined;
  marketAddress: string | null | undefined;
  numericMarketId: number | null | undefined;
}) => {
  if (isLoadingMarket || isLoadingMarketContract) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full">
        <LottieLoader width={32} height={32} />
      </div>
    );
  }

  if (!marketData || !chainId || !marketAddress || !numericMarketId) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full">
        <p className="text-destructive">Failed to load market data.</p>
      </div>
    );
  }

  return null;
};

// Main content component that consumes the forecast context
const ForecastContent = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const chainShortName = params.chainShortName as string;
  const positionId = searchParams.get('positionId');

  const {
    marketData,
    isLoadingMarket,
    isLoadingMarketContract,
    chainId,
    marketAddress,
    numericMarketId,
    getPositionById,
    minTick,
    maxTick,
    tickSpacing,
    baseTokenName,
    quoteTokenName,
    marketClassification,
    marketContractData,
    collateralAssetAddress,
    collateralAssetTicker,
  } = useMarketPage();

  const [selectedInterval, setSelectedInterval] = useState<TimeInterval>(
    TimeInterval.I4H
  );

  const [activeFormTab, setActiveFormTab] = useState<string>('trade');

  const [selectedPrices, setSelectedPrices] = useState<
    Record<LineType, boolean>
  >({
    [LineType.MarketPrice]: true,
    [LineType.IndexPrice]: true,
    [LineType.ResourcePrice]: false,
    [LineType.TrailingAvgPrice]: false,
  });

  // Extract resource slug
  const resourceSlug = marketData?.marketGroup?.resource?.slug;

  // Determine the selected position if positionId exists
  const selectedPosition = positionId ? getPositionById(positionId) : null;

  // ---- Start: Hoisted OrderBook Data Fetching ----
  const {
    pool,
    isLoading: isLoadingPool,
    isError: isErrorPool,
  } = useUniswapPool(
    chainId ?? 0,
    marketData?.poolAddress ? (marketData.poolAddress as `0x${string}`) : '0x'
  );

  const {
    asks,
    bids,
    lastPrice,
    isLoading: isLoadingBook,
    isError: isErrorBook,
  } = useOrderBookData({
    pool,
    chainId: chainId === null ? undefined : chainId,
    poolAddress: marketData?.poolAddress
      ? (marketData.poolAddress as `0x${string}`)
      : undefined,
    baseAssetMinPriceTick: minTick,
    baseAssetMaxPriceTick: maxTick,
    tickSpacing,
    quoteTokenName,
    baseTokenName,
    enabled: true,
  });
  // ---- End: Hoisted OrderBook Data Fetching ----

  // Handler for updating selected prices
  const handlePriceSelection = (line: LineType, selected: boolean) => {
    setSelectedPrices((prev) => {
      return {
        ...prev,
        [line]: selected,
      };
    });
  };

  // Set active tab based on URL position ID (only relevant if positionId exists initially)
  useEffect(() => {
    if (selectedPosition) {
      // Set tab based on position kind (1 = Liquidity, 2 = Trade)
      setActiveFormTab(
        selectedPosition.kind === PositionKind.Liquidity ? 'liquidity' : 'trade'
      );
    }
  }, [selectedPosition]);

  // Use the new MarketStatusDisplay component
  const marketStatusElement = MarketStatusDisplay({
    isLoadingMarket,
    isLoadingMarketContract,
    marketData,
    chainId,
    marketAddress,
    numericMarketId,
  });

  if (marketStatusElement) {
    return marketStatusElement;
  }

  let availableMarkets =
    marketData?.marketGroup?.markets?.filter(
      (
        market: GqlMarketType // market.id is string, numericMarketId is number | null, market.marketId is number
      ) => market.endTimestamp && market.endTimestamp * 1000 > Date.now()
    ) ?? [];
  availableMarkets = availableMarkets.sort((a, b) => a.marketId - b.marketId);

  return (
    <div className="flex flex-col w-full min-h-[100dvh] overflow-y-auto lg:overflow-hidden pt-24">
      <div className="flex flex-col w-full">
        <div className="flex flex-col px-4 md:px-3 lg:px-6 flex-1">
          <div className="mt-2 mb-6">
            <div className="flex items-center gap-4">
              <div>
                <Button
                  asChild
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Link href={`/markets/${chainShortName}`}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Overview
                  </Link>
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                {marketClassification ===
                  MarketGroupClassification.MULTIPLE_CHOICE &&
                  marketData?.marketGroup?.markets &&
                  marketData.marketGroup.markets.length > 1 &&
                  availableMarkets.length > 0 && (
                    <div
                      role="radiogroup"
                      aria-label="Market options"
                      className="flex gap-3 overflow-x-auto py-0 pr-2"
                    >
                      {availableMarkets.map((market: GqlMarketType, idx) => {
                        const isSelected =
                          String(market.marketId) === String(numericMarketId);
                        const buttonText =
                          market.optionName ||
                          market.question ||
                          `Market ${market.marketId}`;

                        const seriesColor = getSeriesColorByIndex(idx);
                        const unselectedBg = withAlpha(seriesColor, 0.08);
                        const hoverBg = withAlpha(seriesColor, 0.16);
                        const borderColor = withAlpha(seriesColor, 0.24);

                        return (
                          <button
                            key={market.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() =>
                              router.push(
                                `/markets/${chainShortName}/${market.marketId}`
                              )
                            }
                            className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm whitespace-nowrap flex-shrink-0 transition-colors text-foreground`}
                            style={{
                              backgroundColor: unselectedBg,
                              borderColor,
                            }}
                            onMouseEnter={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.backgroundColor = hoverBg;
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.backgroundColor = unselectedBg;
                            }}
                          >
                            <span
                              className="inline-flex items-center justify-center rounded-full"
                              style={{
                                width: 16,
                                height: 16,
                                border: `2px solid ${seriesColor}`,
                              }}
                              aria-hidden
                            >
                              {isSelected ? (
                                <span
                                  className="block rounded-full"
                                  style={{
                                    width: 8,
                                    height: 8,
                                    backgroundColor: seriesColor,
                                  }}
                                />
                              ) : null}
                            </span>
                            <span className="truncate max-w-[220px]">
                              {buttonText}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>
            </div>
          </div>
          <MarketHeader
            marketData={marketData!}
            marketContractData={marketContractData}
            chainId={chainId!}
            marketAddress={marketAddress!}
            marketClassification={marketClassification!}
            collateralAssetAddress={collateralAssetAddress}
            baseTokenName={baseTokenName}
            quoteTokenName={quoteTokenName}
            collateralSymbol={collateralAssetTicker}
            minTick={minTick}
            maxTick={maxTick}
          />
          <div className="flex flex-col gap-4">
            {/* Top Row: Chart, OrderBook, and Forms */}
            <div className="flex flex-col lg:flex-row xl:grid xl:grid-cols-12 lg:gap-8 xl:gap-6">
              {/* Chart Column */}
              <div className="flex flex-col w-full relative xl:col-span-6 h-[460px]">
                <div className="w-full flex-1 relative bg-background dark:bg-muted/50 border border-border rounded shadow-sm p-2 md:p-3 pt-4 pl-4 md:pt-5 md:pl-5 overflow-hidden flex flex-col">
                  <div className="flex-1 relative">
                    <div className="absolute top-0 left-0 z-10">
                      <div className="flex items-center gap-2">
                        <div className="rounded-md shadow-sm">
                          <IntervalSelector
                            selectedInterval={selectedInterval}
                            setSelectedInterval={setSelectedInterval}
                          />
                        </div>
                        {marketData?.marketGroup?.resource?.slug && (
                          <PriceSelector
                            selectedPrices={selectedPrices}
                            setSelectedPrices={handlePriceSelection}
                          />
                        )}
                      </div>
                    </div>
                    <PriceChart
                      market={{
                        marketId: numericMarketId!,
                        chainId: chainId!,
                        address: marketAddress!,
                        quoteTokenName:
                          marketData?.marketGroup?.quoteTokenName || undefined,
                        startTimestamp: marketData?.startTimestamp,
                        endTimestamp: marketData?.endTimestamp,
                      }}
                      selectedInterval={selectedInterval}
                      selectedPrices={selectedPrices}
                      resourceSlug={resourceSlug}
                    />
                  </div>
                  {/* Footer removed: PriceSelector moved next to IntervalSelector at top-left */}
                </div>
              </div>

              {/* OrderBook Column - Shows to the right of chart on xl+ */}
              <div className="xl:col-span-3 xl:order-2 order-3">
                <div className="h-[460px]">
                  <OrderBookChart
                    quoteTokenName={quoteTokenName}
                    baseTokenName={baseTokenName}
                    className="h-full"
                    asks={asks}
                    bids={bids}
                    lastPrice={lastPrice}
                    isLoadingPool={isLoadingPool}
                    isErrorPool={isErrorPool}
                    isLoadingBook={isLoadingBook}
                    isErrorBook={isErrorBook}
                  />
                </div>
              </div>

              {/* Forms Column */}
              <div className="w-full lg:max-w-[340px] xl:max-w-none xl:col-span-3 xl:order-3 order-2 pb-4 xl:pb-0 mb-5">
                <div className="bg-background dark:bg-muted/50 rounded border border-border shadow-sm overflow-auto h-[460px]">
                  <div className="w-full">
                    <div className="px-3 py-1 border-b border-border">
                      {!positionId && (
                        <Tabs
                          value={activeFormTab}
                          onValueChange={(value) => setActiveFormTab(value)}
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-2 h-auto p-0 bg-transparent">
                            <TabsTrigger
                              value="trade"
                              className="w-full justify-center text-lg font-medium px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=inactive]:opacity-60 hover:opacity-80 transition-colors"
                            >
                              Trade
                            </TabsTrigger>
                            <TabsTrigger
                              value="liquidity"
                              className="w-full justify-center text-lg font-medium px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=inactive]:opacity-60 hover:opacity-80 transition-colors"
                            >
                              Liquidity
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      )}
                    </div>
                    <div className="p-4">
                      <PositionSelector />
                      <div className="mt-3 relative">
                        {selectedPosition &&
                          selectedPosition.kind === PositionKind.Trade && (
                            <SimpleTradeWrapper
                              positionId={positionId || undefined}
                            />
                          )}
                        {selectedPosition &&
                          selectedPosition.kind === PositionKind.Liquidity && (
                            <SimpleLiquidityWrapper
                              positionId={positionId || undefined}
                            />
                          )}
                        {!selectedPosition && activeFormTab === 'trade' && (
                          <SimpleTradeWrapper
                            positionId={positionId || undefined}
                          />
                        )}
                        {!selectedPosition && activeFormTab === 'liquidity' && (
                          <SimpleLiquidityWrapper
                            positionId={positionId || undefined}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Full Width Data Tables Below */}
            <div className="w-full mb-4">
              <MarketDataTables />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapper component that provides the forecast context
const MarketPage = () => {
  const params = useParams();
  const marketId = params.marketId as string;
  const chainParam = params.chainShortName as string;

  const { chainId, marketAddress } = parseUrlParameter(chainParam);

  return (
    <MarketPageProvider pageDetails={{ chainId, marketAddress, marketId }}>
      <ForecastContent />
    </MarketPageProvider>
  );
};

export default MarketPage;
