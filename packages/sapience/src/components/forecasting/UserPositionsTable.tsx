import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@sapience/ui/components/ui/tabs';
import type React from 'react';
import { useEffect, useMemo } from 'react';
import type { Address } from 'viem';

import LpPositionsTable from '../profile/LpPositionsTable';
import ForecastsTable from '../profile/ForecastsTable';
import TraderPositionsTable from '../profile/TraderPositionsTable';
import UserParlaysTable from '../parlays/UserParlaysTable';
import { usePositions } from '~/hooks/graphql/usePositions';
import { usePredictions } from '~/hooks/graphql/usePredictions';
import { SCHEMA_UID } from '~/lib/constants/eas';

interface UserPositionsTableProps {
  account: Address;
  marketAddress?: string;
  chainId?: number;
  marketId?: number; // Changed from string to number to match typical ID types
  refetchUserPositions?: () => void;
  showProfileButton?: boolean;
  showHeaderText?: boolean;
}

const UserPositionsTable: React.FC<UserPositionsTableProps> = ({
  account,
  marketAddress,
  chainId,
  marketId,
  refetchUserPositions,
  showHeaderText = true,
}) => {
  const positionVars: { address: Address; marketAddress?: string } = {
    address: account,
  };
  if (marketAddress) {
    positionVars.marketAddress = marketAddress;
  }

  const { data: positionsData, refetch: refetchPositions } =
    usePositions(positionVars);
  const { data: attestationsData, refetch: refetchAttestations } =
    usePredictions({
      attesterAddress: account,
      schemaId: SCHEMA_UID,
      marketAddress,
      chainId,
      marketId,
    });

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
    return allPositions;
  }, [allPositions, marketId]);
  const traderPositions = useMemo(
    () => filteredPositions.filter((p) => !p.isLP),
    [filteredPositions]
  );
  const lpPositions = useMemo(
    () => filteredPositions.filter((p) => p.isLP),
    [filteredPositions]
  );
  const safeAttestations = attestationsData || [];

  // Determine if any content exists
  const hasAnyData =
    (traderPositions?.length || 0) > 0 ||
    (lpPositions?.length || 0) > 0 ||
    (safeAttestations?.length || 0) > 0;

  if (!hasAnyData) return null;

  return (
    <div className="space-y-6">
      {showHeaderText && (
        <h3 className="text-2xl font-medium">Your Activity</h3>
      )}
      <Tabs defaultValue="forecasts">
        <div className="mb-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
            <TabsTrigger value="trades">Prediction Market Trades</TabsTrigger>
            <TabsTrigger value="lp">Prediction Market Liquidity</TabsTrigger>
            <TabsTrigger value="parlays">Parlays</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="forecasts">
          <ForecastsTable
            attestations={safeAttestations}
            parentMarketAddress={marketAddress}
            parentChainId={chainId}
            parentMarketId={marketId}
          />
        </TabsContent>

        <TabsContent value="trades">
          <TraderPositionsTable
            positions={traderPositions}
            parentMarketAddress={marketAddress}
            parentChainId={chainId}
            parentMarketId={marketId}
            showHeader={false}
          />
        </TabsContent>

        <TabsContent value="lp">
          <LpPositionsTable
            positions={lpPositions}
            parentMarketAddress={marketAddress}
            parentChainId={chainId}
            parentMarketId={marketId}
            showHeader={false}
          />
        </TabsContent>

        <TabsContent value="parlays">
          <UserParlaysTable
            account={account}
            chainId={chainId}
            showHeaderText={false}
            marketAddressFilter={marketAddress}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserPositionsTable;
