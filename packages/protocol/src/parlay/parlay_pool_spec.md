# Parlay Pools

## Simple Summary

A liquidity pool that enables users to create parlays on prediction markets automatically priced and underwritten by passive stablecoin liquidity providers.

## Abstract

The Parlay Pool is a decentralized protocol that facilitates parlay betting on Sapience prediction markets. Users can create parlays by combining multiple market outcomes, while liquidity providers (LPs) deposit stablecoins into a shared pool that automatically prices, originates, and settles these parlays. The system uses real-time oracle data for pricing, implements robust risk management to protect LP capital, and represents each parlay as a tradeable NFT that users can redeem upon winning.

## Motivation 

Current prediction market platforms typically only allow users to predict individual outcomes, missing the popular parlay mechanic bets where users combine multiple predictions for higher potential payouts. 

This protocol addresses both issues by:
1. Enabling parlay functionality on top of existing prediction markets
2. Providing a liquidity layer that automatically takes the opposing side of parlay bets
3. Creating a sustainable yield opportunity for liquidity providers through systematic edge capture
4. Implementing proper risk management to ensure pool solvency and fair LP treatment

Additionally, LPs will provide sUSDe to set baseline returns at the sUSDe RoR (~10% APY average)

## Specification

### Overview

The Parlay Pool system consists of three core components:

1. **Parlay Pool Contract**: The main smart contract that manages LP deposits/withdrawals, parlay origination, pricing, and settlement
2. **Oracle Services**: External services providing real-time market odds and correlation data
3. **Parlay NFTs**: ERC-721 tokens representing individual parlay positions with embedded settlement rights

The system operates on a request-and-fulfill model where users submit parlay requests, the contract quotes terms using fresh oracle data, and parlays are either originated as NFTs or refunded based on system capacity and user acceptance of terms.

### Rationale

**Automated Market Making Approach**: Rather than requiring manual matching between parlay bettors and liquidity providers, the system uses an AMM model where the pool automatically takes the opposing side of all parlays. This ensures instant execution and consistent liquidity.

**NFT Representation**: Parlays are represented as NFTs to create a clear, transferable claim on future settlement proceeds. This also enables potential secondary market trading of parlay positions.

**Pull Oracle Model**: Using fresh oracle data for each pricing decision ensures accurate risk assessment and prevents stale pricing attacks, though it requires users to wait for on-chain confirmation.

**Risk-Based Position Limits**: The system implements multiple layers of risk management (pool-level risk limits, per-parlay exposure caps, NAV-based withdrawal restrictions) to protect LP capital while maintaining operational efficiency.

### Technical Specifications

#### Core Data Structures

```solidity
struct Parlay {
    uint256 tokenId;
    address creator;
    uint256 principle;
    uint256 potentialPayout;
    Market[] markets;
    Outcome[] predictedOutcomes;
    uint256 createdAt;
    uint256 expirationTime;
    bool settled;
}

struct Market {
    uint256 marketId;
    address oracleAddress;
}

struct Outcome {
    bool prediction; // true for YES, false for NO
}

struct LPPosition {
    address lpAddress;
    uint256 shares;
    uint256 lastDepositTime;
}
```

#### Contract Interfaces

**Main Parlay Pool Contract**:
- `requestParlay(Market[] markets, Outcome[] outcomes, uint256 minPayout) external payable`
- `settleParlay(uint256 tokenId, bytes[] oracleProofs) external`
- `depositLP(uint256 amount) external`
- `requestWithdrawal(uint256 shares) external`
- `sweepExpiredParlay(uint256 tokenId) external`

**Oracle Interface**:
- `getMarketOdds(uint256[] marketIds) external view returns (uint256[] odds)`
- `getCorrelationMatrix(uint256[] marketIds) external view returns (uint256[][] correlations)`

#### Parlay Origination Flow

1. User calls `requestParlay()` with desired markets, outcomes, and minimum acceptable payout
2. Contract validates request against current risk limits and pool capacity
3. Contract pulls fresh odds data from oracle services
4. Contract calculates parlay probability using market odds and correlation adjustments
5. Contract applies configured edge percentage to determine quoted payout
6. If quoted payout meets user's minimum requirement:
   - Contract mints parlay NFT with all relevant data
   - Contract transfers NFT to user
   - User's payment is added to pool capital
7. If quoted payout below minimum or insufficient pool capacity:
   - Contract refunds user's payment

#### Settlement Flow

1. User calls `settleParlay()` with their NFT token ID and oracle resolution proofs
2. Contract validates that all markets in the parlay have resolved
3. Contract checks oracle resolution data against predicted outcomes in NFT
4. If all predictions correct:
   - Contract burns the NFT
   - Contract transfers potential payout to user
   - Pool capital reduced by payout amount
