import { useCallback, useState, useMemo } from 'react';
import {
  encodeFunctionData,
  erc20Abi,
  isHex,
  padHex,
  stringToHex,
  parseUnits,
} from 'viem';
import { useReadContract } from 'wagmi';

import PredictionMarket from '@/protocol/deployments/PredictionMarket.json';
import type { Abi } from 'abitype';
import type { QuoteBid } from '~/lib/auction/useAuctionStart';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useSapienceWriteContract } from '~/hooks/blockchain/useSapienceWriteContract';
import { useToast } from '@sapience/ui/hooks/use-toast';

// Contract addresses
const PREDICTION_MARKET_ADDRESS = PredictionMarket.address as `0x${string}`;

interface UseSubmitParlayProps {
  chainId: number;
  collateralTokenAddress: `0x${string}`;
  collateralTokenDecimals: number;
  _wagerAmount: string; // Total wager amount for the parlay (collateral) - unused, kept for interface compatibility
  selectedBid: QuoteBid | null; // Selected bid from auction - contains all prediction data
  onSuccess?: () => void;
  enabled?: boolean;
  refCode?: string; // Optional referral code; empty/undefined allowed
  onOrderCreated?: (makerTokenId: bigint, takerTokenId: bigint) => void;
}

export function useSubmitParlay({
  chainId,
  collateralTokenAddress,
  collateralTokenDecimals,
  _wagerAmount,
  selectedBid,
  onSuccess,
  enabled = true,
  refCode,
  onOrderCreated,
}: UseSubmitParlayProps) {
  const { address } = useAccount();
  const { toast } = useToast();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Use unified write/sendCalls wrapper (handles chain validation and tx monitoring)
  const { sendCalls, isPending: isSubmitting } = useSapienceWriteContract({
    onSuccess: () => {
      setSuccess('Prediction minted successfully');
      setError(null);
      toast({
        title: 'Prediction Minted',
        description: 'Your prediction has been minted as an NFT.',
        duration: 5000,
      });
      
      // Call with placeholder token IDs - actual IDs will be indexed by API
      onOrderCreated?.(BigInt(0), BigInt(0));

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

  // Remove unused parsedWagerAmount - we use requiredApprovalAmount from bid instead


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

  // The actual amount needed for approval (makerCollateral from bid)
  const requiredApprovalAmount = useMemo(() => {
    if (!selectedBid?.makerCollateral) return BigInt(0);
    try {
      return BigInt(selectedBid.makerCollateral);
    } catch {
      return BigInt(0);
    }
  }, [selectedBid]);

  // Check current allowance
  const { data: currentAllowance = BigInt(0) } = useReadContract({
    address: collateralTokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && PREDICTION_MARKET_ADDRESS 
      ? [address, PREDICTION_MARKET_ADDRESS] 
      : undefined,
    query: {
      enabled: !!address && !!collateralTokenAddress && requiredApprovalAmount > 0,
    },
  });

  // Check if approval is needed
  const needsApproval = useMemo(() => {
    return requiredApprovalAmount > 0 && currentAllowance < requiredApprovalAmount;
  }, [requiredApprovalAmount, currentAllowance]);

  // Prepare calls for sendCalls
  const calls = useMemo(() => {
    const callsArray: { to: `0x${string}`; data: `0x${string}` }[] = [];

    // Validate inputs - need selectedBid for mint
    if (
      requiredApprovalAmount <= 0 ||
      !selectedBid ||
      !address
    ) {
      return callsArray;
    }

    // Add ERC20 approval call only if needed
    if (needsApproval) {
      const approveCalldata = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [PREDICTION_MARKET_ADDRESS, requiredApprovalAmount],
      });

      callsArray.push({
        to: collateralTokenAddress,
        data: approveCalldata,
      });
    }

    // Validate critical bid data
    if (!selectedBid.encodedPredictedOutcomes || selectedBid.encodedPredictedOutcomes === '0x' || 
        selectedBid.encodedPredictedOutcomes.replace(/0x0+/, '0x') === '0x') {
      console.error('[MINT-VALIDATION] encodedPredictedOutcomes is empty or invalid:', selectedBid.encodedPredictedOutcomes);
      return callsArray;
    }
    
    if (!selectedBid.resolver || selectedBid.resolver === '0x0000000000000000000000000000000000000000') {
      console.error('[MINT-VALIDATION] resolver address is invalid:', selectedBid.resolver);
      return callsArray;
    }

    // Build MintPredictionRequestData from selectedBid
    const mintRequestData = {
      encodedPredictedOutcomes: selectedBid.encodedPredictedOutcomes as `0x${string}`,
      resolver: selectedBid.resolver as `0x${string}`,
      makerCollateral: BigInt(selectedBid.makerCollateral || '0'),
      takerCollateral: BigInt(selectedBid.takerWager),
      maker: address,
      taker: selectedBid.taker as `0x${string}`,
      takerSignature: selectedBid.takerSignature as `0x${string}`,
      takerDeadline: BigInt(selectedBid.takerDeadline),
      refCode: encodedRefCode,
    };

    // Log the exact struct being passed to PredictionMarket.mint()
    console.log('=== MINT STRUCT DATA ===');
    console.log('MintPredictionRequestData struct:', JSON.stringify({
      encodedPredictedOutcomes: mintRequestData.encodedPredictedOutcomes,
      resolver: mintRequestData.resolver,
      makerCollateral: mintRequestData.makerCollateral.toString(),
      takerCollateral: mintRequestData.takerCollateral.toString(),
      maker: mintRequestData.maker,
      taker: mintRequestData.taker,
      takerSignature: mintRequestData.takerSignature,
      takerDeadline: mintRequestData.takerDeadline.toString(),
      refCode: mintRequestData.refCode
    }, null, 2));
    
    // TENDERLY COPY-PASTE FORMAT
    console.log('🔥 TENDERLY TUPLE FORMAT (copy this for mint function):');
    console.log(`["${mintRequestData.encodedPredictedOutcomes}","${mintRequestData.resolver}","${mintRequestData.makerCollateral}","${mintRequestData.takerCollateral}","${mintRequestData.maker}","${mintRequestData.taker}","${mintRequestData.takerSignature}","${mintRequestData.takerDeadline}","${mintRequestData.refCode}"]`);
    console.log('========================');

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
    requiredApprovalAmount,
    needsApproval,
    selectedBid,
    address,
    encodedRefCode,
    collateralTokenAddress,
  ]);

  const submitParlay = useCallback(async () => {
    if (!enabled || !address || !selectedBid) {
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
  }, [enabled, address, chainId, calls, sendCalls, toast, selectedBid]);

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
