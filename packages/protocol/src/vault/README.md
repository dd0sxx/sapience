# Passive Liquidity Vault

An **ERC-4626 compliant** Solidity smart contract that implements a passive liquidity vault where an EOA (Externally Owned Account) can manage deposited funds to interact with other protocols. The vault uses a **queue-based system** with withdrawal delays to ensure fair and predictable liquidity management.

## ✅ ERC-4626 Compliance

This vault is fully compliant with the ERC-4626 "Tokenized Vault Standard", providing:
- Standardized deposit/withdraw/mint/redeem functions
- Automatic share-to-asset conversion
- Maximum DeFi interoperability
- Protection against inflation attacks through virtual shares

## Features

### Core Functionality
- **Queue-Based Operations**: Deposit and withdrawal requests are queued and processed with configurable delays
- **Withdrawal Delay**: Configurable delay period (default: 1 day) to prevent bank runs
- **EOA Management**: A designated manager (EOA) can approve funds usage to external protocols
- **Utilization Rate**: Configurable maximum utilization rate to control risk
- **Request Queues**: Deposit and withdrawal requests queued for processing
- **Emergency Mode**: Emergency withdrawal mechanism bypassing delay system
- **Asset/Share Reservation**: Prevents share price manipulation during delayed processing

### Safety Features
- **Reentrancy Protection**: All external calls are protected against reentrancy attacks
- **Pausable**: Contract can be paused by owner in emergency situations
- **Access Control**: Role-based access control for different functions
- **Utilization Limits**: Maximum utilization rate prevents over-leverage
- **Queue Processing Locks**: Prevents race conditions during queue processing
- **Safe Approval Pattern**: Protects against approval frontrunning attacks
- **Conservative Rounding**: Favoring vault security in asset/share conversions

## Architecture

### Key Components

1. **Queue Management**
   - Deposit requests queued for processing
   - Withdrawal requests queued with delay period
   - First-come-first-served processing order
   - Batch processing with gas optimization

2. **Asset Management**
   - ERC20 token representing the underlying asset
   - Share-based accounting system
   - Automatic conversion between assets and shares
   - Reserved assets/shares to prevent price manipulation

3. **Request Queues**
   - Deposit requests queued for immediate or delayed processing
   - Withdrawal requests queued with configurable delay
   - Processing locks to prevent race conditions

4. **Fund Deployment**
   - Manager can approve funds usage to external protocols
   - Tracks active protocols and deployed amounts
   - Maintains utilization rate calculations
   - NFT-based liquidity tracking for deployed funds

5. **Risk Management**
   - Maximum utilization rate limits
   - Emergency mode for crisis situations
   - Pausable functionality
   - Withdrawal delays to prevent bank runs

### State Variables

```solidity
IERC20 public immutable asset;           // Underlying asset token
address public manager;                  // EOA manager address
uint256 public maxUtilizationRate;       // Max utilization (basis points)
uint256 public utilizationRate;          // Current utilization (basis points)
uint256 public interactionDelay;          // Withdrawal delay in seconds (default: 1 day)
uint256 public totalDeployed;            // Total deployed to protocols
bool public emergencyMode;               // Emergency mode flag

// Queue processing state
uint256 public lastProcessedWithdrawalIndex; // Last processed withdrawal index
uint256 public lastProcessedDepositIndex;    // Last processed deposit index
uint256 private reservedAssets;              // Reserved assets for pending withdrawals
uint256 private reservedShares;              // Reserved shares for pending deposits
bool private processingWithdrawals;          // Withdrawal processing lock
bool private processingDeposits;             // Deposit processing lock

// Request queues
WithdrawalRequest[] public withdrawalQueue; // Withdrawal requests
DepositRequest[] public depositQueue;       // Deposit requests
address[] public activeProtocols;           // Active protocol addresses
```

### Data Structures

```solidity
struct WithdrawalRequest {
    address user;             // User requesting withdrawal
    uint256 shares;           // Shares to withdraw
    uint256 assets;           // Asset amount (calculated at request time)
    uint256 timestamp;        // Request timestamp
    bool processed;           // Whether request has been processed
}

struct DepositRequest {
    address user;             // User requesting deposit
    uint256 amount;           // Amount to deposit
    uint256 timestamp;        // Request timestamp
    bool processed;           // Whether request has been processed
}
```

