'use client';

import { useMemo } from 'react';
import type { PositionType } from '@sapience/ui/types';
import OgShareDialogBase from '~/components/shared/OgShareDialogBase';

interface SharePositionDialogProps {
  position: PositionType;
  trigger?: React.ReactNode;
  /** Override the default wager value in the share payload (e.g., use Entry for closed trades) */
  wagerOverride?: number | string;
  /** Override the payout value in the share payload (e.g., use Exit for closed trades) */
  payoutOverride?: number | string;
  /** Extra query params to include in the share URL */
  extraParams?: Record<string, string>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// no-op: we now send the full address for OG rendering

export default function SharePositionDialog({
  position,
  trigger,
  wagerOverride,
  payoutOverride,
  extraParams,
  open: controlledOpen,
  onOpenChange,
}: SharePositionDialogProps) {
  const { market } = position;
  const group = market?.marketGroup;

  const question = market?.question || 'Prediction Market';
  const isYesNo = group?.baseTokenName === 'Yes';
  const side = (() => {
    const baseTokenName = group?.baseTokenName;
    const base = BigInt(position.baseToken || '0');
    const borrowed = BigInt(position.borrowedBaseToken || '0');
    const net = base - borrowed;
    if (baseTokenName === 'Yes') {
      return net >= 0n ? 'on Yes' : 'on No';
    }
    return net >= 0n ? 'long' : 'short';
  })();

  const formatAmount = (val: number): string => {
    if (!Number.isFinite(val)) return '0';
    return val.toFixed(val < 1 ? 4 : 2);
  };

  const wager = useMemo(() => {
    try {
      if (typeof wagerOverride !== 'undefined') {
        const numeric =
          typeof wagerOverride === 'string'
            ? Number(wagerOverride)
            : wagerOverride;
        return formatAmount(Number(numeric));
      }
      const wei = BigInt(position.collateral || '0');
      const val = Number(wei) / 1e18;
      return formatAmount(val);
    } catch {
      return '0';
    }
  }, [position.collateral, wagerOverride]);

  const symbol = group?.collateralSymbol || '';
  const maxPayout = useMemo(() => {
    if (!isYesNo) return '';
    try {
      const base = BigInt(position.baseToken || '0');
      const borrowed = BigInt(position.borrowedBaseToken || '0');
      const net = base - borrowed;
      const amount = net >= 0n ? base : borrowed;
      const val = Number(amount) / 1e18;
      return formatAmount(val);
    } catch {
      return '0';
    }
  }, [isYesNo, position.baseToken, position.borrowedBaseToken]);

  // Exit value should reflect payoutOverride when provided, regardless of market type
  const exitValue = useMemo(() => {
    if (typeof payoutOverride === 'undefined') return '';
    const numeric =
      typeof payoutOverride === 'string'
        ? Number(payoutOverride)
        : payoutOverride;
    return formatAmount(Number(numeric));
  }, [payoutOverride]);
  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    // Prefer identifier-based params
    const groupAddress = group?.address;
    const marketId = position.market?.marketId;
    if (groupAddress && marketId && position.positionId) {
      sp.set('group', groupAddress);
      sp.set('mid', String(marketId));
    }
    // Always provide text fallbacks so the route can render even if fetch fails
    sp.set('q', question);
    sp.set('dir', side);
    // For closed trades, wagerOverride should represent entry, payoutOverride exit.
    sp.set('wager', wager);
    // Prefer explicit exit value (payoutOverride) when provided; otherwise fallback to Yes/No max payout
    if (exitValue) {
      sp.set('payout', exitValue);
    } else if (maxPayout) {
      sp.set('payout', maxPayout);
    }
    // Also include explicit entry/exit for richer previews when available
    if (typeof wagerOverride !== 'undefined') sp.set('entry', wager);
    if (exitValue) sp.set('exit', exitValue);
    // Append any caller-provided extra params
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (typeof v === 'string') sp.set(k, v);
      });
    }
    if (symbol) sp.set('symbol', symbol);
    if (position.positionId) sp.set('pid', String(position.positionId));
    if (position.owner) sp.set('addr', position.owner);
    return sp.toString();
  }, [
    question,
    side,
    wager,
    symbol,
    position.positionId,
    position.owner,
    isYesNo,
    maxPayout,
    exitValue,
    extraParams,
  ]);
  const imageSrc = `/og/trade?${queryString}`;

  return (
    <OgShareDialogBase
      imageSrc={imageSrc}
      title="Share Your Wager"
      trigger={trigger}
      shareTitle="Share"
      shareText={question}
      open={controlledOpen}
      onOpenChange={onOpenChange}
      loaderSizePx={48}
      copyButtonText="Copy Image"
      shareButtonText="Share"
    />
  );
}
