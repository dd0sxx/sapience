import { NumberDisplay } from '@sapience/sdk/ui/components/NumberDisplay';
import { SlippageTolerance } from '@sapience/sdk/ui/components/SlippageTolerance';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@sapience/sdk/ui/components/ui/alert';
import { Badge } from '@sapience/sdk/ui/components/ui/badge';
import { Button } from '@sapience/sdk/ui/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@sapience/sdk/ui/components/ui/form';
import { Input } from '@sapience/sdk/ui/components/ui/input';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sapience/sdk/ui/components/ui/tooltip';
import { useToast } from '@sapience/sdk/ui/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useAccount, useChainId, useReadContract, useSwitchChain } from 'wagmi';

import { ColoredRadioOption } from '@sapience/sdk/ui';
import type { TradeFormMarketDetails } from './CreateTradeForm';
import LottieLoader from '~/components/shared/LottieLoader';
import { useModifyTrade } from '~/hooks/contract/useModifyTrade';
import { useModifyTradeQuoter } from '~/hooks/contract/useModifyTradeQuoter';
import { useTokenBalance } from '~/hooks/contract/useTokenBalance';
import { useTradeForm } from '~/hooks/forms/useTradeForm'; // Assuming TradeFormValues is the correct type
import {
  HIGH_PRICE_IMPACT,
  MIN_BIG_INT_SIZE,
  TOKEN_DECIMALS,
} from '~/lib/constants/numbers';
import { useMarketPage } from '~/lib/context/MarketPageProvider';
import { MarketGroupClassification } from '~/lib/types'; // Added import
import { bigIntAbs } from '~/lib/utils/util';
import { CHART_SERIES_COLORS } from '~/lib/theme/chartColors';

// Define Props including marketDetails
interface ModifyTradeFormProps {
  marketDetails: TradeFormMarketDetails;
  isConnected: boolean;
  onConnectWallet: () => void;
  onSuccess: () => void;
  positionId: string; // Keep positionId
  permitData: PermitDataType | null | undefined; // Add permitData prop
  isPermitLoadingPermit: boolean; // Add isPermitLoadingPermit prop
}
interface PermitDataType {
  permitted?: boolean;
}

function getButtonState({
  isConnected,
  isPermitLoadingPermit,
  permitData,
  isQuoting,
  isApproving,
  isCreatingLP,
  needsApproval,
  collateralAssetTicker,
  isClosing,
  isClosingPosition,
}: {
  isConnected: boolean;
  isPermitLoadingPermit: boolean;
  permitData?: { permitted?: boolean } | null;
  isQuoting: boolean;
  isApproving: boolean;
  isCreatingLP: boolean;
  needsApproval: boolean;
  collateralAssetTicker: string;
  isClosing: boolean;
  isClosingPosition: boolean;
}): { text: string; loading: boolean; disabled: boolean } {
  if (!isConnected) {
    return { text: 'Connect Wallet', loading: false, disabled: false };
  }
  if (isPermitLoadingPermit) {
    return { text: 'Checking permissions...', loading: true, disabled: true };
  }
  if (permitData?.permitted === false) {
    return { text: 'Action Unavailable', loading: false, disabled: true };
  }
  if (isQuoting) {
    return { text: 'Calculating...', loading: true, disabled: true };
  }
  if (isApproving) {
    return {
      text: `Approving ${collateralAssetTicker}...`,
      loading: true,
      disabled: true,
    };
  }
  if (isClosingPosition) {
    return {
      text: 'Closing Position...',
      loading: true,
      disabled: true,
    };
  }
  if (isCreatingLP) {
    return {
      text: isClosing ? 'Closing Position...' : 'Modifying Position...',
      loading: true,
      disabled: true,
    };
  }
  if (needsApproval) {
    return {
      text: `Approve & ${isClosing ? 'Close' : 'Modify'} Position`,
      loading: false,
      disabled: false,
    };
  }
  return {
    text: isClosing ? 'Close Position' : 'Modify Position',
    loading: false,
    disabled: false,
  };
}

