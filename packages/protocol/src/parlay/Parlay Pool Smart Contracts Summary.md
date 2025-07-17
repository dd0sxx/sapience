# Parlay Pool Smart Contracts Summary

This document provides a summary of the Solidity smart contracts developed for the Parlay Pool project, based on the provided specification. The system aims to facilitate parlay betting on prediction markets by leveraging a liquidity pool underwritten by stablecoin liquidity providers.

## 1. Contract Architecture

The Parlay Pool system is composed of the following core smart contracts and interfaces:

- **`ParlayPool.sol`**: The main contract responsible for managing liquidity provider (LP) deposits and withdrawals, handling parlay origination and settlement, and enforcing risk management rules.
- **`ParlayNFT.sol`**: An ERC-721 compliant contract that represents individual parlay positions as unique, tradeable non-fungible tokens.
- **`IOracle.sol`**: An interface defining the expected functions for external oracle services that provide real-time market odds and correlation data.
- **`MockERC20.sol`**: A mock ERC-20 token contract used for testing purposes to simulate stablecoin interactions.

## 2. Core Data Structures

The following Solidity structs are central to the operation of the Parlay Pool:

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

- **`Parlay`**: Stores all relevant information about a user's parlay bet, including its unique ID, creator, principle amount, potential payout, the markets involved, predicted outcomes, creation and expiration timestamps, and settlement status.
- **`Market`**: Defines a single prediction market by its ID and the address of its associated oracle.
- **`Outcome`**: Represents a user's prediction for a specific market, indicating whether they predict 'YES' or 'NO'.
- **`LPPosition`**: Tracks the details of a liquidity provider's stake in the pool, including their address, the number of shares they hold, and the timestamp of their last deposit.

## 3. Contract Interfaces and Key Functions

### `IOracle.sol`

This interface defines how the `ParlayPool` contract interacts with external oracle services to obtain market data.

```solidity
interface IOracle {
    function getMarketOdds(uint256[] calldata marketIds) external view returns (uint256[] memory odds);
    function getCorrelationMatrix(uint256[] calldata marketIds) external view returns (uint256[][] memory correlations);
}
```

- `getMarketOdds(uint256[] marketIds)`: Retrieves the current odds for a given array of market IDs.
- `getCorrelationMatrix(uint256[] marketIds)`: Fetches the correlation matrix between specified markets, crucial for accurate parlay pricing.

### `ParlayNFT.sol`

This contract is an ERC-721 token that manages the creation and burning of Parlay NFTs.

```solidity
contract ParlayNFT is ERC721, Ownable {
    constructor() ERC721("Parlay", "PRLY") Ownable(msg.sender) {}
    function mint(address to, uint256 tokenId) public onlyOwner;
    function burn(uint256 tokenId) public onlyOwner;
}
```

- `mint(address to, uint256 tokenId)`: Mints a new Parlay NFT and assigns it to the specified address. This function is restricted to the owner (the `ParlayPool` contract).
- `burn(uint256 tokenId)`: Burns a Parlay NFT, removing it from circulation. This function is also restricted to the owner.

### `ParlayPool.sol`

This is the central contract of the system, inheriting `Ownable` for access control. It includes various state variables for configurable parameters, oracle addresses, and contract addresses.

#### Constructor

```solidity
constructor(
    address _oddsOracleAddress,
    address _correlationOracleAddress,
    address _sapienceMarketRegistry,
    address _stablecoinAddress,
    address _umaOracleRegistry,
    address _parlayNftAddress
) Ownable(msg.sender) {
    oddsOracle = IOracle(_oddsOracleAddress);
    correlationOracle = IOracle(_correlationOracleAddress);
    SAPIENCE_MARKET_REGISTRY = _sapienceMarketRegistry;
    stablecoin = IERC20(_stablecoinAddress);
    UMA_ORACLE_REGISTRY = _umaOracleRegistry;
    parlayNft = ParlayNFT(_parlayNftAddress);
}
```

The constructor initializes the addresses of the various external contracts and oracles that the `ParlayPool` will interact with.

#### Access Control & Configuration Functions

The contract includes a set of `onlyOwner` functions to allow the owner to configure various parameters, such as risk percentages, exposure limits, edge percentages, and oracle/contract addresses. This provides flexibility and adaptability to market conditions and risk appetites.

