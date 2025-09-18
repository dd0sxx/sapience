import { useEffect, useMemo, useRef, useState } from 'react';
import type { Address } from 'viem';

export interface VaultShareWsQuotePayload {
  chainId: number;
  vaultAddress: string;
  vaultCollateralPerShare: string; // 1e18-scaled integer as string
  timestamp: number; // ms
  signedBy?: string;
  signature?: string;
}

export interface VaultShareWsQuote {
  pricePerShareRay: bigint; // 1e18-scaled
  updatedAtMs: number;
  source: 'ws' | 'fallback';
  raw?: VaultShareWsQuotePayload;
}

interface UseVaultShareQuoteWsOptions {
  chainId?: number;
  vaultAddress?: Address;
  onChainFallbackRay: bigint;
}

export function useVaultShareQuoteWs(options: UseVaultShareQuoteWsOptions): VaultShareWsQuote {
  const { chainId, vaultAddress, onChainFallbackRay } = options;
  const [quote, setQuote] = useState<VaultShareWsQuote>({
    pricePerShareRay: onChainFallbackRay,
    updatedAtMs: Date.now(),
    source: 'fallback',
  });
  const wsRef = useRef<WebSocket | null>(null);

  const wsUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_VAULT_QUOTES_WS_URL;
    if (!base || !chainId || !vaultAddress) return null;
    const u = new URL(base);
    // path already includes /vault-quotes
    u.searchParams.set('v', '1');
    return u.toString();
  }, [chainId, vaultAddress]);

  useEffect(() => {
    if (!wsUrl || !chainId || !vaultAddress) return;
    let closed = false;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      try {
        ws.send(
          JSON.stringify({
            type: 'vault_quote.subscribe',
            payload: { chainId, vaultAddress },
          })
        );
      } catch {
        /* noop */
      }
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string);
        if (data?.type === 'vault_quote.update' && data?.payload) {
          const p = data.payload as VaultShareWsQuotePayload;
          if (
            p.chainId === chainId &&
            p.vaultAddress?.toLowerCase() === vaultAddress.toLowerCase()
          ) {
            const ray = BigInt(String(p.vaultCollateralPerShare));
            setQuote({ pricePerShareRay: ray, updatedAtMs: p.timestamp, source: 'ws', raw: p });
          }
        }
      } catch {
        /* noop */
      }
    };
    ws.onerror = () => {
      // keep fallback
    };
    ws.onclose = () => {
      if (!closed) {
        // keep fallback
      }
    };

    return () => {
      closed = true;
      try {
        ws.close();
      } catch {
        /* noop */
      }
      wsRef.current = null;
    };
  }, [wsUrl, chainId, vaultAddress]);

  // Keep fallback synced if on-chain fallback changes and we don't have ws yet
  useEffect(() => {
    if (quote.source === 'ws') return;
    setQuote({ pricePerShareRay: onChainFallbackRay, updatedAtMs: Date.now(), source: 'fallback' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChainFallbackRay]);

  return quote;
}