const ModifyTradeFormInternal: React.FC<ModifyTradeFormProps> = ({
  marketDetails,
  isConnected,
  onConnectWallet,
  onSuccess,
  positionId,
  permitData,
  isPermitLoadingPermit,
}) => {
  const { address } = useAccount();
  const { toast } = useToast();
  const [isSizeInputFocused, setIsSizeInputFocused] = useState(false);
  const {
    baseTokenName,
    quoteTokenName,
    marketClassification,
    getPositionById,
    numericMarketId,
  } = useMarketPage();
  const successHandled = useRef(false);

  const positionData = getPositionById(positionId);

  const {
    marketAddress,
    chainId,
    marketAbi,
    collateralAssetTicker,
    collateralAssetAddress,
  } = marketDetails;

  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isChainMismatch = isConnected && currentChainId !== chainId;

  const [originalPositionSize, originalPositionDirection]: [
    bigint,
    'Long' | 'Short',
  ] = useMemo(() => {
    if (positionData) {
      const isLong = positionData.vBaseAmount > BigInt(0);
      const size = isLong
        ? positionData.vBaseAmount
        : positionData.borrowedVBase;
      const adjustedSize = size >= MIN_BIG_INT_SIZE ? size : BigInt(0);
      return [isLong ? adjustedSize : -adjustedSize, isLong ? 'Long' : 'Short'];
    }
    return [BigInt(0), 'Long'];
  }, [positionData]);

  const { balance: walletBalance } = useTokenBalance({
    tokenAddress: collateralAssetAddress,
    chainId,
    enabled: isConnected && !!collateralAssetAddress,
  });

  // Format the original position size for the form
  const initialSize = useMemo(() => {
    if (positionData) {
      return formatUnits(
        originalPositionSize < BigInt(0)
          ? -originalPositionSize
          : originalPositionSize,
        TOKEN_DECIMALS
      );
    }
    return '';
  }, [positionData, originalPositionSize]);

  // Use useTradeForm with default values
  const form = useTradeForm({
    defaultValues: {
      size: initialSize,
      direction: originalPositionDirection,
      slippage: '0.5',
    },
  });
  const { control, watch, handleSubmit, setValue, formState, reset } = form;

  // Reset form when position changes
  useEffect(() => {
    if (initialSize && originalPositionDirection) {
      reset({
        size: initialSize,
        direction: originalPositionDirection,
        slippage: '0.5',
      });
    }
  }, [positionId, initialSize, originalPositionDirection, reset]);

  // Watch form fields
  const sizeInput = watch('size'); // Represents the target absolute size
  const slippage = watch('slippage');
  const direction = watch('direction');
  const slippageAsNumber = slippage ? Number(slippage) : 0.5;

  const sizeInputBigInt = useMemo(
    () =>
      direction === 'Short'
        ? -parseUnits(sizeInput, TOKEN_DECIMALS)
        : parseUnits(sizeInput, TOKEN_DECIMALS),
    [direction, sizeInput]
  );
  const isClosing = useMemo(
    () => sizeInputBigInt === BigInt(0),
    [sizeInputBigInt]
  );

  const { quotedCollateralDelta, quotedFillPrice, isQuoting, quoteError } =
    useModifyTradeQuoter({
      marketAddress,
      marketAbi,
      chainId,
      accountAddress: address,
      positionId: BigInt(positionId),
      newSize: sizeInputBigInt,
      enabled: sizeInputBigInt !== originalPositionSize,
    });

  const {
    modifyTrade,
    closePosition,
    needsApproval,
    isApproving,
    isSuccess,
    isLoading,
    isClosingPosition,
    isError: isModifyTradeError,
    error,
  } = useModifyTrade({
    marketAddress,
    marketAbi,
    chainId,
    positionId: BigInt(positionId),
    newSize: sizeInputBigInt,
    slippagePercent: slippageAsNumber,
    enabled: isConnected && !!collateralAssetAddress && !isQuoting,
    collateralTokenAddress: collateralAssetAddress,
    collateralAmount: quotedCollateralDelta,
  });

  const { data: currentPriceD18 } = useReadContract({
    address: marketAddress,
    abi: marketAbi,
    functionName: 'getReferencePrice',
    args: [numericMarketId],
    chainId,
    query: {
      enabled: !!marketAddress,
    },
  });

  // Calculate price impact using helper
  const priceImpact: number = useMemo(() => {
    if (!quotedFillPrice || !currentPriceD18) {
      return 0;
    }

    const currentPrice = Number(formatUnits(currentPriceD18 as bigint, 18));
    const fillPrice = Number(formatUnits(quotedFillPrice, 18));

    return Math.abs((fillPrice - currentPrice) / currentPrice) * 100;
  }, [quotedFillPrice, currentPriceD18]);

  const showPriceImpactWarning = priceImpact > HIGH_PRICE_IMPACT;

  // Handle successful modification
  useEffect(() => {
    if (isSuccess && onSuccess && !successHandled.current) {
      successHandled.current = true;

      // Determine if this was a close operation (either via form or close button)
      const wasClosingOperation = isClosing || isClosingPosition;

      // Reset form with new position size
      const newSize = wasClosingOperation
        ? '0'
        : formatUnits(bigIntAbs(sizeInputBigInt), TOKEN_DECIMALS);

      form.reset(
        {
          size: newSize,
          direction,
          slippage: '0.5',
        },
        {
          keepDirty: false,
          keepTouched: false,
          keepIsValid: false,
          keepErrors: false,
        }
      );

      onSuccess();
    }
  }, [
    isSuccess,
    isClosing,
    isClosingPosition,
    onSuccess,
    sizeInputBigInt,
    direction,
    form,
  ]);

  // Reset the success handler when transaction state changes
  useEffect(() => {
    if (!isSuccess) {
      successHandled.current = false;
    }
  }, [isSuccess]);

  useEffect(() => {
    if (isModifyTradeError && error) {
      toast({
        title: 'Error Modifying Position',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [isModifyTradeError, error, toast]);

  const handleFormSubmit = async () => {
    if (isChainMismatch) {
      if (switchChain) {
        switchChain({ chainId });
      } else {
        toast({
          title: 'Error',
          description: 'Network switching is not available.',
          variant: 'destructive',
        });
      }
      return;
    }
    await modifyTrade();
  };

  const handleDirectionChange = (value: string) => {
    setValue('direction', value as 'Long' | 'Short', {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  // Check if current form state matches original state
  const isFormInOriginalState = useMemo(() => {
    const currentSizeFormatted = sizeInput || '0';
    const originalSizeFormatted = formatUnits(
      originalPositionSize > BigInt(0)
        ? originalPositionSize
        : -originalPositionSize,
      TOKEN_DECIMALS
    );

    return (
      currentSizeFormatted === originalSizeFormatted &&
      direction === originalPositionDirection
    );
  }, [sizeInput, direction, originalPositionSize, originalPositionDirection]);

  // Get button state
  const buttonState = getButtonState({
    isConnected,
    isPermitLoadingPermit,
    permitData,
    isQuoting,
    isApproving,
    isCreatingLP: isLoading,
    needsApproval,
    collateralAssetTicker,
    isClosing,
    isClosingPosition,
  });

  // Handle disconnected state first
  if (!isConnected) {
    return (
      <div className="text-center p-4 border rounded bg-muted/30">
        <Button size="lg" onClick={onConnectWallet}>
          Connect Wallet
        </Button>
      </div>
    );
  }

  // At this point, we are connected and have positionData.

  // Format values needed for rendering
  const originalSizeFormatted = formatUnits(
    originalPositionSize > BigInt(0)
      ? originalPositionSize
      : -originalPositionSize,
    TOKEN_DECIMALS
  );

  const sizeInputDisplay = formatUnits(
    bigIntAbs(sizeInputBigInt),
    TOKEN_DECIMALS
  );

  const LOADING_SPINNER = (
    <LottieLoader className="invert" width={20} height={20} />
  );

  const currentPositionCollateral = formatUnits(
    positionData?.depositedCollateralAmount ?? BigInt(0),
    TOKEN_DECIMALS
  );

  const resultingPositionCollateral = formatUnits(
    (positionData?.depositedCollateralAmount ?? BigInt(0)) +
      (quotedCollateralDelta ?? BigInt(0)),
    TOKEN_DECIMALS
  );

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Direction Selection Buttons */}
        <div className="mb-4">
          {marketClassification === MarketGroupClassification.NUMERIC ? (
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                onClick={() => handleDirectionChange('Long')}
                className={`py-6 text-lg font-normal ${
                  direction === 'Long'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Long
              </Button>
              <Button
                type="button"
                onClick={() => handleDirectionChange('Short')}
                className={`py-6 text-lg font-normal ${
                  direction === 'Short'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Short
              </Button>
            </div>
          ) : (
            <div
              role="radiogroup"
              aria-label="Prediction"
              className="grid grid-cols-2 gap-2 mt-2"
            >
              <ColoredRadioOption
                label="Yes"
                color={CHART_SERIES_COLORS[2]}
                checked={direction === 'Long'}
                onClick={() => handleDirectionChange('Long')}
              />
              <ColoredRadioOption
                label="No"
                color={CHART_SERIES_COLORS[1]}
                checked={direction === 'Short'}
                onClick={() => handleDirectionChange('Short')}
              />
            </div>
          )}
        </div>

        {/* Size Input - Target Size */}
        <div className="mb-6">
          <FormField
            control={control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Size</FormLabel>
                <FormControl>
                  <div
                    className={`flex rounded-md ${
                      isSizeInputFocused ? 'ring-2 ring-ring ring-offset-2' : ''
                    }`}
                  >
                    <Input
                      placeholder={originalSizeFormatted}
                      type="number"
                      step="any"
                      className={
                        marketClassification ===
                        MarketGroupClassification.NUMERIC
                          ? 'rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0'
                          : 'rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0'
                      }
                      {...field}
                      onFocus={() => setIsSizeInputFocused(true)}
                      onBlur={() => setIsSizeInputFocused(false)}
                    />
                    {!isFormInOriginalState && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-l-none border-l-0 ml-[-1px] px-4 h-10"
                              onClick={(e) => {
                                e.preventDefault();
                                field.onChange(originalSizeFormatted);
                                setValue(
                                  'direction',
                                  originalPositionDirection,
                                  {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                    shouldTouch: true,
                                  }
                                );
                              }}
                            >
                              <RotateCcw />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Revert to original position</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {marketClassification ===
                      MarketGroupClassification.NUMERIC && (
                      <div className="px-4 flex items-center border border-input bg-muted rounded-r-md ml-[-1px]">
                        {baseTokenName}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Slippage Tolerance */}
        <SlippageTolerance />

        {/* Permit Alert */}
        {!isPermitLoadingPermit && permitData?.permitted === false && (
          <Alert
            variant="destructive"
            className="mb-4 bg-destructive/10 dark:bg-destructive/20 dark:text-red-700 rounded"
          >
            <AlertTitle>Accessing Via Prohibited Region</AlertTitle>
            <AlertDescription>
              You cannot trade using this app.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="mt-6 space-y-2">
          <Button
            size="lg"
            type="submit"
            disabled={
              !!quoteError ||
              !formState.isValid ||
              !formState.isDirty ||
              buttonState.disabled ||
              isClosingPosition
            }
            className="w-full"
          >
            {buttonState.loading && !isClosingPosition && LOADING_SPINNER}
            {buttonState.text}
          </Button>

          {/* Error Display */}
          {quoteError && (
            <p className="text-red-500 text-sm text-center mt-2 font-medium">
              <AlertTriangle className="inline-block align-top w-4 h-4 mr-1 mt-0.5" />
              Insufficient liquidity. Try a smaller size.
            </p>
          )}
        </div>

        {/* Close Position Button */}
        {!isClosing && originalPositionSize !== BigInt(0) && (
          <Button
            size="lg"
            variant="secondary"
            disabled={buttonState.disabled || isQuoting || isClosingPosition}
            className="w-full mt-8"
            onClick={async (e) => {
              e.preventDefault();
              await closePosition();
            }}
          >
            {isClosingPosition && LOADING_SPINNER}
            Close Position
          </Button>
        )}

        {/* Preview Section */}
        <AnimatePresence mode="wait">
          {formState.isDirty && !quoteError && quotedCollateralDelta && (
            <motion.div
              key="details-container-modify"
              layout
              initial={{ opacity: 0, height: 0, transformOrigin: 'top' }}
              animate={{ opacity: 1, height: 'auto', transformOrigin: 'top' }}
              exit={{ opacity: 0, height: 0, transformOrigin: 'top' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="mb-6 relative overflow-hidden"
            >
              <div
                className={`transition-opacity duration-150 ${isLoading ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}
              >
                <h4 className="text-sm font-medium mb-2.5 flex items-center">
                  Order Quote
                </h4>
                <div className="flex flex-col gap-2.5 text-sm">
                  {/* Size Change */}
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Size</span>
                    <span className="flex items-center space-x-1">
                      {/* Original Size and Direction */}
                      {marketClassification ===
                        MarketGroupClassification.NUMERIC &&
                        originalPositionDirection && (
                          <Badge
                            variant="outline"
                            className={`px-1.5 py-0.5 text-xs font-medium ${
                              originalPositionDirection === 'Long'
                                ? 'border-green-500/40 bg-green-500/10 text-green-600'
                                : 'border-red-500/40 bg-red-500/10 text-red-600'
                            }`}
                          >
                            {originalPositionDirection}
                          </Badge>
                        )}
                      <NumberDisplay value={originalSizeFormatted || '0'} />
                      {marketClassification ===
                      MarketGroupClassification.NUMERIC ? (
                        <span className="ml-1">{baseTokenName}</span>
                      ) : (
                        <span className="ml-1">
                          {originalPositionDirection === 'Long' ? 'Yes' : 'No'}
                        </span>
                      )}
                      <span className="mx-1">→</span>
                      {/* Target Size and Direction */}
                      {marketClassification ===
                        MarketGroupClassification.NUMERIC &&
                        sizeInputBigInt !== BigInt(0) && (
                          <Badge
                            variant="outline"
                            className={`px-1.5 py-0.5 text-xs font-medium ${
                              direction === 'Long'
                                ? 'border-green-500/40 bg-green-500/10 text-green-600'
                                : 'border-red-500/40 bg-red-500/10 text-red-600'
                            }`}
                          >
                            {direction}
                          </Badge>
                        )}
                      <NumberDisplay value={sizeInputDisplay || '0'} />
                      {marketClassification ===
                      MarketGroupClassification.NUMERIC ? (
                        <span className="ml-1">{baseTokenName}</span>
                      ) : (
                        <span className="ml-1">
                          {direction === 'Long' ? 'Yes' : 'No'}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Collateral Change */}
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">
                      Position Collateral
                    </span>
                    <span>
                      <NumberDisplay value={currentPositionCollateral || '0'} />{' '}
                      →{' '}
                      <NumberDisplay
                        value={resultingPositionCollateral || '0'}
                      />{' '}
                      {collateralAssetTicker}
                    </span>
                  </div>

                  {/* Estimated Fill Price */}
                  {quotedFillPrice && !isClosing && (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">
                        Estimated Fill Price
                      </span>
                      <span className="flex items-baseline">
                        <span>
                          <NumberDisplay
                            value={formatUnits(quotedFillPrice, 18)}
                          />{' '}
                          {quoteTokenName}
                        </span>
                        {priceImpact > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={`ml-2 text-xs cursor-help ${
                                    showPriceImpactWarning
                                      ? 'text-red-500'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  {Number(priceImpact.toFixed(2)).toString()}%
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>
                                  This is the impact your order will make on the
                                  current market price.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Wallet Balance */}
                  {walletBalance && (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">
                        Wallet Balance
                      </span>
                      <span>
                        <NumberDisplay value={walletBalance} />{' '}
                        {collateralAssetTicker}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Form>
  );
};

// Export the internal component as the default
export default ModifyTradeFormInternal;
