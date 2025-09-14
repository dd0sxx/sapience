'use client';

import ElizosPreviewSection from '~/components/home/ElizosPreviewSection';
import SusdeCollateralPreviewSection from '~/components/home/SusdeCollateralPreviewSection';
import Hero from '~/components/home/Hero';
import HomepageEnd from '~/components/home/HomepageEnd';

const HomePageContent = () => {
  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
      <Hero />
      <SusdeCollateralPreviewSection />
      <ElizosPreviewSection />
      <HomepageEnd />
    </div>
  );
};

export default HomePageContent;
