# ParlayPool Contract Usage Examples

This document explains how to use the ParlayPool contract with practical examples featuring three users: **Ana** (player), **Bob** and **Carl** (liquidity providers).

## Overview

The ParlayPool implements an orderbook-style parlay system where:
- **Players** submit parlay orders with their principle and desired outcomes
- **LPs** compete by offering fill intents with different payouts
- The **best offer wins** and the parlay is created
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
    playerNFT,         // Player NFT contract
    lpNFT,            // LP NFT contract
    100e6,            // minRequestPayout (100 USDC)
    3600,             // minRequestExpirationTime (1 hour)
    86400 * 7,        // maxRequestExpirationTime (7 days)
    86400 * 30        // parlayAfterExpirationTime (30 days)
);
```

## Example Scenario: Ana's Parlay Order

### Initial Setup

**Ana** wants to bet on a parlay with the following markets:
- Market 1: "Will Bitcoin reach $100k by end of year?" (YES)
- Market 2: "Will Ethereum reach $10k by end of year?" (YES)

**Bob** and **Carl** are LPs who want to provide liquidity and compete for Ana's order.

### Step 1: LPs Deposit Collateral

Before competing, LPs must deposit collateral:

```solidity
// Bob deposits 10,000 USDC
IERC20(principleToken).approve(address(pool), 10000e6);
pool.depositLP(10000e6);

// Carl deposits 8,000 USDC
IERC20(principleToken).approve(address(pool), 8000e6);
pool.depositLP(8000e6);

// Check LP balances
console.log("Bob's balance:", pool.getLPBalance(bob));
console.log("Carl's balance:", pool.getLPBalance(carl));
// Output: Bob's balance: 10000000000 (10,000 USDC)
// Output: Carl's balance: 8000000000 (8,000 USDC)
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
    block.timestamp + 3600,    // Order expires in 1 hour
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

### Step 3: LPs Compete with Fill Intents

Bob and Carl now compete by offering different payouts:

```solidity
// Bob offers 1,300 USDC payout (higher than Ana's minimum)
pool.registerFillIntent(1, 1300e6);

// Carl offers 1,400 USDC payout (beats Bob's offer)
pool.registerFillIntent(1, 1400e6);

// Bob tries to beat Carl's offer
pool.registerFillIntent(1, 1500e6);

console.log("Best fill intent:", pool.getBestFillIntent(1));
// Output: Best fill intent: {lp: bob, payout: 1500000000, timestamp: 1703123456}
```

**Events Emitted:**
```
FillIntentUpdated(bob, 1, 1300000000, 1703123456)
FillIntentUpdated(carl, 1, 1400000000, 1703123457)
FillIntentUpdated(bob, 1, 1500000000, 1703123458)
```

### Step 4: Ana Fills the Order

Ana fills the order with Bob's best offer:

```solidity
// Ana fills the order (anyone can call this, not just Ana)
pool.fillParlayOrder(1);

console.log("Parlay created with player NFT:", pool.getParlay(1));
// Output: Parlay created with player NFT: {playerNftTokenId: 1, lpNftTokenId: 1, ...}
```

**Event Emitted:**
```
ParlayOrderFilled(
    requestId: 1,
    player: ana,
    lp: bob,
    playerNftTokenId: 1,
    lpNftTokenId: 1,
    principle: 1000000000,
    payout: 1500000000
)
```

**What happens:**
- Ana's 1,000 USDC principle is locked in the contract
- Bob's 1,500 USDC payout is locked in the contract
- Player NFT #1 is minted to Ana
- LP NFT #1 is minted to Bob
- Bob's used amount increases by 1,500 USDC

### Step 5: Check LP Balances After Fill

```solidity
console.log("Bob's total balance:", pool.getLPBalance(bob));
console.log("Bob's used amount:", pool.lpUsedAmounts(bob));
console.log("Bob's withdrawable amount:", pool.getLPWithdrawableAmount(bob));

// Output:
// Bob's total balance: 10000000000 (10,000 USDC)
// Bob's used amount: 1500000000 (1,500 USDC)
// Bob's withdrawable amount: 8500000000 (8,500 USDC)
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
    payout: 2500000000, // 1,000 + 1,500 USDC
    playerWon: true
)
```

### Step 7: Winner Withdraws Winnings

Since Ana won (all predictions were correct), she can withdraw her principle + payout:

```solidity
// Ana withdraws her winnings using her player NFT
pool.withdrawParlayPrinciple(1);

console.log("Ana's USDC balance after withdrawal:", IERC20(principleToken).balanceOf(ana));
// Output: Ana's USDC balance after withdrawal: 2500000000 (2,500 USDC)
```

**Event Emitted:**
```
ParlayPrincipleWithdrawn(
    nftTokenId: 1,
    owner: ana,
    amount: 2500000000
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
// Output: Bob's USDC balance after withdrawal: 2500000000 (2,500 USDC)
```

## LP Withdrawal Example

Bob wants to withdraw some of his available balance:

```solidity
console.log("Bob's withdrawable amount:", pool.getLPWithdrawableAmount(bob));
// Output: Bob's withdrawable amount: 8500000000 (8,500 USDC)

// Bob withdraws 2,000 USDC
pool.withdrawLP(2000e6);

console.log("Bob's balance after withdrawal:", pool.getLPBalance(bob));
console.log("Bob's withdrawable amount after withdrawal:", pool.getLPWithdrawableAmount(bob));
// Output:
// Bob's balance after withdrawal: 8000000000 (8,000 USDC)
// Bob's withdrawable amount after withdrawal: 6500000000 (6,500 USDC)
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
- ✅ Deposit collateral to participate
- ✅ Compete with fill intents
- ✅ Best offer automatically wins
- ✅ Withdraw available balance (deposited - used)
- ✅ Withdraw winnings if player loses

### Competition Mechanism:
- ✅ LPs can update their offers
- ✅ Only better offers are accepted
- ✅ Best offer is automatically tracked
- ✅ Winner is determined at fill time

### Security Features:
- ✅ Reentrancy protection
- ✅ Proper balance tracking
- ✅ NFT-based ownership verification
- ✅ Expiration handling
- ✅ Safe token transfers

This orderbook-style system ensures fair competition among LPs while providing players with the best possible payouts for their parlays. 