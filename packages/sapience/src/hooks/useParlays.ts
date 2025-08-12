import { useEffect, useMemo, useState } from 'react';
import type { Address } from 'viem';
import { erc20Abi, formatUnits } from 'viem';
import type { Abi } from 'abitype';
import ParlayPool from '@/protocol/deployments/ParlayPool.json';
import { usePublicClient, useReadContracts } from 'wagmi';

// TODO: centralize these in a shared constants module if needed
export const PARLAY_CONTRACT_ADDRESS =
  '0x918e72DAB2aF7672AbF534F744770D7F8859C55e' as Address;

// Use ABI from deployments directly (now includes all required functions)
const PARLAY_ABI: Abi = (ParlayPool as { abi: Abi }).abi;

export type ParlayMarket = {
  marketGroup: Address;
  marketId: bigint;
};

export type ParlayPredictedOutcome = {
  market: ParlayMarket;
  prediction: boolean;
};

export type ParlayData = {
  id: bigint;
  maker: Address;
  taker: Address;
  orderExpirationTime: bigint;
  filled: boolean;
  makerNftTokenId: bigint;
  takerNftTokenId: bigint;
  collateral: bigint;
  payout: bigint;
  createdAt: bigint;
  settled: boolean;
  makerWon: boolean;
  predictedOutcomes: ParlayPredictedOutcome[];
};

type UseParlaysOptions = { chainId?: number };

