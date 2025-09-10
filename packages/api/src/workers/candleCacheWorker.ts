import 'reflect-metadata';
import { initializeDataSource } from '../db';
import { initializeFixtures } from '../fixtures';
import { CandleCacheBuilder } from '../candle-cache/candleCacheBuilder';
import {
  createResilientProcess,
  getBlockByTimestamp,
  getProviderForChain,
} from '../utils/utils';
import prisma from '../db';
import { reindexMarketGroupEvents } from '../controllers/market';
import { initializeMarket } from '../controllers/market';
import { INDEXERS } from '../fixtures';
import Sapience from '@sapience/protocol/deployments/Sapience.json';
import { Abi } from 'viem';
import { PnlAccuracyReconciler } from '../precompute/reconciler';

// Track markets with recent trading activity for targeted reindexing
const activeIndividualMarkets: Map<
  string,
  {
    marketId: number;
    chainId: number;
    marketGroupAddress: string;
    lastActivity: number;
  }
> = new Map();
let lastCandleBuildTime: number = 0;

async function runCandleCacheBuilder(intervalSeconds: number) {
  await initializeDataSource();
  await initializeFixtures();

  const candleCacheBuilder = CandleCacheBuilder.getInstance();
  const reconciler = PnlAccuracyReconciler.getInstance();

  while (true) {
    const cycleStartTime = Date.now();

    try {
      console.log(`Running candle cache update at ${new Date().toISOString()}`);

      // Build candles and detect which markets have new trading activity
      await buildCandlesAndDetectActivity(candleCacheBuilder);

      // After candle build, run synchronous precompute reconciliation
      console.log('[CANDLE_CACHE] Starting PnL/accuracy reconciliation...');
      await reconciler.runOnce();
      console.log('[CANDLE_CACHE] PnL/accuracy reconciliation completed');

      // Reindex only market groups that have active trading
      const reindexedCount = await reindexActiveIndividualMarkets(
        intervalSeconds + 10
      );

      console.log(
        `Candle cache update completed at ${new Date().toISOString()}`
      );

      // Log cycle summary for monitoring
      const totalDuration = Date.now() - cycleStartTime;
      const totalSeconds = (totalDuration / 1000).toFixed(1);

      if (reindexedCount > 0 || totalDuration > 5000) {
        console.log(
          `Cycle: ${totalSeconds}s | Groups: ${reindexedCount} | Tracked: ${activeIndividualMarkets.size}`
        );

        if (totalDuration > intervalSeconds * 1000) {
          console.warn(
            `Cycle exceeded interval: ${totalSeconds}s > ${intervalSeconds}s`
          );
        }
      }
    } catch (error) {
      const cycleDuration = Date.now() - cycleStartTime;
      console.error(`Error in cycle (${cycleDuration}ms):`, error);
    }

    // Wait for next cycle
    await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
  }
}

