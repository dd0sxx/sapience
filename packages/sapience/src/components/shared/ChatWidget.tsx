'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Button } from '@sapience/ui/components/ui/button';
import { Card } from '@sapience/ui/components/ui/card';
import { Input } from '@sapience/ui/components/ui/input';
import { X, MessageCircle } from 'lucide-react';
import { AddressDisplay } from '~/components/shared/AddressDisplay';
import LottieLoader from '~/components/shared/LottieLoader';
import { useChat } from '~/lib/context/ChatContext';

type ChatMessage = {
  id: string;
  author: 'me' | 'server' | 'system';
  text: string;
  address?: string;
};

const WEBSOCKET_PATH = '/chat';
const API_BASE = process.env.NEXT_PUBLIC_FOIL_API_URL as string;

const buildWebSocketUrl = () => {
  const u = new URL(API_BASE);
  const protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${u.host}${WEBSOCKET_PATH}`;
};

const ChatWidget = () => {
  const { isOpen, closeChat } = useChat();
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const connectedWallet = wallets[0];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingText, setPendingText] = useState('');
  const socketRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tokenRef = useRef<string | null>(null);
  const socketTokenRef = useRef<string | null>(null);
  const authErrorRef = useRef<boolean>(false);
  const outgoingQueueRef = useRef<string[]>([]);
  const reconnectAttemptsRef = useRef<number>(0);
  const isOpenRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const reconnectPromiseRef = useRef<Promise<void> | null>(null);

  const userAddress = connectedWallet?.address || '';
  const normalizedUserAddress = userAddress.toLowerCase();

  const ensureAuthToken = async (force?: boolean): Promise<string | null> => {
    try {
      if (!userAddress) return null;
      // Return cached token if present and not expired
      if (!force && tokenRef.current) return tokenRef.current;
      const storedRaw =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('chatToken')
          : null;
      if (!force && storedRaw) {
        try {
          const stored = JSON.parse(storedRaw) as {
            token: string;
            expiresAt: number;
            address: string;
          };
          if (
            stored.address?.toLowerCase() === userAddress.toLowerCase() &&
            stored.expiresAt > Date.now()
          ) {
            tokenRef.current = stored.token;
            return stored.token;
          }
        } catch {
          /* noop */
        }
      }

      // Fetch nonce & message
      const resNonce = await fetch(`${API_BASE}/chat-auth/nonce`);
      const { message } = await resNonce.json();

      // Sign via Privy wallet
      const wallet = connectedWallet;
      if (!wallet) return null;
      const signature = await wallet.sign(message);

      // Verify
      const resVerify = await fetch(`${API_BASE}/chat-auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userAddress,
          signature,
          nonce: (message.match(/Nonce: (.+)/)?.[1] || '').trim(),
        }),
      });
      if (!resVerify.ok) return null;
      const { token, expiresAt } = await resVerify.json();
      tokenRef.current = token;
      try {
        window.localStorage.setItem(
          'chatToken',
          JSON.stringify({ token, expiresAt, address: userAddress })
        );
      } catch {
        /* noop */
      }
      return token;
    } catch {
      return null;
    }
  };

  const connectSocket = useCallback(
    (url: string, token: string | null) => {
      const ws = new WebSocket(url);
      socketRef.current = ws;
      socketTokenRef.current = token;

      const onMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === 'history' && Array.isArray(data.messages)) {
            const history = data.messages as Array<{
              text: string;
              address?: string;
              timestamp?: number;
            }>;
            setMessages((prev) => {
              if (prev.length > 0) return prev; // don't override if user already typing
              return history.map((m) => ({
                id: crypto.randomUUID(),
                author:
                  m.address && m.address.toLowerCase() === normalizedUserAddress
                    ? 'me'
                    : 'server',
                text: m.text,
                address: m.address,
              }));
            });
            return;
          }
          if (data?.type === 'error' && data.text === 'auth_required') {
            // Clear any cached token (server may have restarted) and trigger a single-flight reconnect
            tokenRef.current = null;
            socketTokenRef.current = null;
            authErrorRef.current = true;
            try {
              if (typeof window !== 'undefined') {
                window.localStorage.removeItem('chatToken');
              }
            } catch {
              /* noop */
            }
            // Kick off reconnect; sendMessage will await this before sending
            if (!reconnectPromiseRef.current) {
              reconnectPromiseRef.current = (async () => {
                const token = await ensureAuthToken(true);
                if (!token) return;
                let nextUrl = buildWebSocketUrl();
                nextUrl = `${nextUrl}?token=${encodeURIComponent(token)}`;
                try {
                  socketRef.current?.close();
                } catch {
                  /* noop */
                }
                await connectSocket(nextUrl, token);
                authErrorRef.current = false;
              })().finally(() => {
                reconnectPromiseRef.current = null;
              });
            }
            return;
          }
          if (data?.type === 'error' && typeof data.text === 'string') {
            const friendly =
              data.text === 'rate_limited'
                ? 'You are sending messages too quickly. Please wait.'
                : data.text === 'empty_message'
                  ? 'Message cannot be empty.'
                  : `Error: ${data.text}`;
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                author: 'system',
                text: friendly,
              },
            ]);
            return;
          }
          if (
            typeof data.text === 'string' &&
            (!data.type || data.type === 'message')
          ) {
            const isMe =
              !!data.address &&
              data.address.toLowerCase() === normalizedUserAddress;
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                author: isMe ? 'me' : 'server',
                text: data.text,
                address: data.address,
              },
            ]);
          }
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              author: 'server',
              text: String(event.data),
            },
          ]);
        }
      };
      const scheduleReconnect = () => {
        if (reconnectPromiseRef.current) return;
        reconnectPromiseRef.current = (async () => {
          const attempt = reconnectAttemptsRef.current;
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((r) => setTimeout(r, delay));
          reconnectAttemptsRef.current = Math.min(attempt + 1, 10);
          // Avoid reconnecting if widget closed or component unmounted
          if (!isMountedRef.current || !isOpenRef.current) return;
          let nextUrl = buildWebSocketUrl();
          let nextToken: string | null = null;
          try {
            nextToken = await ensureAuthToken();
          } catch {
            /* noop */
          }
          if (nextToken)
            nextUrl = `${nextUrl}?token=${encodeURIComponent(nextToken)}`;
          try {
            // Close existing open socket to prevent duplicate connections
            try {
              if (
                socketRef.current &&
                socketRef.current.readyState === WebSocket.OPEN
              ) {
                socketRef.current.close();
              }
            } catch {
              /* noop */
            }
            await connectSocket(nextUrl, nextToken);
          } catch {
            /* noop */
          }
        })().finally(() => {
          reconnectPromiseRef.current = null;
        });
      };
      const onError = () => {
        scheduleReconnect();
      };
      const onClose = () => {
        scheduleReconnect();
      };

      return new Promise<() => void>((resolve) => {
        const onOpen = () => {
          ws.removeEventListener('open', onOpen);
          const detach = () => {
            ws.removeEventListener('message', onMessage);
            ws.removeEventListener('error', onError);
            ws.removeEventListener('close', onClose);
          };
          reconnectAttemptsRef.current = 0;
          // Flush any queued messages once authenticated (if token present)
          if (socketTokenRef.current && outgoingQueueRef.current.length > 0) {
            try {
              const toSend = [...outgoingQueueRef.current];
              outgoingQueueRef.current = [];
              toSend.forEach((text) => {
                try {
                  ws.send(JSON.stringify({ text }));
                } catch {
                  /* noop */
                }
              });
            } catch {
              /* noop */
            }
          }
          resolve(detach);
        };

        ws.addEventListener('open', onOpen);
        ws.addEventListener('message', onMessage);
        ws.addEventListener('error', onError);
        ws.addEventListener('close', onClose);
      });
    },
    [userAddress]
  );

  useEffect(() => {
    isMountedRef.current = true;
    if (!isOpen) return;

    const baseUrl = buildWebSocketUrl();
    isOpenRef.current = true;

    let detach: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        // Try to authenticate on open; if token fetch fails, connect read-only
        let url = baseUrl;
        const token = await ensureAuthToken();
        if (token) url = `${baseUrl}?token=${encodeURIComponent(token)}`;
        const d = await connectSocket(url, token || null);
        if (!cancelled) detach = d;
      } catch {
        /* noop */
      }
    })();

    return () => {
      cancelled = true;
      isOpenRef.current = false;
      isMountedRef.current = false;
      try {
        detach?.();
        socketRef.current?.close();
      } finally {
        socketRef.current = null;
        socketTokenRef.current = null;
      }
    };
  }, [isOpen, userAddress, connectSocket]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // When wallet becomes known, reclassify history messages authored by me
  useEffect(() => {
    if (!normalizedUserAddress) return;
    setMessages((prev) => {
      let changed = false;
      const next = prev.map((m) => {
        if (
          m.author !== 'me' &&
          m.address &&
          m.address.toLowerCase() === normalizedUserAddress
        ) {
          changed = true;
          return { ...m, author: 'me' as const };
        }
        return m;
      });
      return changed ? next : prev;
    });
  }, [normalizedUserAddress]);

  const canChat = useMemo(
    () => ready && authenticated && !!userAddress,
    [ready, authenticated, userAddress]
  );

  const startDrag = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Initialize absolute positioning from current rect
    setPosition({ top: rect.top, left: rect.left });
    isDraggingRef.current = true;
    dragOffsetRef.current = { dx: clientX - rect.left, dy: clientY - rect.top };
  }, []);

  const endDrag = useCallback(() => {
    isDraggingRef.current = false;
    dragOffsetRef.current = null;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !dragOffsetRef.current) return;
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const { dx, dy } = dragOffsetRef.current;
      let nextLeft = e.clientX - dx;
      let nextTop = e.clientY - dy;
      const padding = 8; // keep small margin from edges
      const maxLeft = Math.max(padding, window.innerWidth - w - padding);
      const maxTop = Math.max(padding, window.innerHeight - h - padding);
      nextLeft = Math.min(Math.max(padding, nextLeft), maxLeft);
      nextTop = Math.min(Math.max(padding, nextTop), maxTop);
      setPosition({ top: nextTop, left: nextLeft });
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !dragOffsetRef.current) return;
      if (e.touches.length === 0) return;
      // Prevent scrolling while dragging
      e.preventDefault();
      const t = e.touches[0];
      const el = containerRef.current;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const { dx, dy } = dragOffsetRef.current;
      let nextLeft = t.clientX - dx;
      let nextTop = t.clientY - dy;
      const padding = 8;
      const maxLeft = Math.max(padding, window.innerWidth - w - padding);
      const maxTop = Math.max(padding, window.innerHeight - h - padding);
      nextLeft = Math.min(Math.max(padding, nextLeft), maxLeft);
      nextTop = Math.min(Math.max(padding, nextTop), maxTop);
      setPosition({ top: nextTop, left: nextLeft });
    };

    const onUp = () => endDrag();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove as any);
      window.removeEventListener('touchend', onUp);
    };
  }, [endDrag]);

  const onHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (closeBtnRef.current && closeBtnRef.current.contains(e.target as Node))
        return;
      startDrag(e.clientX, e.clientY);
    },
    [startDrag]
  );

  const onHeaderTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (closeBtnRef.current && closeBtnRef.current.contains(e.target as Node))
        return;
      const t = e.touches[0];
      if (!t) return;
      startDrag(t.clientX, t.clientY);
    },
    [startDrag]
  );

  const sendMessage = () => {
    const text = pendingText.trim();
    if (!text) return;
    if (!canChat) return;
    setPendingText('');

    // If not fully ready to send, enqueue and ensure connection
    const isOpen = socketRef.current?.readyState === WebSocket.OPEN;
    const isAuthed = !!socketTokenRef.current;
    if (!isOpen || !isAuthed) {
      outgoingQueueRef.current.push(text);
      // Attempt to (re)connect with auth
      let url = buildWebSocketUrl();
      // If a reconnect is already in-flight, let onOpen flush the queue
      if (!reconnectPromiseRef.current) {
        reconnectPromiseRef.current = (async () => {
          let token = await ensureAuthToken();
          if (!token) {
            try {
              login();
            } catch {
              /* noop */
            }
            token = await ensureAuthToken(true);
            if (!token) return; // queue will remain until user logs in
          }
          url = `${url}?token=${encodeURIComponent(token)}`;
          try {
            try {
              socketRef.current?.close();
            } catch {
              /* noop */
            }
            await connectSocket(url, token);
          } catch {
            /* noop */
          }
        })().finally(() => {
          reconnectPromiseRef.current = null;
        });
      }
      return;
    }

    // Send immediately; server will echo back including to sender
    try {
      socketRef.current?.send(JSON.stringify({ text }));
    } catch {
      // If immediate send fails, re-enqueue and let reconnect logic handle it
      outgoingQueueRef.current.push(text);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={`fixed z-[60] ${position ? '' : 'bottom-4 right-4'}`}
      style={position ? { top: position.top, left: position.left } : undefined}
    >
      <Card className="w-80 shadow-xl border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div
          ref={headerRef}
          className="flex items-center justify-between p-3 border-b select-none active:cursor-grabbing"
          onMouseDown={onHeaderMouseDown}
          onTouchStart={onHeaderTouchStart}
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 opacity-80" />
            <span className="text-sm font-medium">Chat</span>
          </div>
          <Button
            ref={closeBtnRef}
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={closeChat}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div ref={scrollRef} className="max-h-80 overflow-y-auto p-3 space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`text-sm ${m.author === 'me' ? 'text-right' : 'text-left'}`}
            >
              {m.address && m.author === 'server' && (
                <div className="mb-0.5 opacity-80">
                  <AddressDisplay
                    address={m.address}
                    disableProfileLink
                    className="text-[10px]"
                    compact
                  />
                </div>
              )}
              <span
                className={`inline-block px-2 py-1 rounded ${m.author === 'me' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                {m.text}
              </span>
            </div>
          ))}
          {messages.length === 0 && ready && authenticated && (
            <div className="flex items-center justify-center py-8 my-8">
              <LottieLoader width={32} height={32} />
            </div>
          )}
        </div>
        <div className="p-3 border-t flex items-center gap-2">
          <Input
            value={pendingText}
            onChange={(e) => setPendingText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sendMessage();
            }}
            disabled={!canChat}
          />
          <Button
            onClick={() => (canChat ? void sendMessage() : void login())}
            disabled={canChat ? !pendingText.trim() : false}
          >
            {canChat ? 'Send' : 'Log in'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ChatWidget;
