import prisma from '../../db';
import { getBlockByTimestamp, getProviderForChain } from '../../utils/utils';
import {
  type PublicClient,
  parseAbiItem,
  getContract,
  decodeAbiParameters,
  GetContractReturnType,
} from 'viem';
import Sentry from '../../instrument';
import { SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { IResourcePriceIndexer } from '../../interfaces';
import type { Resource } from '../../../generated/prisma';
import {
  upsertAttestationScoreFromAttestation,
  selectLatestPreEndForMarket,
} from '../../helpers/scoringService';

const BLOCK_BATCH_SIZE = 100;

// EAS contract addresses on different chains
const EAS_CONTRACTS = {
  1: '0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587', // Ethereum Mainnet
  11155111: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e', // Sepolia
  10: '0x4200000000000000000000000000000000000021', // Optimism
  8453: '0x4200000000000000000000000000000000000021', // Base
  42161: '0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458', // Arbitrum
  432: '0x1ABeF822A38CC8906557cD73788ab23A607ae104',
} as const;

const EAS_START_BLOCK = {
  1: 16756720,
  11155111: 2958570,
  10: 107476600,
  8453: 3701279,
  42161: 367337046,
  432: 1,
} as const; // FROM https://github.com/ethereum-attestation-service/eas-indexing-service/blob/master/utils.ts

// Your specific prediction market schema
const PREDICTION_MARKET_SCHEMA_ID =
  '0x2dbb0921fa38ebc044ab0a7fe109442c456fb9ad39a68ce0a32f193744d17744';
const schemaEncoder = new SchemaEncoder(
  'address marketAddress,uint256 marketId,bytes32 questionId,uint160 prediction,string comment'
);

// Schema for decoding prediction market data: address marketAddress, uint256 marketId, uint160 prediction, string comment
const PREDICTION_MARKET_SCHEMA = [
  { type: 'address', name: 'marketAddress' },
  { type: 'uint256', name: 'marketId' },
  { type: 'bytes32', name: 'questionId' },
  { type: 'uint160', name: 'prediction' },
  { type: 'string', name: 'comment' },
] as const;

// EAS ABI for attestation events and data fetching
const EAS_ABI = [
  {
    type: 'function',
    name: 'getAttestation',
    inputs: [
      {
        type: 'bytes32',
        name: 'uid',
      },
    ],
    outputs: [
      {
        type: 'tuple',
        components: [
          { type: 'bytes32', name: 'uid' },
          { type: 'bytes32', name: 'schema' },
          { type: 'uint64', name: 'time' },
          { type: 'uint64', name: 'expirationTime' },
          { type: 'uint64', name: 'revocationTime' },
          { type: 'bytes32', name: 'refUID' },
          { type: 'address', name: 'recipient' },
          { type: 'address', name: 'attester' },
          { type: 'bool', name: 'revocable' },
          { type: 'bytes', name: 'data' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;

const attestedEventSignature = parseAbiItem(
  'event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)'
);

interface AttestationData {
  uid: string;
  schema: string;
  time: bigint;
  recipient: string;
  attester: string;
  data: string;
}

interface PredictionMarketEvent {
  uid: string;
  schemaUID: string;
  attester: string;
  recipient: string;
  transactionHash: string;
  blockNumber: bigint;
  timestamp: number;
}

interface DecodedPredictionData {
  marketAddress: string;
  marketId: string;
  questionId: string;
  prediction: string;
  comment: string;
}

class EASPredictionIndexer implements IResourcePriceIndexer {
  public client: PublicClient;
  private isWatching: boolean = false;
  private chainId: number;
  private easStartBlock: number;
  private easContract: GetContractReturnType<
    typeof EAS_ABI,
    PublicClient,
    `0x${string}`
  >;

  constructor(chainId: number) {
    this.chainId = chainId;
    this.client = getProviderForChain(chainId);
    this.isWatching = false;

    const easAddress = EAS_CONTRACTS[chainId as keyof typeof EAS_CONTRACTS];
    if (!easAddress) {
      throw new Error(`EAS contract not available for chain ${chainId}`);
    }

    this.easStartBlock =
      EAS_START_BLOCK[chainId as keyof typeof EAS_START_BLOCK];
    if (this.easStartBlock === undefined) {
      this.easStartBlock = 0;
    }

    this.easContract = getContract({
      address: easAddress as `0x${string}`,
      abi: EAS_ABI,
      client: this.client,
    });
  }

  private async getAttestationData(
    uid: string
  ): Promise<AttestationData | null> {
    try {
      const result = (await this.easContract.read.getAttestation([
        uid as `0x${string}`,
      ])) as AttestationData;

      return {
        uid: result.uid,
        schema: result.schema,
        time: result.time,
        recipient: result.recipient,
        attester: result.attester,
        data: result.data,
      };
    } catch (error) {
      console.error(
        `[EASPredictionIndexer] Error fetching attestation data for ${uid}:`,
        error
      );
      return null;
    }
  }

  private decodePredictionMarketData(
    rawData: string
  ): DecodedPredictionData | null {
    try {
      if (!rawData || rawData === '0x') {
        return null;
      }

      const decoded = decodeAbiParameters(
        PREDICTION_MARKET_SCHEMA,
        rawData as `0x${string}`
      );

      return {
        marketAddress: decoded[0].toString(),
        marketId: decoded[1].toString(),
        questionId: decoded[2].toString(),
        prediction: decoded[3].toString(),
        comment: decoded[4].toString(),
      };
    } catch (error) {
      console.error(
        '[EASPredictionIndexer] Error decoding prediction market data:',
        error
      );
      return null;
    }
  }

  private async getPredictionMarketEventsForBlocks(
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<PredictionMarketEvent[]> {
    try {
      // Only get events for the prediction market schema
      const attestedLogs = await this.client.getLogs({
        address: EAS_CONTRACTS[
          this.chainId as keyof typeof EAS_CONTRACTS
        ] as `0x${string}`,
        event: attestedEventSignature,
        args: {
          schemaUID: PREDICTION_MARKET_SCHEMA_ID as `0x${string}`,
        },
        fromBlock: fromBlock,
        toBlock: toBlock,
      });

      const events: PredictionMarketEvent[] = [];

      for (const log of attestedLogs) {
        if (log.args.schemaUID !== PREDICTION_MARKET_SCHEMA_ID) {
          continue;
        }

        const block = await this.client.getBlock({
          blockNumber: log.blockNumber!,
        });
        events.push({
          uid: log.args.uid!,
          schemaUID: log.args.schemaUID!,
          attester: log.args.attester!,
          recipient: log.args.recipient!,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber!,
          timestamp: Number(block.timestamp),
        });
      }

      return events;
    } catch (error) {
      console.error(
        `[EASPredictionIndexer] Error fetching prediction market events from block ${fromBlock} to ${toBlock}:`,
        error
      );
      return [];
    }
  }

  private async storePredictionAttestation(
    event: PredictionMarketEvent
  ): Promise<void> {
    try {
      // Get full attestation data to decode the prediction
      const attestationData = await this.getAttestationData(event.uid);
      if (!attestationData) {
        console.warn(
          `[EASPredictionIndexer] Could not fetch attestation data for ${event.uid}`
        );
        return;
      }

      // Decode the prediction market data
      const decodedData = this.decodePredictionMarketData(attestationData.data);
      if (!decodedData) {
        console.warn(
          `[EASPredictionIndexer] Could not decode prediction data for ${event.uid}`
        );
        return;
      }

      const data = attestationData.data;
      const decodedDataJson = JSON.stringify(
        schemaEncoder.decodeData(data),
        (key, value) => (typeof value === 'bigint' ? value.toString() : value)
      );

      const att = await prisma.attestation.upsert({
        where: {
          uid: event.uid,
        },
        create: {
          uid: event.uid,
          attester: event.attester,
          recipient: event.recipient,
          time: event.timestamp,
          schemaId: event.schemaUID,
          blockNumber: Number(event.blockNumber),
          transactionHash: event.transactionHash,
          // AES Indexer backward compatibility
          data: data,
          decodedDataJson: decodedDataJson,
          // Exploded data
          marketAddress: decodedData.marketAddress,
          marketId: decodedData.marketId,
          questionId: decodedData.questionId,
          prediction: decodedData.prediction,
          comment: decodedData.comment || null,
        },
        update: {
          // AES Indexer backward compatibility
          data: data,
          decodedDataJson: decodedDataJson,
          // Exploded data
          marketAddress: decodedData.marketAddress,
          marketId: decodedData.marketId,
          questionId: decodedData.questionId,
          prediction: decodedData.prediction,
          comment: decodedData.comment || null,
        },
      });

      // Update per-attestation scoring info and selection
      await upsertAttestationScoreFromAttestation(att.id);
      await selectLatestPreEndForMarket(
        decodedData.marketAddress,
        decodedData.marketId
      );

      console.log(
        `[EASPredictionIndexer] Stored prediction attestation ${event.uid} for market ${decodedData.marketAddress} (questionId: ${decodedData.questionId}) with prediction ${decodedData.prediction}`
      );
    } catch (error) {
      console.error(
        `[EASPredictionIndexer] Error storing prediction attestation:`,
        error
      );
      Sentry.withScope((scope: Sentry.Scope) => {
        scope.setExtra('event', event);
        scope.setExtra('chainId', this.chainId);
        Sentry.captureException(error);
      });
    }
  }

  async indexBlockPriceFromTimestamp(
    resource: Resource,
    startTimestamp: number,
    endTimestamp?: number,
    overwriteExisting: boolean = false
  ): Promise<boolean> {
    try {
      console.log(
        `[EASPredictionIndexer] Indexing blocks from timestamp ${startTimestamp} to ${endTimestamp || 'latest'}`
      );

      // Use binary search to find the exact blocks for the timestamps
      const startBlock = await getBlockByTimestamp(this.client, startTimestamp);
      console.log(
        `[EASPredictionIndexer] Found start block: ${startBlock.number} at timestamp ${startBlock.timestamp}`
      );

      let endBlock;
      if (endTimestamp) {
        endBlock = await getBlockByTimestamp(this.client, endTimestamp);
        console.log(
          `[EASPredictionIndexer] Found end block: ${endBlock.number} at timestamp ${endBlock.timestamp}`
        );
      } else {
        // If no end timestamp provided, use the latest block
        endBlock = await this.client.getBlock({ blockTag: 'latest' });
        console.log(
          `[EASPredictionIndexer] Using latest block: ${endBlock.number} at timestamp ${endBlock.timestamp}`
        );
      }

      if (!startBlock.number || !endBlock.number) {
        throw new Error('No block found at timestamp');
      }

      // Create array of block numbers to index
      const startBlockNumber = Math.max(
        Number(startBlock.number),
        this.easStartBlock
      );
      const endBlockNumber = Number(endBlock.number);
      const blockNumbers: number[] = [];

      // Process blocks in batches to avoid overwhelming the RPC
      for (
        let i = startBlockNumber;
        i <= endBlockNumber;
        i += BLOCK_BATCH_SIZE
      ) {
        const batchEnd = Math.min(i + BLOCK_BATCH_SIZE - 1, endBlockNumber);
        const batch = Array.from(
          { length: batchEnd - i + 1 },
          (_, idx) => i + idx
        );
        blockNumbers.push(...batch);
      }

      console.log(
        `[EASPredictionIndexer] Indexing ${blockNumbers.length} blocks from ${startBlockNumber} to ${endBlockNumber}`
      );
      return await this.indexBlocks(resource, blockNumbers, overwriteExisting);
    } catch (error) {
      console.error(
        '[EASPredictionIndexer] Error indexing from timestamp:',
        error
      );
      Sentry.captureException(error);
      return false;
    }
  }

  async indexBlocks(
    _: Resource, 
    blocks: number[], 
    overwriteExisting: boolean = false
  ): Promise<boolean> {
    try {
      console.log(
        `[EASPredictionIndexer] Indexing ${blocks.length} blocks: ${blocks[0]} to ${blocks[blocks.length - 1]}`
      );

      // For reindexing large ranges, use optimized batch processing
      if (blocks.length > 1000) {
        return await this.indexBlocksOptimized(blocks, overwriteExisting);
      }

      for (const blockNumber of blocks) {
        await this.indexBlock(blockNumber, overwriteExisting);
      }

      return true;
    } catch (error) {
      console.error('[EASPredictionIndexer] Error indexing blocks:', error);
      Sentry.captureException(error);
      return false;
    }
  }

  private async indexBlocksOptimized(
    blocks: number[], 
    overwriteExisting: boolean = false
  ): Promise<boolean> {
    try {
      console.log(
        `[EASPredictionIndexer] Using optimized batch processing for ${blocks.length} blocks`
      );

      const CHUNK_SIZE = 10000;
      let processedBlocks = 0;

      for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
        const chunk = blocks.slice(i, i + CHUNK_SIZE);
        const fromBlock = chunk[0];
        const toBlock = chunk[chunk.length - 1];

        console.log(
          `[EASPredictionIndexer] Processing chunk: blocks ${fromBlock} to ${toBlock} (${chunk.length} blocks)`
        );

        try {
          // Single efficient query for the entire chunk
          const events = await this.getPredictionMarketEventsForBlocks(
            BigInt(fromBlock),
            BigInt(toBlock)
          );

          console.log(
            `[EASPredictionIndexer] Found ${events.length} attestations in chunk ${fromBlock}-${toBlock}`
          );

          // Optimize duplicate checking by batching database queries
          let skipEventUids: Set<string> = new Set();
          if (!overwriteExisting && events.length > 0) {
            const eventUids = events.map(e => e.uid);
            const existingAttestations = await prisma.attestation.findMany({
              where: {
                uid: { in: eventUids },
              },
              select: { uid: true },
            });
            skipEventUids = new Set(existingAttestations.map(a => a.uid));
          }

          // Process all events in this chunk
          for (const event of events) {
            try {
              // Skip if we already have this attestation and not overwriting
              if (!overwriteExisting && skipEventUids.has(event.uid)) {
                console.log(
                  `[EASPredictionIndexer] Already have attestation ${event.uid}, skipping...`
                );
                continue;
              }

              await this.storePredictionAttestation(event);
            } catch (eventError) {
              console.error(
                `[EASPredictionIndexer] Error processing event:`,
                eventError
              );
              Sentry.captureException(eventError);
              // Continue processing other events
            }
          }

          processedBlocks += chunk.length;
          console.log(
            `[EASPredictionIndexer] Progress: ${processedBlocks}/${blocks.length} blocks (${Math.round((processedBlocks / blocks.length) * 100)}%)`
          );
        } catch (chunkError) {
          console.error(
            `[EASPredictionIndexer] Error processing chunk ${fromBlock}-${toBlock}:`,
            chunkError
          );
          Sentry.captureException(chunkError);

          // Fallback to individual block processing
          console.log(
            `[EASPredictionIndexer] Falling back to individual block processing for chunk ${fromBlock}-${toBlock}`
          );
          for (const blockNumber of chunk) {
            await this.indexBlock(blockNumber, overwriteExisting);
          }
          processedBlocks += chunk.length;
        }

        // Small delay between chunks to avoid overwhelming the RPC
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return true;
    } catch (error) {
      console.error(
        '[EASPredictionIndexer] Error in optimized indexing:',
        error
      );
      Sentry.captureException(error);
      return false;
    }
  }

  private async indexBlock(
    blockNumber: number, 
    overwriteExisting: boolean = false
  ): Promise<void> {
    try {
      const events = await this.getPredictionMarketEventsForBlocks(
        BigInt(blockNumber),
        BigInt(blockNumber)
      );

      if (events.length === 0) {
        return;
      }

      console.log(
        `[EASPredictionIndexer] Found ${events.length} prediction market attestations in block ${blockNumber}`
      );

      // Optimize duplicate checking for individual blocks too
      let skipEventUids: Set<string> = new Set();
      if (!overwriteExisting) {
        const eventUids = events.map(e => e.uid);
        const existingAttestations = await prisma.attestation.findMany({
          where: {
            uid: { in: eventUids },
          },
          select: { uid: true },
        });
        skipEventUids = new Set(existingAttestations.map(a => a.uid));
      }

      for (const event of events) {
        try {
          // Skip if we already have this attestation and not overwriting
          if (!overwriteExisting && skipEventUids.has(event.uid)) {
            console.log(
              `[EASPredictionIndexer] Already have attestation ${event.uid}, skipping...`
            );
            continue;
          }

          await this.storePredictionAttestation(event);
        } catch (eventError) {
          console.error(
            `[EASPredictionIndexer] Error processing event in block ${blockNumber}:`,
            eventError
          );
          Sentry.captureException(eventError);
          // Continue processing other events
        }
      }
    } catch (error) {
      console.error(
        `[EASPredictionIndexer] Error indexing block ${blockNumber}:`,
        error
      );
      Sentry.captureException(error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async watchBlocksForResource(resource: Resource): Promise<void> {
    if (this.isWatching) {
      console.log(
        `[EASPredictionIndexer] Already watching for new predictions`
      );
      return;
    }

    this.isWatching = true;
    console.log(
      `[EASPredictionIndexer] Starting to watch for new prediction market attestations on chain ${this.chainId}`
    );

    try {
      const unwatch = this.client.watchEvent({
        address: EAS_CONTRACTS[
          this.chainId as keyof typeof EAS_CONTRACTS
        ] as `0x${string}`,
        event: attestedEventSignature,
        args: {
          schemaUID: PREDICTION_MARKET_SCHEMA_ID as `0x${string}`,
        },
        onLogs: async (logs) => {
          for (const log of logs) {
            try {
              if (log.args.schemaUID !== PREDICTION_MARKET_SCHEMA_ID) {
                // Skip if not a prediction market attestation for this schema
                console.log(
                  `[EASPredictionIndexer] Skipping event with schema ${log.args.schemaUID}`
                );
                continue;
              }

              const block = await this.client.getBlock({
                blockNumber: log.blockNumber!,
              });

              const event: PredictionMarketEvent = {
                uid: log.args.uid!,
                schemaUID: log.args.schemaUID!,
                attester: log.args.attester!,
                recipient: log.args.recipient!,
                transactionHash: log.transactionHash,
                blockNumber: log.blockNumber!,
                timestamp: Number(block.timestamp),
              };

              await this.storePredictionAttestation(event);
              console.log(
                `[EASPredictionIndexer] Processed new prediction: ${event.uid}`
              );
            } catch (error) {
              console.error(
                `[EASPredictionIndexer] Error processing prediction event:`,
                error
              );
            }
          }
        },
        onError: (error) => {
          console.error(
            `[EASPredictionIndexer] Error in prediction watcher:`,
            error
          );
        },
      });

      // Store unwatch function for cleanup
      process.on('SIGINT', () => {
        unwatch();
        this.isWatching = false;
      });
    } catch (error) {
      console.error(`[EASPredictionIndexer] Error setting up watcher:`, error);
      this.isWatching = false;
      Sentry.withScope((scope: Sentry.Scope) => {
        scope.setExtra('chainId', this.chainId);
        Sentry.captureException(error);
      });
    }
  }
}

export default EASPredictionIndexer;
