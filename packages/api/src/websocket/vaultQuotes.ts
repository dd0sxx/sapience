import { WebSocketServer, WebSocket, type RawData } from 'ws';
import { verifyMessage, type Abi } from 'viem';
import { getProviderForChain } from '../utils/utils';

type VaultKey = string; // `${chainId}:${vaultAddressLower}`

export type PublishVaultQuotePayload = {
  chainId: number;
  vaultAddress: string; // 0x...
  vaultCollateralPerShare: string | number; // 1e18-scaled as string preferred
  timestamp: number; // ms since epoch
  signedBy: string; // expected to be vault manager address
  signature: string; // signature over canonical message
};

export type SubscribePayload = {
  chainId: number;
  vaultAddress: string;
};

export type ClientToServerMessage =
  | { type: 'vault_quote.subscribe'; payload: SubscribePayload }
  | { type: 'vault_quote.unsubscribe'; payload: SubscribePayload }
  | { type: 'vault_quote.publish'; payload: PublishVaultQuotePayload };

export type ServerToClientMessage =
  | { type: 'vault_quote.update'; payload: PublishVaultQuotePayload }
  | { type: 'vault_quote.ack'; payload: { ok?: boolean; error?: string } };

function safeParse<T = unknown>(data: RawData): T | null {
  try {
    return JSON.parse(String(data)) as T;
  } catch {
    return null;
  }
}

function makeKey(chainId: number, vaultAddress: string): VaultKey {
  return `${chainId}:${vaultAddress.toLowerCase()}`;
}

function buildCanonicalMessage(payload: PublishVaultQuotePayload): string {
  // Canonical message to be signed by vault manager/owner (EOA)
  // Keep formatting stable for verification on relayer and producer
  return [
    'Sapience Vault Share Quote',
    `Vault: ${payload.vaultAddress.toLowerCase()}`,
    `ChainId: ${payload.chainId}`,
    `CollateralPerShare: ${String(payload.vaultCollateralPerShare)}`,
    `Timestamp: ${payload.timestamp}`,
  ].join('\n');
}

