'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { parseUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { predictionMarketAbi } from '@sapience/sdk';
import { predictionMarket } from '@sapience/sdk/contracts';
import { DEFAULT_CHAIN_ID } from '@sapience/sdk/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@sapience/sdk/ui/components/ui/dialog';
import { useBetSlipContext } from '~/lib/context/BetSlipContext';
import YesNoSplitButton from '~/components/shared/YesNoSplitButton';
import { useAuctionStart } from '~/lib/auction/useAuctionStart';
import { buildAuctionStartPayload } from '~/lib/auction/buildAuctionPayload';
import { DEFAULT_WAGER_AMOUNT } from '~/lib/utils/betslipUtils';
import SafeMarkdown from '~/components/shared/SafeMarkdown';
import EndTimeDisplay from '~/components/shared/EndTimeDisplay';

export interface ParlayConditionCardProps {
  condition: {
    id?: string;
    question: string;
    shortName?: string | null;
    endTime?: number | null;
    description?: string | null;
  };
  color: string;
}

const ParlayConditionCard: React.FC<ParlayConditionCardProps> = ({
  condition,
  color,
}) => {
  const { id, question, shortName, endTime, description } = condition;
  const { addParlaySelection, removeParlaySelection, parlaySelections } =
    useBetSlipContext();
  const [requestedPrediction, setRequestedPrediction] = React.useState<
    number | null
  >(null);
  const [isRequesting, setIsRequesting] = React.useState<boolean>(false);
  const [lastMakerWagerWei, setLastMakerWagerWei] = React.useState<
    string | null
  >(null);
  const { address: makerAddress } = useAccount();
  const { requestQuotes, bids } = useAuctionStart();
  const PREDICTION_MARKET_ADDRESS = predictionMarket[DEFAULT_CHAIN_ID]?.address;

  const { data: makerNonce } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: predictionMarketAbi,
    functionName: 'nonces',
    args: makerAddress ? [makerAddress] : undefined,
    chainId: DEFAULT_CHAIN_ID,
    query: { enabled: !!makerAddress && !!PREDICTION_MARKET_ADDRESS },
  });

  const displayQ = shortName || question;

  const selectionState = React.useMemo(() => {
    if (!id) return { selectedYes: false, selectedNo: false };
    const existing = parlaySelections.find((s) => s.conditionId === id);
    return {
      selectedYes: !!existing && existing.prediction === true,
      selectedNo: !!existing && existing.prediction === false,
    };
  }, [parlaySelections, id]);

  const handleYes = React.useCallback(() => {
    if (!id) return;
    const existing = parlaySelections.find((s) => s.conditionId === id);
    if (existing && existing.prediction === true) {
      removeParlaySelection(existing.id);
      return;
    }
    addParlaySelection({
      conditionId: id,
      question: displayQ,
      prediction: true,
    });
  }, [
    id,
    displayQ,
    parlaySelections,
    removeParlaySelection,
    addParlaySelection,
  ]);

  const handleNo = React.useCallback(() => {
    if (!id) return;
    const existing = parlaySelections.find((s) => s.conditionId === id);
    if (existing && existing.prediction === false) {
      removeParlaySelection(existing.id);
      return;
    }
    addParlaySelection({
      conditionId: id,
      question: displayQ,
      prediction: false,
    });
  }, [
    id,
    displayQ,
    parlaySelections,
    removeParlaySelection,
    addParlaySelection,
  ]);

  const formatPriceAsPercentage = React.useCallback((price: number) => {
    if (!(price > 0)) return 'Price N/A';
    const percentage = price * 100;
    return `${Math.round(percentage)}% chance`;
  }, []);

  // Complete when ack/bids arrive, if we were requesting
  React.useEffect(() => {
    if (!isRequesting) return;
    if (!bids || bids.length === 0) return;
    try {
      // Filter non-expired bids if deadlines are present
      const nowMs = Date.now();
      const valid = bids.filter((b) => {
        try {
          const dl = Number(b?.takerDeadline || 0);
          return Number.isFinite(dl) ? dl * 1000 > nowMs : true;
        } catch {
          return true;
        }
      });
      const list = valid.length > 0 ? valid : bids;
      // Pick highest takerWager as best payout
      const best = list.reduce((best, cur) => {
        try {
          return BigInt(cur.takerWager) > BigInt(best.takerWager) ? cur : best;
        } catch {
          return best;
        }
      }, list[0]);
      const maker = BigInt(String(lastMakerWagerWei || '0'));
      const taker = BigInt(String(best?.takerWager || '0'));
      const denom = maker + taker;
      const prob = denom > 0n ? Number(maker) / Number(denom) : 0.5;
      // Clamp probability to [0.01, 0.99] to avoid edge cases in display
      const clamped = Math.max(0.01, Math.min(0.99, prob));
      setRequestedPrediction(clamped);
    } catch {
      setRequestedPrediction(0.5);
    } finally {
      setIsRequesting(false);
    }
  }, [bids, isRequesting, lastMakerWagerWei]);

  const handleRequestPrediction = React.useCallback(() => {
    if (isRequesting) return;
    setIsRequesting(true);
    try {
      if (!id || !makerAddress || makerNonce === undefined) {
        // Fallback: simulate completion if wallet context is missing
        window.setTimeout(() => {
          setRequestedPrediction(0.5);
          setIsRequesting(false);
        }, 600);
        return;
      }
      const wagerWei = parseUnits(DEFAULT_WAGER_AMOUNT, 18).toString();
      setLastMakerWagerWei(wagerWei);
      const payload = buildAuctionStartPayload([
        { marketId: id, prediction: true },
      ]);
      requestQuotes({
        wager: wagerWei,
        resolver: payload.resolver,
        predictedOutcomes: payload.predictedOutcomes,
        maker: makerAddress,
        makerNonce: Number(makerNonce),
      });
      // Safety timeout in case nothing returns
      window.setTimeout(() => {
        if (isRequesting) {
          setRequestedPrediction(0.5);
          setIsRequesting(false);
        }
      }, 2000);
    } catch {
      setRequestedPrediction(0.5);
      setIsRequesting(false);
    }
  }, [id, makerAddress, makerNonce, requestQuotes, isRequesting]);

  return (
    <div className="w-full h-full">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bg-card border rounded-md border-border/70 flex flex-row items-stretch h-full md:min-h-[160px] relative overflow-hidden shadow shadow-md transition-shadow duration-200"
      >
        <div
          className="w-1 min-w-[4px] max-w-[4px]"
          style={{ backgroundColor: color, margin: '-1px 0' }}
        />
        <div className="flex-1 flex flex-col h-full">
          <div className="block group">
            <div className="transition-colors">
              <div className="flex flex-col px-4 py-3 gap-3">
                <div className="flex flex-col min-w-0 flex-1">
                  <h3 className="leading-snug min-h-[44px]">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button type="button" className="text-left w-full">
                          <span
                            className="underline decoration-1 decoration-foreground/10 underline-offset-4 transition-colors block overflow-hidden group-hover:decoration-foreground/60"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {displayQ}
                          </span>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="w-[92vw] max-w-3xl break-words overflow-x-hidden">
                        <DialogHeader>
                          <DialogTitle className="break-words whitespace-normal text-2xl font-medium">
                            {displayQ}
                          </DialogTitle>
                        </DialogHeader>
                        <div>
                          <div className="flex items-center mb-4">
                            <EndTimeDisplay endTime={endTime} size="large" />
                          </div>
                          {description ? (
                            <div className="text-sm leading-relaxed break-words [&_a]:break-all">
                              <SafeMarkdown
                                content={description}
                                className="break-words [&_a]:break-all"
                              />
                            </div>
                          ) : null}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </h3>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-auto px-4 pt-0 pb-5">
            <div className="text-xs md:text-sm text-muted-foreground w-full mb-3">
              <div className="truncate whitespace-nowrap min-w-0 h-4 md:h-5 flex items-center">
                <span className="text-muted-foreground mr-0.5">
                  Market Prediction:
                </span>
                &nbsp;
                {requestedPrediction == null ? (
                  isRequesting ? (
                    <span className="text-muted-foreground">Requesting...</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestPrediction}
                      className="text-foreground underline decoration-1 decoration-foreground/60 underline-offset-4 transition-colors hover:decoration-foreground/80 cursor-pointer"
                    >
                      Request
                    </button>
                  )
                ) : (
                  <span className="text-foreground font-medium">
                    {formatPriceAsPercentage(requestedPrediction)}
                  </span>
                )}
              </div>
            </div>
            <YesNoSplitButton
              onYes={handleYes}
              onNo={handleNo}
              className="w-full"
              size="md"
              selectedYes={selectionState.selectedYes}
              selectedNo={selectionState.selectedNo}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ParlayConditionCard;