export function useParlays(options: UseParlaysOptions = {}) {
  // Always default to Arbitrum (42161) for reads unless explicitly overridden
  const activeChainId = options.chainId ?? 42161;
  const publicClient = usePublicClient({ chainId: activeChainId });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [probedIds, setProbedIds] = useState<bigint[]>([]);
  const [probeCursor, setProbeCursor] = useState<bigint>(1n);
  const [doneProbing, setDoneProbing] = useState<boolean>(false);

  // Probe for existing request IDs using read-only calls in ascending chunks
  useEffect(() => {
    let cancelled = false;
    if (!publicClient || doneProbing) return;

    async function probeChunk(
      client: NonNullable<typeof publicClient>,
      start: bigint,
      chunkSize = 25n
    ) {
      setLoading(true);
      setError(null);
      const end = start + chunkSize - 1n;
      try {
        const calls = [] as Array<
          Parameters<(typeof client)['readContract']>[0]
        >;
        for (let id = start; id <= end; id++) {
          calls.push({
            address: PARLAY_CONTRACT_ADDRESS,
            abi: PARLAY_ABI,
            functionName: 'getParlayOrder',
            args: [id],
          });
        }
        const results = await Promise.all(
          calls.map((c) => client.readContract(c))
        );

        const found: bigint[] = [];
        let hitEmptyTail = false;
        results.forEach((res, idx) => {
          try {
            const [parlayData] = res as [
              {
                maker: string;
              },
            ];
            const requestId = start + BigInt(idx);
            // Heuristic: exists if maker != 0x0
            if (
              parlayData &&
              parlayData.maker &&
              parlayData.maker !== '0x0000000000000000000000000000000000000000'
            ) {
              found.push(requestId);
            } else {
              hitEmptyTail = true;
            }
          } catch {
            hitEmptyTail = true;
          }
        });

        if (!cancelled) {
          setProbedIds((prev) => {
            const merged = new Set(prev.concat(found));
            return Array.from(merged).sort((a, b) => (a > b ? -1 : 1));
          });
          if (hitEmptyTail) {
            setDoneProbing(true);
          } else {
            setProbeCursor(end + 1n);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to read parlays');
          setDoneProbing(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Kick a chunk probe
    void probeChunk(publicClient, probeCursor);
    return () => {
      cancelled = true;
    };
  }, [publicClient, probeCursor, doneProbing]);

  // Read unfilled order ids; falls back to probing if unavailable
  const unfilledRead = useReadContracts({
    contracts: [
      {
        address: PARLAY_CONTRACT_ADDRESS,
        abi: PARLAY_ABI,
        functionName: 'getUnfilledOrderIds',
        chainId: activeChainId,
      },
    ],
    query: { enabled: !!publicClient },
  });

  const unfilledIds: bigint[] = useMemo(() => {
    const item = unfilledRead.data?.[0];
    if (item && item.status === 'success') {
      const arr = item.result as bigint[];
      return Array.isArray(arr) ? arr : [];
    }
    return [];
  }, [unfilledRead.data]);

  const ids: bigint[] = useMemo(() => {
    return unfilledIds.length > 0 ? unfilledIds : probedIds;
  }, [unfilledIds, probedIds]);

  // Read config to discover collateral token for decimals
  const configRead = useReadContracts({
    contracts: [
      {
        address: PARLAY_CONTRACT_ADDRESS,
        abi: PARLAY_ABI,
        functionName: 'getConfig',
        chainId: activeChainId,
      },
    ],
    query: { enabled: !!publicClient },
  });

  const collateralToken = ((): Address | undefined => {
    const item = configRead.data?.[0];
    if (item && item.status === 'success') {
      const cfg = item.result as {
        collateralToken: Address;
      };
      return cfg.collateralToken;
    }
    return undefined;
  })();

  const decimalsRead = useReadContracts({
    contracts: collateralToken
      ? [
          {
            address: collateralToken,
            abi: erc20Abi,
            functionName: 'decimals',
            chainId: activeChainId,
          },
        ]
      : [],
    query: { enabled: !!collateralToken },
  });

  const tokenDecimals = useMemo(() => {
    const item = decimalsRead.data?.[0];
    if (item && item.status === 'success') {
      return Number(item.result as unknown as bigint);
    }
    return 18; // sensible default
  }, [decimalsRead.data]);

  // Batch read each parlay order by id
  const ordersRead = useReadContracts({
    contracts: ids.map((id) => ({
      address: PARLAY_CONTRACT_ADDRESS,
      abi: PARLAY_ABI,
      functionName: 'getParlayOrder',
      args: [id],
      chainId: activeChainId,
    })),
    query: { enabled: ids.length > 0 && !!publicClient },
  });

  const parlays: ParlayData[] = useMemo(() => {
    if (!ordersRead.data) return [];
    return ordersRead.data
      .map((entry, idx) => {
        if (entry.status !== 'success') return undefined;
        const [parlayData, predictedOutcomes] = entry.result as [
          {
            maker: Address;
            orderExpirationTime: bigint;
            filled: boolean;
            taker: Address;
            makerNftTokenId: bigint;
            takerNftTokenId: bigint;
            collateral: bigint;
            payout: bigint;
            createdAt: bigint;
            settled: boolean;
            makerWon: boolean;
          },
          ParlayPredictedOutcome[],
        ];
        return {
          id: ids[idx],
          maker: parlayData.maker,
          taker: parlayData.taker,
          orderExpirationTime: parlayData.orderExpirationTime,
          filled: parlayData.filled,
          makerNftTokenId: parlayData.makerNftTokenId,
          takerNftTokenId: parlayData.takerNftTokenId,
          collateral: parlayData.collateral,
          payout: parlayData.payout,
          createdAt: parlayData.createdAt,
          settled: parlayData.settled,
          makerWon: parlayData.makerWon,
          predictedOutcomes,
        } satisfies ParlayData;
      })
      .filter(Boolean) as ParlayData[];
  }, [ordersRead.data, ids]);

  const formatted = useMemo(
    () =>
      parlays.map((p) => ({
        ...p,
        collateralFormatted: formatUnits(p.collateral, tokenDecimals),
        payoutFormatted: formatUnits(p.payout, tokenDecimals),
      })),
    [parlays, tokenDecimals]
  );

  return {
    loading:
      loading ||
      ordersRead.isLoading ||
      configRead.isLoading ||
      unfilledRead.isLoading,
    error:
      error ||
      ordersRead.error?.message ||
      configRead.error?.message ||
      unfilledRead.error?.message ||
      null,
    parlays: formatted,
    tokenDecimals,
    collateralToken,
    // Expose raw unfilled IDs for troubleshooting/visibility
    unfilledIds,
  };
}
