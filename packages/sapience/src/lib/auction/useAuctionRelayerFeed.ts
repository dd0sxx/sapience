'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '~/lib/context/SettingsContext';

export type AuctionFeedMessage = {
  time: number; // ms epoch
  type: string;
  channel?: string | null; // auctionId when applicable
  data: unknown;
};

function toWsUrl(baseHttpUrl: string | null): string | null {
  try {
    if (!baseHttpUrl || baseHttpUrl.length === 0) {
      const loc = typeof window !== 'undefined' ? window.location : undefined;
      if (!loc) return null;
      const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${loc.host}/auction`;
    }
    const u = new URL(baseHttpUrl);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.search = '';
    return u.toString();
  } catch {
    return null;
  }
}

export function useAuctionRelayerFeed() {
  const { apiBaseUrl } = useSettings();
  // Settings apiBaseUrl default already includes "/auction" path
  const wsUrl = useMemo(() => toWsUrl(apiBaseUrl), [apiBaseUrl]);
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<AuctionFeedMessage[]>([]);

  useEffect(() => {
    if (!wsUrl) return;
    let closed = false;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // No-op; we passively listen for public broadcasts like auction.started
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        const now = Date.now();
        const type = String(msg?.type || 'unknown');
        const channel = (msg?.payload?.auctionId as string) || null;
        const entry: AuctionFeedMessage = {
          time: now,
          type,
          channel,
          data: msg?.payload ?? msg,
        };
        setMessages((prev) => {
          const next = [entry, ...prev];
          // Keep a bounded buffer
          return next.slice(0, 500);
        });
      } catch {
        // ignore
      }
    };
    ws.onerror = () => {
      // ignore; keep prior messages
    };
    ws.onclose = () => {
      if (!closed) {
        // leave state
      }
    };

    return () => {
      closed = true;
      try {
        ws.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    };
  }, [wsUrl]);

  return { messages };
}
