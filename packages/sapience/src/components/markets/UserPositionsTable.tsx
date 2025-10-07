import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@sapience/sdk/ui/components/ui/tabs';
import type React from 'react';
import { useEffect, useMemo } from 'react';
import type { Address } from 'viem';

import ActiveClosedLpPositionsTable from '../profile/ActiveClosedLpPositionsTable';
import ForecastsTable from '../profile/ForecastsTable';
import TraderPositionsTable from '../profile/TraderPositionsTable';
import ClosedTraderPositionsTable from '../profile/ClosedTraderPositionsTable';
import UserParlaysTable from '../parlays/UserParlaysTable';
import { usePositions } from '~/hooks/graphql/usePositions';
import { useForecasts } from '~/hooks/graphql/useForecasts';
import { SCHEMA_UID } from '~/lib/constants/eas';
import { useMarketGroupPage } from '~/lib/context/MarketGroupPageProvider';
import EmptyTabState from '~/components/shared/EmptyTabState';

interface UserPositionsTableProps {
  account: Address;
  marketAddress?: string;
  chainId?: number;
  marketId?: number; // Changed from string to number to match typical ID types
  marketIds?: number[]; // When on a multi-choice group, pass all active marketIds
  refetchUserPositions?: () => void;
  showProfileButton?: boolean;
  showHeaderText?: boolean;
  showParlaysTab?: boolean;
}

const UserPositionsTable: React.FC<UserPositionsTableProps> = ({
  account,
  marketAddress,
  chainId,
  marketId,
  marketIds,
  refetchUserPositions,
  showHeaderText = true,
  showParlaysTab = true,
}) => {
  const positionVars: { address: Address; marketAddress?: string } = {
    address: account,
  };
  if (marketAddress) {
    positionVars.marketAddress = marketAddress;
  }

  const { data: positionsData, refetch: refetchPositions } =
    usePositions(positionVars);
  const { data: attestationsData, refetch: refetchAttestations } = useForecasts(
    {
      attesterAddress: account,
      schemaId: SCHEMA_UID,
      marketAddress,
      chainId,
      marketId,
    }
  );

  // Refetch on mount and when parent triggers via changing callback identity
  useEffect(() => {
    refetchPositions();
    refetchAttestations();
  }, [refetchPositions, refetchAttestations]);

  useEffect(() => {
    if (refetchUserPositions) {
      refetchPositions();
      refetchAttestations();
    }
  }, [refetchUserPositions, refetchPositions, refetchAttestations]);

  const allPositions = useMemo(() => positionsData || [], [positionsData]);
  const filteredPositions = useMemo(() => {
    if (marketId != null) {
      return allPositions.filter((p) => p.market?.marketId === marketId);
    }
    if (marketIds && marketIds.length > 0) {
      const idSet = new Set(marketIds);
      return allPositions.filter((p) =>
        p.market?.marketId != null ? idSet.has(p.market.marketId) : false
      );
    }
    return allPositions;
  }, [allPositions, marketId, marketIds]);
  const traderPositions = useMemo(
    () => filteredPositions.filter((p) => !p.isLP),
    [filteredPositions]
  );
  const traderPositionsOpen = useMemo(() => {
    return traderPositions.filter((p) => {
      try {
        const collateralStr = p.collateral ?? '0';
        const hasCollateral = BigInt(collateralStr) > 0n;
        return hasCollateral && !p.isSettled;
      } catch {
        return !p.isSettled;
      }
    });
  }, [traderPositions]);
  const traderPositionsClosed = useMemo(() => {
    return traderPositions.filter((p) => {
      try {
        const collateralStr = p.collateral ?? '0';
        const hasCollateral = BigInt(collateralStr) > 0n;
        return !hasCollateral || !!p.isSettled;
      } catch {
        return !!p.isSettled;
      }
    });
  }, [traderPositions]);
  const lpPositions = useMemo(
    () => filteredPositions.filter((p) => p.isLP),
    [filteredPositions]
  );
  const safeAttestations = useMemo(() => {
    const atts = attestationsData || [];
    // Filter attestations to the specific market or active market set when provided
    if (marketId != null) {
      return atts.filter((a) => parseInt(a.marketId, 16) === marketId);
    }
    if (marketIds && marketIds.length > 0) {
      const idSet = new Set(marketIds);
      return atts.filter((a) => idSet.has(parseInt(a.marketId, 16)));
    }
    return atts;
  }, [attestationsData, marketId, marketIds]);

  // Provide a stable, globally consistent order for option color mapping
  const { marketGroupData } = useMarketGroupPage?.() || ({} as any);
  const summaryMarketsForColors = useMemo(() => {
    const list = marketGroupData?.markets || [];
    return list
      .slice()
      .sort(
        (a: any, b: any) => Number(a?.marketId ?? 0) - Number(b?.marketId ?? 0)
      );
  }, [marketGroupData]);

  return (
    <div className="space-y-6">
      {showHeaderText && (
        <h3 className="text-2xl font-medium">Your Activity</h3>
      )}
      <Tabs defaultValue="trades">
        <div className="mb-2.5">
          <TabsList
            className={`grid w-full h-auto grid-cols-1 gap-2 ${showParlaysTab ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}
          >
            <TabsTrigger className="w-full" value="trades">
              Trades
            </TabsTrigger>
            <TabsTrigger className="w-full" value="lp">
              Liquidity
            </TabsTrigger>
            {showParlaysTab && (
              <TabsTrigger className="w-full" value="parlays">
                Parlays
              </TabsTrigger>
            )}
            <TabsTrigger className="w-full" value="forecasts">
              Forecasts
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="trades">
          {traderPositionsOpen.length > 0 ? (
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">
                Active
              </h3>
              <TraderPositionsTable
                positions={traderPositionsOpen}
                parentMarketAddress={marketAddress}
                parentChainId={chainId}
                parentMarketId={marketId}
                context="user_positions"
                showPositionColumn
                columns={{ actions: false }}
                summaryMarketsForColors={summaryMarketsForColors}
              />
            </div>
          ) : null}
          {traderPositionsClosed.length > 0 ? (
            <div className="mt-6">
              <h3 className="font-medium text-sm text-muted-foreground mb-2">
                Closed
              </h3>
              <ClosedTraderPositionsTable positions={traderPositionsClosed} />
            </div>
          ) : null}
          {traderPositionsOpen.length === 0 &&
          traderPositionsClosed.length === 0 ? (
            <EmptyTabState message="No trades found" />
          ) : null}
        </TabsContent>

        <TabsContent value="lp">
          <ActiveClosedLpPositionsTable
            positions={lpPositions}
            parentMarketAddress={marketAddress}
            parentChainId={chainId}
            parentMarketId={marketId}
            context="user_positions"
            showPositionColumn
            columns={{ actions: false }}
            summaryMarketsForColors={summaryMarketsForColors}
          />
        </TabsContent>

        {showParlaysTab && (
          <TabsContent value="parlays">
            <UserParlaysTable account={account} showHeaderText={false} />
          </TabsContent>
        )}

        <TabsContent value="forecasts">
          <ForecastsTable
            attestations={safeAttestations}
            parentMarketAddress={marketAddress}
            parentChainId={chainId}
            parentMarketId={marketId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserPositionsTable;
