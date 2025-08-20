'use client';
import { Switch } from '@sapience/ui/components/ui/switch';
import { Input } from '@sapience/ui/components/ui/input';
import { Label } from '@sapience/ui/components/ui/label';
// import type { MarketGroupType } from '@/sapience/ui/types';
import { Badge } from '@sapience/ui/components/ui/badge';
import Link from 'next/link';
import { FormProvider, type UseFormReturn } from 'react-hook-form';
import { SquareStack, AlertTriangle } from 'lucide-react';
import { Button } from '@/sapience/ui/index';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sapience/ui/components/ui/tooltip';
import { useBetSlipContext } from '~/lib/context/BetSlipContext';
// import type { MarketGroupClassification } from '~/lib/types';
import { MarketGroupClassification } from '~/lib/types';
import YesNoWagerInput from '~/components/forecasting/forms/inputs/YesNoWagerInput';
import WagerInputWithQuote from '~/components/forecasting/forms/shared/WagerInputWithQuote';
import { getChainShortName } from '~/lib/utils/util';
import { WagerInput } from '~/components/forecasting/forms';
import LottieLoader from '~/components/shared/LottieLoader';

interface BetslipContentProps {
  isParlayMode: boolean;
  setIsParlayMode: (mode: boolean) => void;
  individualMethods: UseFormReturn<{
    positions: Record<string, { predictionValue: string; wagerAmount: string }>;
  }>;
  parlayMethods: UseFormReturn<{
    wagerAmount: string;
    limitAmount: string | number;
    positions: Record<string, { predictionValue: string; wagerAmount: string }>;
  }>;
  handleIndividualSubmit: () => void;
  handleParlaySubmit: () => void;
  isParlaySubmitting: boolean;
  parlayError?: string | null;
  isSubmitting: boolean;
  // Optional minimum parlay wager (human units) to show and validate in the input
  minParlayWager?: string;
  parlayCollateralSymbol?: string;
  parlayCollateralAddress?: `0x${string}`;
  parlayChainId?: number;
}

