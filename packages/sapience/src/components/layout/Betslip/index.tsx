'use client';

import { Button } from '@sapience/ui/components/ui/button';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@sapience/ui/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
} from '@sapience/ui/components/ui/drawer';
import { useIsBelow } from '@sapience/ui/hooks/use-mobile';

import Image from 'next/image';
import { useForm, useWatch } from 'react-hook-form';
import { useState, useMemo, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePrivy } from '@privy-io/react-auth';
import { sapienceAbi } from '@sapience/ui/lib/abi';

import { encodeFunctionData, parseUnits, erc20Abi, formatUnits } from 'viem';
import erc20ABI from '@sapience/ui/abis/erc20abi.json';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@sapience/ui/hooks/use-toast';
import { useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import ParlayPool from '@/protocol/deployments/ParlayPool.json';
import type { Abi } from 'abitype';
import { useBetSlipContext } from '~/lib/context/BetSlipContext';
import { wagerAmountSchema } from '~/components/forecasting/forms/inputs/WagerInput';

import { MarketGroupClassification } from '~/lib/types';
import {
  getDefaultFormPredictionValue,
  DEFAULT_WAGER_AMOUNT,
  YES_SQRT_PRICE_X96,
} from '~/lib/utils/betslipUtils';
import { useSapienceWriteContract } from '~/hooks/blockchain/useSapienceWriteContract';
import { COLLATERAL_DECIMALS } from '~/lib/constants/numbers';
import { calculateCollateralLimit, DEFAULT_SLIPPAGE } from '~/utils/trade';
import type { useQuoter } from '~/hooks/forms/useQuoter';
import { generateQuoteQueryKey } from '~/hooks/forms/useQuoter';
import { useSubmitParlay } from '~/hooks/forms/useSubmitParlay';
import { PARLAY_CONTRACT_ADDRESS } from '~/hooks/useParlays';
import { getQuoteParamsFromPosition } from '~/hooks/forms/useMultiQuoter';
import { BetslipContent } from '~/components/layout/Betslip/BetslipContent';
import { tickToPrice } from '~/lib/utils/tickUtils';

interface BetslipProps {
  variant?: 'triggered' | 'panel';
}

const Betslip = ({ variant = 'triggered' }: BetslipProps) => {
  const {
    betSlipPositions,
    isPopoverOpen,
    setIsPopoverOpen,
    clearBetSlip,
    positionsWithMarketData,
  } = useBetSlipContext();

  const [isParlayMode, setIsParlayMode] = useState(false);
  const isCompact = useIsBelow(1024);
  const { login, authenticated } = usePrivy();
  const { sendCalls, isPending: isPendingWriteContract } =
    useSapienceWriteContract({
      onSuccess: () => {
        clearBetSlip();
      },
      successMessage: 'Your prediction has been submitted.',
      fallbackErrorMessage: 'Failed to submit prediction',
    });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Parlay config: read minCollateral and collateral token decimals
  const parlayChainId = betSlipPositions[0]?.chainId || 8453;

  const configRead = useReadContracts({
    contracts: [
      {
        address: PARLAY_CONTRACT_ADDRESS,
        abi: ParlayPool.abi as Abi,
        functionName: 'getConfig',
        chainId: parlayChainId,
      },
    ],
    query: { enabled: betSlipPositions.length > 0 },
  });

  const collateralToken: Address | undefined = (() => {
    const item = configRead.data?.[0];
    if (item && item.status === 'success') {
      const cfg = item.result as {
        collateralToken: Address;
      };
      return cfg.collateralToken;
    }
    return undefined;
  })();

  const minCollateralRaw: bigint | undefined = (() => {
    const item = configRead.data?.[0];
    if (item && item.status === 'success') {
      const cfg = item.result as {
        minCollateral: bigint;
      };
      return cfg.minCollateral;
    }
    return undefined;
  })();

  // Fetch collateral token symbol and decimals to display in parlay wager and format min
  const erc20MetaRead = useReadContracts({
    contracts: collateralToken
      ? [
          {
            address: collateralToken,
            abi: erc20Abi,
            functionName: 'symbol',
            chainId: parlayChainId,
          },
          {
            address: collateralToken,
            abi: erc20Abi,
            functionName: 'decimals',
            chainId: parlayChainId,
          },
        ]
      : [],
    query: { enabled: !!collateralToken },
  });

  const collateralSymbol: string | undefined = useMemo(() => {
    const item = erc20MetaRead.data?.[0];
    if (item && item.status === 'success') {
      return String(item.result as unknown as string);
    }
    return undefined;
  }, [erc20MetaRead.data]);

  const collateralDecimals: number | undefined = useMemo(() => {
    const item = erc20MetaRead.data?.[1];
    if (item && item.status === 'success') {
      return Number(item.result as unknown as number);
    }
    return undefined;
  }, [erc20MetaRead.data]);

  const minParlayWager = useMemo(() => {
    if (!minCollateralRaw) return undefined;
    const decimals = collateralDecimals ?? 18;
    try {
      return formatUnits(minCollateralRaw, decimals);
    } catch {
      return String(minCollateralRaw);
    }
  }, [minCollateralRaw, collateralDecimals]);

  // Disable parlay mode automatically when there are fewer than two positions
  useEffect(() => {
    if (betSlipPositions.length < 2 && isParlayMode) {
      setIsParlayMode(false);
    }
  }, [betSlipPositions.length, isParlayMode]);

  // Create dynamic form schema based on positions
  const formSchema = useMemo(() => {
    const positionsSchema: Record<
      string,
      z.ZodObject<{ predictionValue: z.ZodString; wagerAmount: z.ZodTypeAny }>
    > = {};

    betSlipPositions.forEach((position) => {
      positionsSchema[position.id] = z.object({
        predictionValue: z.string().min(1, 'Please make a prediction'),
        wagerAmount: wagerAmountSchema,
      });
    });

    return z.object({
      positions: z.object(positionsSchema),
    });
  }, [betSlipPositions]);

  // Helper function to generate form values
  const generateFormValues = useMemo(() => {
    return {
      positions: Object.fromEntries(
        betSlipPositions.map((position) => {
          // Use stored market classification for smart defaults
          const classification =
            position.marketClassification || MarketGroupClassification.NUMERIC;

          // Start with helper default (handles YES/NO and multichoice)
          let predictionValue = getDefaultFormPredictionValue(
            classification,
            position.prediction,
            position.marketId
          );

          // For numeric markets, compute a sensible midpoint default when market data is available
          if (!predictionValue) {
            if (classification === MarketGroupClassification.NUMERIC) {
              const withData = positionsWithMarketData.find(
                (p) => p.position.id === position.id
              );
              const firstMarket = withData?.marketGroupData?.markets?.[0];
              if (firstMarket) {
                const lowerBound = tickToPrice(
                  firstMarket.baseAssetMinPriceTick ?? 0
                );
                const upperBound = tickToPrice(
                  firstMarket.baseAssetMaxPriceTick ?? 0
                );
                const mid = (lowerBound + upperBound) / 2;
                predictionValue = String(
                  mid > -1 && mid < 1 ? mid.toFixed(6) : Math.round(mid)
                );
              } else {
                // Leave blank to let the numeric input compute/display a midpoint locally
                predictionValue = '';
              }
            } else if (classification === MarketGroupClassification.YES_NO) {
              // Explicit fallback only for YES/NO
              predictionValue = YES_SQRT_PRICE_X96;
            }
          }

          const wagerAmount = position.wagerAmount || DEFAULT_WAGER_AMOUNT;

          return [
            position.id,
            {
              predictionValue,
              wagerAmount,
            },
          ];
        })
      ),
    };
  }, [betSlipPositions, positionsWithMarketData]);

  // Set up form for individual wagers
  const individualMethods = useForm<{
    positions: Record<string, { predictionValue: string; wagerAmount: string }>;
  }>({
    resolver: zodResolver(formSchema),
    defaultValues: generateFormValues,
    mode: 'onChange',
  });

  // Set up form for parlay mode
  const parlayMethods = useForm<{
    wagerAmount: string;
    limitAmount: string | number;
    positions: Record<string, { predictionValue: string; wagerAmount: string }>;
  }>({
    defaultValues: {
      ...generateFormValues,
      wagerAmount: DEFAULT_WAGER_AMOUNT,
      limitAmount:
        positionsWithMarketData.filter(
          (p) => p.marketClassification !== MarketGroupClassification.NUMERIC
        ).length > 0
          ? parseFloat(DEFAULT_WAGER_AMOUNT) *
            Math.pow(
              2,
              positionsWithMarketData.filter(
                (p) =>
                  p.marketClassification !== MarketGroupClassification.NUMERIC
              ).length
            )
          : 2,
    },
  });

  // Reactive form field values (avoid calling watch inside effects/memos)
  const parlayWagerAmount = useWatch({
    control: parlayMethods.control,
    name: 'wagerAmount',
  });
  const parlayLimitAmount = useWatch({
    control: parlayMethods.control,
    name: 'limitAmount',
  });
  const parlayPositionsForm = useWatch({
    control: parlayMethods.control,
    name: 'positions',
  });

  // Reset form when betslip positions change
  useEffect(() => {
    individualMethods.reset(generateFormValues);
  }, [individualMethods, generateFormValues]);

  // Keep parlay form positions in sync when betslip positions change
  useEffect(() => {
    parlayMethods.reset({
      ...generateFormValues,
      wagerAmount:
        parlayMethods.getValues('wagerAmount') ||
        (minParlayWager ?? DEFAULT_WAGER_AMOUNT),
      limitAmount:
        parlayMethods.getValues('limitAmount') ||
        (positionsWithMarketData.filter(
          (p) => p.marketClassification !== MarketGroupClassification.NUMERIC
        ).length > 0
          ? String(
              parseFloat(DEFAULT_WAGER_AMOUNT) *
                Math.pow(
                  2,
                  positionsWithMarketData.filter(
                    (p) =>
                      p.marketClassification !==
                      MarketGroupClassification.NUMERIC
                  ).length
                )
            )
          : '10'),
    });
  }, [
    parlayMethods,
    generateFormValues,
    minParlayWager,
    positionsWithMarketData,
  ]);

  // Ensure wager is at least minParlayWager when config loads
  useEffect(() => {
    if (!minParlayWager) return;
    const current = parlayMethods.getValues('wagerAmount');
    if (!current || Number(current) < Number(minParlayWager)) {
      parlayMethods.setValue('wagerAmount', String(minParlayWager), {
        shouldValidate: true,
      });
    }
  }, [minParlayWager, parlayMethods]);

  // Calculate and set minimum payout when list length or wager amount changes
  // Minimum payout = wagerAmount × 2^(number of positions), formatted to 2 decimals
  useEffect(() => {
    const wagerAmount = parlayWagerAmount || DEFAULT_WAGER_AMOUNT;
    const listLength = positionsWithMarketData.filter(
      (p) => p.marketClassification !== MarketGroupClassification.NUMERIC
    ).length;

    if (listLength > 0) {
      const minimumPayout = parseFloat(wagerAmount) * Math.pow(2, listLength);
      parlayMethods.setValue(
        'limitAmount',
        Number.isFinite(minimumPayout) ? Number(minimumPayout.toFixed(2)) : 0,
        { shouldValidate: true }
      );
    }
  }, [parlayWagerAmount, positionsWithMarketData, parlayMethods]);

  // Prepare parlay positions for the hook
  const parlayPositions = useMemo(() => {
    const limitAmount = (parlayLimitAmount ?? '10').toString();
    const positionsForm =
      (parlayPositionsForm as Record<string, { predictionValue?: string }>) ||
      {};

    return positionsWithMarketData
      .filter(
        (p) => p.marketClassification !== MarketGroupClassification.NUMERIC
      )
      .map(({ position, marketClassification }) => {
        const predValue = positionsForm?.[position.id]?.predictionValue;
        if (
          marketClassification === MarketGroupClassification.MULTIPLE_CHOICE
        ) {
          const selectedMarketId = Number(predValue ?? position.marketId);
          return {
            marketAddress: position.marketAddress,
            marketId: selectedMarketId,
            prediction: true,
            limit: limitAmount,
          };
        }
        // YES/NO path (default)
        const isYes = predValue === YES_SQRT_PRICE_X96;
        return {
          marketAddress: position.marketAddress,
          marketId: position.marketId,
          prediction: isYes,
          limit: limitAmount,
        };
      });
  }, [positionsWithMarketData, parlayLimitAmount, parlayPositionsForm]);

  // Calculate payout amount = wager × 2^(number of positions)
  const payoutAmount = useMemo(() => {
    const wager = parlayWagerAmount || minParlayWager || DEFAULT_WAGER_AMOUNT;
    const listLength = parlayPositions.length;
    const payout = parseFloat(wager) * Math.pow(2, listLength);
    return Number.isFinite(payout) ? payout.toFixed(2) : '0';
  }, [parlayWagerAmount, parlayPositions.length, minParlayWager]);

  // Use the parlay submission hook
  const {
    submitParlay,
    isSubmitting: isParlaySubmitting,
    error: parlayError,
  } = useSubmitParlay({
    chainId: betSlipPositions[0]?.chainId || 8453, // Use first position's chainId or default to Base
    parlayContractAddress: PARLAY_CONTRACT_ADDRESS,
    collateralTokenAddress:
      collateralToken || '0x0000000000000000000000000000000000000000',
    collateralTokenDecimals: collateralDecimals ?? 18,
    positions: parlayPositions,
    wagerAmount:
      parlayMethods.watch('wagerAmount') ||
      (minParlayWager ?? DEFAULT_WAGER_AMOUNT),
    payoutAmount,
    enabled:
      parlayPositions.length > 0 &&
      !!collateralToken &&
      collateralDecimals != null,
    onSuccess: () => {
      // Clear betslip and close popover; hook handles redirect to profile
      clearBetSlip();
      setIsPopoverOpen(false);
    },
  });

  const handleIndividualSubmit = () => {
    if (!authenticated) {
      login();
      return;
    }

    // Ensure all positions are on the same chain
    const chainIds = new Set(
      positionsWithMarketData.map((p) => p.position.chainId)
    );
    if (chainIds.size > 1) {
      toast({
        title: 'Multiple chains detected',
        description:
          'Please place predictions only on markets from the same chain.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    // Guard: no positions
    if (positionsWithMarketData.length === 0) return;

    // Compute shared chainId
    const chainId = positionsWithMarketData[0].position.chainId;

    // Deadline and slippage
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
    const slippage = DEFAULT_SLIPPAGE;

    // Read form values once
    const formValues = individualMethods.getValues();

    // Aggregate approvals per marketAddress and collect trades per position
    const approveByMarket = new Map<
      string,
      { totalAmount: bigint; collateralAsset: string }
    >();
    const tradeCalls: { to: `0x${string}`; data: `0x${string}` }[] = [];

    for (const pos of positionsWithMarketData) {
      // Validate required market data
      if (!pos.marketGroupData || !pos.marketClassification) {
        toast({
          title: 'Market data unavailable',
          description: 'Please wait for market data to load and try again.',
          variant: 'destructive',
          duration: 5000,
        });
        return;
      }

      const positionId = pos.position.id;
      const marketAddress = pos.position.marketAddress as `0x${string}`;
      const marketId = pos.position.marketId;

      const wagerAmountStr =
        formValues?.positions?.[positionId]?.wagerAmount ||
        pos.position.wagerAmount ||
        '0';
      const parsedWagerAmount = parseUnits(wagerAmountStr, COLLATERAL_DECIMALS);

      // Aggregate approve per market (spender = marketAddress)
      const existing = approveByMarket.get(marketAddress);
      const collateralAsset = pos.marketGroupData
        .collateralAsset as `0x${string}`;
      if (existing) {
        approveByMarket.set(marketAddress, {
          totalAmount: existing.totalAmount + parsedWagerAmount,
          collateralAsset: existing.collateralAsset,
        });
      } else {
        approveByMarket.set(marketAddress, {
          totalAmount: parsedWagerAmount,
          collateralAsset,
        });
      }

      // Build trade params for each position
      const predictionValue =
        formValues?.positions?.[positionId]?.predictionValue ?? '';
      const { expectedPrice } = getQuoteParamsFromPosition({
        positionId,
        marketGroupData: pos.marketGroupData,
        marketClassification: pos.marketClassification,
        predictionValue,
        wagerAmount: wagerAmountStr,
      });

      const quoteKey = generateQuoteQueryKey(
        pos.position.chainId,
        marketAddress,
        marketId,
        expectedPrice,
        parsedWagerAmount
      );
      const quoteData =
        queryClient.getQueryData<ReturnType<typeof useQuoter>['quoteData']>(
          quoteKey
        );
      if (!quoteData) {
        toast({
          title: 'Quote not found',
          description:
            'Pricing data for one of your positions is missing. Please refresh the quotes.',
          variant: 'destructive',
          duration: 5000,
        });
        return;
      }

      const maxCollateral = calculateCollateralLimit(
        parsedWagerAmount,
        slippage
      );

      const tradeParams = {
        marketId,
        size: quoteData.maxSize,
        maxCollateral,
        deadline,
      } as const;

      const tradeData = encodeFunctionData({
        abi: sapienceAbi().abi,
        functionName: 'createTraderPosition',
        args: [tradeParams],
      });
      tradeCalls.push({ to: marketAddress, data: tradeData });
    }

    // Build approve calls (one per market)
    const approveCalls: { to: `0x${string}`; data: `0x${string}` }[] = [];
    approveByMarket.forEach(
      ({ totalAmount, collateralAsset }, marketAddress) => {
        const approveData = encodeFunctionData({
          abi: erc20ABI,
          functionName: 'approve',
          args: [marketAddress, totalAmount],
        });
        approveCalls.push({
          to: collateralAsset as `0x${string}`,
          data: approveData,
        });
      }
    );

    // Send batched approves then trades
    const calls = [...approveCalls, ...tradeCalls];
    if (calls.length === 0) return;

    sendCalls({
      calls,
      chainId,
    });
  };

  const handleParlaySubmit = () => {
    if (!authenticated) {
      login();
      return;
    }

    // Submit the parlay using the hook
    submitParlay();
  };

  const contentProps = {
    isParlayMode,
    setIsParlayMode,
    individualMethods,
    parlayMethods,
    handleIndividualSubmit,
    handleParlaySubmit,
    isParlaySubmitting,
    parlayError,
    isSubmitting: Boolean(isPendingWriteContract),
    minParlayWager,
    parlayCollateralSymbol: collateralSymbol,
    parlayCollateralAddress: collateralToken,
    parlayChainId,
  };

  if (isCompact) {
    return (
      <>
        {/* Mobile Bet Slip Button (fixed bottom-center, circular, icon-filled) */}
        <Drawer open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <DrawerTrigger asChild>
            <Button
              className="fixed shadow-md left-1/2 -translate-x-1/2 bottom-6 z-40 lg:hidden rounded-full overflow-hidden flex items-center justify-center border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors pointer-events-auto"
              size="icon"
              variant="secondary"
            >
              <Image
                src="/susde-icon.svg"
                alt="sUSDe"
                width={24}
                height={24}
                className="h-full w-full"
              />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[85vh]">
            <DrawerHeader className="pb-0">
              <DrawerTitle className="text-left"></DrawerTitle>
            </DrawerHeader>
            <div
              className={`${betSlipPositions.length === 0 ? 'px-4 pt-4 pb-14' : 'p-0'} h-full`}
            >
              <BetslipContent {...contentProps} />
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  if (variant === 'panel') {
    return (
      <div className="w-full h-full flex flex-col">
        <div
          className={`${betSlipPositions.length === 0 ? 'px-4 pt-4 pb-10' : 'p-0'} h-full`}
        >
          <BetslipContent {...contentProps} />
        </div>
      </div>
    );
  }

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="default"
            className="hidden lg:flex rounded-full px-5"
            size="default"
          >
            <Image src="/susde-icon.svg" alt="sUSDe" width={20} height={20} />
            Predict
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={`${betSlipPositions.length === 0 ? 'w-80 h-[24rem] px-4 pt-4 pb-14' : 'w-[20rem] p-0'} flex flex-col`}
          align="end"
        >
          <div className="flex-1">
            <BetslipContent {...contentProps} />
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};

export default Betslip;
