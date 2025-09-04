import { createServer } from 'http';
import { WebSocket, RawData } from 'ws';
import { createChatWebSocketServer } from '../websocket/chat';
import { privateKeyToAccount } from 'viem/accounts';

function waitForMessage<T = any>(ws: WebSocket, predicate: (data: any) => boolean, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const onMessage = (raw: RawData) => {
      try {
        const data = JSON.parse(String(raw));
        if (predicate(data)) {
          cleanup();
          resolve(data as T);
        }
      } catch {
        // ignore
      }
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const onClose = () => {
      cleanup();
      reject(new Error('socket closed before expected message'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('timeout waiting for message'));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      ws.off('message', onMessage);
      ws.off('error', onError);
      ws.off('close', onClose);
    };
    ws.on('message', onMessage);
    ws.on('error', onError);
    ws.on('close', onClose);
  });
}

async function main() {
  // Start minimal server with only chat WS
  const server = createServer((_req, res) => {
    res.statusCode = 404;
    res.end('not found');
  });
  createChatWebSocketServer(server);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addressInfo = server.address();
  if (!addressInfo || typeof addressInfo === 'string') throw new Error('No address info');
  const port = addressInfo.port;
  const baseUrl = `ws://127.0.0.1:${port}/chat`;

  // Client A: unauthenticated listener
  const a = new WebSocket(baseUrl);
  // Listen for initial history before waiting for open to avoid races
  const aHistory = waitForMessage(a, (d) => d && d.type === 'history');
  await new Promise<void>((resolve) => a.once('open', () => resolve()));
  // Expect initial history
  await aHistory;

  // Attempt to post without auth -> expect auth_required error
  a.send(JSON.stringify({ text: 'hello unauth', clientId: 'c1' }));
  const errUnauth = await waitForMessage(a, (d) => d && d.type === 'error' && d.text === 'auth_required');
  if (!errUnauth) throw new Error('Expected auth_required error');

  // Begin WS auth flow
  a.send(JSON.stringify({ type: 'auth.nonce', clientId: 'auth1' }));
  const nonceResp = await waitForMessage<{ message: string; nonce: string }>(a, (d) => d && d.type === 'auth.nonce' && typeof d.message === 'string' && typeof d.nonce === 'string');

  // Use a deterministic test key
  const TEST_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86b9d6f5bf9d5a5aa5c1c2a9f7aa';
  const account = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`);
  const signature = await account.signMessage({ message: nonceResp.message });

  a.send(
    JSON.stringify({
      type: 'auth.verify',
      address: account.address,
      signature,
      nonce: nonceResp.nonce,
      clientId: 'auth2',
    })
  );
  const verified = await waitForMessage<{ token: string }>(a, (d) => d && d.type === 'auth.verified' && typeof d.token === 'string');
  if (!verified || !verified.token) throw new Error('Expected auth.verified with token');

  // Client B: unauthenticated listener that should receive broadcasts
  const b = new WebSocket(baseUrl);
  const bHistory = waitForMessage(b, (d) => d && d.type === 'history');
  await new Promise<void>((resolve) => b.once('open', () => resolve()));
  await bHistory;

  // Post an authenticated message from A
  const msgText = 'hello world';
  a.send(JSON.stringify({ text: msgText, clientId: 'm1' }));

  // Expect broadcast to both A and B
  const recvA = await waitForMessage(a, (d) => (!d.type || d.type === 'message') && d.text === msgText);
  const recvB = await waitForMessage(b, (d) => (!d.type || d.type === 'message') && d.text === msgText);
  if (!recvA || !recvB) throw new Error('Expected broadcast to both clients');

  // New Client C connects unauthenticated and should receive history including the message
  const c = new WebSocket(baseUrl);
  const cHistory = waitForMessage<{ messages: Array<{ text: string }> }>(c, (d) => d && d.type === 'history' && Array.isArray(d.messages));
  await new Promise<void>((resolve) => c.once('open', () => resolve()));
  const hist = await cHistory;
  const hasMsg = hist.messages.some((m) => m.text === msgText);
  if (!hasMsg) throw new Error('History does not include prior message');

  // Cleanup
  a.close();
  b.close();
  c.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

main()
  .then(() => {
    console.log('chat websocket e2e: OK');
    process.exit(0);
  })
  .catch((err) => {
    console.error('chat websocket e2e: FAILED', err);
    process.exit(1);
  });


