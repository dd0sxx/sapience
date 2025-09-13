import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sapience/ui/components/ui/tooltip';
import { Button } from '@sapience/ui/components/ui/button';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import { blo } from 'blo';

import type { PositionType } from '@sapience/ui/types';
import { InfoIcon } from 'lucide-react';
import Link from 'next/link';
import SettlePositionButton from '../markets/SettlePositionButton';
import SellPositionDialog from '../markets/SellPositionDialog';
import SharePositionDialog from '../markets/SharePositionDialog';
import EmptyTabState from '~/components/shared/EmptyTabState';
import NumberDisplay from '~/components/shared/NumberDisplay';
import { AddressDisplay } from '~/components/shared/AddressDisplay';
import PositionSharesBadge from '~/components/shared/PositionSharesBadge';
import { useMarketPrice } from '~/hooks/graphql/useMarketPrice';
import {
  calculateEffectiveEntryPrice,
  getChainShortName,
} from '~/lib/utils/util';
import {
  resolvePositionsTableVisibility,
  type TableViewContext,
  type MarketContext,
  type ColumnOverrides,
} from '~/components/shared/tableVisibility';

interface TraderPositionsTableProps {
  positions: PositionType[];
  parentMarketAddress?: string;
  parentChainId?: number;
  parentMarketId?: number;
  showActions?: boolean;
  showOwnerColumn?: boolean;
  showPositionColumn?: boolean;
  context?: TableViewContext;
  marketContext?: MarketContext;
  columns?: ColumnOverrides;
}

function MaxPayoutCell({ position }: { position: PositionType }) {
  const baseTokenName = position.market?.marketGroup?.baseTokenName;
  const collateralSymbol = position.market?.marketGroup?.collateralSymbol;

  if (baseTokenName === 'Yes') {
    const baseTokenBI = BigInt(position.baseToken || '0');
    const borrowedBaseTokenBI = BigInt(position.borrowedBaseToken || '0');
    const netPositionBI = baseTokenBI - borrowedBaseTokenBI;
    const value = Number(formatEther(netPositionBI)); // Used for determining sign

    let maxPayoutAmountBI: bigint;
    if (value >= 0) {
      maxPayoutAmountBI = baseTokenBI;
    } else {
      maxPayoutAmountBI = borrowedBaseTokenBI;
    }
    const displayAmount = Number(formatEther(maxPayoutAmountBI));
    // Removed redundant isNaN check

    return (
      <>
        <NumberDisplay value={displayAmount} /> {collateralSymbol}
      </>
    );
  }
  return <span className="text-muted-foreground">N/A</span>;
}

