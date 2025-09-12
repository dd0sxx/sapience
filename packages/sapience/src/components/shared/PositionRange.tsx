import { Badge } from '@sapience/ui/components/ui/badge';
import clsx from 'clsx';

import NumberDisplay from '~/components/shared/NumberDisplay';
import { useMarketPrice } from '~/hooks/graphql/useMarketPrice';
import { tickToPrice } from '~/lib/utils/util';

type PositionRangeProps = {
  lowPriceTick: number | string;
  highPriceTick: number | string;
  unitQuote?: string;
  marketGroupAddress?: string;
  chainId?: number;
  marketId?: number;
  showBadge?: boolean;
  className?: string;
};

export function PositionRange({
  lowPriceTick,
  highPriceTick,
  unitQuote,
  marketGroupAddress,
  chainId,
  marketId,
  showBadge = true,
  className,
}: PositionRangeProps) {
  const lowPrice = tickToPrice(Number(lowPriceTick));
  const highPrice = tickToPrice(Number(highPriceTick));

  const address = marketGroupAddress || '';
  const safeChainId = chainId || 0;

  const { data: currentMarketPriceRaw } = useMarketPrice(
    address,
    safeChainId,
    marketId
  );

  const hasMarketPrice =
    currentMarketPriceRaw !== undefined && currentMarketPriceRaw !== null;
  const currentMarketPrice = hasMarketPrice
    ? Number(currentMarketPriceRaw)
    : undefined;

  const inRange = hasMarketPrice
    ? currentMarketPrice! >= lowPrice && currentMarketPrice! <= highPrice
    : null;

  return (
    <div
      className={clsx('whitespace-nowrap flex items-center gap-2', className)}
    >
      <span>
        <NumberDisplay value={lowPrice} /> → <NumberDisplay value={highPrice} />{' '}
        {unitQuote}
      </span>
      {showBadge && hasMarketPrice && (
        <Badge
          variant="outline"
          className={
            inRange
              ? 'border-green-500/40 bg-green-500/10 text-green-600'
              : 'border-red-500/40 bg-red-500/10 text-red-600'
          }
        >
          {inRange ? 'In Range' : 'Out of Range'}
        </Badge>
      )}
    </div>
  );
}

export default PositionRange;
