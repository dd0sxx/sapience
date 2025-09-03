export type HexString = `0x${string}`;

export interface AuctionRequestPayload {
  wager: string; // wei string
  predictedOutcomes: string[]; // Array of bytes strings that the verifier validates/understands
  verifier: string; // contract address for market validation
  long: string; // EOA address of the long initiating the auction
}

export interface BidQuote {
  takerDeadline: number; // unix seconds
}

export interface BidFillRawTx {
  rawSignedTx: HexString; // RLP
}

export interface BidFillCallData {
  callData: {
    to: string;
    data: HexString;
    gas?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    nonce?: string;
  };
  signature?: {
    r: HexString;
    s: HexString;
    v: number;
  };
}

export interface MintParlayData {
  short: string; // EOA
  shortWager: string; // wei string
  shortSignature: string; // Short's signature allowing this specific bid
}

export type BidFill = BidFillRawTx | BidFillCallData | MintParlayData;

export interface BidPayload {
  auctionId: string;
  short: string; // Short's EOA address (0x...)
  shortWager: string; // wei string
  shortDeadline: number; // unix seconds
  shortSignature: string; // Short's signature authorizing this specific bid over the typed payload
}

export type ValidatedBid = BidPayload;

export type ClientToServerMessage = {
  type: 'auction.start';
  payload: AuctionRequestPayload;
};

export type BotToServerMessage = { type: 'bid.submit'; payload: BidPayload };

export type ServerToClientMessage =
  | { type: 'auction.ack'; payload: { auctionId: string } }
  | { type: 'bid.ack'; payload: { error?: string } }
  | {
      type: 'auction.bids';
      payload: { bids: ValidatedBid[] };
    }
  | {
      type: 'auction.started';
      payload: AuctionRequestPayload & { auctionId: string };
    };
