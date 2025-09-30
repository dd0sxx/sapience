import { useEffect, useMemo, useRef, useState } from 'react';
import type { Address } from 'viem';

export interface VaultQuoteUpdatePayload {
  chainId: number;
  vaultAddress: string;
  vaultCollateralPerShare: string; // 1e18-scaled
  timestamp: number; // ms epoch
  signedBy?: string;
  signature?: string;
}

export type VaultQuoteMessage = {
  time: number;
  type: 'vault.quote';
  data: VaultQuoteUpdatePayload;
};

export function useVaultQuotesFeed(options: {
  chainId?: number;
  vaultAddress?: Address;
}): VaultQuoteMessage[] {
  const { chainId, vaultAddress } = options;
  const [msgs, setMsgs] = useState<VaultQuoteMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const wsUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_VAULT_QUOTES_WS_URL;
    if (!base || !chainId || !vaultAddress) return null;
    const u = new URL(base);
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
          const p = data.payload as VaultQuoteUpdatePayload;
          if (
            p.chainId === chainId &&
            p.vaultAddress?.toLowerCase() === vaultAddress.toLowerCase()
          ) {
            setMsgs((prev) => {
              const next = [
                { time: p.timestamp, type: 'vault.quote' as const, data: p },
                ...prev,
              ];
              return next.slice(0, 200);
            });
          }
        }
      } catch {
        /* noop */
      }
    };
    ws.onerror = () => {
      /* ignore */
    };
    ws.onclose = () => {
      if (!closed) {
        /* ignore */
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

  return msgs;
}


