import { useQuery } from "@tanstack/react-query";
import { createClient } from "../../lib/api";
import type {
  MarketsDataParams,
  MarketsDataResult,
} from "../../types/MarketsData";
import { MarketsDataService } from "./MarketsDataService";

/**
 * Hook for fetching and processing markets data (both Market Groups and Conditions)
 *
 * This hook provides a unified interface for:
 * - Market Groups (Order Book markets) with filtering, grouping, and sorting
 * - Conditions (RFQ/Parlay markets) with filtering, grouping, and sorting
 *
 * @param params - Configuration parameters for data fetching and filtering
 * @returns MarketsDataResult with processed data and loading states
 */
export function useMarketsData(params: MarketsDataParams) {
  const query = useQuery<MarketsDataResult, Error>({
    queryKey: ["marketsData", params],
    queryFn: async () => {
      const client = createClient();
      const service = new MarketsDataService(client);
      const result = await service.fetchAllData(params);
      return result;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    notifyOnChangeProps: ["data", "error", "isLoading"],
  });

  return query;
}

// Re-export types for external use
export type {
  MarketsDataParams,
  MarketsDataResult,
  GroupedMarketGroup,
} from "../../types/MarketsData";
