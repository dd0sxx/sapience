import { useToast } from '@sapience/ui/hooks/use-toast';
import { useCallback, useState, useMemo } from 'react';
import {
  encodeFunctionData,
  erc20Abi,
  isHex,
  padHex,
  stringToHex,
  parseUnits,
} from 'viem';

import PredictionMarket from '@/protocol/deployments/PredictionMarket.json';
import SapienceResolver from '@/protocol/deployments/SapienceResolver.json';
import type { Abi } from 'abitype';
import { useRouter } from 'next/navigation';
import { useAccount, usePublicClient } from 'wagmi';
import { useSapienceWriteContract } from '~/hooks/blockchain/useSapienceWriteContract';
import { buildAuctionStartPayload } from '~/lib/auction/buildAuctionPayload';
import type { QuoteBid } from '~/lib/auction/useAuctionStart';

// Contract addresses from deployments
const PREDICTION_MARKET_ADDRESS = PredictionMarket.address as `0x${string}`;
const SAPIENCE_RESOLVER_ADDRESS = SapienceResolver.address as `0x${string}`;

interface ParlayPosition {
  marketAddress: string;
  marketId: number;
  prediction: boolean;
  limit: string; // Amount in string format
}

interface UseSubmitParlayProps {
  chainId: number;
  collateralTokenAddress: `0x${string}`;
  collateralTokenDecimals: number;
  positions: ParlayPosition[];
  wagerAmount: string; // Total wager amount for the parlay (collateral)
  payoutAmount: string; // Expected payout amount
  selectedBid?: QuoteBid; // Selected bid from auction
  onSuccess?: () => void;
  enabled?: boolean;
  refCode?: string; // Optional referral code; empty/undefined allowed
  onOrderCreated?: (makerTokenId: bigint, takerTokenId: bigint, txHash?: string) => void;
}

