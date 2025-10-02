export { c as CandleType, C as CategoryType, a as MarketGroupType, M as MarketType, P as PositionType, Q as Query, b as ResourcePrice, R as ResourceType, T as Transaction, T as TransactionType } from '../graphql-DZn6p9CD.js';
import { Pool } from '@uniswap/v3-sdk';

declare enum ChartType {
    PRICE = "Price Chart",
    DEPTH = "Depth",
    ORDER_BOOK = "Order Book",
    VOLUME = "VOLUME",
    LIQUIDITY = "LIQUIDITY"
}
declare enum TimeWindow {
    D = "D",
    W = "W",
    M = "M"
}
declare enum TimeInterval {
    I5M = "I5M",
    I15M = "I15M",
    I30M = "I30M",
    I4H = "I4H",
    I1D = "I1D"
}
declare enum LineType {
    MarketPrice = "marketPrice",
    IndexPrice = "indexPrice",
    ResourcePrice = "resourcePrice",
    TrailingAvgPrice = "trailingAvgPrice"
}

type MarketsApiResponse = Array<{
    id: number;
    name: string;
    chainId: number;
    address: string;
    collateralAsset: string;
    owner: string;
    isCumulative: boolean;
    resource: {
        id: number;
        name: string;
        slug: string;
    };
    markets: Array<{
        id: number;
        marketId: number;
        startTimestamp: number;
        endTimestamp: number;
        public: boolean;
        question?: string;
    }>;
    currentMarket: {
        id: number;
        marketId: number;
        startTimestamp: number;
        endTimestamp: number;
        public: boolean;
        question?: string;
    } | null;
    nextMarket: {
        id: number;
        marketId: number;
        startTimestamp: number;
        endTimestamp: number;
        public: boolean;
        question?: string;
    } | null;
}>;
interface MarketGroup {
    id: number;
    name: string;
    chainId: number;
    address: string;
    collateralAsset: string;
    owner: string;
    isCumulative: boolean;
    resource: {
        id: number;
        name: string;
        slug: string;
    };
    markets: {
        id: number;
        marketId: number;
        startTimestamp: number;
        endTimestamp: number;
        public: boolean;
        question?: string;
    }[];
}
type MarketGroupParams = {
    assertionLiveness: bigint;
    bondAmount: bigint;
    bondCurrency: string;
    feeRate: number;
    optimisticOracleV3: string;
    claimStatement: string;
    uniswapPositionManager: `0x${string}`;
    uniswapQuoter: `0x${string}`;
    uniswapSwapRouter: `0x${string}`;
};

type Market = {
    marketId: string;
    startTime: bigint;
    endTime: bigint;
    poolAddress: `0x${string}`;
    quoteToken: string;
    baseToken: string;
    minPriceD18: bigint;
    maxPriceD18: bigint;
    baseAssetMinPriceTick: number;
    baseAssetMaxPriceTick: number;
    settled: boolean;
    settlementPriceD18: bigint;
    pool: Pool;
    liquidity: string;
};

declare const RESOURCE_ORDER: readonly ["ethereum-gas", "base-gas", "arbitrum-gas", "ethereum-blobspace", "celestia-blobspace", "bitcoin-fees"];
type ResourceSlug = (typeof RESOURCE_ORDER)[number];

export { ChartType, LineType, type Market, type MarketGroup, type MarketGroupParams, type MarketsApiResponse, RESOURCE_ORDER, type ResourceSlug, TimeInterval, TimeWindow };
