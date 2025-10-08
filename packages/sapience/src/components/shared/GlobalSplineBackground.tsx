'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import SplineTopBackground from '~/components/shared/SplineTopBackground';

// Renders the Spline background globally and fades it out on the homepage.
// Keeps the iframe mounted for smooth transitions between routes.
export default function GlobalSplineBackground() {
  const pathname = usePathname();
  const isHomepage = useMemo(() => pathname === '/', [pathname]);
  const isMarkets = useMemo(
    () => pathname?.startsWith('/markets') === true,
    [pathname]
  );

  // When hidden, fully fade the container. When visible, use our standard opacity.
  // Disable the component's default opacity so we can animate between 0 and target.
  const containerClassName = isHomepage
    ? 'z-0 opacity-0 transition-opacity duration-500 ease-out'
    : 'z-0 opacity-50 dark:opacity-75 transition-opacity duration-500 ease-out';

  return (
    <SplineTopBackground
      // Maintain the subtle left gradient that matches several pages
      showLeftGradient={true}
      // Enable a gentle top fade under dense headers on Markets
      showTopFade={isMarkets}
      disableDefaultOpacity={true}
      containerClassName={containerClassName}
    />
  );
}
