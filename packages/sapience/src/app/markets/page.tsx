import { dehydrate, QueryClient } from '@tanstack/react-query';

import MarketGroupsList from '~/components/forecasting/MarketGroupsList';
import Hydrate from '~/components/Hydrate';
import {
  prefetchCategories,
  prefetchEnrichedMarketGroups,
} from '~/hooks/graphql/useMarketGroups';

export function generateMetadata() {
  return {
    title: 'Markets | Sapience',
    description: 'Make forecasts across various focus areas',
    openGraph: {
      title: 'Markets | Sapience',
      description: 'Make forecasts across various focus areas',
      type: 'website',
    },
  };
}

const ForecastingPage = async () => {
  // new query client for the server
  const serverQC = new QueryClient();

  // Prefetch enriched market groups data
  await prefetchEnrichedMarketGroups(serverQC);
  await prefetchCategories(serverQC);

  const state = dehydrate(serverQC);
  return (
    <Hydrate state={state}>
      <div className="container mx-auto px-4 md:p-8 max-w-8xl mt-16">
        <MarketGroupsList />
      </div>
    </Hydrate>
  );
};

export default ForecastingPage;
