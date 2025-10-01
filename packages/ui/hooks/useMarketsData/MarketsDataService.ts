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

// Focus areas with their colors - matching the constants from the main app
const FOCUS_AREAS = [
  {
    id: "economy-finance",
    name: "Economy & Finance",
    color: "#4ADE80", // green-400
  },
  {
    id: "crypto",
    name: "Crypto",
    color: "#C084FC", // purple-400
  },
  {
    id: "weather",
    name: "Weather",
    color: "#93C5FD", // blue-300
  },
  {
    id: "geopolitics",
    name: "Geopolitics",
    color: "#F87171", // red-400
  },
  {
    id: "tech-science",
    name: "Tech & Science",
    color: "#FBBF24", // amber-400
  },
  {
    id: "sports",
    name: "Sports",
    color: "#F97316", // orange-500
  },
  {
    id: "culture",
    name: "Culture",
    color: "#D946EF", // fuchsia-500
  },
];

// Helper function to get color for a category slug
const getCategoryColor = (categorySlug: string): string => {
  // First try to find a matching focus area
  const focusArea = FOCUS_AREAS.find((fa) => fa.id === categorySlug);

  if (focusArea) {
    return focusArea.color;
  }

  // If no matching focus area, create a deterministic color based on the slug
  // This ensures the same category always gets the same color
  const DEFAULT_COLORS = [
    "#3B82F6", // blue-500
    "#C084FC", // purple-400
    "#4ADE80", // green-400
    "#FBBF24", // amber-400
    "#F87171", // red-400
    "#22D3EE", // cyan-400
    "#FB923C", // orange-400
  ];

  // Use a simple hash function to get a consistent index
  const hashCode = categorySlug.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + (acc * 32 - acc);
  }, 0);

  const colorIndex = Math.abs(hashCode) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[colorIndex];
};

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

      const result = {
        ...marketGroupsResult,
        ...conditionsResult,
        lastUpdated: Date.now(),
      };

      return result;
    } catch (error) {
      console.error("Error in MarketsDataService.fetchAllData:", error);
      throw error;
    }
  }

  private async fetchMarketGroups(): Promise<MarketGroupType[]> {
    try {
      const data = await this.graphqlClient.request<{
        marketGroups: MarketGroupType[];
      }>(MARKETS_QUERY);
      console.log(
        "MarketsDataService: Market groups fetched:",
        data.marketGroups?.length || 0
      );
      return data.marketGroups || [];
    } catch (error) {
      console.error("MarketsDataService: Error fetching market groups:", error);
      throw error;
    }
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

    // Filter by search term
    const filteredBySearch = this.filterMarketsBySearchTerm(
      filteredByStatus,
      params.searchTerm
    );

    // Group by market group
    const groupedByMarketKey = this.groupMarketsByMarketKey(
      filteredBySearch,
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
    const result = marketGroups.flatMap((marketGroup) => {
      const allMarkets = marketGroup.markets || [];
      const validPoolAddressMarkets = allMarkets.filter((market) =>
        isAddress(market.poolAddress || "")
      );
      const validTimestampMarkets = validPoolAddressMarkets.filter(
        (market) =>
          typeof market.startTimestamp === "number" &&
          typeof market.endTimestamp === "number"
      );

      return validTimestampMarkets.map(
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

    return result;
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

  private filterMarketsBySearchTerm(
    markets: MarketWithContext[],
    searchTerm?: string
  ): MarketWithContext[] {
    if (!searchTerm) return markets;

    const lower = searchTerm.toLowerCase();

    return markets.filter((market) => {
      const haystacks: string[] = [];
      if (typeof market.question === "string") haystacks.push(market.question);
      if (typeof market.shortName === "string")
        haystacks.push(market.shortName);
      if (typeof market.optionName === "string")
        haystacks.push(market.optionName);
      if (typeof market.categorySlug === "string")
        haystacks.push(market.categorySlug);

      return haystacks.some((h) => h.toLowerCase().includes(lower));
    });
  }

  private groupMarketsByMarketKey(
    markets: MarketWithContext[],
    sourceMarketGroups: MarketGroupType[]
  ): Record<string, GroupedMarketGroup> {
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
          console.warn(
            "MarketsDataService: Skipping market group due to missing data:",
            {
              marketKey,
              marketName,
              collateralAsset,
              marketNameType: typeof marketName,
              collateralAssetType: typeof collateralAsset,
            }
          );
          return acc;
        }

        // Calculate display question
        const allMarketsInGroup = sourceMarketGroup?.markets || [];
        const marketWithQuestion =
          allMarketsInGroup.find((m) => !!m.question) || null;
        const displayQuestion =
          (marketWithQuestion && marketWithQuestion.question) ||
          sourceMarketGroup?.question ||
          "";

        // Calculate if any market is active (will be updated after markets are added)
        const isActive = false; // Will be calculated after markets are added

        // Calculate market classification based on number of markets
        // This will be updated after markets are added
        const marketClassification = undefined;

        // Get display unit from baseTokenName or quoteTokenName
        const displayUnit = sourceMarketGroup?.baseTokenName || "";

        // Get color based on category slug
        const color = getCategoryColor(market.categorySlug);

        acc[marketKey] = {
          key: marketKey,
          marketAddress: market.marketAddress,
          chainId: market.chainId,
          marketName,
          collateralAsset,
          color,
          categorySlug: market.categorySlug,
          categoryId: market.categoryId,
          marketQuestion: sourceMarketGroup?.question || null,
          markets: [],
          displayQuestion,
          isActive,
          marketClassification,
          displayUnit,
        };
      }

      acc[marketKey].markets.push(market);

      // Update isActive based on the current markets in the group
      const now = Math.floor(Date.now() / 1000);
      acc[marketKey].isActive = acc[marketKey].markets.some(
        (m) => typeof m.endTimestamp === "number" && now <= m.endTimestamp
      );

      // Calculate market classification based on number of markets
      const marketCount = acc[marketKey].markets.length;
      if (marketCount === 1) {
        acc[marketKey].marketClassification = "YES_NO";
      } else if (marketCount === 2) {
        acc[marketKey].marketClassification = "YES_NO";
      } else if (marketCount > 2) {
        acc[marketKey].marketClassification = "MULTIPLE_CHOICE";
      }

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
