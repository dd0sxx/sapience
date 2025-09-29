'use client';

import { Button } from '@sapience/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@sapience/ui/components/ui/dialog';
import Image from 'next/image';
import { Copy, Share2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@sapience/ui/hooks/use-toast';
import LottieLoader from '~/components/shared/LottieLoader';

interface OgShareDialogBaseProps {
  imageSrc: string; // Relative path with query, e.g. "/og/trade?..."
  title?: string; // Dialog title
  trigger?: React.ReactNode;
  shareTitle?: string; // Title for navigator.share
  shareText?: string; // Text for navigator.share
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  loaderSizePx?: number; // defaults to 48 for consistency
  copyButtonText?: string; // defaults to "Copy Image"
  shareButtonText?: string; // defaults to "Share"
}

export default function OgShareDialogBase(props: OgShareDialogBaseProps) {
  const {
    imageSrc,
    title = 'Share',
    trigger,
    shareTitle = 'Share',
    shareText,
    open: controlledOpen,
    onOpenChange,
    loaderSizePx = 48,
    copyButtonText = 'Copy Image',
    shareButtonText = 'Share',
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

  const absoluteShareUrl = useMemo(() => {
    if (typeof window !== 'undefined')
      return `${window.location.origin}${imageSrc}`;
    return imageSrc;
  }, [imageSrc]);

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
            {title}
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
                <LottieLoader width={loaderSizePx} height={loaderSizePx} />
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
                  const res = await fetch(absoluteShareUrl, {
                    cache: 'no-store',
                  });
                  const blob = await res.blob();
                  if (navigator.clipboard && (window as any).ClipboardItem) {
                    const item = new (window as any).ClipboardItem({
                      [blob.type]: blob,
                    });
                    await navigator.clipboard.write([item]);
                  } else {
                    await navigator.clipboard.writeText(absoluteShareUrl);
                  }
                  toast({ title: 'Image copied successfully' });
                } catch {
                  try {
                    await navigator.clipboard.writeText(absoluteShareUrl);
                    toast({ title: 'Link copied successfully' });
                  } catch {
                    // ignore
                  }
                }
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> {copyButtonText}
            </Button>
            <Button
              size="lg"
              className="w-1/2"
              type="button"
              onClick={async () => {
                if ((navigator as any).share) {
                  try {
                    await (navigator as any).share({
                      title: shareTitle,
                      text: shareText,
                      url: absoluteShareUrl,
                    });
                    return;
                  } catch {
                    // fallthrough
                  }
                }
                window.open(absoluteShareUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              <Share2 className="mr-2 h-4 w-4" /> {shareButtonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