async function buildCandlesAndDetectActivity(
  candleCacheBuilder: CandleCacheBuilder
) {
  // Build candles and process market prices
  await candleCacheBuilder.buildCandles();

  // Small buffer to catch concurrent trades
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const buildEndTime = Math.floor(Date.now() / 1000);

  // Query for market prices created since last cycle (with overlap for safety)
  const queryStartTime = lastCandleBuildTime > 0 ? lastCandleBuildTime - 5 : 0;

  const recentMarketPrices = await prisma.marketPrice.findMany({
    where: {
      timestamp: {
        gt: BigInt(queryStartTime.toString()),
        lte: BigInt(buildEndTime.toString()),
      },
    },
    include: {
      transaction: {
        include: {
          position: {
            include: {
              market: {
                include: {
                  market_group: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Process market prices to identify active markets
  for (const price of recentMarketPrices) {
    if (!price.transaction?.position?.market?.market_group?.address) {
      continue;
    }

    const market = price.transaction.position.market;
    const marketGroup = market.market_group!;
    const key = `${marketGroup.chainId}:${marketGroup.address!}:${market.id}`;

    // Track this market as recently active
    activeIndividualMarkets.set(key, {
      marketId: market.id,
      chainId: marketGroup.chainId,
      marketGroupAddress: marketGroup.address!,
      lastActivity: Number(price.timestamp),
    });
  }

  // Development debugging only
  if (process.env.NODE_ENV === 'development') {
    const recentEvents = await prisma.event.findMany({
      where: {
        timestamp: {
          gt: BigInt(queryStartTime.toString()),
          lte: BigInt(buildEndTime.toString()),
        },
      },
      include: { market_group: true },
    });

    const tradeEvents = recentEvents.filter((e) => {
      if (!e.logData || typeof e.logData !== 'object') return false;
      const eventData = e.logData as { eventName?: string };
      return (
        eventData.eventName === 'TraderPositionCreated' ||
        eventData.eventName === 'TraderPositionModified'
      );
    });

    if (tradeEvents.length > recentMarketPrices.length) {
      console.warn(
        `Event/Price mismatch: ${tradeEvents.length} events, ${recentMarketPrices.length} prices`
      );
    }
  }

  // Fallback: catch any very recent trades that might have been missed
  const veryRecentPrices = await prisma.marketPrice.findMany({
    where: {
      timestamp: {
        gt: BigInt((buildEndTime - 30).toString()),
      },
    },
    include: {
      transaction: {
        include: {
          position: {
            include: {
              market: {
                include: {
                  market_group: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Add any missed markets to tracking
  let additionalMarkets = 0;
  for (const price of veryRecentPrices) {
    if (!price.transaction?.position?.market?.market_group?.address) continue;

    const market = price.transaction.position.market;
    const marketGroup = market.market_group!;
    const key = `${marketGroup.chainId}:${marketGroup.address!}:${market.id}`;

    const existing = activeIndividualMarkets.get(key);
    if (!existing || existing.lastActivity < Number(price.timestamp)) {
      activeIndividualMarkets.set(key, {
        marketId: market.id,
        chainId: marketGroup.chainId,
        marketGroupAddress: marketGroup.address!,
        lastActivity: Number(price.timestamp),
      });

      if (!existing) {
        additionalMarkets++;
      }
    }
  }

  // Log activity when detected
  if (recentMarketPrices.length > 0) {
    const marketIds = Array.from(
      new Set(
        recentMarketPrices
          .filter((p) => p.transaction?.position?.market)
          .map((p) => p.transaction!.position!.market!.id)
      )
    );

    const suffix =
      additionalMarkets > 0 ? ` (+${additionalMarkets} recent)` : '';
    console.log(
      `Activity: ${recentMarketPrices.length} prices, markets [${marketIds.join(', ')}]${suffix}`
    );
  }

  lastCandleBuildTime = buildEndTime;
}

async function reindexActiveIndividualMarkets(
  lookbackSeconds: number
): Promise<number> {
  const currentTime = Math.floor(Date.now() / 1000);
  const cutoffTime = currentTime - lookbackSeconds;

  // Get markets that have been active recently
  const recentActiveMarkets = Array.from(activeIndividualMarkets.entries())
    .filter(([, info]) => info.lastActivity >= cutoffTime)
    .map(([, info]) => info);

  // Group by market group to avoid duplicate reindexing
  const marketGroupsToReindex = new Map<
    string,
    { chainId: number; address: string; activeMarkets: number[] }
  >();

  for (const marketInfo of recentActiveMarkets) {
    const groupKey = `${marketInfo.chainId}:${marketInfo.marketGroupAddress}`;

    if (!marketGroupsToReindex.has(groupKey)) {
      marketGroupsToReindex.set(groupKey, {
        chainId: marketInfo.chainId,
        address: marketInfo.marketGroupAddress,
        activeMarkets: [],
      });
    }

    marketGroupsToReindex
      .get(groupKey)!
      .activeMarkets.push(marketInfo.marketId);
  }

  // Process each active market group
  let processedCount = 0;
  for (const [, groupInfo] of marketGroupsToReindex) {
    try {
      await reindexSpecificMarket(
        groupInfo.chainId,
        groupInfo.address,
        groupInfo.activeMarkets[0].toString(),
        Math.ceil(lookbackSeconds / 60)
      );

      processedCount++;
    } catch (error) {
      console.error(`Failed to reindex ${groupInfo.address}:`, error);
    }
  }

  // Clean up inactive markets from memory
  const oldCutoff = currentTime - 3600;
  for (const [key, info] of activeIndividualMarkets.entries()) {
    if (info.lastActivity < oldCutoff) {
      activeIndividualMarkets.delete(key);
    }
  }

  return processedCount;
}

// Reindex a market group with recent activity
async function reindexSpecificMarket(
  chainId: number,
  address: string,
  marketId: string,
  lookbackMinutes: number
) {
  // Get market group details from database
  const marketEntity = await prisma.marketGroup.findFirst({
    where: {
      chainId,
      address: address.toLowerCase(),
    },
    include: {
      resource: true,
    },
  });

  if (!marketEntity) {
    throw new Error(
      `Market not found for chainId ${chainId} and address ${address}`
    );
  }

  // Initialize market for reindexing
  const marketInfo = {
    marketChainId: chainId,
    deployment: {
      address,
      abi: Sapience.abi as Abi,
      deployTimestamp: marketEntity.deployTimestamp?.toString() || '0',
      deployTxnBlockNumber:
        marketEntity.deployTxnBlockNumber?.toString() || '0',
    },
    isCumulative: marketEntity.isCumulative || false,
    isBridged: marketEntity.isBridged || false,
    resource: {
      name: marketEntity.resource?.name,
      priceIndexer: marketEntity.resource
        ? INDEXERS[marketEntity.resource.slug]
        : null,
    },
  };

  const market = await initializeMarket(marketInfo);

  // Calculate recent block range for reindexing
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const lookbackTimestamp = currentTimestamp - lookbackMinutes * 60;
  const client = getProviderForChain(chainId);

  let startBlock;
  try {
    const startBlockData = await getBlockByTimestamp(client, lookbackTimestamp);
    startBlock = Number(startBlockData.number);
  } catch {
    // Fallback: estimate blocks using average block time
    const currentBlockNumber = await client.getBlockNumber();
    const estimatedBlocksBack = Math.ceil((lookbackMinutes * 60) / 12);
    startBlock = Math.max(0, Number(currentBlockNumber) - estimatedBlocksBack);
  }

  // Temporarily set start block for recent reindexing
  const originalDeployTxnBlockNumber = market.deployTxnBlockNumber;
  market.deployTxnBlockNumber = startBlock;

  // Reindex recent events for this market group
  await reindexMarketGroupEvents(market);

  // Restore original block number
  market.deployTxnBlockNumber = originalDeployTxnBlockNumber;
}

// Command line argument handling
async function handleWorkerCommands(args: string[]): Promise<boolean> {
  if (args.length <= 2) return false;

  const command = args[2];

  if (command === 'candle-cache') {
    const intervalSeconds = parseInt(args[3] || '15', 10);
    if (isNaN(intervalSeconds) || intervalSeconds <= 0) {
      console.error('Invalid interval. Provide positive number of seconds.');
      return true;
    }

    console.log(
      `Starting candle cache worker with smart reindexing (${intervalSeconds}s interval)`
    );
    await createResilientProcess(
      () => runCandleCacheBuilder(intervalSeconds),
      'candleCacheBuilder'
    )();
    return true;
  }

  return false;
}

// Start the worker
(async () => {
  const workerHandled = await handleWorkerCommands(process.argv);
  // If no worker command was handled, proceed with the default main logic
  if (!workerHandled) {
    console.log(
      'Starting candle cache worker with smart reindexing (15s interval)'
    );
    await createResilientProcess(
      () => runCandleCacheBuilder(15),
      'candleCacheBuilder'
    )();
  }
})();
