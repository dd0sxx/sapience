'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Address } from 'viem';

import type { Position as PositionType } from '@sapience/ui/types/graphql';
import OgShareDialogBase from '~/components/shared/OgShareDialog';
import { usePositions } from '~/hooks/graphql/usePositions';
import {
  useForecasts,
  type FormattedAttestation,
} from '~/hooks/graphql/useForecasts';
import { useUserParlays, type Parlay } from '~/hooks/graphql/useUserParlays';
import { SCHEMA_UID } from '~/lib/constants/eas';

type Anchor = 'trades' | 'lp' | 'forecasts' | 'parlays';

type ShareIntentStored = {
  address: string;
  anchor: Anchor;
  clientTimestamp: number;
  txHash?: string;
  positionId?: string | number;
  og?: { imagePath: string; params?: Record<string, any> };
};

export default function ShareAfterRedirect({ address }: { address: Address }) {
  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const clearedRef = useRef(false);

  const lowerAddress = String(address).toLowerCase();

  // Data hooks for fallback resolution
  const { data: positions } = usePositions({ address: lowerAddress });
  const { data: forecasts } = useForecasts({
    attesterAddress: lowerAddress,
    schemaId: SCHEMA_UID,
  });
  const { data: parlays } = useUserParlays({ address: lowerAddress });

  const clearIntent = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      window.sessionStorage.removeItem('sapience:share-intent');
      clearedRef.current = true;
    } catch {
      // ignore
    }
  }, []);

  const readIntent = useCallback((): ShareIntentStored | null => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = window.sessionStorage.getItem('sapience:share-intent');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ShareIntentStored;
      return parsed || null;
    } catch {
      return null;
    }
  }, []);

  const currentAnchor = useMemo<Anchor | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = window.location.hash?.replace('#', '').toLowerCase();
    if (
      raw === 'trades' ||
      raw === 'lp' ||
      raw === 'forecasts' ||
      raw === 'parlays'
    )
      return raw;
    return null;
  }, []);

  // Build minimal OG url from resolved entities
  const toOgUrl = useCallback(
    (
      anchor: Anchor,
      entity: PositionType | FormattedAttestation | Parlay
    ): string | null => {
      const qp = new URLSearchParams();
      qp.set('addr', lowerAddress);
      try {
        if (anchor === 'trades' && entity) {
          const pos = entity as PositionType;
          const q =
            pos?.market?.marketGroup?.question || pos?.market?.question || '';
          if (q) qp.set('q', q);
          const symbol =
            pos?.market?.marketGroup?.collateralSymbol ||
            pos?.market?.marketGroup?.baseTokenName ||
            '';
          if (symbol) qp.set('symbol', symbol);
          const wager = pos?.collateral || pos?.transactions?.[0]?.collateral;
          if (wager) qp.set('wager', String(wager));
          return `/og/trade?${qp.toString()}`;
        }
        if (anchor === 'lp' && entity) {
          const pos = entity as PositionType;
          const q =
            pos?.market?.marketGroup?.question || pos?.market?.question || '';
          if (q) qp.set('q', q);
          const symbol =
            pos?.market?.marketGroup?.collateralSymbol ||
            pos?.market?.marketGroup?.baseTokenName ||
            '';
          if (symbol) qp.set('symbol', symbol);
          return `/og/liquidity?${qp.toString()}`;
        }
        if (anchor === 'forecasts' && entity) {
          const q = '';
          if (q) qp.set('q', q);
          const f = entity as FormattedAttestation;
          if (f?.rawTime) qp.set('created', String(f.rawTime));
          return `/og/forecast?${qp.toString()}`;
        }
        if (anchor === 'parlays' && entity) {
          // Encode up to 5 legs short names if present
          const p = entity as Parlay;
          const legs: string[] = (p?.predictedOutcomes || [])
            .map(
              (o) =>
                (o?.condition?.shortName as string) ||
                (o?.condition?.question as string)
            )
            .filter(Boolean)
            .slice(0, 5);
          if (legs.length > 0) {
            legs.forEach((l, idx) => qp.set(`leg${idx + 1}`, String(l)));
          }
          return `/og/parlay?${qp.toString()}`;
        }
      } catch {
        // ignore
      }
      return null;
    },
    [lowerAddress]
  );

  // Main effect: attempt to resolve and show
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (clearedRef.current) return;

    const intent = readIntent();
    if (!intent) return;

    // Validate address and anchor
    const intentAddr = String(intent.address || '').toLowerCase();
    if (!intentAddr || intentAddr !== lowerAddress) return;
    if (!currentAnchor || currentAnchor !== intent.anchor) return;

    // Path 1: immediate OG provided by caller
    if (intent.og && intent.og.imagePath) {
      try {
        const params = new URLSearchParams(
          Object.fromEntries(
            Object.entries(intent.og.params || {})
              .filter(([, v]) => v !== undefined && v !== null)
              .map(([k, v]) => [k, String(v)])
          )
        );
        const src = `${intent.og.imagePath}?${params.toString()}`;
        setImageSrc(src);
        setOpen(true);
        clearIntent();
        return;
      } catch {
        // fallthrough to resolution
      }
    }

    // Path 2: attempt to resolve via data hooks, up to 60s
    const start = Date.now();
    const windowMs = 2 * 60 * 1000; // 2 minutes
    const deadline = start + 60 * 1000; // give up after 60s
    const timer = setInterval(() => {
      const now = Date.now();
      if (now > deadline) {
        clearInterval(timer);
        clearIntent();
        return;
      }

      const ts = Number(intent.clientTimestamp || 0);
      const minTs = ts - windowMs;
      const maxTs = ts + windowMs;

      let resolved: PositionType | FormattedAttestation | Parlay | null = null;
      if (intent.anchor === 'trades' || intent.anchor === 'lp') {
        const isLp = intent.anchor === 'lp';
        const list: PositionType[] = (positions || []).filter(
          (p: PositionType) => Boolean(p?.isLP) === isLp
        );

        // Try by positionId
        if (intent.positionId !== undefined) {
          const pid = String(intent.positionId);
          resolved =
            list.find((p: PositionType) => String(p.positionId) === pid) ||
            null;
        }
        // Try by txHash
        if (!resolved && intent.txHash) {
          const txh = String(intent.txHash).toLowerCase();
          resolved =
            list.find((p: PositionType) =>
              (p?.transactions || []).some(
                (t: any) =>
                  String(t?.event?.transactionHash || '').toLowerCase() === txh
              )
            ) || null;
        }
        // Fallback by recency window
        if (!resolved) {
          const within = list
            .map((p: PositionType) => {
              const created = Number(p?.createdAt ?? 0);
              const latestTx = Math.max(
                0,
                ...(p?.transactions || []).map((t: any) =>
                  Number(t?.createdAt ?? 0)
                )
              );
              const candidateTs =
                Number.isFinite(latestTx) && latestTx > 0 ? latestTx : created;
              return { p, candidateTs };
            })
            .filter(
              (x: { p: PositionType; candidateTs: number }) =>
                Number.isFinite(x.candidateTs) &&
                x.candidateTs >= minTs / 1000 - 5 &&
                x.candidateTs <= maxTs / 1000 + 5
            );
          within.sort(
            (
              a: { p: PositionType; candidateTs: number },
              b: { p: PositionType; candidateTs: number }
            ) => b.candidateTs - a.candidateTs
          );
          resolved = within[0]?.p || null;
        }
      } else if (intent.anchor === 'forecasts') {
        const list: FormattedAttestation[] = forecasts || [];
        resolved =
          list.find(
            (f: FormattedAttestation) => Number(f.rawTime) * 1000 >= minTs
          ) || null;
      } else if (intent.anchor === 'parlays') {
        const list: Parlay[] = parlays || [];
        resolved =
          list
            .filter((p: Parlay) => Number(p.mintedAt) * 1000 >= minTs)
            .sort(
              (a: Parlay, b: Parlay) => Number(b.mintedAt) - Number(a.mintedAt)
            )[0] || null;
      }

      if (resolved) {
        const src = toOgUrl(intent.anchor, resolved);
        if (src) {
          clearInterval(timer);
          setImageSrc(src);
          setOpen(true);
          clearIntent();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    lowerAddress,
    currentAnchor,
    positions,
    forecasts,
    parlays,
    readIntent,
    toOgUrl,
    clearIntent,
  ]);

  if (!imageSrc) return null;

  return (
    <OgShareDialogBase
      imageSrc={imageSrc}
      open={open}
      onOpenChange={setOpen}
      title="Share"
      shareTitle="Share"
    />
  );
}
