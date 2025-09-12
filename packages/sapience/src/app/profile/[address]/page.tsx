'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Address } from 'viem';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@sapience/ui/components/ui/tabs';

import ProfileHeader from '~/components/profile/ProfileHeader';
import TraderPositionsTable from '~/components/profile/TraderPositionsTable';
import LpPositionsTable from '~/components/profile/LpPositionsTable';
import ForecastsTable from '~/components/profile/ForecastsTable';
import UserParlaysTable from '~/components/parlays/UserParlaysTable';
import { usePositions } from '~/hooks/graphql/usePositions';
import { useForecasts } from '~/hooks/graphql/useForecasts';
import { SCHEMA_UID } from '~/lib/constants/eas';
import LottieLoader from '~/components/shared/LottieLoader';
import EmptyProfileState from '~/components/profile/EmptyProfileState';
import ProfileStats from '~/components/profile/ProfileStats';

const TAB_VALUES = ['trades', 'auction', 'lp', 'forecasts'] as const;
type TabValue = (typeof TAB_VALUES)[number];

export default function PortfolioPage() {
  const params = useParams();
  const address = (params.address as string).toLowerCase() as Address;

  // Feature flag: enable Parlays only when explicitly turned on
  const [parlayFeatureEnabled, setParlayFeatureEnabled] =
    useState<boolean>(false);
  useEffect(() => {
    try {
      const params =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : null;
      if (params?.get('parlays') === 'true') {
        window.localStorage.setItem('sapience.parlays', 'true');
      }
      const stored =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('sapience.parlays')
          : null;
      setParlayFeatureEnabled(stored === 'true');
    } catch {
      setParlayFeatureEnabled(false);
    }
  }, []);

  const {
    data: positionsData,
    isLoading: positionsLoading,
    isFetching: positionsFetching,
  } = usePositions({
    address,
  });
  const traderPositions = (positionsData || []).filter((p) => !p.isLP);
  const lpPositions = (positionsData || []).filter((p) => p.isLP);

  const { data: attestations, isLoading: forecastsLoading } = useForecasts({
    attesterAddress: address,
    schemaId: SCHEMA_UID,
  });

  const allLoaded =
    !positionsLoading && !forecastsLoading && !positionsFetching;

  const hasTrades = traderPositions.length > 0;
  const hasLp = lpPositions.length > 0;
  const hasForecasts = (attestations?.length || 0) > 0;

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (allLoaded && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [allLoaded, hasLoadedOnce]);

  const getHashValue = () => {
    if (typeof window === 'undefined') return 'trades' as TabValue;
    const rawHash = window.location.hash?.replace('#', '').toLowerCase();
    const desired = (TAB_VALUES as readonly string[]).includes(rawHash)
      ? (rawHash as TabValue)
      : ('trades' as TabValue);
    // If Parlays is disabled, fall back to trades
    if (desired === 'auction' && !parlayFeatureEnabled)
      return 'trades' as TabValue;
    return desired;
  };

  const [tabValue, setTabValue] = useState<TabValue>('trades');

  useEffect(() => {
    setTabValue(getHashValue());
  }, [parlayFeatureEnabled]);

  useEffect(() => {
    const onHashChange = () => {
      setTabValue(getHashValue());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', onHashChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('hashchange', onHashChange);
      }
    };
  }, []);

  const handleTabChange = (value: string) => {
    const nextValue = (TAB_VALUES as readonly string[]).includes(value)
      ? (value as TabValue)
      : ('trades' as TabValue);
    // Prevent selecting Parlays when feature is disabled
    if (nextValue === 'auction' && !parlayFeatureEnabled) {
      return;
    }
    setTabValue(nextValue);
    if (typeof window !== 'undefined') {
      const url = `${window.location.pathname}${window.location.search}#${nextValue}`;
      window.history.replaceState(null, '', url);
    }
  };

  const didAutoRedirectRef = useRef(false);

  useEffect(() => {
    if (!hasLoadedOnce || didAutoRedirectRef.current) return;

    const rawHash =
      typeof window !== 'undefined'
        ? window.location.hash?.replace('#', '').toLowerCase()
        : '';
    const hasExplicitHash = (TAB_VALUES as readonly string[]).includes(rawHash);
    if (hasExplicitHash) {
      // If user explicitly navigated to Parlays while disabled, redirect to trades
      if (rawHash === 'auction' && !parlayFeatureEnabled) {
        didAutoRedirectRef.current = true;
        handleTabChange('trades');
        return;
      }
      didAutoRedirectRef.current = true;
      return;
    }

    const tabHasContent = (tab: TabValue): boolean => {
      if (tab === 'trades') return hasTrades;
      if (tab === 'auction') return false; // Parlays is coming soon
      if (tab === 'lp') return hasLp;
      if (tab === 'forecasts') return hasForecasts;
      return false;
    };

    // If current tab already has content, do nothing further
    if (tabHasContent(tabValue)) {
      didAutoRedirectRef.current = true;
      return;
    }

    // Parlays is currently feature-flagged; skip it in auto-redirect logic unless enabled
    const firstWithContent: TabValue | null = hasTrades
      ? 'trades'
      : hasLp
        ? 'lp'
        : hasForecasts
          ? 'forecasts'
          : null;

    if (firstWithContent && tabValue !== firstWithContent) {
      handleTabChange(firstWithContent);
    }
    // Mark as done to avoid overriding user interactions later
    didAutoRedirectRef.current = true;
  }, [hasLoadedOnce, hasTrades, hasLp, hasForecasts, parlayFeatureEnabled]);

  // If the feature flag becomes disabled while on Parlays, snap back to trades
  useEffect(() => {
    if (!parlayFeatureEnabled && tabValue === 'auction') {
      handleTabChange('trades');
    }
  }, [parlayFeatureEnabled, tabValue]);

  return (
    <div className="container max-w-6xl mx-auto py-32 px-4">
      <div className="mb-5 lg:mb-10">
        <ProfileHeader address={address} />
      </div>

      <div className="mb-5">
        <ProfileStats address={address} />
      </div>

      {hasLoadedOnce ? (
        !(hasTrades || hasLp || hasForecasts) ? (
          <EmptyProfileState />
        ) : (
          <Tabs
            value={tabValue}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-1 lg:grid-cols-4 h-auto gap-2 mb-5">
              <TabsTrigger className="w-full" value="trades">
                Prediction Market Trades
              </TabsTrigger>
              <TabsTrigger
                className="w-full"
                value="auction"
                disabled={!parlayFeatureEnabled}
              >
                Parlays
              </TabsTrigger>
              <TabsTrigger className="w-full" value="lp">
                Prediction Market Liquidity
              </TabsTrigger>
              <TabsTrigger className="w-full" value="forecasts">
                Forecasts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trades">
              <TraderPositionsTable
                positions={traderPositions}
                showHeader={false}
              />
            </TabsContent>

            <TabsContent value="auction">
              <UserParlaysTable account={address} showHeaderText={false} />
            </TabsContent>

            <TabsContent value="lp">
              <LpPositionsTable positions={lpPositions} showHeader={false} />
            </TabsContent>

            <TabsContent value="forecasts">
              <ForecastsTable attestations={attestations} />
            </TabsContent>
          </Tabs>
        )
      ) : (
        <div className="flex justify-center py-24">
          <LottieLoader width={32} height={32} />
        </div>
      )}
    </div>
  );
}