## Queue System

### How Queues Work

The vault operates on a queue-based system to ensure fair and predictable processing:

1. **Request Submission**:
   - Deposits: Added to deposit queue for processing
   - Withdrawals: Added to withdrawal queue with delay period
   - First-come-first-served order maintained

2. **Processing Timing**:
   - Deposits: Can be processed immediately or with delay
   - Withdrawals: Must wait for withdrawal delay period
   - Batch processing with gas optimization

3. **Queue Lifecycle**:
   ```
   Request → Queue → Delay (for withdrawals) → Processing → Completion
   ```

### Queue Processing

When processing queues:
1. Deposits are processed by minting shares to users
2. Withdrawals are processed by burning shares and transferring assets
3. Processing locks prevent race conditions
4. Gas optimization limits batch sizes

### Benefits

- **Fair Processing**: First-come-first-served order
- **Predictable Timing**: Users know when their requests will be processed
- **Bank Run Protection**: Withdrawal delays prevent mass exits
- **Gas Optimization**: Batch processing with size limits

## Asset/Share Reservation System

### How Reservation Works

The vault implements a sophisticated reservation system to prevent share price manipulation:

1. **Withdrawal Requests**:
   - Shares are kept until processing time
   - Asset amount calculated at processing time
   - No immediate share burning or asset reservation

2. **Deposit Requests**:
   - Assets transferred immediately to vault
   - Shares calculated and reserved
   - Shares minted during processing

3. **Price Stability**:
   - Share price remains stable during request phase
   - Conversion happens at processing time
   - Conservative rounding favors vault security

### Benefits

- **Price Manipulation Protection**: No immediate share burning
- **Fair Conversion**: Asset/share conversion at processing time
- **Vault Security**: Conservative rounding approach
- **Predictable Behavior**: Consistent share-to-asset ratios

## Usage

### For Users

#### Depositing
```solidity
// Approve vault to spend tokens
asset.approve(address(vault), amount);

// Request deposit (queued for processing)
uint256 queuePosition = vault.requestDeposit(amount);

// Check deposit status
uint256 queueLength = vault.getDepositQueueLength();
```

#### Withdrawing
```solidity
// Request withdrawal (queued with delay)
uint256 queuePosition = vault.requestWithdrawal(shares);

// Check withdrawal status
uint256 pendingAmount = vault.getPendingWithdrawal(user);
uint256 queueLength = vault.getWithdrawalQueueLength();
```

#### Emergency Withdrawal
```solidity
// Only available when emergency mode is active
vault.emergencyWithdraw(shares);
```

#### Checking Queue Status
```solidity
// Get queue information
uint256 depositQueueLength = vault.getDepositQueueLength();
uint256 withdrawalQueueLength = vault.getWithdrawalQueueLength();

// Check processing status
bool processingWithdrawals = vault.isProcessingWithdrawals();
bool processingDeposits = vault.isProcessingDeposits();
```

### For Manager (EOA)

#### Approving Funds Usage
```solidity
// Approve funds usage to a protocol
vault.approveFundsUsage(protocolAddress, amount);

// Example: Approve to Compound
vault.approveFundsUsage(compoundTokenAddress, amount);
```

#### Checking Deployment Status
```solidity
// Get total deployed amount
uint256 totalDeployed = vault.totalDeployed();

// Get active protocols
uint256 protocolCount = vault.getActiveProtocolsCount();
address protocol = vault.getActiveProtocol(0);
```

### For Owner

#### Configuration
```solidity
// Set new manager
vault.setManager(newManager);

// Set maximum utilization rate (basis points)
vault.setMaxUtilizationRate(8000); // 80%

// Set withdrawal delay
vault.setinteractionDelay(2 days);

// Toggle emergency mode
vault.toggleEmergencyMode();

// Pause/unpause contract
vault.pause();
vault.unpause();
```

#### Queue Management
```solidity
// Process withdrawal queue (with gas limit)
vault.processWithdrawals(100); // Process up to 100 requests

// Process deposit queue (with gas limit)
vault.processDeposits(100); // Process up to 100 requests
```

## Key Functions

