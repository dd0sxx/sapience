# ParlayPool Contract Usage Examples

This document explains how to use the ParlayPool contract with practical examples featuring three users: **Ana** (player), **Bob** and **Carl** (liquidity providers).

## Overview

The ParlayPool implements a true orderbook-style parlay system where:
- **Players** submit parlay orders with their principle and desired outcomes
- **LPs** compete by directly filling orders with their preferred payouts
- The **first LP to fill** within the order expiration time wins (60 seconds in examples)
- No pre-deposits needed - LPs transfer funds directly when filling
- After market resolution, the **winner** (player or LP) withdraws principle + payout

## Contract Setup

First, deploy the required contracts:

```solidity
// Deploy NFT contracts
ParlayNFT playerNFT = new ParlayNFT("Parlay Player", "PPLY");
ParlayNFT lpNFT = new ParlayNFT("Parlay LP", "PLPY");

// Deploy ParlayPool
ParlayPool pool = new ParlayPool(
    principleToken,    // USDC address
    address(playerNFT), // Player NFT contract
    address(lpNFT),    // LP NFT contract
    100e6,            // minRequestPayout (100 USDC)
    60,               // minRequestExpirationTime (60 seconds)
    86400 * 7,        // maxRequestExpirationTime (7 days)
    86400 * 30        // parlayAfterExpirationTime (30 days)
);

// Transfer ownership of NFT contracts to ParlayPool
playerNFT.transferOwnership(address(pool));
lpNFT.transferOwnership(address(pool));
```

### Alternative Deployment Pattern

You could also deploy the NFTs with the ParlayPool as the initial owner by passing the pool address to the NFT constructors:

```solidity
// Deploy ParlayPool first (without NFT addresses)
ParlayPool pool = new ParlayPool(
    principleToken,    // USDC address
    address(0),        // Player NFT contract (placeholder)
    address(0),        // LP NFT contract (placeholder)
    100e6,            // minRequestPayout (100 USDC)
    60,               // minRequestExpirationTime (60 seconds)
    86400 * 7,        // maxRequestExpirationTime (7 days)
    86400 * 30        // parlayAfterExpirationTime (30 days)
);

// Deploy NFT contracts with ParlayPool as owner
ParlayNFT playerNFT = new ParlayNFT("Parlay Player", "PPLY");
ParlayNFT lpNFT = new ParlayNFT("Parlay LP", "PLPY");

// Transfer ownership to ParlayPool
playerNFT.transferOwnership(address(pool));
lpNFT.transferOwnership(address(pool));

// Update ParlayPool with NFT addresses (would need a setter function)
pool.setNFTAddresses(address(playerNFT), address(lpNFT));
```

**Note:** This alternative pattern would require adding setter functions to the ParlayPool contract.

## Example Scenario: Ana's Parlay Order

### Initial Setup

**Ana** wants to bet on a parlay with the following markets:
- Market 1: "Will Bitcoin reach $100k by end of year?" (YES)
- Market 2: "Will Ethereum reach $10k by end of year?" (YES)

**Bob** and **Carl** are LPs who want to provide liquidity and compete for Ana's order.

### Step 1: LPs Prepare for Competition

LPs need to have sufficient balance and approve the pool to spend their tokens:

```solidity
// Bob approves the pool to spend his USDC (he'll need this when filling orders)
IERC20(principleToken).approve(address(pool), 10000e6);

// Carl approves the pool to spend his USDC
IERC20(principleToken).approve(address(pool), 8000e6);

// Note: No pre-deposits needed! LPs transfer funds directly when filling orders
// The pool checks their actual token balance at fill time
```

### Step 2: Ana Submits Parlay Order

Ana submits her parlay order with 1,000 USDC principle:

