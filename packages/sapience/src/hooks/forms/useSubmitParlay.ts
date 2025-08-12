import { useToast } from '@sapience/ui/hooks/use-toast';
import { useCallback, useState, useMemo } from 'react';
import { encodeFunctionData, erc20Abi, isHex, padHex, stringToHex } from 'viem';
import { useAccount } from 'wagmi';
import { useSapienceWriteContract } from '~/hooks/blockchain/useSapienceWriteContract';

// Contract addresses
const PARLAY_CONTRACT_ADDRESS = '0x918e72DAB2aF7672AbF534F744770D7F8859C55e';
const COLLATERAL_TOKEN_ADDRESS = '0x3138d1B6F726F54813c9Ed6E29A5e44C24Cb11f1';

// Parlay contract ABI (only the functions we need)
const PARLAY_ABI = [
  {
    type: 'function',
    name: 'submitParlayOrder',
    inputs: [
      {
        name: 'predictedOutcomes',
        type: 'tuple[]',
        components: [
          {
            name: 'market',
            type: 'tuple',
            components: [
              {
                name: 'marketGroup',
                type: 'address',
              },
              {
                name: 'marketId',
                type: 'uint256',
              },
            ],
          },
          {
            name: 'prediction',
            type: 'bool',
          },
        ],
      },
      {
        name: 'collateral',
        type: 'uint256',
      },
      {
        name: 'payout',
        type: 'uint256',
      },
      {
        name: 'orderExpirationTime',
        type: 'uint256',
      },
      {
        name: 'refCode',
        type: 'bytes32',
      },
    ],
    outputs: [
      {
        name: 'requestId',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
] as const;

interface ParlayPosition {
  marketAddress: string;
  marketId: number;
  prediction: boolean;
  limit: string; // Amount in string format
}

interface UseSubmitParlayProps {
  chainId: number;
  positions: ParlayPosition[];
  wagerAmount: string; // Total wager amount for the parlay (collateral)
  payoutAmount: string; // Expected payout amount
  orderExpirationHours?: number; // Hours from now when order expires (default: 24)
  onSuccess?: () => void;
  enabled?: boolean;
  refCode?: string; // Optional referral code; empty/undefined allowed
}

export function useSubmitParlay({
  chainId,
  positions,
  wagerAmount,
  payoutAmount,
  orderExpirationHours = 24,
  onSuccess,
  enabled = true,
  refCode,
}: UseSubmitParlayProps) {
  const { address } = useAccount();
  const { toast } = useToast();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Use unified write/sendCalls wrapper (handles chain validation and tx monitoring)
  const { sendCalls, isPending: isSubmitting } = useSapienceWriteContract({
    onSuccess: () => {
      setSuccess('Parlay order submitted successfully');
      setError(null);
      toast({
        title: 'Parlay Order Confirmed',
        description:
          'Your parlay order has been submitted and is available for other users to fill',
        duration: 5000,
      });
      onSuccess?.();
    },
    onError: (err) => {
      const message = err?.message || 'Transaction failed';
      setError(message);
    },
    successMessage: 'Parlay submitted',
    fallbackErrorMessage: 'Failed to submit parlay',
  });

  // Parse amounts to bigint
  const parsedWagerAmount = useMemo(() => {
    try {
      return BigInt(wagerAmount || '0');
    } catch {
      return BigInt(0);
    }
  }, [wagerAmount]);

  const parsedPayoutAmount = useMemo(() => {
    try {
      return BigInt(payoutAmount || '0');
    } catch {
      return BigInt(0);
    }
  }, [payoutAmount]);

  // Calculate order expiration time (current time + hours in seconds)
  const orderExpirationTime = useMemo(() => {
    return BigInt(
      Math.floor(Date.now() / 1000) + orderExpirationHours * 60 * 60
    );
  }, [orderExpirationHours]);

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

    // Validate inputs
    if (
      positions.length === 0 ||
      parsedWagerAmount <= 0 ||
      parsedPayoutAmount <= 0
    ) {
      return callsArray;
    }

    // Add ERC20 approval call for collateral token
    const approveCalldata = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [PARLAY_CONTRACT_ADDRESS, parsedWagerAmount],
    });

    callsArray.push({
      to: COLLATERAL_TOKEN_ADDRESS,
      data: approveCalldata,
    });

    // Transform positions to match contract structure
    const predictedOutcomes = positions.map((position) => ({
      market: {
        marketGroup: position.marketAddress as `0x${string}`,
        marketId: BigInt(position.marketId),
      },
      prediction: position.prediction,
    }));

    // Add submitParlayOrder call
    const submitParlayCalldata = encodeFunctionData({
      abi: PARLAY_ABI,
      functionName: 'submitParlayOrder',
      args: [
        predictedOutcomes,
        parsedWagerAmount,
        parsedPayoutAmount,
        orderExpirationTime,
        encodedRefCode,
      ],
    });

    callsArray.push({
      to: PARLAY_CONTRACT_ADDRESS,
      data: submitParlayCalldata,
    });

    return callsArray;
  }, [
    positions,
    parsedWagerAmount,
    parsedPayoutAmount,
    orderExpirationTime,
    encodedRefCode,
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
        title: 'Submitting Parlay Order',
        description:
          'Please confirm the transaction batch in your wallet. This will approve collateral and submit your parlay order.',
      });

      // Submit the batch of calls using the unified wrapper
      await sendCalls({
        calls,
        chainId,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to submit parlay';
      setError(errorMessage);

      toast({
        title: 'Parlay Failed',
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
