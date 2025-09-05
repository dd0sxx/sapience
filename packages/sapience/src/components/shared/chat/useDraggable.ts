'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useDraggable() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const positionRef = useRef<{ top: number; left: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = { top: rect.top, left: rect.left };
    positionRef.current = next;
    setPosition(next);
    isDraggingRef.current = true;
    dragOffsetRef.current = { dx: clientX - rect.left, dy: clientY - rect.top };
  }, []);

  const endDrag = useCallback(() => {
    isDraggingRef.current = false;
    dragOffsetRef.current = null;
    try {
      const p = positionRef.current;
      if (p && Number.isFinite(p.top) && Number.isFinite(p.left)) {
        window.localStorage.setItem(
          'sapience.chat.position',
          JSON.stringify({ top: Math.round(p.top), left: Math.round(p.left) })
        );
      }
    } catch {
      /* noop */
    }
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
      const padding = 8;
      const maxLeft = Math.max(padding, window.innerWidth - w - padding);
      const maxTop = Math.max(padding, window.innerHeight - h - padding);
      nextLeft = Math.min(Math.max(padding, nextLeft), maxLeft);
      nextTop = Math.min(Math.max(padding, nextTop), maxTop);
      const next = { top: nextTop, left: nextLeft };
      positionRef.current = next;
      setPosition(next);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !dragOffsetRef.current) return;
      if (e.touches.length === 0) return;
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
      const next = { top: nextTop, left: nextLeft };
      positionRef.current = next;
      setPosition(next);
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

  // Load persisted position on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('sapience.chat.position');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.top === 'number' &&
        typeof parsed.left === 'number' &&
        Number.isFinite(parsed.top) &&
        Number.isFinite(parsed.left)
      ) {
        const next = { top: parsed.top, left: parsed.left } as {
          top: number;
          left: number;
        };
        positionRef.current = next;
        setPosition(next);
      }
    } catch {
      /* noop */
    }
  }, []);

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

  return {
    refs: { containerRef, headerRef, closeBtnRef },
    position,
    handlers: { onHeaderMouseDown, onHeaderTouchStart },
  } as const;
}
