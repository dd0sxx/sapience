import { Prisma } from '../../generated/prisma';

// Define the type for MarketGroup with necessary includes
type MarketGroupWithRelations = Prisma.MarketGroupGetPayload<{
  include: {
    resource: true;
    market: true;
  };
}>;

export interface marketInfo {
  resourceSlug: string;
  marketGroupIdx: number;
  marketIdx: number;
  marketId: number;
  marketGroupAddress: string;
  marketGroupChainId: number;
  startTimestamp: number;
  endTimestamp: number;
  isCumulative: boolean;
}

export class marketInfoStore {
  private static instance: marketInfoStore;
  private marketInfoByIdx: Map<number, marketInfo> = new Map();

  private constructor() {}

  public static getInstance() {
    if (!this.instance) {
      this.instance = new marketInfoStore();
    }
    return this.instance;
  }

  public async updatemarketInfo(marketGroups: MarketGroupWithRelations[]) {
    console.log(
      `updatemarketInfo: MarketGroups.length: ${marketGroups.length}`
    );
    let _debugCounter = 0;
    for (const marketGroup of marketGroups) {
      // Add resource slug
      const resourceSlug = marketGroup.resource?.slug ?? 'no-resource';

      // Add market with extra data
      if (marketGroup.market) {
        _debugCounter += marketGroup.market.length;
        for (const market of marketGroup.market) {
          if (this.marketInfoByIdx.has(market.id) || !marketGroup.address) {
            continue;
          }
          this.marketInfoByIdx.set(market.id, {
            marketId: market.marketId,
            marketGroupIdx: marketGroup.id,
            marketIdx: market.id,
            resourceSlug,
            marketGroupAddress: marketGroup.address,
            marketGroupChainId: marketGroup.chainId,
            startTimestamp: market.startTimestamp ?? 0,
            endTimestamp: market.endTimestamp ?? 0,
            isCumulative: marketGroup.isCumulative ?? false,
          });
        }
      }
    }
    console.log(`updatemarketInfo: Markets counter: ${_debugCounter}`);
  }

  public getmarketInfo(marketId: number): marketInfo | undefined {
    return this.marketInfoByIdx.get(marketId);
  }

  public getmarketInfoByChainAndAddress(
    chainId: number,
    address: string,
    marketId: string
  ): marketInfo | undefined {
    for (const marketInfo of this.marketInfoByIdx.values()) {
      if (!marketInfo.marketGroupAddress || !address) {
        console.log(
          'getmarketInfoByChainAndAddress: debug statement',
          this.marketInfoByIdx,
          chainId,
          address,
          marketId
        );
      }
      if (
        marketInfo.marketGroupChainId === chainId &&
        marketInfo.marketGroupAddress &&
        marketInfo.marketGroupAddress.toLowerCase() === address.toLowerCase() &&
        marketInfo.marketId === Number(marketId)
      ) {
        return marketInfo;
      }
    }
    return undefined;
  }

  public getAllMarketIndexes(): number[] {
    return Array.from(this.marketInfoByIdx.keys());
  }

  public getAllMarketIndexesByResourceSlug(resourceSlug: string): number[] {
    return Array.from(this.marketInfoByIdx.values())
      .filter((m) => m.resourceSlug === resourceSlug)
      .map((m) => m.marketIdx);
  }

  public getAllResourceSlugs(): string[] {
    return Array.from(this.marketInfoByIdx.values()).map((m) => m.resourceSlug);
  }

  public isMarketActive(marketId: number, timestamp: number): boolean {
    const marketInfo = this.marketInfoByIdx.get(marketId);
    if (!marketInfo) return false;

    return (
      timestamp >= marketInfo.startTimestamp &&
      (marketInfo.endTimestamp === 0 || timestamp <= marketInfo.endTimestamp)
    );
  }

  public getActiveMarkets(timestamp: number): number[] {
    return this.getAllMarketIndexes().filter((marketId) =>
      this.isMarketActive(marketId, timestamp)
    );
  }
}
