import { GraphQLClient } from 'graphql-request';
import { Abi } from 'abitype';
import * as _tanstack_react_query from '@tanstack/react-query';
import { R as Resource } from '../graphql-DZn6p9CD.mjs';
import { Address, Abi as Abi$1 } from 'viem';
import { Pool } from '@uniswap/v3-sdk';

declare const createGraphQLClient: () => GraphQLClient;
declare function graphqlRequest<T>(query: string, variables?: Record<string, any>): Promise<T>;
declare function typedGraphqlRequest<TQuery, TVariables extends Record<string, any> = Record<string, never>>(query: string, variables?: TVariables): Promise<TQuery>;

declare const sapienceAbi: () => {
    abi: Abi;
};
declare const sapienceFactoryAbi: () => {
    abi: Abi;
};

declare const useResources: () => _tanstack_react_query.UseQueryResult<(Resource & {
    iconPath: string;
})[], Error>;
declare const useLatestResourcePrice: (slug: string) => _tanstack_react_query.UseQueryResult<{
    timestamp: string;
    value: string;
}, Error>;
declare const useLatestIndexPrice: (market: {
    address: string;
    chainId: number;
    marketId: number;
}) => _tanstack_react_query.UseQueryResult<{
    timestamp: string;
    value: string;
} | null, Error>;

interface MarketData {
    marketId: bigint;
    startTime: bigint;
    endTime: bigint;
    pool: Address;
    ethToken: Address;
    gasToken: Address;
    minPriceD18: bigint;
    maxPriceD18: bigint;
    baseAssetMinPriceTick: number;
    baseAssetMaxPriceTick: number;
    settled: boolean;
    settlementPriceD18: bigint;
    assertionId: `0x${string}`;
}
interface MarketGroupParams {
    feeRate: number;
    assertionLiveness: bigint;
    bondAmount: bigint;
    bondCurrency: Address;
    uniswapPositionManager: Address;
    uniswapSwapRouter: Address;
    uniswapQuoter: Address;
    optimisticOracleV3: Address;
    claimStatement: `0x${string}`;
}
interface UseMarketResult {
    marketData: MarketData | undefined;
    marketGroupParams: MarketGroupParams | undefined;
    isLoading: boolean;
    error: Error | null;
}
interface UseMarketProps {
    marketAddress: Address;
    marketId: bigint;
    abi: Abi$1;
}
declare function useMarket({ marketAddress, marketId, abi }: UseMarketProps): UseMarketResult;

declare const useUniswapPool: (chainId: number, poolAddress: `0x${string}`) => {
    pool: Pool | null;
    liquidity: string;
    isError: boolean;
    isLoading: boolean;
    refetchUniswapData: () => void;
};

export { createGraphQLClient, graphqlRequest, sapienceAbi, sapienceFactoryAbi, typedGraphqlRequest, useLatestIndexPrice, useLatestResourcePrice, useMarket, useResources, useUniswapPool };