Examples:
- `setMaxPoolRiskPercentage(uint256 _percentage)`
- `setDefaultEdgePercentage(uint256 _percentage)`
- `setOddsOracleAddress(address _address)`

#### Core Functions

- `requestParlay(Market[] calldata _markets, Outcome[] calldata _outcomes, uint256 _minPayout) external payable`:
  Allows users to request a parlay bet. It performs initial validations, such as checking the number of markets and the principle amount. It also handles the transfer of stablecoins from the user to the pool. **(Further implementation for risk checks, oracle interaction, pricing, NFT minting, and refunds is marked with `TODO` comments and will be completed in subsequent iterations.)**

- `_getPoolNAV() internal view returns (uint256)`:
  An internal view function to calculate the Net Asset Value (NAV) of the pool. Currently, it only considers liquid capital. **(The calculation of 'Expected Value of Outstanding Parlays' is marked as `TODO` due to its complexity and potential gas costs, suggesting off-chain computation or more efficient on-chain methods.)**

- `depositLP(uint256 _amount) external`:
  Enables liquidity providers to deposit stablecoins into the pool. It validates the deposit amount against `MIN_LP_DEPOSIT` and calculates the number of shares to mint based on the current pool NAV. It updates the LP's position and the total shares/principle of the pool.

- `requestWithdrawal(uint256 _shares) external`:
  Allows LPs to request a withdrawal of their shares. It checks for sufficient shares and ensures the `LP_DEPOSIT_LOCKUP` period has passed. **(Further implementation for withdrawal restrictions, such as risk limits and cool-down periods, is marked with `TODO` comments.)** It calculates the stablecoin amount to withdraw based on the current NAV and transfers it to the LP.

- `settleParlay(uint256 _tokenId, bytes[] calldata _oracleProofs) external`:
  Facilitates the settlement of a parlay. It requires the parlay creator to call it with the NFT token ID and oracle resolution proofs. **(Validation of oracle proofs and checking predicted outcomes are marked as `TODO`.)** If all predictions are correct, the NFT is burned, and the potential payout is transferred to the user. Otherwise, the NFT is burned, and the principle remains with the pool.

- `sweepExpiredParlay(uint256 _tokenId) external`:
  Allows a keeper to sweep expired parlays. It checks if the parlay has expired based on `PARLAY_EXPIRATION_BUFFER`. **(Verification of market resolution as losses or past resolution time is marked as `TODO`.)** The NFT is burned, and the principle remains with the pool as profit.

## 4. Test Cases (Initial)

An initial test file (`test/ParlayPool.test.js`) has been set up using Hardhat and Chai. It includes basic tests for:

- **Deployment**: Verifying that the `ParlayPool` contract is deployed correctly and its constructor parameters (owner, stablecoin address, ParlayNFT address) are set as expected.
- **LP Deposits**: Testing the `depositLP` function to ensure LPs can deposit stablecoins, shares are calculated correctly for initial and subsequent deposits, and the `MIN_LP_DEPOSIT` requirement is enforced.

**Further tests for `requestParlay`, `settleParlay`, `requestWithdrawal`, `sweepExpiredParlay`, and comprehensive risk management scenarios are marked as `TODO` in the test file and will be implemented to ensure full coverage and robustness.**

## 5. Next Steps

The next steps for this project involve:

1.  **Completing `TODO` Implementations**: Addressing all `TODO` comments within the `ParlayPool.sol` contract, particularly focusing on:
    -   Detailed risk limit checks in `requestParlay`.
    -   Accurate calculation of 'Expected Value of Outstanding Parlays' in `_getPoolNAV`.
    -   Comprehensive withdrawal restrictions in `requestWithdrawal`.
    -   Robust oracle proof validation and outcome checking in `settleParlay`.
    -   Verification of market resolution in `sweepExpiredParlay`.
2.  **Expanding Test Coverage**: Writing extensive unit tests for all functions, especially those marked with `TODO`, to ensure all edge cases and specified behaviors are correctly handled.
3.  **Optimization and Gas Efficiency**: Reviewing the implemented logic for gas efficiency and optimizing where possible, especially for frequently called functions.
4.  **Security Audits**: Preparing the contracts for formal security audits to identify and mitigate potential vulnerabilities.

This structured approach ensures that the Parlay Pool contracts are developed systematically, adhering to best practices, and thoroughly tested to meet the project's requirements for functionality, security, and efficiency.