5. If any prediction incorrect:
   - Contract burns the NFT
   - No payout made (user's principle remains with pool as profit)

#### LP Management

**Deposit Process**:
1. LP calls `depositLP()` with stablecoin amount
2. Contract calculates current pool NAV using live market data for outstanding parlays
3. Contract mints LP shares proportional to deposit size and current NAV
4. LP shares added to user's position with timestamp

**Withdrawal Process**:
1. LP calls `requestWithdrawal()` with desired share amount
2. Contract validates withdrawal wouldn't exceed risk limits (outstanding parlay liability ≤ pool capacity * risk percentage)
3. Contract calculates current pool NAV and determines stablecoin value of requested shares
4. If withdrawal allowed and sufficient ramp-down time has passed:
   - Contract burns LP shares
   - Contract transfers corresponding stablecoin amount to LP

#### Risk Management

**Pool Risk Limits**:
- Maximum risk exposure as percentage of total pool capital
- Individual parlay exposure caps
- Per-market concentration limits

**NAV Calculation**:
```
Pool NAV = Liquid Capital + Expected Value of Outstanding Parlays
Expected Value = Σ(Parlay Payout × Current Win Probability)
```

**Withdrawal Restrictions**:
- Minimum deposit period before withdrawals allowed
- Withdrawals blocked if they would push pool risk above configured limit
- Cool-down periods between large withdrawals

## Test Cases

### Test Case 1: Basic Parlay Creation and Settlement

**Setup**: Pool with $100,000 capital, 10% risk limit, 50% edge configuration

**Actions**:
1. User requests $100 parlay on Market A (YES) + Market B (YES)
2. Oracle reports Market A odds: 20%, Market B odds: 25%
3. Combined probability: 5% (assuming independence)
4. Contract quotes 10:1 payout (50% edge applied)
5. User accepts, receives NFT for potential $1,000 payout
6. Both markets resolve to YES
7. User calls settle, receives $1,000

**Expected Results**:
- Parlay NFT created with correct parameters
- Pool capital reduced by $1,000 upon settlement
- All risk limits respected throughout process

### Test Case 2: Risk Limit Enforcement

**Setup**: Pool with $10,000 capital, 10% risk limit (max $1,000 exposure)

**Actions**:
1. User A requests $100 parlay with potential $800 payout
2. User B immediately requests $100 parlay with potential $500 payout
3. Both requests submitted in same block

**Expected Results**:
- First transaction to be mined should succeed
- Second transaction should revert due to risk limit breach
- User B should receive automatic refund

### Test Case 3: LP NAV Calculation with Outstanding Parlays

**Setup**: Pool with $50,000 from LPs, outstanding parlay with $2,000 potential payout

**Actions**:
1. Market odds change such that parlay win probability increases from 5% to 10%
2. New LP attempts to deposit $10,000
3. Contract calculates NAV: $50,000 - ($2,000 × 0.10) = $49,800
4. LP receives shares based on $49,800 pool valuation

**Expected Results**:
- LP share calculation reflects current expected liabilities
- Pool remains fairly valued for all participants

### Test Case 4: Expired Parlay Sweep

**Setup**: Parlay created with 30-day expiration, both markets resolved as losses

**Actions**:
1. 31 days pass after parlay creation
2. Keeper calls `sweepExpiredParlay()`
3. Contract burns NFT and adds principle to pool profits

**Expected Results**:
- NFT burned permanently
- Pool NAV increases by parlay principle amount
- Increased value reflected in LP share prices

## Configurable Values

### Risk Management Parameters
- `MAX_POOL_RISK_PERCENTAGE`: Maximum percentage of pool capital that can be at risk (default: 10%)
- `MAX_PARLAY_EXPOSURE`: Maximum potential payout for any single parlay (default: 1% of pool capital)
- `MAX_MARKET_CONCENTRATION`: Maximum total exposure to any single market (default: 5% of pool capital)

### Economic Parameters
- `DEFAULT_EDGE_PERCENTAGE`: Default house edge applied to parlay pricing (default: 20%)
- `MIN_LP_DEPOSIT`: Minimum stablecoin amount for LP deposits (default: $100)
- `LP_DEPOSIT_LOCKUP`: Minimum time LPs must wait before withdrawing (default: 7 days)
- `WITHDRAWAL_COOLDOWN`: Minimum time between large LP withdrawals (default: 24 hours)

### Operational Parameters
- `PARLAY_EXPIRATION_BUFFER`: Time after latest market resolution when parlays expire (default: 30 days)
- `ORACLE_TIMEOUT`: Maximum time to wait for oracle response before refunding (default: 5 minutes)
- `MIN_PARLAY_AMOUNT`: Minimum bet size for parlay creation (default: $1)
- `MAX_MARKETS_PER_PARLAY`: Maximum number of markets that can be combined (default: 10)

### Oracle Configuration
- `ODDS_ORACLE_ADDRESS`: Address of the market odds oracle service
- `CORRELATION_ORACLE_ADDRESS`: Address of the market correlation oracle service
- `ORACLE_UPDATE_FREQUENCY`: Expected frequency of oracle data updates (default: 60 seconds)
- `STALE_DATA_THRESHOLD`: Maximum age of oracle data before considered stale (default: 300 seconds)

### Contract Addresses
- `SAPIENCE_MARKET_REGISTRY`: Address of Sapience market registry contract
- `STABLECOIN_ADDRESS`: Address of accepted stablecoin (USDC/USDT/DAI)
- `UMA_ORACLE_REGISTRY`: Address of UMA oracle registry for market resolution data