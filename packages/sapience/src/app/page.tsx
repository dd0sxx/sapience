'use client';

import ElizosPreviewSection from '~/components/home/ElizosPreviewSection';
import FeaturedMarketGroupSection from '~/components/home/FeaturedMarketGroupSection';
import SusdeCollateralPreviewSection from '~/components/home/SusdeCollateralPreviewSection';
import Hero from '~/components/home/Hero';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <Hero />
      <FeaturedMarketGroupSection />
      <SusdeCollateralPreviewSection />
      <ElizosPreviewSection />
    </div>
  );
}
