'use client';

import * as React from 'react';
import autoScroll from 'embla-carousel-auto-scroll';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@sapience/sdk/ui/components/ui/carousel';
import { useSidebar } from '@sapience/sdk/ui/components/ui/sidebar';
import ParlayConditionCard from '../markets/ParlayConditionCard';
import { useConditions } from '~/hooks/graphql/useConditions';
import { getCategoryStyle } from '~/lib/utils/categoryStyle';

// Removed LottieLoader in favor of simple fade-in cards and fixed-height placeholder

// Interface for featured conditions in the homepage carousel
interface FeaturedCondition {
  id: string;
  question: string;
  shortName?: string | null;
  endTime: number;
  description?: string | null;
  color: string;
  categoryId: string;
  categorySlug: string;
}

export default function FeaturedMarketGroupCards() {
  // Fetch recent conditions
  const { data: conditions, isLoading: isLoadingConditions } = useConditions({
    take: 100,
  });

  // Per-mount random seed to vary picks between mounts but keep them stable within a session
  const [randomSeed] = React.useState<number>(() => Math.random());

  // Simple seeded RNG (Mulberry32)
  const createRng = React.useCallback((seed: number) => {
    let t = Math.floor(seed * 0x7fffffff) >>> 0;
    return function rng() {
      t += 0x6d2b79f5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }, []);

  // Build featured conditions with category variety; target 8 items
  const featuredConditions: FeaturedCondition[] = React.useMemo(() => {
    if (!conditions) return [];

    const rng = createRng(randomSeed);
    const now = Math.floor(Date.now() / 1000);

    // 1) Active + public conditions
    const activePublic = conditions.filter((c) => {
      if (typeof c.endTime !== 'number' || c.endTime <= 0) return false;
      if (!c.public) return false;
      return now <= c.endTime;
    });

    // 2) Map with color metadata
    const mapped: FeaturedCondition[] = activePublic.map((c) => {
      const slug = c.category?.slug || '';
      const styleInfo = getCategoryStyle(slug);
      const color = styleInfo?.color || 'hsl(var(--muted-foreground))';
      return {
        id: c.id,
        question: c.question,
        shortName: c.shortName,
        endTime: c.endTime,
        description: c.description,
        color,
        categoryId: String(c.category?.id ?? ''),
        categorySlug: slug,
      };
    });

    // 3) One per category when possible
    const byCategory = mapped.reduce<Record<string, FeaturedCondition[]>>(
      (acc, cond) => {
        const key = cond.categoryId || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(cond);
        return acc;
      },
      {}
    );

    const onePerCategory: FeaturedCondition[] = Object.values(byCategory)
      .map((conds) => {
        if (conds.length === 0) return null;
        const randomIndex = Math.floor(rng() * conds.length);
        return conds[randomIndex];
      })
      .filter((c): c is FeaturedCondition => c !== null);

    // 4) Shuffle and fill up to 8
    function shuffle<T>(arr: T[]): T[] {
      const copy = arr.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    const randomized = shuffle(onePerCategory);

    const selectedIds = new Set(randomized.map((c) => c.id));
    const remaining = shuffle(mapped.filter((c) => !selectedIds.has(c.id)));

    const filled: FeaturedCondition[] = [...randomized];
    for (const c of remaining) {
      if (filled.length >= 8) break;
      filled.push(c);
    }

    // 5) If still fewer than 8 items, repeat from start
    if (filled.length < 8 && filled.length > 0) {
      let i = 0;
      while (filled.length < 8) {
        filled.push(filled[i % filled.length]);
        i++;
        if (i > 32) break;
      }
    }

    return filled;
  }, [conditions, createRng, randomSeed]);

  if (isLoadingConditions) {
    return (
      <section className="pt-0 px-0 w-full relative z-10">
        <div className="w-full px-0">
          {/* Maintain space to prevent layout jump while data loads */}
          <div className="mt-0 mb-6 md:mb-4">
            <div className="h-[150px] md:h-[160px] w-full" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-0 px-0 w-full relative z-10">
      <div className="w-full px-0">
        {featuredConditions.length === 0 ? (
          // Always reserve space, even when no items yet
          <div className="relative mt-0 md:mt-0 mb-6 md:mb-4 h-[150px] md:h-[160px]" />
        ) : (
          <MobileAndDesktopLists items={featuredConditions} />
        )}
      </div>
    </section>
  );
}

function MobileAndDesktopLists({ items }: { items: FeaturedCondition[] }) {
  const { state, openMobile } = useSidebar();
  const [mobileApi, setMobileApi] = React.useState<CarouselApi | null>(null);
  const [desktopApi, setDesktopApi] = React.useState<CarouselApi | null>(null);
  const hasRandomizedMobileStart = React.useRef(false);
  const hasRandomizedDesktopStart = React.useRef(false);
  const memoItems = React.useMemo(() => items, [items]);

  const autoScrollPluginMobile = React.useMemo(
    () =>
      autoScroll({
        playOnInit: true,
        stopOnMouseEnter: true,
        stopOnInteraction: true,
        speed: 0.5,
      }),
    []
  );

  const autoScrollPluginDesktop = React.useMemo(
    () =>
      autoScroll({
        playOnInit: true,
        // Keep autoscrolling even when hovered on desktop
        stopOnMouseEnter: false,
        stopOnInteraction: true,
        speed: 0.5,
      }),
    []
  );

  // Reinitialize carousels when the sidebar open/collapsed state changes
  React.useEffect(() => {
    mobileApi?.reInit();
    desktopApi?.reInit();
  }, [state, openMobile, mobileApi, desktopApi]);

  // Randomize starting slide (mobile) once on init
  React.useEffect(() => {
    if (!mobileApi || hasRandomizedMobileStart.current) return;
    if (memoItems.length === 0) return;
    const startIndex = Math.floor(Math.random() * memoItems.length);
    try {
      mobileApi.scrollTo(startIndex, true);
    } catch {
      console.error('Error scrolling to random index', startIndex);
    }
    hasRandomizedMobileStart.current = true;
  }, [mobileApi, memoItems.length]);

  // Randomize starting slide (desktop) once on init
  React.useEffect(() => {
    if (!desktopApi || hasRandomizedDesktopStart.current) return;
    if (memoItems.length === 0) return;
    const startIndex = Math.floor(Math.random() * memoItems.length);
    try {
      desktopApi.scrollTo(startIndex, true);
    } catch {
      console.error('Error scrolling to random index', startIndex);
    }
    hasRandomizedDesktopStart.current = true;
  }, [desktopApi, memoItems.length]);

  const desktopItemClass = React.useMemo(() => {
    // Narrower cards to fit more within the hero width
    if (memoItems.length >= 3) return 'pl-8 basis-1/3 lg:basis-1/4 h-full';
    if (memoItems.length === 2) return 'pl-8 basis-1/2 lg:basis-1/3 h-full';
    return 'pl-8 basis-[65%] lg:basis-1/2 h-full';
  }, [memoItems.length]);

  return (
    <div className="relative mt-0 md:mt-0 mb-6 md:mb-4 min-h-[150px] md:min-h-[160px]">
      {/* Fade overlays */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-20 w-8 md:w-16 bg-gradient-to-r from-background to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 md:w-16 bg-gradient-to-l from-background to-transparent"
        aria-hidden
      />
      {/* Mobile: Embla carousel with auto-scroll */}
      <div className="md:hidden w-full px-0 h-[150px]">
        <Carousel
          opts={{ loop: true, align: 'start', containScroll: 'trimSnaps' }}
          plugins={[autoScrollPluginMobile]}
          setApi={setMobileApi}
          className="w-full h-full"
        >
          <CarouselContent className="-ml-8 items-stretch h-full">
            {memoItems.map((c) => (
              <CarouselItem key={c.id} className="pl-8 basis-[70%] h-full">
                <ParlayConditionCard
                  condition={{
                    id: c.id,
                    question: c.question,
                    shortName: c.shortName,
                    endTime: c.endTime,
                    description: c.description,
                  }}
                  color={c.color}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Dewtop: Embla carousel with auto-scroll */}
      <div className="hidden md:block w-full px-0 h-[160px]">
        <Carousel
          opts={{ loop: true, align: 'start', containScroll: 'trimSnaps' }}
          plugins={[autoScrollPluginDesktop]}
          setApi={setDesktopApi}
          className="w-full h-full"
        >
          <CarouselContent className="-ml-8 items-stretch h-full">
            {memoItems.map((c) => (
              <CarouselItem key={c.id} className={`${desktopItemClass} h-full`}>
                <ParlayConditionCard
                  condition={{
                    id: c.id,
                    question: c.question,
                    shortName: c.shortName,
                    endTime: c.endTime,
                    description: c.description,
                  }}
                  color={c.color}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}
