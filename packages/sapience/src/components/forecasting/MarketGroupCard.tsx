'use client';

import Link from 'next/link';
import * as React from 'react';
import type { MarketWithContext } from './MarketGroupsList';
import type { MarketGroupClassification } from '~/lib/types';
import { MarketGroupClassification as MarketGroupClassificationEnum } from '~/lib/types';
import { getChainShortName } from '~/lib/utils/util';
import { useMarketGroupChartData } from '~/hooks/graphql/useMarketGroupChartData';

export interface MarketGroupCardProps {
  chainId: number;
  marketAddress: string;
  market: MarketWithContext[];
  color: string;
  displayQuestion: string;
  isActive?: boolean;
  marketClassification?: MarketGroupClassification;
  displayUnit?: string;
}

const MarketGroupCard = ({
  chainId,
  marketAddress,
  market,
  color,
  displayQuestion,
  isActive,
  marketClassification,
  displayUnit,
}: MarketGroupCardProps) => {
  const chainShortName = React.useMemo(
    () => getChainShortName(chainId),
    [chainId]
  );

  const sortedMarkets = React.useMemo(
    () => [...market].sort((a, b) => a.marketId - b.marketId),
    [market]
  );

  const marketIds = React.useMemo(
    () => sortedMarkets.map((m) => m.marketId),
    [sortedMarkets]
  );

  const { chartData, isLoading: isLoadingChartData } = useMarketGroupChartData({
    chainShortName,
    marketAddress,
    activeMarketIds: marketIds,
  });

  const latestPrices = React.useMemo(() => {
    if (chartData.length === 0) return {} as Record<number, number>;

    const latestDataPoint = chartData[chartData.length - 1];
    const prices: Record<number, number> = {};

    if (latestDataPoint.markets) {
      Object.entries(latestDataPoint.markets).forEach(
        ([marketIdStr, value]) => {
          if (typeof value === 'number') {
            prices[parseInt(marketIdStr)] = value / 1e18;
          }
        }
      );
    }

    return prices;
  }, [chartData]);

  const formatPriceAsPercentage = (price: number) => {
    if (price <= 0) return 'Price N/A';
    const percentage = price * 100;
    return `${Math.round(percentage)}% chance`;
  };

  const MarketPrediction = () => {
    if (!isActive || market.length === 0) return null;

    if (
      marketClassification === MarketGroupClassificationEnum.MULTIPLE_CHOICE
    ) {
      const marketPriceData = market.map((marketItem) => {
        const currentPrice = latestPrices[marketItem.marketId] || 0;
        return {
          marketItem,
          price: currentPrice,
        };
      });

      const highestPricedMarket = marketPriceData.reduce((highest, current) =>
        current.price > highest.price ? current : highest
      );

      if (highestPricedMarket.price > 0) {
        return (
          <span className="font-medium text-foreground">
            {highestPricedMarket.marketItem.optionName}
          </span>
        );
      }
      return (
        <span className="text-foreground">
          {isLoadingChartData ? 'Loading...' : <span>No trades yet</span>}
        </span>
      );
    } else {
      let targetMarket = market[0];

      if (marketClassification === MarketGroupClassificationEnum.YES_NO) {
        targetMarket = market.find((m) => m.optionName === 'Yes') || market[0];
      }

      const currentPrice = latestPrices[targetMarket.marketId] || 0;

      if (currentPrice > 0) {
        if (marketClassification === MarketGroupClassificationEnum.NUMERIC) {
          return (
            <span className="font-medium text-foreground">
              {currentPrice.toFixed(2)}
              {displayUnit && <span className="ml-1">{displayUnit}</span>}
            </span>
          );
        } else {
          return (
            <span className="font-medium text-foreground">
              {formatPriceAsPercentage(currentPrice)}
            </span>
          );
        }
      }

      return (
        <span className="text-foreground">
          {isLoadingChartData ? 'Loading...' : 'No trades yet'}
        </span>
      );
    }
  };

  const activeMarket = React.useMemo(() => {
    if (!isActive || market.length === 0) return null;

    if (marketClassification === MarketGroupClassificationEnum.YES_NO) {
      return market.find((m) => m.optionName === 'Yes') || market[0];
    }

    return market[0];
  }, [isActive, market, marketClassification]);

  const canShowPredictionElement = isActive && market.length > 0;

  return (
    <div className="w-full h-full">
      <div className="bg-background border rounded-md border-border/70 dark:bg-muted/50 flex flex-row transition-colors items-stretch min-h-[90px] md:min-h-[126px] h-full relative overflow-hidden">
        <div
          className="w-1 min-w-[4px] max-w-[4px]"
          style={{ backgroundColor: color, margin: '-1px 0' }}
        />

        <div className="flex-grow flex flex-col md:flex-row md:items-center md:justify-between px-5 py-3 gap-3">
          <div className="flex flex-col flex-grow">
            <h3 className="text-sm md:text-base leading-tight mb-2">
              <Link
                href={`/markets/${chainShortName}:${marketAddress}${
                  marketClassification !==
                    MarketGroupClassificationEnum.MULTIPLE_CHOICE &&
                  activeMarket
                    ? `/${activeMarket.marketId}`
                    : ''
                }`}
                className="group"
              >
                <span className="underline decoration-1 decoration-foreground/10 underline-offset-4 transition-colors group-hover:decoration-foreground/60">
                  {displayQuestion}
                </span>
              </Link>
            </h3>
            {canShowPredictionElement && (
              <div className="text-xs md:text-sm text-muted-foreground mt-auto md:mt-0">
                <span className="text-muted-foreground">
                  Market Prediction:{' '}
                </span>
                <MarketPrediction />
                {/* Details link removed for cards */}
              </div>
            )}
          </div>
          {/* No action buttons or show/hide toggle for cards */}
        </div>
      </div>
      {/* No expandable panel for cards */}
    </div>
  );
};

export default MarketGroupCard;
