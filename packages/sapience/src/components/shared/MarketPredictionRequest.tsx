'use client';

import * as React from 'react';
import { parseUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { predictionMarketAbi } from '@sapience/sdk';
import { predictionMarket } from '@sapience/sdk/contracts';
import { DEFAULT_CHAIN_ID } from '@sapience/sdk/constants';
import { useAuctionStart } from '~/lib/auction/useAuctionStart';
import { buildAuctionStartPayload } from '~/lib/auction/buildAuctionPayload';
import { DEFAULT_WAGER_AMOUNT } from '~/lib/utils/betslipUtils';

export interface MarketPredictionRequestProps {
  conditionId?: string;
  onPrediction?: (probability: number) => void;
  className?: string;
  inline?: boolean;
}

const MarketPredictionRequest: React.FC<MarketPredictionRequestProps> = ({
  conditionId,
  onPrediction,
  className,
  inline = true,
}) => {
  const [requestedPrediction, setRequestedPrediction] = React.useState<
    number | null
  >(null);
  const [isRequesting, setIsRequesting] = React.useState<boolean>(false);
  const [lastMakerWagerWei, setLastMakerWagerWei] = React.useState<
    string | null
  >(null);
  const [queuedRequest, setQueuedRequest] = React.useState<boolean>(false);

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

  const formatPriceAsPercentage = React.useCallback((price: number) => {
    if (!(price > 0)) return 'Price N/A';
    const percentage = price * 100;
    return `${Math.round(percentage)}% chance`;
  }, []);

  React.useEffect(() => {
    if (!isRequesting) return;
    if (!bids || bids.length === 0) return;
    try {
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
      const clamped = Math.max(0.01, Math.min(0.99, prob));
      setRequestedPrediction(clamped);
      if (typeof onPrediction === 'function') onPrediction(clamped);
    } catch {
      setRequestedPrediction(0.5);
      if (typeof onPrediction === 'function') onPrediction(0.5);
    } finally {
      setIsRequesting(false);
    }
  }, [bids, isRequesting, lastMakerWagerWei, onPrediction]);

  React.useEffect(() => {
    if (!queuedRequest) return;
    if (!isRequesting) return;
    if (!conditionId || !makerAddress || makerNonce === undefined) return;
    try {
      const wagerWei = parseUnits(DEFAULT_WAGER_AMOUNT, 18).toString();
      setLastMakerWagerWei(wagerWei);
      const payload = buildAuctionStartPayload([
        { marketId: conditionId, prediction: true },
      ]);
      requestQuotes({
        wager: wagerWei,
        resolver: payload.resolver,
        predictedOutcomes: payload.predictedOutcomes,
        maker: makerAddress,
        makerNonce: Number(makerNonce),
      });
      setQueuedRequest(false);
    } catch {
      setIsRequesting(false);
      setQueuedRequest(false);
    }
  }, [
    queuedRequest,
    isRequesting,
    conditionId,
    makerAddress,
    makerNonce,
    requestQuotes,
  ]);

  const handleRequestPrediction = React.useCallback(() => {
    if (isRequesting) return;
    setRequestedPrediction(null);
    setIsRequesting(true);
    try {
      if (!conditionId || !makerAddress || makerNonce === undefined) {
        setQueuedRequest(true);
      } else {
        const wagerWei = parseUnits(DEFAULT_WAGER_AMOUNT, 18).toString();
        setLastMakerWagerWei(wagerWei);
        const payload = buildAuctionStartPayload([
          { marketId: conditionId, prediction: true },
        ]);
        requestQuotes({
          wager: wagerWei,
          resolver: payload.resolver,
          predictedOutcomes: payload.predictedOutcomes,
          maker: makerAddress,
          makerNonce: Number(makerNonce),
        });
      }
    } catch {
      setIsRequesting(false);
    }
  }, [conditionId, makerAddress, makerNonce, requestQuotes, isRequesting]);

  return (
    <div
      className={
        inline ? `inline-flex items-center ${className || ''}` : className
      }
    >
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
  );
};

export default MarketPredictionRequest;
