import { useCallback, useMemo, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import type { Address } from 'viem';

type PublishResult = { ok: boolean; error?: string };

function buildCanonicalMessage(params: {
  chainId: number;
  vaultAddress: Address;
  vaultCollateralPerShare: bigint | string | number;
  timestamp: number;
}): string {
  return [
    'Sapience Vault Share Quote',
    `Vault: ${params.vaultAddress.toLowerCase()}`,
    `ChainId: ${params.chainId}`,
    `CollateralPerShare: ${String(params.vaultCollateralPerShare)}`,
    `Timestamp: ${params.timestamp}`,
  ].join('\n');
}

export function useVaultQuotePublisher(options: {
  chainId?: number;
  vaultAddress?: Address;
}) {
  const { chainId, vaultAddress } = options;
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isPublishing, setIsPublishing] = useState(false);

  const wsUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_VAULT_QUOTES_WS_URL;
    if (!base || !chainId || !vaultAddress) return null;
    const u = new URL(base);
    u.searchParams.set('v', '1');
    return u.toString();
  }, [chainId, vaultAddress]);

  const publishQuote = useCallback(
    async (vaultCollateralPerShareRay: bigint): Promise<PublishResult> => {
      if (!wsUrl || !chainId || !vaultAddress) {
        return { ok: false, error: 'missing_configuration' };
      }
      if (!address) {
        return { ok: false, error: 'wallet_not_connected' };
      }
      setIsPublishing(true);
      try {
        const timestamp = Date.now();
        const message = buildCanonicalMessage({
          chainId,
          vaultAddress,
          vaultCollateralPerShare: vaultCollateralPerShareRay,
          timestamp,
        });
        const signature = await signMessageAsync({ message });

        await new Promise<PublishResult>((resolve) => {
          let settled = false;
          try {
            const ws = new WebSocket(wsUrl);
            ws.onopen = () => {
              try {
                const payload = {
                  type: 'vault_quote.publish',
                  payload: {
                    chainId,
                    vaultAddress: vaultAddress.toLowerCase(),
                    vaultCollateralPerShare: String(vaultCollateralPerShareRay),
                    timestamp,
                    signedBy: address.toLowerCase(),
                    signature,
                  },
                };
                ws.send(JSON.stringify(payload));
              } catch {
                /* noop */
              }
            };
            ws.onmessage = (ev) => {
              try {
                const data = JSON.parse(ev.data as string);
                if (data?.type === 'vault_quote.ack') {
                  settled = true;
                  resolve({ ok: !!data?.payload?.ok, error: data?.payload?.error });
                  try {
                    ws.close();
                  } catch {
                    /* noop */
                  }
                }
              } catch {
                /* noop */
              }
            };
            ws.onerror = () => {
              if (!settled) {
                settled = true;
                resolve({ ok: false, error: 'ws_error' });
              }
            };
            ws.onclose = () => {
              if (!settled) {
                settled = true;
                resolve({ ok: false, error: 'ws_closed' });
              }
            };
          } catch {
            resolve({ ok: false, error: 'ws_init_failed' });
          }
        });

        return { ok: true };
      } catch (err) {
        return { ok: false, error: (err as Error).message };
      } finally {
        setIsPublishing(false);
      }
    },
    [wsUrl, chainId, vaultAddress, address, signMessageAsync]
  );

  return { publishQuote, isPublishing };
}


