import Sentry from '../instrument';
import { WebSocketServer, WebSocket, type RawData } from 'ws';
import { randomUUID } from 'crypto';

export type VaultQuoteRequestInputPayload = {
  chainId: number;
  vaultAddress: string;
  collateralAmount?: string; // For deposit: input collateral, output shares
  sharesAmount?: string;     // For withdraw: input shares, output collateral
  operation: 'deposit' | 'withdraw';
};

export type VaultQuoteRequestPayload = VaultQuoteRequestInputPayload & {
  requestId: string; // Assigned by server
};

export type VaultQuoteResponsePayload = {
  requestId: string;
  chainId: number;
  vaultAddress: string;
  operation: 'deposit' | 'withdraw';
  inputAmount: string;
  outputAmount: string;
  price: string; // collateral per share
  timestamp: number;
};

export type SubscribeRequestPayload = { requestId: string };

export type ClientToServerMessage =
  | { type: 'vault_quote.request'; payload: VaultQuoteRequestInputPayload }
  | { type: 'vault_quote.subscribe'; payload: SubscribeRequestPayload }
  | { type: 'vault_quote.unsubscribe'; payload: SubscribeRequestPayload };


export type ServerToBotMessage = {
  type: 'vault_quote.requested';
  payload: VaultQuoteRequestPayload;
};
export type ServerToBotAck = { type: 'vault_quote.submit.ack'; payload: { ok?: boolean; error?: string } };
export type BotToServerMessage = { type: 'vault_quote.submit'; payload: VaultQuoteResponsePayload };

export type ServerToClientMessage =
  | { type: 'vault_quote.ack'; payload: { ok?: boolean; error?: string } }
  | { type: 'vault_quote.request.ack'; payload: { requestId: string } }
  | { type: 'vault_quote.response'; payload: VaultQuoteResponsePayload };

function safeParse<T = unknown>(data: RawData): T | null {
  try {
    return JSON.parse(String(data)) as T;
  } catch {
    return null;
  }
}


const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_MESSAGES = 100;

