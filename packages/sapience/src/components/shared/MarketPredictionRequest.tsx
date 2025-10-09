'use client';

import * as React from 'react';
import { parseUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { predictionMarketAbi } from '@sapience/sdk';
import { predictionMarket } from '@sapience/sdk/contracts';
import { DEFAULT_CHAIN_ID } from '@sapience/sdk/constants';
import { useAuctionStart } from '~/lib/auction/useAuctionStart';
import {
  buildAuctionStartPayload,
  type PredictedOutcomeInputStub,
} from '~/lib/auction/buildAuctionPayload';
import { DEFAULT_WAGER_AMOUNT } from '~/lib/utils/betslipUtils';

export interface MarketPredictionRequestProps {
  conditionId?: string;
  outcomes?: PredictedOutcomeInputStub[];
  onPrediction?: (probability: number) => void;
  className?: string;
  inline?: boolean;
  eager?: boolean;
}

const MarketPredictionRequest: React.FC<MarketPredictionRequestProps> = ({
  conditionId,
  outcomes,
  onPrediction,
  className,
  inline = true,
  eager = true,
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

  const eagerlyRequestedRef = React.useRef<boolean>(false);

  // Generate or retrieve a stable guest maker address for logged-out users
  const guestMakerAddress = React.useMemo<`0x${string}` | null>(() => {
    try {
      if (typeof window === 'undefined') return null;
      let addr = window.localStorage.getItem('sapience_guest_maker_address');
      if (!addr) {
        const bytes = new Uint8Array(20);
        // Use Web Crypto to generate a random 20-byte address
        window.crypto.getRandomValues(bytes);
        addr =
          '0x' +
          Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        window.localStorage.setItem('sapience_guest_maker_address', addr);
      }
      return addr as `0x${string}`;
    } catch {
      return null;
    }
  }, []);

  // Prefer connected wallet address; fall back to guest address
  const selectedMakerAddress = makerAddress ?? guestMakerAddress ?? undefined;

  const { data: makerNonce } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: predictionMarketAbi,
    functionName: 'nonces',
    args: selectedMakerAddress ? [selectedMakerAddress] : undefined,
    chainId: DEFAULT_CHAIN_ID,
    query: { enabled: !!selectedMakerAddress && !!PREDICTION_MARKET_ADDRESS },
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

  const effectiveOutcomes = React.useMemo<PredictedOutcomeInputStub[]>(() => {
    if (outcomes && outcomes.length > 0) return outcomes;
    if (conditionId) return [{ marketId: conditionId, prediction: true }];
    return [];
  }, [outcomes, conditionId]);

  React.useEffect(() => {
    if (!queuedRequest) return;
    if (!isRequesting) return;
    if (effectiveOutcomes.length === 0 || !selectedMakerAddress) return;
    try {
      const wagerWei = parseUnits(DEFAULT_WAGER_AMOUNT, 18).toString();
      setLastMakerWagerWei(wagerWei);
      const payload = buildAuctionStartPayload(effectiveOutcomes);
      requestQuotes({
        wager: wagerWei,
        resolver: payload.resolver,
        predictedOutcomes: payload.predictedOutcomes,
        maker: selectedMakerAddress,
        makerNonce: makerNonce !== undefined ? Number(makerNonce) : 0,
      });
      setQueuedRequest(false);
    } catch {
      setIsRequesting(false);
      setQueuedRequest(false);
    }
  }, [
    queuedRequest,
    isRequesting,
    effectiveOutcomes,
    selectedMakerAddress,
    makerNonce,
    requestQuotes,
  ]);

  const handleRequestPrediction = React.useCallback(() => {
    if (isRequesting) return;
    setRequestedPrediction(null);
    setIsRequesting(true);
    try {
      if (effectiveOutcomes.length === 0 || !selectedMakerAddress) {
        setQueuedRequest(true);
      } else {
        const wagerWei = parseUnits(DEFAULT_WAGER_AMOUNT, 18).toString();
        setLastMakerWagerWei(wagerWei);
        const payload = buildAuctionStartPayload(effectiveOutcomes);
        requestQuotes({
          wager: wagerWei,
          resolver: payload.resolver,
          predictedOutcomes: payload.predictedOutcomes,
          maker: selectedMakerAddress,
          makerNonce: makerNonce !== undefined ? Number(makerNonce) : 0,
        });
      }
    } catch {
      setIsRequesting(false);
    }
  }, [
    effectiveOutcomes,
    selectedMakerAddress,
    makerNonce,
    requestQuotes,
    isRequesting,
  ]);

  React.useEffect(() => {
    if (!eager) return;
    if (eagerlyRequestedRef.current) return;
    eagerlyRequestedRef.current = true;
    handleRequestPrediction();
  }, [eager, handleRequestPrediction]);

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
