import type { AuctionRequestPayload, BidPayload } from './types';
import {
  encodeAbiParameters,
  keccak256,
  verifyTypedData,
  getAddress,
} from 'viem';

/**
 * Helper function to create MintParlayRequestData for the ParlayPool.mint() function
 * This matches the struct defined in the Solidity contract
 */
export interface MintParlayRequestData {
  short: string;
  predictedOutcomes: string[]; // Array of bytes strings that the verifier validates/understands
  verifier: string;
  wager: string;
  collateralShort: string;
  // Note: ERC-20 approvals are handled off-chain by long and short separately
}

/**
 * Creates the MintParlayRequestData struct for the ParlayPool.mint() function
 */
export function createMintParlayRequestData(
  auction: AuctionRequestPayload,
  short: string,
  collateralShort: string
): MintParlayRequestData {
  if (!auction.verifier) {
    throw new Error('Auction must have a verifier address');
  }

  return {
    short: short,
    predictedOutcomes: auction.predictedOutcomes,
    verifier: auction.verifier,
    wager: auction.wager,
    collateralShort: collateralShort,
  };
}

/**
 * Validates that an Auction has all required fields for the mint flow
 */
export function validateAuctionForMint(auction: AuctionRequestPayload): {
  valid: boolean;
  error?: string;
} {
  if (!auction.wager || BigInt(auction.wager) <= 0n) {
    return { valid: false, error: 'Invalid wager' };
  }
  if (!auction.predictedOutcomes || auction.predictedOutcomes.length === 0) {
    return { valid: false, error: 'No predicted outcomes' };
  }
  if (!auction.verifier) {
    return { valid: false, error: 'Missing verifier address' };
  }
  if (!auction.long) {
    return { valid: false, error: 'Missing long address' };
  }

  // Basic long address validation (0x-prefixed 40-hex)
  if (
    typeof auction.long !== 'string' ||
    !/^0x[a-fA-F0-9]{40}$/.test(auction.long)
  ) {
    return { valid: false, error: 'Invalid long address' };
  }

  // Validate predicted outcomes are non-empty bytes strings
  for (const outcome of auction.predictedOutcomes) {
    if (!outcome || typeof outcome !== 'string' || outcome.length === 0) {
      return {
        valid: false,
        error: 'Invalid predicted outcome: must be non-empty bytes string',
      };
    }
  }

  return { valid: true };
}

/**
 * Calculates the expected payout for a parlay (wager + taker collateral)
 */
export function calculateExpectedPayout(
  wager: string,
  takerCollateral: string
): string {
  const wagerAmount = BigInt(wager);
  const takerAmount = BigInt(takerCollateral);
  return (wagerAmount + takerAmount).toString();
}

/**
 * Validates that a bid's payout matches the expected payout
 */
export function validatePayout(
  wager: string,
  takerCollateral: string,
  bidPayout: string
): boolean {
  const expectedPayout = calculateExpectedPayout(wager, takerCollateral);
  return BigInt(bidPayout) === BigInt(expectedPayout);
}

/**
 * Creates a standardized error message for common validation failures
 */
export function createValidationError(
  reason: string,
  context?: Record<string, unknown>
): string {
  const baseMessage = `Validation failed: ${reason}`;
  if (context && Object.keys(context).length > 0) {
    const contextStr = Object.entries(context)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');
    return `${baseMessage} (${contextStr})`;
  }
  return baseMessage;
}

/**
 * Verifies a taker bid using a typed payload scheme (e.g., EIP-712 or personal_sign preimage).
 * This function currently does structural checks only; wire in real signature recovery for production.
 */
export function verifyTakerBid(params: {
  auctionId: string;
  short: string;
  shortWager: string;
  shortDeadline: number;
  shortSignature: string;
}): { ok: boolean; reason?: string } {
  try {
    const { auctionId, short, shortWager, shortDeadline, shortSignature } =
      params;
    if (!auctionId || typeof auctionId !== 'string') {
      return { ok: false, reason: 'invalid_auction_id' };
    }
    if (typeof short !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(short)) {
      return { ok: false, reason: 'invalid_short' };
    }
    if (!shortWager || BigInt(shortWager) <= 0n) {
      return { ok: false, reason: 'invalid_short_wager' };
    }
    if (
      typeof shortDeadline !== 'number' ||
      !Number.isFinite(shortDeadline) ||
      shortDeadline <= Math.floor(Date.now() / 1000)
    ) {
      return { ok: false, reason: 'quote_expired' };
    }
    if (
      typeof shortSignature !== 'string' ||
      !shortSignature.startsWith('0x') ||
      shortSignature.length < 10
    ) {
      return { ok: false, reason: 'invalid_short_bid_signature_format' };
    }

    // TODO: Implement real signature verification (EIP-712) against the exact typed payload
    // For now, treat format-valid signatures as acceptable.
    return { ok: true };
  } catch {
    return { ok: false, reason: 'verification_failed' };
  }
}

export async function verifyTakerBidStrict(params: {
  auction: AuctionRequestPayload;
  bid: BidPayload;
  chainId: number;
  verifyingContract: `0x${string}`;
}): Promise<{ ok: boolean; reason?: string }> {
  try {
    const { auction, bid, chainId, verifyingContract } = params;

    // Basic guards
    if (!auction || !bid) return { ok: false, reason: 'invalid_payload' };
    if (!auction.predictedOutcomes?.length)
      return { ok: false, reason: 'invalid_auction_outcomes' };

    const encodedOutcomes = auction.predictedOutcomes[0] as `0x${string}`;

    // Hash the inner message per contract
    const inner = encodeAbiParameters(
      [
        { type: 'bytes' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'address' },
        { type: 'address' },
        { type: 'uint256' },
      ],
      [
        encodedOutcomes,
        BigInt(bid.shortWager),
        BigInt(auction.wager),
        auction.verifier as `0x${string}`,
        auction.long as `0x${string}`,
        BigInt(bid.shortDeadline),
      ]
    );

    const messageHash = keccak256(inner);

    // EIP-712 domain and types must match SignatureProcessor
    const domain = {
      name: 'SignatureProcessor',
      version: '1',
      chainId,
      verifyingContract,
    } as const;

    const types = {
      Approve: [
        { name: 'messageHash', type: 'bytes32' },
        { name: 'owner', type: 'address' },
      ],
    } as const;

    const message = {
      messageHash,
      owner: getAddress(bid.short),
    } as const;

    const ok = await verifyTypedData({
      address: getAddress(bid.short),
      domain,
      primaryType: 'Approve',
      types,
      message,
      signature: bid.shortSignature as `0x${string}`,
    });

    return ok ? { ok: true } : { ok: false, reason: 'invalid_signature' };
  } catch {
    return { ok: false, reason: 'verification_failed' };
  }
}