function PositionValueCell({ position }: { position: PositionType }) {
  const { transactions } = position;
  const marketId = position.market?.marketId;
  const marketGroup = position.market?.marketGroup;
  const address = marketGroup?.address || '';
  const chainId = marketGroup?.chainId || 0;
  const baseTokenName = marketGroup?.baseTokenName;
  const collateralSymbol = marketGroup?.collateralSymbol;

  // --- Fetch Current Market Price ---
  const { data: currentMarketPriceRaw, isLoading: priceLoading } =
    useMarketPrice(address, chainId, marketId);

  // Default to 0 if undefined after loading, handling the linter error
  const currentMarketPrice = currentMarketPriceRaw ?? 0;

  const baseTokenAmount = Number(
    formatEther(BigInt(position.baseToken || '0'))
  );
  const borrowedBaseTokenAmount = Number(
    formatEther(BigInt(position.borrowedBaseToken || '0'))
  );

  const netPosition = baseTokenAmount - borrowedBaseTokenAmount;
  const isLong = netPosition >= 0;

  // --- Calculate Effective Entry Price ---
  const entryPrice = calculateEffectiveEntryPrice(transactions || [], isLong);

  // --- Calculate Position Size, Value, PnL ---
  let positionSize = 0;
  let currentPositionValue = 0;
  let costBasis = 0; // The value at entry (note: this is different from wager for PnL%)

  if (baseTokenName === 'Yes') {
    // Yes/No Market
    if (isLong) {
      // Long YES
      positionSize = baseTokenAmount;
      currentPositionValue = positionSize * currentMarketPrice;
      costBasis = positionSize * entryPrice;
    } else {
      // Short YES (Long NO)
      positionSize = borrowedBaseTokenAmount;
      currentPositionValue = positionSize * (1 - currentMarketPrice);
      costBasis = positionSize * (1 - entryPrice);
    }
  } else if (isLong) {
    // Linear or other Market Types - Long Position
    positionSize = baseTokenAmount;
    currentPositionValue = positionSize * currentMarketPrice;
    costBasis = positionSize * entryPrice;
  } else {
    // Linear or other Market Types - Short Position
    positionSize = borrowedBaseTokenAmount;
    const pnlPerUnit = entryPrice - currentMarketPrice;
    const totalPnl = positionSize * pnlPerUnit;
    costBasis = positionSize * entryPrice;
    currentPositionValue = costBasis + totalPnl;
  }

  // --- PnL Calculation based on Wager (position.collateral) ---
  const wagerAmount = Number(formatEther(BigInt(position.collateral || '0')));

  // 'pnl' is the profit or loss amount relative to the initial wager
  const pnl = currentPositionValue - wagerAmount;
  // Calculate PnL percentage relative to the wagerAmount
  const pnlPercentage = wagerAmount !== 0 ? (pnl / wagerAmount) * 100 : 0;

  // --- Per-share values (Avg -> Current) for subtitle under Position Value ---
  const avgPricePerToken = positionSize !== 0 ? wagerAmount / positionSize : 0;
  const currentPricePerToken =
    positionSize !== 0 ? currentPositionValue / positionSize : 0;

  // Display loading state or handle potential errors
  if (priceLoading) {
    return (
      <span className="text-muted-foreground text-xs">Loading price...</span>
    );
  }

  return (
    <div>
      <div className="whitespace-nowrap">
        <NumberDisplay value={currentPositionValue} /> {collateralSymbol}{' '}
        {/* A positive pnl means a gain (value > wager), so green. A negative pnl means a loss. */}
        <small className={pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
          ({pnlPercentage.toFixed(2)}%)
        </small>
      </div>
      <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1 whitespace-nowrap">
        Share Value: <NumberDisplay value={avgPricePerToken} /> →{' '}
        <NumberDisplay value={currentPricePerToken} /> {collateralSymbol}
      </div>
    </div>
  );
}

export default function TraderPositionsTable({
  positions,
  parentMarketAddress,
  parentChainId,
  parentMarketId,
  showActions = true,
  showOwnerColumn = false,
  showPositionColumn,
  context,
  marketContext,
  columns,
}: TraderPositionsTableProps) {
  const { address: connectedAddress } = useAccount();

  // Determine context for action gating (specific market page)
  const inferredMarketContext: MarketContext | undefined =
    marketContext ||
    (parentMarketAddress && parentChainId
      ? {
          address: parentMarketAddress,
          chainId: parentChainId,
          marketId: parentMarketId,
        }
      : undefined);
  const isSpecificMarketPage = Boolean(
    (context && context === 'market_page') ||
      (inferredMarketContext?.address &&
        inferredMarketContext?.chainId &&
        inferredMarketContext?.marketId)
  );

  if (!positions || positions.length === 0) {
    return <EmptyTabState message="No trades found" />;
  }

  const validPositions = positions.filter(
    (p) => p && p.market && p.id && !p.isLP
  );

  if (validPositions.length === 0) {
    return <EmptyTabState message="No trades found" />;
  }

  const hasMultipleMarkets = validPositions.some(
    (p) =>
      p.market?.marketGroup &&
      p.market?.marketGroup?.markets &&
      p.market?.marketGroup?.markets.length > 1
  );

  const overrides: ColumnOverrides = {
    position:
      showPositionColumn !== undefined ? Boolean(showPositionColumn) : 'auto',
    owner: showOwnerColumn,
    actions: showActions,
    ...columns,
  };

  const visibility = resolvePositionsTableVisibility({
    context,
    marketContext: inferredMarketContext,
    hasMultipleMarkets,
    overrides,
  });
  const displayQuestionColumn = visibility.showPosition;

  // Sort newest to oldest by createdAt; fallback to latest transaction.createdAt
  const getPositionCreatedMs = (p: PositionType) => {
    const direct = (p as PositionType & { createdAt?: string }).createdAt;
    if (direct) {
      const ms = new Date(direct).getTime();
      if (Number.isFinite(ms)) return ms;
    }
    const latestTxn = (p.transactions || [])
      .map((t) => new Date(t.createdAt as unknown as string).getTime())
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => b - a)[0];
    return latestTxn || 0;
  };

  const sortedPositions = [...validPositions].sort(
    (a, b) => getPositionCreatedMs(b) - getPositionCreatedMs(a)
  );

  return (
    <div>
      <div className="rounded border bg-background dark:bg-muted/50">
        {/* Table Header (desktop) */}
        <div
          className={`hidden xl:grid ${
            visibility.showActions
              ? visibility.showOwner
                ? 'xl:[grid-template-columns:repeat(12,minmax(0,1fr))_auto]'
                : 'xl:[grid-template-columns:repeat(11,minmax(0,1fr))_auto]'
              : visibility.showOwner
                ? 'xl:[grid-template-columns:repeat(12,minmax(0,1fr))]'
                : 'xl:[grid-template-columns:repeat(11,minmax(0,1fr))]'
          } items-center h-12 px-4 text-sm font-medium text-muted-foreground border-b`}
        >
          {displayQuestionColumn && (
            <div className={'xl:col-span-5'}>Position</div>
          )}
          <div
            className={
              displayQuestionColumn ? 'xl:col-span-3' : 'xl:col-span-5'
            }
          >
            Wager
          </div>
          <div
            className={
              (displayQuestionColumn ? 'xl:col-span-3' : 'xl:col-span-6') +
              ' flex items-center gap-1'
            }
          >
            <span>Current Position Value</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-normal">
                    The position value is approximate due to slippage.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {visibility.showOwner && <div className="xl:col-span-1">Owner</div>}
          {/* Header actions sizer to align auto-width column with row actions */}
          {visibility.showActions && (
            <div
              className={`${visibility.showOwner ? 'xl:col-start-13' : 'xl:col-start-12'} xl:col-span-1 xl:justify-self-end`}
            >
              <div className="invisible flex gap-3" aria-hidden>
                <Button size="sm" variant="outline">
                  Settle
                </Button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-9 px-3 rounded-md border text-sm bg-background hover:bg-muted/50 border-border"
                >
                  Share
                </button>
              </div>
            </div>
          )}
        </div>
        {sortedPositions.map((position: PositionType) => {
          const isOwner =
            connectedAddress &&
            position.owner &&
            connectedAddress.toLowerCase() === position.owner.toLowerCase();

          if (!position.market) {
            console.warn(
              'Skipping position render due to missing market data:',
              position.positionId
            );
            return null;
          }

          const isClosed = Number(position.collateral) === 0;
          const marketAddress = position.market.marketGroup?.address || '';

          const endTimestamp = position.market?.endTimestamp;
          const isPositionSettled = position.isSettled || false;
          const now = Date.now();
          const isExpired = endTimestamp
            ? Number(endTimestamp) * 1000 < now
            : false;

          return (
            <TraderPositionRow
              key={position.id}
              position={position}
              isOwner={Boolean(isOwner)}
              hasWallet={Boolean(connectedAddress)}
              isClosed={isClosed}
              isExpired={isExpired}
              isMarketPage={Boolean(isSpecificMarketPage)}
              isPositionSettled={isPositionSettled}
              marketAddress={marketAddress}
              displayQuestionColumn={Boolean(displayQuestionColumn)}
              showActions={visibility.showActions}
              showOwnerColumn={Boolean(visibility.showOwner)}
            />
          );
        })}
      </div>
    </div>
  );
}