```solidity
// Ana approves the pool to spend her USDC
IERC20(principleToken).approve(address(pool), 1000e6);

// Ana submits parlay order
Market[] memory markets = new Market[](2);
markets[0] = Market(marketGroup1, 1); // Bitcoin market
markets[1] = Market(marketGroup2, 2); // Ethereum market

bool[] memory outcomes = new bool[](2);
outcomes[0] = true;  // YES for Bitcoin
outcomes[1] = true;  // YES for Ethereum

uint256 requestId = pool.submitParlayOrder(
    markets,
    outcomes,
    1000e6,                    // 1,000 USDC principle
    1200e6,                    // Minimum 1,200 USDC payout
    block.timestamp + 60,      // Order expires in 60 seconds
    block.timestamp + 86400    // Parlay expires in 1 day
);

console.log("Parlay order submitted with ID:", requestId);
// Output: Parlay order submitted with ID: 1
```

**Event Emitted:**
```
ParlayOrderSubmitted(
    player: ana,
    requestId: 1,
    markets: [Market1, Market2],
    outcomes: [true, true],
    principle: 1000000000,
    minPayout: 1200000000,
    orderExpirationTime: 1703123456,
    parlayExpirationTime: 1703209856
)
```

### Step 3: LPs Compete by Filling the Order

Bob and Carl now compete by directly filling the order with their preferred payouts. The first one to fill within 60 seconds wins:

```solidity
// Bob tries to fill the order with 1,300 USDC payout
pool.fillParlayOrder(1, 1300e6);

// If Bob's transaction goes through first, he wins!
// If Carl's transaction goes through first, Carl wins!

// Carl tries to fill the order with 1,400 USDC payout (higher payout)
pool.fillParlayOrder(1, 1400e6);

// Only one of these transactions will succeed - the first one to be mined
```

**Event Emitted (for the winner):**
```
ParlayOrderFilled(
    requestId: 1,
    player: ana,
    lp: bob, // or carl, depending on who filled first
    playerNftTokenId: 1,
    lpNftTokenId: 1,
    principle: 1000000000,
    payout: 1300000000 // or 1400000000, depending on who filled
)
```

### Step 4: Order is Filled (First LP Wins)

The first LP to successfully fill the order within 60 seconds wins. Let's say Bob's transaction was mined first:

```solidity
// Check who filled the order
(bool filled, address filledBy, uint256 filledPayout, uint256 filledAt) = pool.getParlayOrderFillInfo(1);

console.log("Order filled by:", filledBy);
console.log("Payout offered:", filledPayout);
console.log("Filled at:", filledAt);
// Output: Order filled by: bob
// Output: Payout offered: 1300000000 (1,300 USDC)
// Output: Filled at: 1703123456
```

**What happens:**
- Ana's 1,000 USDC principle is locked in the contract
- Bob's 1,300 USDC payout is transferred from Bob to the contract
- Player NFT #1 is minted to Ana
- LP NFT #1 is minted to Bob
- Bob's used amount increases by 1,300 USDC

### Step 5: Check LP Used Amount After Fill

```solidity
console.log("Bob's used amount:", pool.getLPUsedAmount(bob));
console.log("Bob's actual USDC balance:", IERC20(principleToken).balanceOf(bob));

// Output:
// Bob's used amount: 1300000000 (1,300 USDC)
// Bob's actual USDC balance: 8700000000 (8,700 USDC)
```

### Step 6: Market Resolution and Settlement

After the markets resolve, the parlay can be settled:

```solidity
// Someone calls settleParlay (could be anyone)
pool.settleParlay(1); // Using player NFT token ID

console.log("Parlay settled:", pool.getParlay(1).settled);
// Output: Parlay settled: true
```

**Event Emitted:**
```
ParlaySettled(
    playerNftTokenId: 1,
    lpNftTokenId: 1,
    payout: 2300000000, // 1,000 + 1,300 USDC
    playerWon: true
)
```

### Step 7: Winner Withdraws Winnings

Since Ana won (all predictions were correct), she can withdraw her principle + payout:

```solidity
// Ana withdraws her winnings using her player NFT
pool.withdrawParlayPrinciple(1);

console.log("Ana's USDC balance after withdrawal:", IERC20(principleToken).balanceOf(ana));
// Output: Ana's USDC balance after withdrawal: 2300000000 (2,300 USDC)
```

**Event Emitted:**
```
ParlayPrincipleWithdrawn(
    nftTokenId: 1,
    owner: ana,
    amount: 2300000000
)
```

## Alternative Scenario: LP Wins

If Ana's predictions were wrong, Bob (the LP) would win:

```solidity
// In settleParlay function, if playerWon = false:
// parlay.payout = 0; // No payout for player

// Bob withdraws his winnings using his LP NFT
pool.withdrawParlayPrinciple(1); // Using LP NFT token ID

console.log("Bob's USDC balance after withdrawal:", IERC20(principleToken).balanceOf(bob));
// Output: Bob's USDC balance after withdrawal: 2300000000 (2,300 USDC)
```

## LP Balance Management

In the new orderbook approach, LPs don't need to manage deposits/withdrawals:

```solidity
// Bob's used amount (locked in unsettled parlays)
console.log("Bob's used amount:", pool.getLPUsedAmount(bob));
// Output: Bob's used amount: 1300000000 (1,300 USDC)

// Bob's actual USDC balance (he can spend this freely)
console.log("Bob's actual balance:", IERC20(principleToken).balanceOf(bob));
// Output: Bob's actual balance: 8700000000 (8,700 USDC)

// Bob can use his actual balance for other purposes or to fill more orders
// No need to withdraw from the pool - funds are only locked when filling orders
```

## Order Expiration Example

If no LP fills Ana's order before expiration:

```solidity
// Wait for order to expire
// block.timestamp >= request.orderExpirationTime

// Ana cancels her expired order
pool.cancelExpiredOrder(1);

// Ana's principle is returned to her
console.log("Ana's balance after canceling expired order:", IERC20(principleToken).balanceOf(ana));
// Output: Ana's balance after canceling expired order: 1000000000 (1,000 USDC)
```

**Event Emitted:**
```
OrderExpired(
    requestId: 1,
    player: ana,
    principleReturned: 1000000000
)
```

## Parlay Expiration Example

If a parlay expires without being settled:

```solidity
// Wait for parlay to expire
// block.timestamp >= parlay.expirationTime + parlayAfterExpirationTime

// Anyone can sweep the expired parlay
pool.sweepExpiredParlay(1);

// NFTs are burned and principle remains in the pool
console.log("Player NFT exists:", playerNFT.ownerOf(1));
// Output: Player NFT exists: Revert (token does not exist)
```

**Event Emitted:**
```
ParlayExpired(
    playerNftTokenId: 1,
    lpNftTokenId: 1,
    principleReclaimed: 1000000000
)
```

## Key Features Summary

### For Players (like Ana):
- ✅ Submit parlay orders with principle
- ✅ Set minimum acceptable payout
- ✅ Fill orders with best available offer
- ✅ Withdraw winnings if predictions correct

### For LPs (like Bob and Carl):
- ✅ Approve token spending to participate
- ✅ Compete by directly filling orders
- ✅ First to fill within time limit wins
- ✅ Transfer funds directly when filling
- ✅ No deposit/withdrawal management needed
- ✅ Withdraw winnings if player loses

### Competition Mechanism:
- ✅ LPs compete by calling fillParlayOrder directly
- ✅ First transaction to be mined wins
- ✅ No pre-deposits required
- ✅ Winner is determined by transaction order

### Security Features:
- ✅ Reentrancy protection
- ✅ Proper balance tracking
- ✅ NFT-based ownership verification
- ✅ Expiration handling
- ✅ Safe token transfers

This orderbook-style system ensures fair competition among LPs while providing players with the best possible payouts for their parlays. 