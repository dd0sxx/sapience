# Auction WebSocket API Documentation

## Overview

The Auction WebSocket API enables real-time communication between longs and shorts, facilitated by a relayer, for creating and managing prediction market auctions using the `PredictionMarket.sol` contract. Longs create auctions with their wagers and predictions, shorts submit competitive bids, and the relayer facilitates the matching process by validating signatures and broadcasting auction data. The system supports a mint-based flow where positions (represented as NFTs) are created immediately when both parties provide valid signatures.

## Message Types

### 1. auction.start

Starts a new auction to receive bids from shorts.

```typescript
{
  type: 'auction.start',
  payload: {
    long: string                      // Long's EOA address
    wager: string,                    // Long's wager amount (in collateral native units, likely 18 decimals places)
    verifier: string,                 // Verifier contract address
    predictedOutcomes: [              // Array of bytes strings that the verifier validates/understands
      string,                         // Bytes string representing market prediction
      string                          // Additional prediction bytes strings...
    ],
  }
}
```

### 2. Response (auction.ack)

Confirms receipt of an Auction start and automatically subscribes the long to a channel for bids for that auctionId.

```typescript
{
  type: 'auction.ack',
  payload: {
    auctionId: string
  }
}
```

### 3. auction.started (Broadcast)

Broadcasts new Auction starts to all connected shorts.

```typescript
{
  type: 'auction.started',
  payload: {
    auctionId: string,                // Server-generated unique identifier for this Auction
    long: string,                     // Long's EOA address
    wager: string,                    // Long's wager amount (wei)
    predictedOutcomes: [              // Array of bytes strings that the verifier validates/understands
      string,                         // Bytes string representing market prediction
      string                          // Additional prediction bytes strings...
    ],
    verifier: string                  // Verifier contract address
  }
}
```

### 4. bid.submit

Submits a bid/quote for an Auction. The payload MUST explicitly include the short address, short wager, and a quote expiration. These values are NOT derivable from a signature and must be provided and then verified against the signed payload.

```typescript
{
  type: 'bid.submit',
  payload: {
    auctionId: string,                // Auction ID to bid on
    short: string,                    // Short's EOA address (0x...)
    shortWager: string,               // Short's wager contribution (wei)
    shortDeadline: number,            // Unix timestamp when quote expires
    shortSignature: string            // Off-chain signature over the typed payload to authorize this bid
  }
}
```

### 5. Response (bid.ack)

Confirms receipt of a bid or reports an error.

```typescript
{
  type: 'bid.ack',
  payload: {
    error?: string                    // Error message if bid rejected
  }
}
```

### 6. auction.bids (Broadcast)

Broadcasts current bids for an Auction to subscribed longs only. Longs are automatically subscribed to an auction channel when they send an `auction.start` for that specific auction ID.

```typescript
{
  type: 'auction.bids',
  payload: {
    bids: [                           // Array of validated bids
      {
        auctionId: string,            // Auction ID this bid is for
        shortSignature: string,       // Short's off-chain signature authorizing the bid
        short: string,                // Short's EOA address
        shortWager: string,           // Short's wager contribution (collateral units, typically represented with 18 decimals)
        shortDeadline: number         // Unix timestamp when quote expires
      }
    ]
  }
}
```

## Connection Management

### Rate Limiting

- **Window**: 10 seconds
- **Max Messages**: 100 messages per window
- **Exceeded**: Connection closed with code `1008` and reason `rate_limited`

### Message Size Limit

- **Max Size**: 64KB per message
- **Exceeded**: Connection closed with code `1009` and reason `message_too_large`

## Bid Selection

The UI presents the best available bid that hasn't expired yet. The best bid is determined by the highest short wager amount among all valid (non-expired) bids.

## Validation Rules

### Auction Validation

- Wager must be positive
- At least one predicted outcome required (as non-empty bytes strings)
- Verifier address must be provided
- Long address must be provided and a valid `0x` address

### Bid Validation

- Quote must not be expired
- Short wager must be positive and ≤ long wager
- Off-chain bid signature must be provided and be a valid hex string

### Token Approvals

Both parties must perform standard ERC-20 approvals in their own wallets:

- Long must approve the contract to spend the long collateral prior to minting
- Short must approve the contract to spend the short collateral prior to filling

### Common Error Codes

- `invalid_payload`: Missing or invalid message structure
- `quote_expired`: Quote has expired
- `invalid_short_wager`: Short wager is invalid
- `short_wager_too_high`: Short wager exceeds long wager
- `invalid_short_bid_signature_format`: Short bid signature format is invalid

## Example Flow

### 1. Long Creates Auction

```javascript
ws.send(
  JSON.stringify({
    type: 'auction.start',
    payload: {
      wager: '1000000000000000000', // 1 ETH
      predictedOutcomes: [
        '0x...', // Bytes string representing market prediction
        '0x...', // Additional prediction bytes strings...
      ],
      verifier: '0x...',
      long: '0xYourLongAddressHere',
    },
  })
);
```

### 2. Short Responds with Bid

```javascript
ws.send(
  JSON.stringify({
    type: 'bid.submit',
    payload: {
      auctionId: 'auction-123',
      short: '0xShortAddress',
      shortWager: '500000000000000000', // 0.5 ETH
      shortDeadline: Math.floor(Date.now() / 1000) + 60,
      shortSignature: '0x...', // Signature over the typed payload
    },
  })
);
```

### 3. Long Executes Transaction

After receiving and selecting a bid, the long constructs the `OpenPositionsRequest` struct using:

- The Auction data (predictedOutcomes, verifier, collateralLong from wager)
- The bid data (short, shortWager, shortSignature)
- Their own long signature and referralCode

The maker then calls the `mint()` function on the ParlayPool contract. The system will automatically detect the minting through blockchain event listeners.

## Taker Example

The system includes a reference taker implementation (`botExample.ts`) that:

- Connects to the WebSocket endpoint
- Listens for `auction.started` messages
- Automatically calculates short collateral as 50% of long collateral
- Submits bids with proper mint data structure
- Handles bid acknowledgments and bid updates

## Security Considerations

1. **Rate Limiting**: Prevents spam and DoS attacks
2. **Message Size Limits**: Prevents memory exhaustion
3. **Approvals**: Standard ERC-20 approvals must be completed by both maker and taker
4. **Collateral Validation**: Ensures reasonable collateral amounts
5. **Expiration Checks**: Prevents execution of expired quotes/Auctions

## Error Handling

All errors are returned in the `bid.ack` message with descriptive error codes. Makers and takers should implement proper error handling and retry logic for transient failures.