export function useSubmitParlay({
  chainId,
  collateralTokenAddress,
  collateralTokenDecimals,
  positions,
  wagerAmount,
  payoutAmount,
  selectedBid,
  onSuccess,
  enabled = true,
  refCode,
  onOrderCreated,
}: UseSubmitParlayProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const { toast } = useToast();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Encode predicted outcomes for SapienceResolver
  const encodedPredictedOutcomes = useMemo(() => {
    if (positions.length === 0) return '0x' as `0x${string}`;
    
    const outcomes = positions.map(position => ({
      marketGroup: position.marketAddress,
      marketId: position.marketId,
      prediction: position.prediction
    }));
    
    const { predictedOutcomes } = buildAuctionStartPayload(outcomes, SAPIENCE_RESOLVER_ADDRESS);
    return predictedOutcomes[0] || ('0x' as `0x${string}`);
  }, [positions]);

  // Use unified write/sendCalls wrapper (handles chain validation and tx monitoring)
  const { sendCalls, isPending: isSubmitting } = useSapienceWriteContract({
    onTxHash: (hash) => {
      // no-op; we'll re-read order ids on success
      void hash;
    },
    onSuccess: (receipt) => {
      setSuccess('Prediction minted successfully');
      setError(null);
      toast({
        title: 'Prediction Minted',
        description:
          'Your prediction has been minted as an NFT and is now active.',
        duration: 5000,
      });
      
      // For PredictionMarket.mint, the NFT token IDs are returned directly
      // We would need to parse the transaction result to get the actual token IDs
      // For now, we'll use placeholder values and let the component handle the specifics
      try {
        // The mint function returns (makerNftTokenId, takerNftTokenId)
        // This would typically be extracted from transaction logs or return data
        // For now, we'll call without txHash since we don't have access to it here
        onOrderCreated?.(BigInt(0), BigInt(0));
      } catch {
        // ignore
      }

      onSuccess?.();
      if (address) {
        router.push(`/profile/${address.toLowerCase()}#parlays`);
      }
    },
    onError: (err) => {
      const message = err?.message || 'Transaction failed';
      setError(message);
    },
    successMessage: 'Prediction minted',
    fallbackErrorMessage: 'Failed to mint prediction',
  });

  // Parse human-readable amounts to base units using token decimals
  const parsedWagerAmount = useMemo(() => {
    try {
      return parseUnits(wagerAmount || '0', collateralTokenDecimals);
    } catch {
      return BigInt(0);
    }
  }, [wagerAmount, collateralTokenDecimals]);

  const parsedPayoutAmount = useMemo(() => {
    try {
      return parseUnits(payoutAmount || '0', collateralTokenDecimals);
    } catch {
      return BigInt(0);
    }
  }, [payoutAmount, collateralTokenDecimals]);


  // Encode optional refCode to bytes32 (empty -> 0x00..00)
  const encodedRefCode = useMemo(() => {
    const zero = '0x' + '0'.repeat(64);
    if (!refCode || refCode.trim().length === 0) return zero as `0x${string}`;

    // If already hex, pad/truncate to 32 bytes
    if (isHex(refCode)) {
      try {
        return padHex(refCode, { size: 32 });
      } catch {
        // Fallback to zero on invalid input
        return zero as `0x${string}`;
      }
    }

    // Convert plain string to hex and pad/truncate to 32 bytes
    try {
      let hex = stringToHex(refCode);
      if (hex.length > 66) {
        hex = `0x${(hex as string).slice(2, 66)}`; // keep first 32 bytes
      }
      return padHex(hex, { size: 32 });
    } catch {
      return zero as `0x${string}`;
    }
  }, [refCode]);

  // Prepare calls for sendCalls
  const calls = useMemo(() => {
    const callsArray: { to: `0x${string}`; data: `0x${string}` }[] = [];

    // Validate inputs - need selectedBid for PredictionMarket.mint
    if (
      positions.length === 0 ||
      parsedWagerAmount <= 0 ||
      !selectedBid ||
      !address
    ) {
      return callsArray;
    }

    // Add ERC20 approval call for collateral token to PredictionMarket
    const approveCalldata = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [PREDICTION_MARKET_ADDRESS, parsedWagerAmount],
    });

    callsArray.push({
      to: collateralTokenAddress,
      data: approveCalldata,
    });

    // Build MintPredictionRequestData struct
    const mintRequestData = {
      encodedPredictedOutcomes: encodedPredictedOutcomes,
      resolver: SAPIENCE_RESOLVER_ADDRESS,
      makerCollateral: parsedWagerAmount,
      takerCollateral: BigInt(selectedBid.takerWager),
      maker: address,
      taker: selectedBid.taker as `0x${string}`,
      takerSignature: selectedBid.takerSignature as `0x${string}`,
      takerDeadline: BigInt(selectedBid.takerDeadline),
      refCode: encodedRefCode,
    };

    // Add PredictionMarket.mint call
    const mintCalldata = encodeFunctionData({
      abi: PredictionMarket.abi as Abi,
      functionName: 'mint',
      args: [mintRequestData],
    });

    callsArray.push({
      to: PREDICTION_MARKET_ADDRESS,
      data: mintCalldata,
    });

    return callsArray;
  }, [
    positions,
    parsedWagerAmount,
    selectedBid,
    address,
    encodedRefCode,
    encodedPredictedOutcomes,
    collateralTokenAddress,
  ]);

  const submitParlay = useCallback(async () => {
    if (!enabled || !address || positions.length === 0) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      // Validate calls
      if (calls.length === 0) {
        throw new Error('No valid calls to execute');
      }

      toast({
        title: 'Minting Prediction',
        description:
          'Please confirm the transaction batch in your wallet. This will approve collateral and mint your prediction NFT.',
      });

      // Submit the batch of calls using the unified wrapper
      await sendCalls({
        calls,
        chainId,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to mint prediction';
      setError(errorMessage);

      toast({
        title: 'Prediction Mint Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [enabled, address, positions.length, chainId, calls, sendCalls, toast]);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return {
    submitParlay,
    isSubmitting,
    error,
    success,
    reset,
  };
}
