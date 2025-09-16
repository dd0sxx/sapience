'use client';

import dynamic from 'next/dynamic';

const BotsHero = dynamic(() => import('~/components/bots/BotsHero'), {
  ssr: false,
});

const TemplateSection = dynamic(
  () => import('~/components/bots/BuildAgentSection'),
  { ssr: false }
);

const BotsQuickStart = dynamic(
  () => import('~/components/bots/BotsQuickStart'),
  { ssr: false }
);

const BotsPageContent = () => {
  return (
    <main className="min-h-screen w-full">
      <BotsHero />
      <BotsQuickStart />
      <TemplateSection />
    </main>
  );
};

export default BotsPageContent;
