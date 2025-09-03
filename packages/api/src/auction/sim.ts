import type { BidPayload, AuctionRequestPayload } from './types';
import {
  validateAuctionForMint,
  createValidationError,
  verifyTakerBid,
} from './helpers';

export interface SimResult {
  ok: boolean;
  reason?: string;
}

export function basicValidateBid(
  auction: AuctionRequestPayload,
  bid: BidPayload
): SimResult {
  if (!auction || !bid) return { ok: false, reason: 'invalid_payload' };

  // Validate Auction structure for mint flow
  const auctionValidation = validateAuctionForMint(auction);
  if (!auctionValidation.valid) {
    return {
      ok: false,
      reason: createValidationError(
        auctionValidation.error || 'invalid_auction'
      ),
    };
  }

  // Validate short fields in payload
  if (!bid.short || typeof bid.short !== 'string') {
    return { ok: false, reason: 'invalid_short' };
  }
  if (!bid.shortWager) {
    return { ok: false, reason: 'invalid_short_wager' };
  }

  try {
    const shortWagerBigInt = BigInt(bid.shortWager);
    const wager = BigInt(auction.wager);

    // Basic validation: short wager should be positive and not exceed long wager
    if (shortWagerBigInt <= 0n) {
      return { ok: false, reason: 'invalid_short_wager' };
    }
    if (shortWagerBigInt > wager) {
      return { ok: false, reason: 'short_wager_too_high' };
    }
  } catch {
    return { ok: false, reason: 'invalid_wager_values' };
  }

  // Validate short signature payload and deadline (format + expiry)
  const sigCheck = verifyTakerBid({
    auctionId: bid.auctionId,
    short: bid.short,
    shortWager: bid.shortWager,
    shortDeadline: bid.shortDeadline,
    shortSignature: bid.shortSignature,
  });
  if (!sigCheck.ok) {
    return { ok: false, reason: sigCheck.reason };
  }

  // Note: Collateral transfer now relies on standard ERC20 approvals, not permits.
  // Bots should ensure the taker has approved the Parlay contract prior to bid submission.
  // TODO: verify verifier address and market validation

  return { ok: true };
}