### Queue Functions
- `requestDeposit(uint256 amount)`: Request deposit for processing
- `requestWithdrawal(uint256 shares)`: Request withdrawal with delay
- `processWithdrawals(uint256 maxRequests)`: Process withdrawal queue
- `processDeposits(uint256 maxRequests)`: Process deposit queue

### Manager Functions
- `approveFundsUsage(address protocol, uint256 amount)`: Approve funds usage to protocol

### Emergency Functions
- `emergencyWithdraw(uint256 shares)`: Emergency withdrawal (bypasses delay)

### View Functions
- `totalAssets()`: Get total assets in vault
- `availableAssets()`: Get available assets for withdrawals
- `getDepositQueueLength()`: Get length of deposit queue
- `getWithdrawalQueueLength()`: Get length of withdrawal queue
- `getActiveProtocolsCount()`: Get number of active protocols
- `getPendingWithdrawal(address user)`: Get user's pending withdrawal amount
- `getPendingDeposit(address user)`: Get user's pending deposit amount

## Events

The contract emits comprehensive events for all major operations:

### Request Events
- `DepositRequested`: When a deposit is requested
- `WithdrawalRequested`: When a withdrawal is requested
- `DepositProcessed`: When a deposit request is processed
- `WithdrawalProcessed`: When a withdrawal request is processed

### Manager Events
- `FundsApproved`: When manager approves funds usage

### Emergency Events
- `EmergencyWithdrawal`: When emergency withdrawal occurs

### Configuration Events
- `ManagerUpdated`: When manager address changes
- `MaxUtilizationRateUpdated`: When max utilization rate changes
- `interactionDelayUpdated`: When withdrawal delay changes

## Security Considerations

### Reentrancy Protection
All external calls are protected using OpenZeppelin's `ReentrancyGuard`.

### Access Control
- **Owner**: Can configure parameters, pause contract, set manager
- **Manager**: Can approve funds usage to protocols
- **Users**: Can deposit, request withdrawals, process withdrawals

### Risk Management
- **Utilization Limits**: Prevents over-leverage of vault funds
- **Withdrawal Delays**: Prevents bank runs and mass exits
- **Processing Locks**: Prevents race conditions during queue processing
- **Emergency Mode**: Allows immediate withdrawals in crisis situations
- **Pausable**: Can halt operations if needed

### Economic Security
- **Share-based Accounting**: Fair distribution of vault performance
- **Queue-based Processing**: Ensures orderly and predictable processing
- **Asset/Share Reservation**: Prevents price manipulation
- **Conservative Rounding**: Favors vault security in conversions
- **Safe Approval Pattern**: Protects against approval frontrunning

## Testing

The contract includes comprehensive tests covering:

- Queue management and processing
- Deposit and withdrawal request handling
- Fund deployment and utilization tracking
- Emergency scenarios
- Access control
- Edge cases and error conditions
- Gas optimization and batch processing

Run tests with:
```bash
forge test --match-path test/vault/PassiveLiquidityVault.t.sol
```

## Deployment

1. Deploy the underlying asset token (if not using existing)
2. Deploy the vault with asset address and manager address
3. Configure parameters (max utilization, withdrawal delay)
4. Transfer ownership to governance contract (if applicable)

### Initial Configuration
```solidity
// Set withdrawal delay (default: 1 day)
vault.setinteractionDelay(1 days);

// Set maximum utilization rate (default: 80%)
vault.setMaxUtilizationRate(8000);

// Set manager address
vault.setManager(managerAddress);
```

## Integration Examples

### With Lending Protocols
```solidity
// Approve funds usage to Compound
vault.approveFundsUsage(compoundTokenAddress, amount);
```

### With DEX Liquidity Pools
```solidity
// Approve funds usage to Uniswap
vault.approveFundsUsage(uniswapRouter, amount);
```

### With Prediction Markets
```solidity
// Approve funds usage to PredictionMarket
vault.approveFundsUsage(predictionMarketAddress, amount);
```

## Gas Optimization

The contract is optimized for gas efficiency:

- Uses `immutable` for constant values
- Efficient storage layout
- Minimal external calls
- Batch processing for queues with size limits
- Processing locks to prevent unnecessary operations

## Upgradeability

The contract is not upgradeable by design for maximum security. Configuration changes are handled through parameter updates by the owner.

## License

MIT License - see LICENSE file for details.