const PASSIVE_VAULT_ABI: Abi = [
  {
    type: 'function',
    name: 'manager',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
];

async function fetchAuthorizedSigners(
  chainId: number,
  vaultAddress: string
): Promise<Set<string>> {
  const client = getProviderForChain(chainId);
  const addr = vaultAddress.toLowerCase() as `0x${string}`;
  const manager = (await client
    .readContract({ address: addr, abi: PASSIVE_VAULT_ABI, functionName: 'manager' })
    .catch(() => undefined)) as string | undefined;
  const set = new Set<string>();
  if (manager) set.add(manager.toLowerCase());
  return set;
}

const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_MESSAGES = 100;

export function createVaultQuotesWebSocketServer() {
  const wss = new WebSocketServer({ noServer: true });

  // Subscriptions per vault key
  const subs = new Map<VaultKey, Set<WebSocket>>();
  const latestQuoteByKey = new Map<VaultKey, PublishVaultQuotePayload>();
  const signerCache = new Map<VaultKey, { signers: Set<string>; fetchedAt: number }>();

  function subscribe(key: VaultKey, ws: WebSocket) {
    if (!subs.has(key)) subs.set(key, new Set());
    subs.get(key)!.add(ws);
  }
  function unsubscribe(key: VaultKey, ws: WebSocket) {
    const set = subs.get(key);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) subs.delete(key);
  }
  function unsubscribeAll(ws: WebSocket) {
    for (const [k, set] of subs.entries()) {
      if (set.has(ws)) {
        set.delete(ws);
        if (set.size === 0) subs.delete(k);
      }
    }
  }
  function broadcast(key: VaultKey, message: ServerToClientMessage) {
    const set = subs.get(key);
    if (!set || set.size === 0) return 0;
    const str = JSON.stringify(message);
    let n = 0;
    set.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(str);
          n++;
        } catch {
          set.delete(ws);
        }
      } else {
        set.delete(ws);
      }
    });
    return n;
  }

  wss.on('connection', (ws, req) => {
    const ip =
      req.socket.remoteAddress ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      'unknown';
    const ua = (req.headers['user-agent'] as string) || 'unknown';
    console.log(`[VaultQuotes-WS] Connection opened from ${ip} ua="${ua}"`);

    let rateCount = 0;
    let rateResetAt = Date.now() + RATE_LIMIT_WINDOW_MS;

    ws.on('message', async (data: RawData) => {
      // rate limiting & size guard
      const now = Date.now();
      if (now > rateResetAt) {
        rateCount = 0;
        rateResetAt = now + RATE_LIMIT_WINDOW_MS;
      }
      if (++rateCount > RATE_LIMIT_MAX_MESSAGES) {
        try { ws.close(1008, 'rate_limited'); } catch { /* ignore */ }
        return;
      }
      const dataSize = typeof data === 'string' ? (data as string).length : (data as Buffer).byteLength;
      if (dataSize > 64_000) {
        try { ws.close(1009, 'message_too_large'); } catch { /* ignore */ }
        return;
      }

      const msg = safeParse<ClientToServerMessage>(data);
      if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

      if (msg.type === 'vault_quote.subscribe') {
        const { chainId, vaultAddress } = msg.payload || ({} as SubscribePayload);
        if (!chainId || !vaultAddress) {
          try { ws.send(JSON.stringify({ type: 'vault_quote.ack', payload: { error: 'invalid_subscribe' } })); } catch {}
          return;
        }
        const key = makeKey(chainId, vaultAddress);
        subscribe(key, ws);
        // send latest if present
        const latest = latestQuoteByKey.get(key);
        if (latest) {
          try { ws.send(JSON.stringify({ type: 'vault_quote.update', payload: latest })); } catch {}
        }
        try { ws.send(JSON.stringify({ type: 'vault_quote.ack', payload: { ok: true } })); } catch {}
        return;
      }

      if (msg.type === 'vault_quote.unsubscribe') {
        const { chainId, vaultAddress } = msg.payload || ({} as SubscribePayload);
        if (!chainId || !vaultAddress) return;
        const key = makeKey(chainId, vaultAddress);
        unsubscribe(key, ws);
        try { ws.send(JSON.stringify({ type: 'vault_quote.ack', payload: { ok: true } })); } catch {}
        return;
      }

      if (msg.type === 'vault_quote.publish') {
        const p = msg.payload as PublishVaultQuotePayload;
        try {
          // basic payload validation
          if (!p || !p.vaultAddress || !p.chainId || p.timestamp == null || p.vaultCollateralPerShare == null || !p.signedBy || !p.signature) {
            try { ws.send(JSON.stringify({ type: 'vault_quote.ack', payload: { error: 'invalid_payload' } })); } catch {}
            return;
          }
          // anti-replay window (5 minutes)
          if (Math.abs(Date.now() - p.timestamp) > 5 * 60 * 1000) {
            try { ws.send(JSON.stringify({ type: 'vault_quote.ack', payload: { error: 'stale_timestamp' } })); } catch {}
            return;
          }

          const key = makeKey(p.chainId, p.vaultAddress);
          // fetch or reuse signer cache (cache 60s)
          let allowed = signerCache.get(key);
          const cacheFresh = allowed && Date.now() - allowed.fetchedAt < 60_000;
          if (!cacheFresh) {
            const signers = await fetchAuthorizedSigners(p.chainId, p.vaultAddress);
            allowed = { signers, fetchedAt: Date.now() };
            signerCache.set(key, allowed);
          }

          const canonical = buildCanonicalMessage(p);
          const ok = await verifyMessage({
            address: p.signedBy.toLowerCase() as `0x${string}`,
            message: canonical,
            signature: p.signature as `0x${string}`,
          });
          if (!ok) {
            try { ws.send(JSON.stringify({ type: 'vault_quote.ack', payload: { error: 'bad_signature' } })); } catch {}
            return;
          }
          if (!allowed!.signers.has(p.signedBy.toLowerCase())) {
            try { ws.send(JSON.stringify({ type: 'vault_quote.ack', payload: { error: 'unauthorized_signer' } })); } catch {}
            return;
          }

          // normalize and store
          const normalized: PublishVaultQuotePayload = {
            chainId: p.chainId,
            vaultAddress: p.vaultAddress.toLowerCase(),
            vaultCollateralPerShare: String(p.vaultCollateralPerShare),
            timestamp: p.timestamp,
            signedBy: p.signedBy.toLowerCase(),
            signature: p.signature,
          };
          latestQuoteByKey.set(key, normalized);
          const recipients = broadcast(key, { type: 'vault_quote.update', payload: normalized });
          try { ws.send(JSON.stringify({ type: 'vault_quote.ack', payload: { ok: true } })); } catch {}
          console.log(`[VaultQuotes-WS] quote published key=${key} recipients=${recipients}`);
        } catch (err) {
          try { ws.send(JSON.stringify({ type: 'vault_quote.ack', payload: { error: (err as Error).message || 'internal_error' } })); } catch {}
        }
        return;
      }
    });

    ws.on('close', () => {
      unsubscribeAll(ws);
      console.log(`[VaultQuotes-WS] Connection closed from ${ip}`);
    });
  });

  return wss;
}


