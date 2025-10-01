import type {
  Market as MarketType,
  MarketGroup as MarketGroupType,
  Category as CategoryType,
  Condition as ConditionType,
} from "./graphql";

// Re-export GraphQL types for convenience
export type { MarketType, MarketGroupType, CategoryType, ConditionType };

// Internal types for the markets data service
export interface MarketWithContext extends MarketType {
  marketAddress: string;
  chainId: number;
  collateralAsset: string;
  categorySlug: string;
  categoryId: string;
}

export interface GroupedMarketGroup {
  key: string;
  marketAddress: string;
  chainId: number;
  marketName: string;
  collateralAsset: string;
  color: string;
  categorySlug: string;
  categoryId: string;
  marketQuestion?: string | null;
  markets: MarketWithContext[];
  displayQuestion?: string;
  isActive?: boolean;
  marketClassification?: string;
  displayUnit?: string;
}

export interface MarketsDataParams {
  // Market Groups filters
  selectedCategorySlug?: string | null;
  statusFilter: "all" | "active";
  searchTerm?: string;

  // Conditions filters
  conditionsTake?: number;
  conditionsSkip?: number;
}

export interface MarketsDataResult {
  // Market Groups (Order Book)
  groupedMarketGroups: GroupedMarketGroup[];
  marketGroupsByDay: Record<string, GroupedMarketGroup[]>;
  sortedMarketDays: string[];

  // Conditions (RFQ/Parlay)
  filteredConditions: ConditionType[];
  conditionsByDay: Record<string, ConditionType[]>;
  sortedConditionDays: string[];

  // Metadata
  lastUpdated: number;
}
