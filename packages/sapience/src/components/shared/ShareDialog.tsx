'use client';

import { Button } from '@sapience/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@sapience/ui/components/ui/dialog';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Copy, Share2 } from 'lucide-react';
import { useToast } from '@sapience/ui/hooks/use-toast';
import LottieLoader from '~/components/shared/LottieLoader';

interface ShareDialogProps {
  question: string;
  side?: string;
  wager?: number | string;
  payout?: number | string;
  symbol?: string;
  groupAddress?: string;
  marketId?: number | string;
  positionId?: number | string;
  owner?: string;
  extraParams?: Record<string, string>;
  trigger?: React.ReactNode;
  imagePath?: string; // defaults to OG position path for now
  title?: string; // dialog title
  legs?: { question: string; choice: 'Yes' | 'No' }[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ShareDialog(props: ShareDialogProps) {
  const {
    question,
    side,
    wager,
    payout,
    symbol,
    groupAddress,
    marketId,
    positionId,
    owner,
    extraParams,
    trigger,
    imagePath = '/og/trade',
    title = 'Share',
    open: controlledOpen,
    onOpenChange,
  } = props;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = typeof controlledOpen === 'boolean';
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled
    ? (val: boolean) => onOpenChange && onOpenChange(val)
    : setUncontrolledOpen;
  const [cacheBust, setCacheBust] = useState('');
  const [imgLoading, setImgLoading] = useState(true);
  const { toast } = useToast();

  const formatAmount = (val: number): string => {
    if (!Number.isFinite(val)) return '0';
    return val.toFixed(val < 1 ? 4 : 2);
  };

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (groupAddress && marketId != null) {
      sp.set('group', groupAddress);
      sp.set('mid', String(marketId));
    }
    sp.set('q', question);
    if (side) sp.set('dir', side);
    if (typeof wager !== 'undefined')
      sp.set('wager', formatAmount(Number(wager)));
    if (typeof payout !== 'undefined')
      sp.set('payout', formatAmount(Number(payout)));
    if (symbol) sp.set('symbol', symbol);
    if (positionId != null) sp.set('pid', String(positionId));
    if (owner) sp.set('addr', owner);
    if (props.legs && Array.isArray(props.legs)) {
      for (const leg of props.legs) {
        const q = (leg?.question ?? '').toString();
        const c = leg?.choice === 'Yes' ? 'Yes' : 'No';
        if (q) sp.append('leg', `${q}|${c}`);
      }
    }
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (typeof v === 'string') sp.set(k, v);
      });
    }
    return sp.toString();
  }, [
    question,
    side,
    wager,
    payout,
    symbol,
    groupAddress,
    marketId,
    positionId,
    owner,
    extraParams,
    props.legs,
  ]);

  const imageSrc = `${imagePath}?${queryString}`;
  const shareUrl = useMemo(() => {
    const base = `${imagePath}?${queryString}`;
    if (typeof window !== 'undefined')
      return `${window.location.origin}${base}`;
    return base;
  }, [imagePath, queryString]);

  useEffect(() => {
    if (open) setCacheBust(String(Date.now()));
  }, [open]);

  const previewSrc = `${imageSrc}${cacheBust ? `&cb=${cacheBust}` : ''}`;

  useEffect(() => {
    setImgLoading(true);
  }, [previewSrc]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader className="pb-2">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="w-full aspect-[1200/630] bg-muted rounded overflow-hidden relative border border-border">
            {imgLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <LottieLoader width={48} height={48} />
              </div>
            )}
            <Image
              src={previewSrc}
              alt="Share preview"
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              onLoad={() => setImgLoading(false)}
              onError={() => setImgLoading(false)}
              priority
            />
          </div>
          <div className="flex gap-3">
            <Button
              size="lg"
              className="w-1/2"
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  const res = await fetch(shareUrl, { cache: 'no-store' });
                  const blob = await res.blob();
                  if (navigator.clipboard && (window as any).ClipboardItem) {
                    const item = new (window as any).ClipboardItem({
                      [blob.type]: blob,
                    });
                    await navigator.clipboard.write([item]);
                  } else {
                    await navigator.clipboard.writeText(shareUrl);
                  }
                  toast({ title: 'Image copied successfully' });
                } catch {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    toast({ title: 'Link copied successfully' });
                  } catch {
                    // ignore
                  }
                }
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy Image
            </Button>
            <Button
              size="lg"
              className="w-1/2"
              type="button"
              onClick={async () => {
                if ((navigator as any).share) {
                  try {
                    await (navigator as any).share({
                      title,
                      text: question,
                      url: shareUrl,
                    });
                    return;
                  } catch {
                    // fallthrough
                  }
                }
                window.open(shareUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