export function createVaultQuotesWebSocketServer() {
  const wss = new WebSocketServer({ noServer: true });

  // Request tracking for quote requests
  const pendingRequests = new Map<string, { requester?: WebSocket; timestamp: number; payload: VaultQuoteRequestPayload }>();
  // Response cache for delivering to late subscribers
  const responsesByRequestId = new Map<string, VaultQuoteResponsePayload>();
  // Subscriptions per requestId
  const requestSubscriptions = new Map<string, Set<WebSocket>>();

  function subscribeToRequest(requestId: string, ws: WebSocket) {
    if (!requestSubscriptions.has(requestId)) requestSubscriptions.set(requestId, new Set());
    requestSubscriptions.get(requestId)!.add(ws);
  }

  function unsubscribeFromRequest(requestId: string, ws: WebSocket) {
    const set = requestSubscriptions.get(requestId);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) requestSubscriptions.delete(requestId);
  }

  function unsubscribeFromAll(ws: WebSocket) {
    for (const [rid, set] of requestSubscriptions.entries()) {
      if (set.has(ws)) {
        set.delete(ws);
        if (set.size === 0) requestSubscriptions.delete(rid);
      }
    }
  }

  function broadcastToRequestSubscribers(requestId: string, message: ServerToClientMessage) {
    const set = requestSubscriptions.get(requestId);
    if (!set || set.size === 0) return 0;
    const str = JSON.stringify(message);
    let sent = 0;
    set.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(str);
          sent++;
        } catch {
          set.delete(client);
        }
      } else {
        set.delete(client);
      }
    });
    if (set.size === 0) requestSubscriptions.delete(requestId);
    return sent;
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
        try {
          ws.close(1008, 'rate_limited');
        } catch {
          /* ignore */
        }
        return;
      }
      const dataSize =
        typeof data === 'string'
          ? (data as string).length
          : (data as Buffer).byteLength;
      if (dataSize > 64_000) {
        try {
          ws.close(1009, 'message_too_large');
        } catch {
          /* ignore */
        }
        return;
      }

      const msg = safeParse<ClientToServerMessage | BotToServerMessage>(data);
      if (!msg || typeof msg !== 'object' || !('type' in msg)) return;


      if (msg.type === 'vault_quote.request') {
        const incoming = msg.payload as VaultQuoteRequestInputPayload;
        
        // Validate request payload
        if (
          !incoming ||
          !incoming.chainId ||
          !incoming.vaultAddress ||
          !incoming.operation ||
          (!incoming.collateralAmount && !incoming.sharesAmount)
        ) {
          try {
            ws.send(
              JSON.stringify({
                type: 'vault_quote.ack',
                payload: { error: 'invalid_request' },
              })
            );
          } catch {
            void 0;
          }
          return;
        }

        // Assign requestId and persist pending request
        const requestId = randomUUID();
        const request: VaultQuoteRequestPayload = { ...incoming, requestId };

        pendingRequests.set(requestId, {
          requester: ws,
          timestamp: Date.now(),
          payload: request,
        });

        // Clean up old pending requests (older than 5 minutes)
        const now = Date.now();
        for (const [reqId, req] of pendingRequests.entries()) {
          if (now - req.timestamp > 5 * 60 * 1000) {
            pendingRequests.delete(reqId);
          }
        }

        // Broadcast the request to all connected clients (bots)
        const requestMessage: ServerToBotMessage = {
          type: 'vault_quote.requested',
          payload: request as VaultQuoteRequestPayload & { requestId: string },
        };
        
        let botCount = 0;
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            try {
              client.send(JSON.stringify(requestMessage));
              botCount++;
            } catch {
              // ignore send errors
            }
          }
        });

        // Acknowledge to the client with assigned requestId
        try {
          ws.send(
            JSON.stringify({ type: 'vault_quote.request.ack', payload: { requestId } })
          );
        } catch {
          void 0;
        }

        console.log(
          `[VaultQuotes-WS] quote request broadcast requestId=${request.requestId} bots=${botCount}`
        );
        return;
      }

      if (msg.type === 'vault_quote.subscribe') {
        const { requestId } = msg.payload as SubscribeRequestPayload;
        if (!requestId) {
          try {
            ws.send(
              JSON.stringify({ type: 'vault_quote.ack', payload: { error: 'invalid_subscribe' } })
            );
          } catch {
            void 0;
          }
          return;
        }
        subscribeToRequest(requestId, ws);
        // If we already have a response, send it immediately
        const existing = responsesByRequestId.get(requestId);
        if (existing) {
          try {
            ws.send(JSON.stringify({ type: 'vault_quote.response', payload: existing }));
          } catch {
            void 0;
          }
        }
        try {
          ws.send(JSON.stringify({ type: 'vault_quote.ack', payload: { ok: true } }));
        } catch {
          void 0;
        }
        console.log(`[VaultQuotes-WS] subscribe requestId=${requestId}`);
        return;
      }

      if (msg.type === 'vault_quote.unsubscribe') {
        const { requestId } = msg.payload as SubscribeRequestPayload;
        if (requestId) unsubscribeFromRequest(requestId, ws);
        try {
          ws.send(JSON.stringify({ type: 'vault_quote.ack', payload: { ok: true } }));
        } catch {
          void 0;
        }
        console.log(`[VaultQuotes-WS] unsubscribe requestId=${requestId}`);
        return;
      }

      if (msg.type === 'vault_quote.submit') {
        const response = msg.payload as VaultQuoteResponsePayload;
        
        // Validate response payload
        if (
          !response ||
          !response.requestId ||
          !response.chainId ||
          !response.vaultAddress ||
          !response.operation ||
          !response.inputAmount ||
          !response.outputAmount ||
          !response.price
        ) {
          try {
            ws.send(
              JSON.stringify({
                type: 'vault_quote.ack',
                payload: { error: 'invalid_response' },
              })
            );
          } catch {
            void 0;
          }
          return;
        }

        // Cache response for late subscribers
        responsesByRequestId.set(response.requestId, response);

        // Try to send to original requester if still connected
        const pendingRequest = pendingRequests.get(response.requestId);
        if (pendingRequest?.requester && pendingRequest.requester.readyState === WebSocket.OPEN) {
          try {
            pendingRequest.requester.send(
              JSON.stringify({ type: 'vault_quote.response', payload: response })
            );
          } catch {
            // ignore
          }
        }

        // Broadcast to subscribers of this requestId
        const recipients = broadcastToRequestSubscribers(response.requestId, {
          type: 'vault_quote.response',
          payload: response,
        });

        // Remove from pending (keep response cache for some time)
        pendingRequests.delete(response.requestId);

        // Ack to bot
        try {
          (ws as WebSocket).send(
            JSON.stringify({ type: 'vault_quote.submit.ack', payload: { ok: true } } satisfies ServerToBotAck)
          );
        } catch {
          void 0;
        }

        console.log(
          `[VaultQuotes-WS] quote response processed requestId=${response.requestId} subscribers=${recipients}`
        );
        return;
      }

    });

    ws.on('error', (err) => {
      console.error(`[VaultQuotes-WS] Socket error from ${ip}:`, err);
      try {
        Sentry.captureException(err);
      } catch {
        /* ignore */
      }
    });

    ws.on('close', () => {
      // Clean up any pending requests from this client
      for (const [reqId, req] of pendingRequests.entries()) {
        if (req.requester === ws) pendingRequests.delete(reqId);
      }
      // Remove all subscriptions for this client
      unsubscribeFromAll(ws);
      
      console.log(`[VaultQuotes-WS] Connection closed from ${ip}`);
    });
  });

  return wss;
}
