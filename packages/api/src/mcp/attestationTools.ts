import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import prisma from '../db';

/**
 * Tool: get_attestations_by_market
 * Returns all attestations for a specific market ID.
 */
export const getAttestationsByMarket = {
  name: 'get_attestations_by_market',
  description:
    'Get all attestations for a specific market ID. Returns attestation details including attester, prediction, comment, and timestamp.',
  parameters: {
    properties: {
      marketId: z
        .string()
        .describe('The market ID to query attestations for'),
    },
  },
  function: async ({
    marketId,
  }: {
    marketId: string;
  }): Promise<CallToolResult> => {
    try {
      const attestations = await prisma.attestation.findMany({
        where: {
          marketId: marketId,
        },
        orderBy: {
          time: 'desc',
        },
      });

      const formatted = attestations.map((a) => ({
        uid: a.uid,
        attester: a.attester,
        recipient: a.recipient,
        marketId: a.marketId,
        marketAddress: a.marketAddress,
        questionId: a.questionId,
        prediction: a.prediction,
        comment: a.comment,
        time: a.time,
        blockNumber: a.blockNumber,
        transactionHash: a.transactionHash,
        decodedData: a.decodedDataJson ? JSON.parse(a.decodedDataJson) : null,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                marketId,
                totalAttestations: formatted.length,
                attestations: formatted,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to get attestations for market ${marketId}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          },
        ],
      };
    }
  },
};

/**
 * Tool: get_attestations_by_address
 * Returns attestations submitted by a specific address.
 */
export const getAttestationsByAddress = {
  name: 'get_attestations_by_address',
  description:
    'Get attestations submitted by a specific address. Can optionally filter by market ID.',
  parameters: {
    properties: {
      attesterAddress: z
        .string()
        .describe('The address that submitted attestations'),
      marketId: z
        .string()
        .optional()
        .describe('Optional market ID to filter attestations'),
    },
  },
  function: async ({
    attesterAddress,
    marketId,
  }: {
    attesterAddress: string;
    marketId?: string;
  }): Promise<CallToolResult> => {
    try {
      // Normalize address to lowercase for comparison
      const normalizedAddress = attesterAddress.toLowerCase();

      const where: {
        attester: string;
        marketId?: string;
      } = {
        attester: normalizedAddress,
      };

      if (marketId) {
        where.marketId = marketId;
      }

      const attestations = await prisma.attestation.findMany({
        where,
        orderBy: {
          time: 'desc',
        },
      });

      // Group attestations by market for better organization
      const attestationsByMarket = attestations.reduce((acc, a) => {
        if (!acc[a.marketId]) {
          acc[a.marketId] = [];
        }
        acc[a.marketId].push({
          uid: a.uid,
          marketAddress: a.marketAddress,
          questionId: a.questionId,
          prediction: a.prediction,
          comment: a.comment,
          time: a.time,
          blockNumber: a.blockNumber,
          transactionHash: a.transactionHash,
          decodedData: a.decodedDataJson ? JSON.parse(a.decodedDataJson) : null,
        });
        return acc;
      }, {} as Record<string, Array<{
        uid: string;
        marketAddress: string;
        questionId: string;
        prediction: string;
        comment: string | null;
        time: number;
        blockNumber: number;
        transactionHash: string;
        decodedData: unknown;
      }>>);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                attesterAddress: normalizedAddress,
                marketIdFilter: marketId || 'none',
                totalAttestations: attestations.length,
                uniqueMarkets: Object.keys(attestationsByMarket).length,
                attestationsByMarket,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to get attestations for address ${attesterAddress}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          },
        ],
      };
    }
  },
};

/**
 * Tool: get_recent_attestations
 * Returns the most recent attestations across all markets or for a specific market.
 */
export const getRecentAttestations = {
  name: 'get_recent_attestations',
  description:
    'Get the most recent attestations. Can be filtered by market ID and limited to a specific number.',
  parameters: {
    properties: {
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(10)
        .describe('Number of attestations to return (default: 10, max: 100)'),
      marketId: z
        .string()
        .optional()
        .describe('Optional market ID to filter attestations'),
    },
  },
  function: async ({
    limit = 10,
    marketId,
  }: {
    limit?: number;
    marketId?: string;
  }): Promise<CallToolResult> => {
    try {
      const where: {
        marketId?: string;
      } = {};

      if (marketId) {
        where.marketId = marketId;
      }

      const attestations = await prisma.attestation.findMany({
        where,
        orderBy: {
          time: 'desc',
        },
        take: limit,
      });

      // Also fetch market details for context
      const marketIds = [...new Set(attestations.map((a) => parseInt(a.marketId)))].filter(id => !isNaN(id));
      const markets = await prisma.market.findMany({
        where: {
          marketId: {
            in: marketIds,
          },
        },
        select: {
          marketId: true,
          question: true,
          optionName: true,
          endTimestamp: true,
        },
      });

      const marketMap = markets.reduce((acc, m) => {
        acc[m.marketId.toString()] = {
          question: m.question,
          optionName: m.optionName,
          endTimestamp: m.endTimestamp,
        };
        return acc;
      }, {} as Record<string, {
        question: string | null;
        optionName: string | null;
        endTimestamp: number | null;
      }>);

      const formatted = attestations.map((a) => ({
        uid: a.uid,
        attester: a.attester,
        marketId: a.marketId,
        marketDetails: marketMap[a.marketId] || null,
        prediction: a.prediction,
        comment: a.comment,
        time: a.time,
        timestamp: new Date(a.time * 1000).toISOString(),
        blockNumber: a.blockNumber,
        transactionHash: a.transactionHash,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                filter: marketId ? `marketId: ${marketId}` : 'all markets',
                limit,
                count: formatted.length,
                attestations: formatted,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to get recent attestations: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          },
        ],
      };
    }
  },
};

/**
 * Tool: check_attestation_exists
 * Check if an address has already submitted an attestation for a specific market.
 */
export const checkAttestationExists = {
  name: 'check_attestation_exists',
  description:
    'Check if a specific address has already submitted an attestation for a given market. Useful for preventing duplicate submissions.',
  parameters: {
    properties: {
      attesterAddress: z
        .string()
        .describe('The address to check'),
      marketId: z
        .string()
        .describe('The market ID to check'),
    },
  },
  function: async ({
    attesterAddress,
    marketId,
  }: {
    attesterAddress: string;
    marketId: string;
  }): Promise<CallToolResult> => {
    try {
      const normalizedAddress = attesterAddress.toLowerCase();

      const existingAttestation = await prisma.attestation.findFirst({
        where: {
          attester: normalizedAddress,
          marketId: marketId,
        },
        orderBy: {
          time: 'desc',
        },
      });

      if (existingAttestation) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  hasAttestation: true,
                  message: `Address ${normalizedAddress} has already submitted an attestation for market ${marketId}`,
                  attestation: {
                    uid: existingAttestation.uid,
                    prediction: existingAttestation.prediction,
                    comment: existingAttestation.comment,
                    time: existingAttestation.time,
                    timestamp: new Date(existingAttestation.time * 1000).toISOString(),
                    transactionHash: existingAttestation.transactionHash,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  hasAttestation: false,
                  message: `Address ${normalizedAddress} has not submitted an attestation for market ${marketId}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to check attestation: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          },
        ],
      };
    }
  },
};