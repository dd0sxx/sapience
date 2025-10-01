import type { GraphQLClient } from "graphql-request";
import { isAddress } from "viem";

import type {
  MarketGroupType,
  CategoryType,
  ConditionType,
  MarketWithContext,
  GroupedMarketGroup,
  MarketsDataParams,
  MarketsDataResult,
} from "../../types/MarketsData";
import { GET_CATEGORIES, GET_CONDITIONS, MARKETS_QUERY } from "./queries";

export class MarketsDataService {
  constructor(private graphqlClient: GraphQLClient) {}

  async fetchAllData(params: MarketsDataParams): Promise<MarketsDataResult> {
    try {
      const [marketGroups, conditions, categories] = await Promise.all([
        this.fetchMarketGroups(),
        this.fetchConditions(
          params.conditionsTake || 200,
          params.conditionsSkip || 0
        ),
        this.fetchCategories(),
      ]);

      const marketGroupsResult = this.processMarketGroupsData(
        marketGroups,
        categories,
        params
      );

      const conditionsResult = this.processConditionsData(conditions, params);

      return {
        ...marketGroupsResult,
        ...conditionsResult,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error("Error in MarketsDataService.fetchAllData:", error);
      throw error;
    }
  }

  private async fetchMarketGroups(): Promise<MarketGroupType[]> {
    const data = await this.graphqlClient.request<{
      marketGroups: MarketGroupType[];
    }>(MARKETS_QUERY);
    return data.marketGroups || [];
  }

  private async fetchConditions(
    take: number,
    skip: number
  ): Promise<ConditionType[]> {
    const data = await this.graphqlClient.request<{
      conditions: ConditionType[];
    }>(GET_CONDITIONS, {
      take,
      skip,
    });
    return data.conditions || [];
  }

  private async fetchCategories(): Promise<CategoryType[]> {
    const data = await this.graphqlClient.request<{
      categories: CategoryType[];
    }>(GET_CATEGORIES);
    return data.categories || [];
  }

  private processMarketGroupsData(
    marketGroups: MarketGroupType[],
    _categories: CategoryType[],
    params: MarketsDataParams
  ) {
    // Filter by category
    const filteredByCategory = this.filterMarketGroupsByCategory(
      marketGroups,
      params.selectedCategorySlug
    );

    // Flatten and enrich markets
    const allMarkets = this.flattenAndEnrichMarkets(filteredByCategory);

    // Filter by status
    const filteredByStatus = this.filterMarketsByStatus(
      allMarkets,
      params.statusFilter
    );

    // Group by market group
    const groupedByMarketKey = this.groupMarketsByMarketKey(
      filteredByStatus,
      filteredByCategory
    );

    // Group by day
    const marketGroupsByDay = this.groupMarketGroupsByDay(
      Object.values(groupedByMarketKey)
    );

    // Sort days
    const sortedMarketDays = this.sortMarketDays(
      marketGroupsByDay,
      params.statusFilter
    );

    return {
      groupedMarketGroups: Object.values(groupedByMarketKey),
      marketGroupsByDay,
      sortedMarketDays,
    };
  }

  private processConditionsData(
    conditions: ConditionType[],
    params: MarketsDataParams
  ) {
    // 1. Filter conditions
    const filteredConditions = this.filterConditions(conditions, params);

    // 2. Group by day
    const conditionsByDay = this.groupConditionsByDay(filteredConditions);

    // 3. Sort days
    const sortedConditionDays = this.sortConditionDays(
      conditionsByDay,
      params.statusFilter
    );

    return {
      filteredConditions,
      conditionsByDay,
      sortedConditionDays,
    };
  }

  private filterMarketGroupsByCategory(
    marketGroups: MarketGroupType[],
    selectedCategorySlug?: string | null
  ): MarketGroupType[] {
    if (!selectedCategorySlug) return marketGroups;

    return marketGroups.filter((marketGroup) => {
      const hasAddress = isAddress(marketGroup.address || "");

      const hasDeployedMarkets = Array.isArray(marketGroup.markets)
        ? marketGroup.markets.some((m) => isAddress(m.poolAddress || ""))
        : false;

      if (!hasAddress || !hasDeployedMarkets) return false;

      const marketSlug = marketGroup.category?.slug;
      return marketSlug === selectedCategorySlug;
    });
  }

  private flattenAndEnrichMarkets(
    marketGroups: MarketGroupType[]
  ): MarketWithContext[] {
    return marketGroups.flatMap((marketGroup) => {
      return marketGroup.markets
        .filter((market) => isAddress(market.poolAddress || ""))
        .filter(
          (market) =>
            typeof market.startTimestamp === "number" &&
            typeof market.endTimestamp === "number"
        )
        .map(
          (market): MarketWithContext => ({
            ...market,
            startTimestamp: market.startTimestamp,
            endTimestamp: market.endTimestamp,
            marketAddress: marketGroup.address!,
            chainId: marketGroup.chainId,
            collateralAsset: marketGroup.collateralAsset!,
            categorySlug: marketGroup.category!.slug,
            categoryId: marketGroup.category!.id.toString(),
          })
        );
    });
  }

  private filterMarketsByStatus(
    markets: MarketWithContext[],
    statusFilter: "all" | "active"
  ): MarketWithContext[] {
    const now = Math.floor(Date.now() / 1000);

    return markets.filter((market) => {
      if (typeof market.endTimestamp !== "number" || market.endTimestamp <= 0) {
        return false;
      }
      if (!market.public) return false;

      if (statusFilter === "active") {
        return now <= market.endTimestamp;
      }

      return true; // 'all' status includes everything public
    });
  }

  private groupMarketsByMarketKey(
    markets: MarketWithContext[],
    sourceMarketGroups: MarketGroupType[]
  ): Record<string, GroupedMarketGroup> {
    const DEFAULT_CATEGORY_COLOR = "#9CA3AF";

    return markets.reduce<Record<string, GroupedMarketGroup>>((acc, market) => {
      const marketKey = `${market.chainId}:${market.marketAddress}`;

      if (!acc[marketKey]) {
        const sourceMarketGroup = sourceMarketGroups.find(
          (m) => `${m.chainId}:${m.address}` === marketKey
        );

        const marketName = sourceMarketGroup?.category?.name;
        const { collateralAsset } = market;

        if (
          typeof marketName !== "string" ||
          typeof collateralAsset !== "string"
        ) {
          return acc;
        }

        acc[marketKey] = {
          key: marketKey,
          marketAddress: market.marketAddress,
          chainId: market.chainId,
          marketName,
          collateralAsset,
          color: DEFAULT_CATEGORY_COLOR, // Will be enhanced later with focus areas
          categorySlug: market.categorySlug,
          categoryId: market.categoryId,
          marketQuestion: sourceMarketGroup?.question || null,
          markets: [],
          displayQuestion: undefined,
          isActive: undefined,
          marketClassification: undefined,
          displayUnit: undefined,
        };
      }

      acc[marketKey].markets.push(market);
      return acc;
    }, {});
  }

  private groupMarketGroupsByDay(
    marketGroups: GroupedMarketGroup[]
  ): Record<string, GroupedMarketGroup[]> {
    return marketGroups.reduce<Record<string, GroupedMarketGroup[]>>(
      (acc, group) => {
        // Find the latest end time for this group
        const latestEndTime = group.markets.reduce((latest, market) => {
          return Math.max(latest, market.endTimestamp || 0);
        }, 0);

        const dayKey =
          latestEndTime > 0 ? this.getDayKey(latestEndTime) : "No end time";

        if (!acc[dayKey]) {
          acc[dayKey] = [];
        }
        acc[dayKey].push(group);

        return acc;
      },
      {}
    );
  }

  private sortMarketDays(
    marketGroupsByDay: Record<string, GroupedMarketGroup[]>,
    statusFilter: "all" | "active"
  ): string[] {
    const dayEndTimes: Record<string, number> = {};

    Object.entries(marketGroupsByDay).forEach(([dayKey, groups]) => {
      const withEnds = groups.filter((group) =>
        group.markets.some(
          (m) => typeof m.endTimestamp === "number" && m.endTimestamp > 0
        )
      );

      if (withEnds.length > 0) {
        const endTimes = withEnds.flatMap((group) =>
          group.markets.map((m) => m.endTimestamp || 0).filter((t) => t > 0)
        );

        if (statusFilter === "all") {
          dayEndTimes[dayKey] = Math.max(...endTimes);
        } else {
          dayEndTimes[dayKey] = Math.min(...endTimes);
        }
      } else {
        dayEndTimes[dayKey] = Math.floor(Date.now() / 1000);
      }
    });

    return Object.keys(marketGroupsByDay).sort((a, b) => {
      const timeA = dayEndTimes[a] ?? 0;
      const timeB = dayEndTimes[b] ?? 0;
      return statusFilter === "all" ? timeB - timeA : timeA - timeB;
    });
  }

  private filterConditions(
    conditions: ConditionType[],
    params: MarketsDataParams
  ): ConditionType[] {
    const publicConditions = conditions.filter((c) => c.public);
    if (publicConditions.length === 0) return [];

    const nowSec = Math.floor(Date.now() / 1000);
    const lower = (params.searchTerm || "").toLowerCase();

    return publicConditions.filter((c) => {
      // Filter by status
      if (
        params.statusFilter === "active" &&
        typeof c.endTime === "number" &&
        c.endTime > 0 &&
        c.endTime <= nowSec
      ) {
        return false;
      }

      // Filter by category
      if (
        params.selectedCategorySlug &&
        c.category?.slug !== params.selectedCategorySlug
      ) {
        return false;
      }

      // Filter by search term
      if (!lower) return true;

      const haystacks: string[] = [];
      if (typeof c.question === "string") haystacks.push(c.question);
      if (typeof c.claimStatement === "string")
        haystacks.push(c.claimStatement);
      if (typeof c.description === "string") haystacks.push(c.description);
      if (typeof c.category?.name === "string") haystacks.push(c.category.name);
      if (typeof c.category?.slug === "string") haystacks.push(c.category.slug);
      if (Array.isArray(c.similarMarkets)) haystacks.push(...c.similarMarkets);

      return haystacks.some((h) => h.toLowerCase().includes(lower));
    });
  }

  private groupConditionsByDay(
    conditions: ConditionType[]
  ): Record<string, ConditionType[]> {
    return conditions.reduce<Record<string, ConditionType[]>>((acc, c) => {
      const end = typeof c.endTime === "number" ? c.endTime : 0;
      const dayKey = end > 0 ? this.getDayKey(end) : "No end time";

      if (!acc[dayKey]) acc[dayKey] = [];
      acc[dayKey].push(c);

      return acc;
    }, {});
  }

  private sortConditionDays(
    conditionsByDay: Record<string, ConditionType[]>,
    statusFilter: "all" | "active"
  ): string[] {
    const dayEndTimes: Record<string, number> = {};

    Object.entries(conditionsByDay).forEach(([dayKey, list]) => {
      const withEnds = list.filter(
        (c) => typeof c.endTime === "number" && c.endTime > 0
      ) as Array<ConditionType & { endTime: number }>;

      if (withEnds.length > 0) {
        if (statusFilter === "all") {
          const latest = [...withEnds].sort((a, b) => b.endTime - a.endTime)[0]
            .endTime;
          dayEndTimes[dayKey] = latest;
        } else {
          const earliest = [...withEnds].sort(
            (a, b) => a.endTime - b.endTime
          )[0].endTime;
          dayEndTimes[dayKey] = earliest;
        }
      } else {
        dayEndTimes[dayKey] = Math.floor(Date.now() / 1000);
      }
    });

    return Object.keys(conditionsByDay).sort((a, b) => {
      const timeA = dayEndTimes[a] ?? 0;
      const timeB = dayEndTimes[b] ?? 0;
      return statusFilter === "all" ? timeB - timeA : timeA - timeB;
    });
  }

  private getDayKey(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }
}