type TraderPositionRowProps = {
  position: PositionType;
  isOwner: boolean;
  hasWallet: boolean;
  isClosed: boolean;
  isExpired: boolean;
  isMarketPage: boolean;
  isPositionSettled: boolean;
  marketAddress: string;
  displayQuestionColumn: boolean;
  showActions: boolean;
  showOwnerColumn: boolean;
};

function TraderPositionRow({
  position,
  isOwner,
  hasWallet,
  isClosed,
  isExpired,
  isMarketPage,
  isPositionSettled,
  marketAddress,
  displayQuestionColumn,
  showActions,
  showOwnerColumn,
}: TraderPositionRowProps) {
  return (
    <div className="px-4 py-4 xl:py-4 border-b last:border-b-0">
      <div
        className={`flex flex-col gap-3 xl:grid ${
          showActions
            ? showOwnerColumn
              ? 'xl:[grid-template-columns:repeat(12,minmax(0,1fr))_auto]'
              : 'xl:[grid-template-columns:repeat(11,minmax(0,1fr))_auto]'
            : showOwnerColumn
              ? 'xl:[grid-template-columns:repeat(12,minmax(0,1fr))]'
              : 'xl:[grid-template-columns:repeat(11,minmax(0,1fr))]'
        } xl:items-center`}
      >
        {displayQuestionColumn && (
          <div className={'xl:col-span-5'}>
            {(() => {
              const chainShortName = position.market?.marketGroup?.chainId
                ? getChainShortName(position.market.marketGroup.chainId)
                : 'unknown';
              const marketAddr = position.market?.marketGroup?.address || '';
              const marketId = position.market?.marketId;
              const question = position.market?.question || 'N/A';

              if (!marketAddr || marketId === undefined)
                return (
                  <div className="space-y-2">
                    <h2 className="text-[17px] font-medium text-foreground leading-[1.35] tracking-[-0.01em]">
                      {question}
                    </h2>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <PositionSharesBadge position={position} />
                      <span> #{position.positionId}</span>
                    </div>
                  </div>
                );
              return (
                <div className="space-y-2">
                  <h2 className="text-[17px] font-medium text-foreground leading-[1.35] tracking-[-0.01em]">
                    <Link
                      href={`/markets/${chainShortName}:${marketAddr}/${marketId}`}
                      className="group"
                    >
                      <span className="underline decoration-1 decoration-foreground/10 underline-offset-4 transition-colors group-hover:decoration-foreground/60">
                        {question}
                      </span>
                    </Link>
                  </h2>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <PositionSharesBadge position={position} />
                    <span>Position #{position.positionId}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {isClosed ? (
          <div
            className={`${
              displayQuestionColumn
                ? showOwnerColumn
                  ? 'xl:col-span-7'
                  : 'xl:col-span-6'
                : showOwnerColumn
                  ? 'xl:col-span-12'
                  : 'xl:col-span-11'
            } text-center font-medium text-muted-foreground tracking-wider`}
          >
            CLOSED
          </div>
        ) : (
          <>
            {/* Removed Position Size cell as it's displayed under the question */}

            <div
              className={
                displayQuestionColumn ? 'xl:col-span-3' : 'xl:col-span-5'
              }
            >
              <div className="text-xs text-muted-foreground xl:hidden">
                Wager
              </div>
              <div>
                <div className="whitespace-nowrap">
                  <NumberDisplay
                    value={Number(
                      formatEther(BigInt(position.collateral || '0'))
                    )}
                  />{' '}
                  {position.market?.marketGroup?.collateralSymbol || 'Unknown'}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1 whitespace-nowrap">
                  To Win: <MaxPayoutCell position={position} />
                </div>
              </div>
            </div>

            <div
              className={
                displayQuestionColumn ? 'xl:col-span-3' : 'xl:col-span-6'
              }
            >
              <div className="text-xs text-muted-foreground xl:hidden">
                Position Value
              </div>
              <PositionValueCell position={position} />
            </div>

            {showOwnerColumn && (
              <div className="xl:col-span-1">
                <div className="text-xs text-muted-foreground xl:hidden">
                  Owner
                </div>
                <div className="flex items-center gap-2">
                  {position.owner ? (
                    <Image
                      alt={position.owner}
                      src={blo(position.owner as `0x${string}`)}
                      className="w-5 h-5 rounded-sm ring-1 ring-border/50"
                      width={20}
                      height={20}
                    />
                  ) : null}
                  <div className="[&_span.font-mono]:text-foreground">
                    <AddressDisplay address={position.owner || ''} />
                  </div>
                </div>
              </div>
            )}

            {showActions && (
              <div
                className={`mt-3 xl:mt-0 xl:col-span-1 ${showOwnerColumn ? 'xl:col-start-13' : 'xl:col-start-12'} xl:justify-self-end`}
              >
                <div className="flex gap-3 justify-start xl:justify-end">
                  {/* Exclusively show Settle when expired and not settled; otherwise show Sell (not on market page) */}
                  {isExpired && !isPositionSettled ? (
                    isOwner ? (
                      <SettlePositionButton
                        positionId={position.positionId.toString()}
                        marketAddress={marketAddress}
                        chainId={position.market?.marketGroup?.chainId || 0}
                        isMarketSettled={position.market?.settled || false}
                        onSuccess={() => {
                          console.log(
                            `Settle action for position ${position.positionId} initiated. Consider implementing a data refetch mechanism.`
                          );
                        }}
                      />
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button size="sm" variant="outline" disabled>
                                Settle
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[220px]">
                              {hasWallet
                                ? 'You can only settle positions from the account that owns them.'
                                : 'Connect your account to settle this position.'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  ) : (
                    !isMarketPage &&
                    (isOwner && !isClosed ? (
                      <SellPositionDialog
                        position={position}
                        marketAddress={marketAddress}
                        chainId={position.market?.marketGroup?.chainId || 0}
                        onSuccess={() => {
                          console.log(
                            `Close action for position ${position.positionId} sent.`
                          );
                        }}
                      />
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button size="sm" variant="outline" disabled>
                                Sell
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[220px]">
                              {!hasWallet
                                ? 'Connect your wallet to sell this position.'
                                : isClosed
                                  ? 'This position is already closed.'
                                  : 'You can only sell from the account that owns this position.'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))
                  )}

                  <SharePositionDialog
                    position={position}
                    trigger={
                      <button
                        type="button"
                        className="inline-flex items-center justify-center h-9 px-3 rounded-md border text-sm bg-background hover:bg-muted/50 border-border"
                      >
                        Share
                      </button>
                    }
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
