'use client';

import React from 'react';
import { formatUnits } from 'viem';
import type { PositionType } from '@sapience/ui/types';
import EmptyTabState from '~/components/shared/EmptyTabState';
import LpPositionsTable from './LpPositionsTable';
import {
  type TableViewContext,
  type MarketContext,
  type ColumnOverrides,
} from '~/components/shared/tableVisibility';

interface ActiveClosedLpPositionsTableProps {
  positions: PositionType[];
  parentMarketAddress?: string;
  parentChainId?: number;
  parentMarketId?: number;
  showActions?: boolean;
  showOwnerColumn?: boolean;
  showPositionColumn?: boolean;
  context?: TableViewContext;
  marketContext?: MarketContext;
  columns?: ColumnOverrides;
  summaryMarketsForColors?: Array<any>;
}

export default function ActiveClosedLpPositionsTable({
  positions,
  parentMarketAddress,
  parentChainId,
  parentMarketId,
  showActions = true,
  showOwnerColumn = false,
  showPositionColumn,
  context,
  marketContext,
  columns,
  summaryMarketsForColors,
}: ActiveClosedLpPositionsTableProps) {

    // Debug logging for position tracking
    console.log('All positions received:', positions.length);
    console.log('Positions with collateral > 0:', positions.filter(p => {
      const collateral = Number(formatUnits(BigInt(p.collateral || '0'), p.market?.marketGroup?.collateralDecimals || 18));
      return collateral > 0;
    }).length);
    console.log('Positions with collateral = 0:', positions.filter(p => {
      const collateral = Number(formatUnits(BigInt(p.collateral || '0'), p.market?.marketGroup?.collateralDecimals || 18));
      return collateral === 0;
    }).length);
  // Filter positions into active and closed based on collateral
  const activePositions = positions.filter((position) => {
    const collateral = Number(
      formatUnits(
        BigInt(position.collateral || '0'),
        position.market?.marketGroup?.collateralDecimals || 18
      )
    );
    return collateral > 0;
  });

  const closedPositions = positions.filter((position) => {
    const collateral = Number(
      formatUnits(
        BigInt(position.collateral || '0'),
        position.market?.marketGroup?.collateralDecimals || 18
      )
    );
    return collateral === 0;
  });

  console.log("closedPositions", closedPositions);
  console.log("activePositions", activePositions);
  
  // Debug: Log each position's collateral value
  positions.forEach((position, index) => {
    const collateral = Number(formatUnits(BigInt(position.collateral || '0'), position.market?.marketGroup?.collateralDecimals || 18));
    console.log(`Position ${index}: collateral=${collateral}, positionId=${position.positionId}, isLP=${position.isLP}`);
  });

  // Create column overrides to remove Collateral and Current Position Value columns
  const modifiedColumns: ColumnOverrides = {
    ...columns,
  };

  return (
    <div>
      {activePositions.length > 0 && (
        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-2">
            Active
          </h3>
          <LpPositionsTable
            positions={activePositions}
            parentMarketAddress={parentMarketAddress}
            parentChainId={parentChainId}
            parentMarketId={parentMarketId}
            showActions={showActions}
            showOwnerColumn={showOwnerColumn}
            showPositionColumn={showPositionColumn}
            context={context}
            marketContext={marketContext}
            columns={modifiedColumns}
            summaryMarketsForColors={summaryMarketsForColors}
            hideCollateralColumn={true}
            hideValueColumn={true}
          />
        </div>
      )}
      
      {closedPositions.length > 0 && (
        <div className={activePositions.length > 0 ? 'mt-6' : ''}>
          <h3 className="font-medium text-sm text-muted-foreground mb-2">
            Closed
          </h3>
          <LpPositionsTable
            positions={closedPositions}
            parentMarketAddress={parentMarketAddress}
            parentChainId={parentChainId}
            parentMarketId={parentMarketId}
            showActions={showActions}
            showOwnerColumn={showOwnerColumn}
            showPositionColumn={showPositionColumn}
            context={context}
            marketContext={marketContext}
            columns={modifiedColumns}
            summaryMarketsForColors={summaryMarketsForColors}
            hideCollateralColumn={true}
            hideValueColumn={true}
          />
        </div>
      )}
      
      {activePositions.length === 0 && closedPositions.length === 0 && (
        <EmptyTabState message="No liquidity positions found" />
      )}
    </div>
  );
}
