import { useToast } from '@sapience/ui/hooks/use-toast';
import { useCallback, useState } from 'react';
import type { Abi, Address, Hash } from 'viem';
import { parseUnits, encodeFunctionData } from 'viem';
import erc20ABI from '@sapience/ui/abis/erc20abi.json';

import { useTokenApproval } from './useTokenApproval';
import { CREATE_LIQUIDITY_REDUCTION_PERCENT } from '~/lib/constants/numbers';
import { useSapienceWriteContract } from '~/hooks/blockchain/useSapienceWriteContract';
import { calculateMinAmount } from '~/utils/trade';

/**
 * Parameters for creating a liquidity position
 */
export interface CreateLPParams {
  marketAddress: Address;
  marketAbi: Abi;
  chainId?: number;
  marketId: bigint;
  collateralAmount: string;
  lowPriceTick: number | null;
  highPriceTick: number | null;
  amount0: bigint;
  amount1: bigint;
  slippagePercent: number;
  enabled?: boolean;
  collateralTokenAddress?: Address;
  onSuccess?: (txHash: Hash) => void;
}

/**
 * Hook for creating a liquidity position with automatic token approval
 */
export function useCreateLP({
  marketAddress,
  marketAbi,
  chainId,
  marketId,
  collateralAmount,
  lowPriceTick,
  highPriceTick,
  amount0,
  amount1,
  slippagePercent,
  enabled = true,
  collateralTokenAddress,
  onSuccess: onTxHash,
}: CreateLPParams) {
  const { toast } = useToast();
  const [error, setError] = useState<Error | null>(null);

  // Use token approval hook to check current allowance
  const { hasAllowance } = useTokenApproval({
    tokenAddress: collateralTokenAddress,
    spenderAddress: marketAddress,
    amount: collateralAmount,
    chainId,
    enabled:
      enabled &&
      !!collateralTokenAddress &&
      parseFloat(collateralAmount || '0') > 0,
  });

  // Parse collateral amount
  const parsedCollateralAmount = parseUnits(collateralAmount || '0', 18);

  // Use the generic Sapience write contract hook with sendCalls
  const { sendCalls, isPending } = useSapienceWriteContract({
    onTxHash,
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Liquidity position created successfully!',
        duration: 5000,
      });
    },
    onError: (_error) => {
      setError(_error);
    },
    successMessage: 'Liquidity position created successfully!',
    fallbackErrorMessage: 'Failed to create liquidity position',
  });

  // Function to create LP with batched approve + createLP calls
  const performCreateLP = useCallback(async (): Promise<void> => {
    if (
      !enabled ||
      !marketAddress ||
      (!amount0 && !amount1) ||
      lowPriceTick === null ||
      highPriceTick === null ||
      !chainId
    ) {
      console.error(
        'Missing required parameters for creating liquidity position or invalid ticks'
      );
      setError(new Error('Invalid parameters for LP creation'));
      return;
    }

    try {
      setError(null);

      // 30 minutes from now
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
      const adjustedBaseToken = BigInt(
        Math.floor(Number(amount0) * (1 - CREATE_LIQUIDITY_REDUCTION_PERCENT))
      );
      const adjustedQuoteToken = BigInt(
        Math.floor(Number(amount1) * (1 - CREATE_LIQUIDITY_REDUCTION_PERCENT))
      );

      // Calculate minimum amounts based on slippage tolerance
      const minAmount0 = calculateMinAmount(adjustedBaseToken, slippagePercent);
      const minAmount1 = calculateMinAmount(
        adjustedQuoteToken,
        slippagePercent
      );

      console.log(
        'Low Price Tick:',
        lowPriceTick,
        'High Price Tick:',
        highPriceTick
      );

      // Prepare the parameters for the createLiquidityPosition function
      const liquidityParams = {
        marketId,
        lowerTick: BigInt(lowPriceTick),
        upperTick: BigInt(highPriceTick),
        amountBaseToken: adjustedBaseToken,
        amountQuoteToken: adjustedQuoteToken,
        collateralAmount: parsedCollateralAmount,
        minAmountBaseToken: minAmount0,
        minAmountQuoteToken: minAmount1,
        deadline,
      };
      console.log('Liquidity Params:', liquidityParams);

      // Build the calls array
      const calls: { to: `0x${string}`; data: `0x${string}` }[] = [];

      // Add approve call if needed
      if (!hasAllowance && collateralTokenAddress) {
        const approveData = encodeFunctionData({
          abi: erc20ABI,
          functionName: 'approve',
          args: [marketAddress, parsedCollateralAmount],
        });
        calls.push({
          to: collateralTokenAddress,
          data: approveData,
        });
      }

      // Add createLiquidityPosition call
      const createLPData = encodeFunctionData({
        abi: marketAbi,
        functionName: 'createLiquidityPosition',
        args: [liquidityParams],
      });
      calls.push({
        to: marketAddress,
        data: createLPData,
      });

      // Send all calls in batch
      await sendCalls({
        calls,
        chainId,
      });
    } catch (err) {
      console.error('Error in performCreateLP:', err);
      setError(
        err instanceof Error
          ? err
          : new Error('Failed to create liquidity position')
      );
      //setProcessingTx(false);
    }
  }, [
    enabled,
    marketAddress,
    amount0,
    amount1,
    lowPriceTick,
    highPriceTick,
    slippagePercent,
    marketId,
    parsedCollateralAmount,
    sendCalls,
    marketAbi,
    chainId,
    hasAllowance,
    collateralTokenAddress,
  ]);

  return {
    createLP: performCreateLP,
    isLoading: isPending,
    error,
  };
}
