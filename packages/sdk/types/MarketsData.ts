import type {
  Market as MarketType,
  MarketGroup as MarketGroupType,
  Category as CategoryType,
  Condition as ConditionType,
} from "./graphql";

export type { MarketType, MarketGroupType, CategoryType, ConditionType };

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

  // Categories
  categories: CategoryType[];

  // Metadata
  lastUpdated: number;
}
