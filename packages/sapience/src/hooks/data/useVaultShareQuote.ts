import { useEffect, useMemo, useRef, useState } from 'react';
import type { Address } from 'viem';

export interface VaultShareQuote {
  pricePerShareRay: bigint; // 1e18-scaled
  updatedAtMs: number;
  source: 'offchain' | 'fallback';
}

interface UseVaultShareQuoteOptions {
  chainId?: number;
  vaultAddress?: Address;
  onChainFallbackRay: bigint;
}

export function useVaultShareQuote(
  options: UseVaultShareQuoteOptions
): VaultShareQuote {
  const { chainId, vaultAddress, onChainFallbackRay } = options;
  const [quote, setQuote] = useState<VaultShareQuote>({
    pricePerShareRay: onChainFallbackRay,
    updatedAtMs: Date.now(),
    source: 'fallback',
  });
  const lastSetRef = useRef<number>(0);

  const endpoint = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_VAULT_QUOTE_URL;
    if (!base || !chainId || !vaultAddress) return null;
    const url = new URL(base);
    url.searchParams.set('chainId', String(chainId));
    url.searchParams.set('vaultAddress', vaultAddress);
    return url.toString();
  }, [chainId, vaultAddress]);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    async function run() {
      if (!endpoint) return;
      try {
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: { accept: 'application/json' },
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Quote HTTP ${res.status}`);
        const json = await res.json();
        // Expected shape: { pricePerShareRay: string | number, updatedAtMs?: number }
        const pps = json?.pricePerShareRay;
        if (pps == null) throw new Error('Missing pricePerShareRay');
        const ray = BigInt(String(pps));
        if (!mounted) return;
        const now = Date.now();
        lastSetRef.current = now;
        setQuote({
          pricePerShareRay: ray,
          updatedAtMs: json?.updatedAtMs ?? now,
          source: 'offchain',
        });
      } catch {
        if (!mounted) return;
        // keep fallback; no state update to avoid flapping
      }
    }

    run();

    const id = setInterval(run, 15_000);
    return () => {
      mounted = false;
      controller.abort();
      clearInterval(id);
    };
  }, [endpoint]);

  // Keep fallback updated if on-chain fallback changes materially
  useEffect(() => {
    if (quote.source === 'offchain') return;
    setQuote({
      pricePerShareRay: onChainFallbackRay,
      updatedAtMs: Date.now(),
      source: 'fallback',
    });
  }, [onChainFallbackRay]);

  return quote;
}
