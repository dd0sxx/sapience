import Sentry from '../instrument';
import { WebSocketServer, WebSocket, type RawData } from 'ws';

export type VaultQuoteRequestPayload = {
  chainId: number;
  vaultAddress: string;
  collateralAmount?: string; // For deposit: input collateral, output shares
  sharesAmount?: string;     // For withdraw: input shares, output collateral
  operation: 'deposit' | 'withdraw';
  requestId: string; // For correlating request/response
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

export type ClientToServerMessage =
  | { type: 'vault_quote.request'; payload: VaultQuoteRequestPayload }
  | { type: 'vault_quote.response'; payload: VaultQuoteResponsePayload };

export type ServerToClientMessage =
  | { type: 'vault_quote.ack'; payload: { ok?: boolean; error?: string } }
  | { type: 'vault_quote.request'; payload: VaultQuoteRequestPayload }
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
  const pendingRequests = new Map<string, { requester: WebSocket; timestamp: number }>();

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

      const msg = safeParse<ClientToServerMessage>(data);
      if (!msg || typeof msg !== 'object' || !('type' in msg)) return;


      if (msg.type === 'vault_quote.request') {
        const request = msg.payload as VaultQuoteRequestPayload;
        
        // Validate request payload
        if (
          !request ||
          !request.chainId ||
          !request.vaultAddress ||
          !request.requestId ||
          !request.operation ||
          (!request.collateralAmount && !request.sharesAmount)
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

        // Store the request to track the requester
        pendingRequests.set(request.requestId, {
          requester: ws,
          timestamp: Date.now()
        });

        // Clean up old pending requests (older than 5 minutes)
        const now = Date.now();
        for (const [reqId, req] of pendingRequests.entries()) {
          if (now - req.timestamp > 5 * 60 * 1000) {
            pendingRequests.delete(reqId);
          }
        }

        // Broadcast the request to all connected clients (bots)
        const requestMessage = {
          type: 'vault_quote.request',
          payload: request
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

        try {
          ws.send(
            JSON.stringify({ type: 'vault_quote.ack', payload: { ok: true } })
          );
        } catch {
          void 0;
        }

        console.log(
          `[VaultQuotes-WS] quote request broadcast requestId=${request.requestId} bots=${botCount}`
        );
        return;
      }

      if (msg.type === 'vault_quote.response') {
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

        // Find the original requester
        const pendingRequest = pendingRequests.get(response.requestId);
        if (!pendingRequest) {
          try {
            ws.send(
              JSON.stringify({
                type: 'vault_quote.ack',
                payload: { error: 'request_not_found' },
              })
            );
          } catch {
            void 0;
          }
          return;
        }

        // Send response to the original requester
        try {
          pendingRequest.requester.send(
            JSON.stringify({
              type: 'vault_quote.response',
              payload: response
            })
          );
        } catch {
          // requester might have disconnected
        }

        // Clean up the pending request
        pendingRequests.delete(response.requestId);

        try {
          ws.send(
            JSON.stringify({ type: 'vault_quote.ack', payload: { ok: true } })
          );
        } catch {
          void 0;
        }

        console.log(
          `[VaultQuotes-WS] quote response sent requestId=${response.requestId}`
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
        if (req.requester === ws) {
          pendingRequests.delete(reqId);
        }
      }
      
      console.log(`[VaultQuotes-WS] Connection closed from ${ip}`);
    });
  });

  return wss;
}