export const BetslipContent = ({
  isParlayMode,
  setIsParlayMode,
  individualMethods,
  parlayMethods,
  handleIndividualSubmit,
  handleParlaySubmit,
  isParlaySubmitting,
  parlayError,
  isSubmitting,
  minParlayWager,
  parlayCollateralSymbol,
  parlayCollateralAddress,
  parlayChainId,
}: BetslipContentProps) => {
  // Temporary feature flag: disable parlay UI while keeping code paths intact for easy re-enable
  const PARLAY_FEATURE_ENABLED = false;
  const {
    betSlipPositions,
    removePosition,
    positionsWithMarketData,
    clearBetSlip,
  } = useBetSlipContext();
  const hasNumericMarket = positionsWithMarketData.some(
    (p) => p.marketClassification === MarketGroupClassification.NUMERIC
  );
  const parlayDisabled = betSlipPositions.length < 2;
  const effectiveParlayMode = PARLAY_FEATURE_ENABLED && isParlayMode;
  return (
    <>
      <div className="w-full h-full flex flex-col">
        <div className={`${betSlipPositions.length === 0 ? '' : 'px-4 pt-4'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Predict</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium leading-none">
                <SquareStack className="w-3 h-3" />
                Parlay
              </span>
              {!PARLAY_FEATURE_ENABLED ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center">
                        <Switch checked={false} disabled />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Coming Soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : parlayDisabled ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center">
                        <Switch checked={false} disabled />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        You must add at least two predictions to build a parlay.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className="flex items-center">
                  <Switch
                    checked={isParlayMode}
                    onCheckedChange={setIsParlayMode}
                  />
                </span>
              )}
              {betSlipPositions.length > 0 && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={clearBetSlip}
                  type="button"
                  className="ml-3"
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {effectiveParlayMode && (
            <div className="flex items-center justify-between mt-4">
              <Badge
                variant="outline"
                className="px-1.5 py-0.5 text-xs font-medium border-yellow-500/40 bg-yellow-500/10 text-yellow-600 flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                Experimental Feature
              </Badge>
              <Button asChild variant="outline" size="xs">
                <Link href="/parlays">View Parlays</Link>
              </Button>
            </div>
          )}
        </div>

        <div
          className={`flex-1 min-h-0 ${
            betSlipPositions.length === 0 ? '' : 'overflow-y-auto'
          }`}
        >
          {betSlipPositions.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-center px-16">
              <p className="text-base text-muted-foreground">
                Add predictions to see your potential payout.
              </p>
            </div>
          ) : !effectiveParlayMode ? (
            <FormProvider {...individualMethods}>
              <form
                onSubmit={individualMethods.handleSubmit(
                  handleIndividualSubmit
                )}
                className="p-4"
              >
                {positionsWithMarketData.map((positionData, index) => {
                  const isLast = index === positionsWithMarketData.length - 1;
                  return (
                    <div
                      key={positionData.position.id}
                      className={`mb-4 ${!isLast ? 'border-b border-border pb-4' : ''}`}
                    >
                      {positionData.isLoading && (
                        <div className="flex w-full justify-center py-2">
                          <LottieLoader width={20} height={20} />
                        </div>
                      )}

                      {positionData.error && (
                        <>
                          <div className="mb-2">
                            <h3 className="font-medium text-foreground pr-2">
                              {positionData.position.question}
                            </h3>
                          </div>
                          <div className="text-xs text-destructive p-2 bg-destructive/10 rounded">
                            Error loading market data
                            <br />
                            <small>
                              Chain: {positionData.position.chainId} (
                              {getChainShortName(positionData.position.chainId)}
                              )
                              <br />
                              Market: {positionData.position.marketAddress}
                            </small>
                          </div>
                        </>
                      )}

                      {positionData.marketGroupData &&
                        positionData.marketClassification && (
                          <WagerInputWithQuote
                            positionId={positionData.position.id}
                            question={positionData.position.question}
                            marketGroupData={positionData.marketGroupData}
                            marketClassification={
                              positionData.marketClassification
                            }
                            selectedMarketId={positionData.position.marketId}
                            onRemove={() =>
                              removePosition(positionData.position.id)
                            }
                          />
                        )}

                      {!positionData.isLoading &&
                        !positionData.error &&
                        (!positionData.marketGroupData ||
                          !positionData.marketClassification) && (
                          <>
                            <div className="mb-2">
                              <h3 className="font-medium text-foreground pr-2">
                                {positionData.position.question}
                              </h3>
                            </div>
                            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                              Market data not available
                            </div>
                          </>
                        )}
                    </div>
                  );
                })}

                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  className="w-full py-6 text-lg font-normal bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={
                    positionsWithMarketData.some((p) => p.isLoading) ||
                    isSubmitting
                  }
                >
                  Submit Prediction{betSlipPositions.length > 1 ? 's' : ''}
                </Button>
              </form>
            </FormProvider>
          ) : (
            <FormProvider {...parlayMethods}>
              <form
                onSubmit={parlayMethods.handleSubmit(handleParlaySubmit)}
                className="space-y-4 p-4"
              >
                {hasNumericMarket && (
                  <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                    Numeric markets are excluded from parlays.
                  </div>
                )}
                <div className="space-y-4">
                  {positionsWithMarketData
                    .filter(
                      (p) =>
                        p.marketClassification !==
                        MarketGroupClassification.NUMERIC
                    )
                    .map((positionData) => (
                      <div
                        key={positionData.position.id}
                        className="pb-4 mb-4 border-b border-border"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="font-medium text-foreground pr-2">
                            {positionData.marketGroupData?.markets?.find(
                              (m) =>
                                m.marketId === positionData.position.marketId
                            )?.question || positionData.position.question}
                          </h3>
                          <button
                            onClick={() =>
                              removePosition(positionData.position.id)
                            }
                            className="text-[24px] leading-none text-muted-foreground hover:text-foreground"
                            type="button"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>

                        {positionData.marketGroupData && (
                          <YesNoWagerInput
                            marketGroupData={positionData.marketGroupData}
                            positionId={positionData.position.id}
                            showWagerInput={false}
                          />
                        )}
                      </div>
                    ))}

                  <div className="pt-1">
                    <WagerInput
                      minAmount={minParlayWager}
                      collateralSymbol={parlayCollateralSymbol || 'sUSDe'}
                      collateralAddress={parlayCollateralAddress}
                      chainId={parlayChainId}
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="limitAmount"
                      className="text-sm font-medium"
                    >
                      Minimum Payout
                    </Label>
                    <div className="mt-1.5 relative">
                      <Input
                        id="limitAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="pr-16"
                        {...parlayMethods.register('limitAmount', {
                          required: 'Minimum payout is required',
                          min: {
                            value: 0,
                            message: 'Minimum payout must be positive',
                          },
                        })}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        {parlayCollateralSymbol || 'sUSDe'}
                      </div>
                    </div>
                    {parlayMethods.formState.errors.limitAmount && (
                      <p className="text-sm text-destructive mt-1">
                        {parlayMethods.formState.errors.limitAmount.message}
                      </p>
                    )}
                  </div>
                  <div className="pt-2">
                    <Button
                      className="w-full py-6 text-lg font-normal bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={
                        isParlaySubmitting ||
                        positionsWithMarketData.some((p) => p.isLoading)
                      }
                      type="submit"
                      size="lg"
                      variant="default"
                    >
                      {isParlaySubmitting
                        ? 'Submitting Parlay...'
                        : 'Submit Parlay'}
                    </Button>
                  </div>
                </div>

                {parlayError && (
                  <div className="text-sm text-destructive p-2 bg-destructive/10 rounded">
                    {parlayError}
                  </div>
                )}
              </form>
            </FormProvider>
          )}
        </div>
      </div>
    </>
  );
};
