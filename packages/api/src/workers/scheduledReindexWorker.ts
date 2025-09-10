import 'reflect-metadata';
import { initializeDataSource } from '../db';
import { initializeFixtures } from '../fixtures';
import { createResilientProcess, getBlockByTimestamp, getProviderForChain } from '../utils/utils';
import prisma from '../db';
import { reindexMarket } from './jobs/reindexMarket';
import { reindexMarketGroupEvents } from '../controllers/market';
import { initializeMarket } from '../controllers/market';
import { INDEXERS } from '../fixtures';
import Sapience from '@sapience/protocol/deployments/Sapience.json';
import { Abi } from 'viem';

// Create a custom reindex function that only looks at recent events
async function reindexMarketGroupRecent(
  chainId: number,
  address: string,
  marketId: string,
  lookbackMinutes: number
) {
  try {
    console.log(
      `Reindexing recent events for market group ${address} on chain ${chainId} (last ${lookbackMinutes} minutes)`
    );

    // Find the market in the database
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

    // Create a market info object
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

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const lookbackTimestamp = currentTimestamp - (lookbackMinutes * 60);

    // Get the client for this chain
    const client = getProviderForChain(chainId);

    // Get the block number for the lookback timestamp
    let startBlock;
    try {
      const startBlockData = await getBlockByTimestamp(client, lookbackTimestamp);
      startBlock = Number(startBlockData.number);
    } catch (error) {
      console.warn(`Could not find block for timestamp ${lookbackTimestamp}, using recent blocks`);
      // Fallback: use recent blocks (estimate ~12 second block time)
      const currentBlockNumber = await client.getBlockNumber();
      const estimatedBlocksBack = Math.ceil((lookbackMinutes * 60) / 12);
      startBlock = Math.max(0, Number(currentBlockNumber) - estimatedBlocksBack);
    }

    const originalDeployTxnBlockNumber = market.deployTxnBlockNumber;
    market.deployTxnBlockNumber = startBlock;

    console.log(`Reindexing from block ${startBlock} (${lookbackMinutes} minutes ago)`);

 
    await reindexMarketGroupEvents(market);

    market.deployTxnBlockNumber = originalDeployTxnBlockNumber;

    console.log(`Completed recent reindex for market group ${address}`);
  } catch (error) {
    console.error(`Error in reindexMarketGroupRecent:`, error);
    throw error;
  }
}

async function runScheduledReindex(intervalMinutes: number) {
  await initializeDataSource();
  await initializeFixtures();

  // Calculate lookback window (interval + 5 minute buffer to ensure we don't miss anything)
  const lookbackMinutes = intervalMinutes + 2;

  while (true) {
    try {
      console.log(`Running recent market reindex at ${new Date().toISOString()}`);
      console.log(`Reindexing last ${lookbackMinutes} minutes of events (${intervalMinutes}min interval + 5min buffer)`);
      
      const marketGroups = await prisma.marketGroup.findMany({
        include: { market: true },
      });

      console.log(`Found ${marketGroups.length} market groups to reindex`);

     
      for (const marketGroup of marketGroups) {
        if (!marketGroup.address) continue;
        
        try {
          console.log(`Reindexing recent events for market group ${marketGroup.address} on chain ${marketGroup.chainId}`);
          
      
          const marketId = marketGroup.market[0]?.id?.toString() || '0';
          
          await reindexMarketGroupRecent(
            marketGroup.chainId, 
            marketGroup.address, 
            marketId,
            lookbackMinutes
          );
          console.log(`Completed market group ${marketGroup.address}`);
        } catch (error) {
          console.error(`Failed to reindex market group ${marketGroup.address}:`, error);
         
        }
      }
      
      console.log(`Recent market reindex completed at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Error in market reindex:', error);
    }

    // Wait for the specified interval
    await new Promise((resolve) => setTimeout(resolve, intervalMinutes * 60 * 1000));
  }
}

// Handle command line arguments
async function handleWorkerCommands(args: string[]): Promise<boolean> {
  if (args.length <= 2) return false;

  const command = args[2];

  if (command === 'market-reindex') {
    // Get interval from command line, default to 60 minutes if not specified
    const intervalMinutes = parseInt(args[3] || '60', 10);
    if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
      console.error(
        'Invalid interval specified. Please provide a positive number of minutes.'
      );
      return true;
    }

    console.log(
      `Starting market reindex worker with ${intervalMinutes} minute interval`
    );
    await createResilientProcess(
      () => runScheduledReindex(intervalMinutes),
      'scheduledReindexWorker'
    )();
    return true;
  }

  return false;
}

// Start the worker
(async () => {
  const workerHandled = await handleWorkerCommands(process.argv);

  if (!workerHandled) {
    console.log('Starting market reindex worker with default 60 minute interval');
    await createResilientProcess(
      () => runScheduledReindex(30),
      'scheduledReindexWorker'
    )();
  }
})();
