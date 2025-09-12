# Passive Liquidity Vault

An **ERC-4626 compliant** Solidity smart contract that implements a passive liquidity vault where an EOA (Externally Owned Account) can manage deposited funds to interact with other protocols. The vault uses an **epoch-based system** for deposits and withdrawals, ensuring fair and predictable liquidity management.

## ✅ ERC-4626 Compliance

This vault is fully compliant with the ERC-4626 "Tokenized Vault Standard", providing:
- Standardized deposit/withdraw/mint/redeem functions
- Automatic share-to-asset conversion
- Maximum DeFi interoperability
- Protection against inflation attacks through virtual shares

## Features

### Core Functionality
- **Epoch-Based Operations**: All deposits and withdrawals are processed in discrete epochs (default: 1 day)
- **Locked Accounting**: No deposits/withdrawals during active epochs to ensure stable accounting
- **EOA Management**: A designated manager (EOA) can deploy funds to external protocols
- **Utilization Rate**: Configurable maximum utilization rate to control risk
- **Request Queue**: Deposit and withdrawal requests queued for next available epoch
- **Emergency Mode**: Emergency withdrawal mechanism bypassing epoch system

### Safety Features
- **Reentrancy Protection**: All external calls are protected against reentrancy attacks
- **Pausable**: Contract can be paused by owner in emergency situations
- **Access Control**: Role-based access control for different functions
- **Utilization Limits**: Maximum utilization rate prevents over-leverage
- **Epoch Locking**: Prevents front-running and ensures fair processing
- **Mid-Epoch Protection**: Requests after epoch midpoint go to next epoch

## Architecture

### Key Components

1. **Epoch Management**
   - Discrete time periods (default: 1 day) for all operations
   - Epoch state tracking (active, processing, closed)
   - Automatic epoch transitions and accounting updates

2. **Asset Management**
   - ERC20 token representing the underlying asset
   - Share-based accounting system locked during epochs
   - Automatic conversion between assets and shares

3. **Request Queues**
   - Deposit requests queued for next available epoch
   - Withdrawal requests queued for next available epoch
   - Mid-epoch protection (requests after 50% go to next epoch)

4. **Fund Deployment**
   - Manager can deploy funds to external protocols
   - Tracks deployment amounts and protocols
   - Maintains utilization rate calculations
   - Supports PnL processing for profit/loss accounting

5. **Risk Management**
   - Maximum utilization rate limits
   - Emergency mode for crisis situations
   - Pausable functionality

### State Variables

```solidity
IERC20 public immutable asset;           // Underlying asset token
address public manager;                  // EOA manager address
uint256 public maxUtilizationRate;       // Max utilization (basis points)
uint256 public utilizationRate;          // Current utilization (basis points)
uint256 public epochDuration;            // Epoch duration in seconds (default: 1 day)
uint256 public currentEpoch;             // Current epoch number
uint256 public epochStartTime;           // Start time of current epoch
uint256 public totalDeployed;            // Total deployed to protocols
uint256 public cumulativePnL;            // Net PnL across all protocols

// Epoch-based request queues
DepositRequest[] public depositQueue;    // Deposit requests for next epoch
WithdrawalRequest[] public withdrawalQueue; // Withdrawal requests for next epoch

// Epoch processing state
mapping(uint256 => EpochInfo) public epochs; // Epoch information
mapping(address => DeploymentInfo) public deployments; // Protocol deployments
```

### Data Structures

```solidity
struct EpochInfo {
    uint256 startTime;        // Epoch start timestamp
    uint256 endTime;          // Epoch end timestamp
    uint256 totalDeposits;    // Total deposits processed in this epoch
    uint256 totalWithdrawals; // Total withdrawals processed in this epoch
    uint256 sharePrice;       // Share price at epoch start
    bool processed;           // Whether epoch has been processed
}

struct DepositRequest {
    address user;             // User requesting deposit
    uint256 amount;           // Amount to deposit
    uint256 timestamp;        // Request timestamp
    uint256 targetEpoch;      // Target epoch for processing
    bool processed;           // Whether request has been processed
}

struct WithdrawalRequest {
    address user;             // User requesting withdrawal
    uint256 shares;           // Shares to withdraw
    uint256 timestamp;        // Request timestamp
    uint256 targetEpoch;      // Target epoch for processing
    bool processed;           // Whether request has been processed
}
```

## Epoch System

### How Epochs Work

The vault operates on discrete epochs (default: 1 day) to ensure fair and predictable processing:

1. **Epoch States**:
   - **Active**: Epoch is running, accounting is locked
   - **Processing**: Epoch has ended, processing requests
   - **Closed**: Epoch completed, ready for next epoch

2. **Request Timing**:
   - Requests made in first 50% of epoch → processed in next epoch
   - Requests made in last 50% of epoch → processed in epoch after next
   - This prevents front-running based on epoch outcomes

3. **Epoch Lifecycle**:
   ```
   Epoch N (Active) → Epoch N (Processing) → Epoch N+1 (Active)
   ```

### Epoch Processing

When an epoch ends:
1. All deposit/withdrawal requests are processed
2. New share price is calculated based on vault performance
3. Utilization rate is recalculated
4. Next epoch begins with updated accounting

### Benefits

- **Fair Processing**: No one can front-run epoch transitions
- **Predictable Timing**: Users know when their requests will be processed
- **Stable Accounting**: Share prices locked during epochs
- **Risk Management**: Utilization rates updated at epoch boundaries

## PnL Processing

### How PnL Processing Works

The vault includes a sophisticated profit and loss (PnL) processing system that allows the manager to report protocol performance without recalling funds:

1. **Positive PnL (Profit)**:
   - Manager calls `processPnL(protocol, positiveAmount, calldata)`
   - Vault increases `cumulativePnL` by the profit amount
   - Assets are collected from the protocol using the provided calldata
   - `totalDeployed` remains unchanged (funds stay deployed)
   - Share price increases as total assets increase

2. **Negative PnL (Loss)**:
   - Manager calls `processPnL(protocol, negativeAmount, calldata)`
   - Vault decreases `cumulativePnL` by the loss amount
   - No actual asset transfer occurs (losses are unrealized)
   - `totalDeployed` remains unchanged (funds stay deployed)
   - Share price decreases as total assets decrease

### Accounting System

The vault uses a cumulative PnL tracking system:

```solidity
struct VaultAccounting {
    uint256 totalDeployed;        // Actual funds deployed to protocols
    uint256 cumulativePnL;       // Net PnL across all protocols
}

function totalAssets() public view override returns (uint256) {
    return IERC20(asset()).balanceOf(address(this)) + totalDeployed + cumulativePnL;
}
```

**Key Benefits:**
- **ERC-4626 Compliant**: Share price accurately reflects vault value
- **Periodic Reporting**: Can report PnL without recalling funds
- **Accurate Tracking**: `totalDeployed` always reflects actual deployments
- **Flexible**: Supports multiple PnL iterations per deployment
- **Real-time Updates**: Share price updates immediately with PnL changes
- **Transparent**: All PnL events are logged for monitoring

### Example Usage

```solidity
// Deploy funds to protocol
vault.deployFunds(compoundTokenAddress, 1000e6, calldata);

// Report profit (collects assets, keeps funds deployed)
vault.processPnL(
    compoundTokenAddress,
    100e6, // +100 tokens profit
    abi.encodeWithSignature("redeem(uint256)", profitShares)
);

// Report loss (no asset transfer, just accounting)
vault.processPnL(
    compoundTokenAddress,
    -50e6, // -50 tokens loss
    abi.encodeWithSignature("markLoss(uint256)", 50e6)
);

// Report another profit
vault.processPnL(
    compoundTokenAddress,
    75e6, // +75 tokens profit
    abi.encodeWithSignature("redeem(uint256)", profitShares)
);

// Final state: totalDeployed = 1000, cumulativePnL = +125
```

## Usage

### For Users

#### Depositing
```solidity
// Approve vault to spend tokens
asset.approve(address(vault), amount);

// Request deposit (queued for next available epoch)
uint256 requestId = vault.requestDeposit(amount, receiver);

// Check when deposit will be processed
uint256 targetEpoch = vault.getDepositTargetEpoch(requestId);
```

#### Withdrawing
```solidity
// Request withdrawal (queued for next available epoch)
uint256 requestId = vault.requestWithdrawal(shares, receiver);

// Check when withdrawal will be processed
uint256 targetEpoch = vault.getWithdrawalTargetEpoch(requestId);
```

#### Emergency Withdrawal
```solidity
// Only available when emergency mode is active
vault.emergencyWithdraw(shares);
```

#### Checking Epoch Status
```solidity
// Get current epoch information
uint256 currentEpoch = vault.currentEpoch();
uint256 epochStartTime = vault.epochStartTime();
uint256 timeUntilNextEpoch = vault.timeUntilNextEpoch();

// Check if we're in the first or second half of epoch
bool isFirstHalf = vault.isFirstHalfOfEpoch();
```

### For Manager (EOA)

#### Deploying Funds
```solidity
// Deploy funds to a protocol with calldata
vault.deployFunds(protocolAddress, amount, calldata);
```

#### Recalling Funds
```solidity
// Recall funds from a protocol
vault.recallFunds(protocolAddress, amount, calldata);
```

#### Processing PnL
```solidity
// Process profit and loss for a protocol
// Positive PnL: collect profits (like recallFunds)
// Negative PnL: account for losses (reduce totalDeployed)
vault.processPnL(protocolAddress, pnlAmount, calldata);
```

### For Owner

#### Configuration
```solidity
// Set new manager
vault.setManager(newManager);

// Set maximum utilization rate (basis points)
vault.setMaxUtilizationRate(8000); // 80%

// Set epoch duration
vault.setEpochDuration(1 days);

// Toggle emergency mode
vault.toggleEmergencyMode();

// Pause/unpause contract
vault.pause();
vault.unpause();
```

#### Epoch Management
```solidity
// Manually trigger epoch transition (if needed)
vault.processEpoch();

// Get epoch information
EpochInfo memory epoch = vault.getEpochInfo(epochNumber);
```

## Key Functions

### Epoch Functions
- `processEpoch()`: Process current epoch and transition to next
- `getCurrentEpoch()`: Get current epoch number
- `getEpochInfo(uint256 epoch)`: Get information about specific epoch
- `isFirstHalfOfEpoch()`: Check if current time is in first half of epoch
- `timeUntilNextEpoch()`: Get seconds until next epoch starts

### Request Functions
- `requestDeposit(uint256 amount, address receiver)`: Request deposit for next epoch
- `requestWithdrawal(uint256 shares, address receiver)`: Request withdrawal for next epoch
- `getDepositTargetEpoch(uint256 requestId)`: Get target epoch for deposit request
- `getWithdrawalTargetEpoch(uint256 requestId)`: Get target epoch for withdrawal request

### Manager Functions
- `deployFunds(address protocol, uint256 amount, bytes calldata data)`: Deploy funds to protocol
- `recallFunds(address protocol, uint256 amount, bytes calldata data)`: Recall funds from protocol
- `processPnL(address protocol, int256 pnl, bytes calldata data)`: Process profit/loss for protocol

### Emergency Functions
- `emergencyWithdraw(uint256 shares)`: Emergency withdrawal (bypasses epoch system)

### View Functions
- `totalAssets()`: Get total assets in vault
- `getDepositQueueLength()`: Get length of deposit queue
- `getWithdrawalQueueLength()`: Get length of withdrawal queue
- `getActiveProtocolsCount()`: Get number of active protocols

## Events

The contract emits comprehensive events for all major operations:

### Epoch Events
- `EpochStarted`: When a new epoch begins
- `EpochProcessed`: When an epoch is processed and closed
- `EpochDurationUpdated`: When epoch duration is changed

### Request Events
- `DepositRequested`: When a deposit is requested for next epoch
- `WithdrawalRequested`: When a withdrawal is requested for next epoch
- `DepositProcessed`: When a deposit request is processed
- `WithdrawalProcessed`: When a withdrawal request is processed

### Manager Events
- `FundsDeployed`: When manager deploys funds
- `FundsRecalled`: When manager recalls funds
- `PnLProcessed`: When profit/loss is processed for a protocol
- `UtilizationRateUpdated`: When utilization rate changes

### Emergency Events
- `EmergencyWithdrawal`: When emergency withdrawal occurs

## Security Considerations

### Reentrancy Protection
All external calls are protected using OpenZeppelin's `ReentrancyGuard`.

### Access Control
- **Owner**: Can configure parameters, pause contract, set manager
- **Manager**: Can deploy and recall funds to/from protocols
- **Users**: Can deposit, request withdrawals, process withdrawals

### Risk Management
- **Utilization Limits**: Prevents over-leverage of vault funds
- **Epoch Locking**: Prevents front-running and ensures fair processing
- **Mid-Epoch Protection**: Requests after 50% of epoch go to next epoch
- **Emergency Mode**: Allows immediate withdrawals in crisis situations
- **Pausable**: Can halt operations if needed

### Economic Security
- **Share-based Accounting**: Fair distribution of vault performance
- **Epoch-based Processing**: Ensures orderly and predictable processing
- **Protocol Tracking**: Monitors all external deployments
- **Front-running Protection**: Mid-epoch cutoff prevents information advantage

## Testing

The contract includes comprehensive tests covering:

- Epoch management and transitions
- Deposit and withdrawal request queuing
- Mid-epoch protection logic
- Fund deployment and recall
- PnL processing (positive and negative scenarios)
- Utilization rate management
- Epoch processing and accounting updates
- Emergency scenarios
- Access control
- Edge cases and error conditions

Run tests with:
```bash
forge test --match-path test/vault/PassiveLiquidityVault.t.sol
```

## Deployment

1. Deploy the underlying asset token (if not using existing)
2. Deploy the vault with asset address and manager address
3. Configure parameters (max utilization, epoch duration)
4. Transfer ownership to governance contract (if applicable)

### Initial Configuration
```solidity
// Set epoch duration (default: 1 day)
vault.setEpochDuration(1 days);

// Set maximum utilization rate (default: 80%)
vault.setMaxUtilizationRate(8000);

// Set manager address
vault.setManager(managerAddress);
```

## Integration Examples

### With Lending Protocols
```solidity
// Deploy to Compound
vault.deployFunds(
    compoundTokenAddress,
    amount,
    abi.encodeWithSignature("mint(uint256)", amount)
);

// Recall from Compound
vault.recallFunds(
    compoundTokenAddress,
    amount,
    abi.encodeWithSignature("redeem(uint256)", shares)
);

// Report lending profits from Compound (collects interest, keeps principal deployed)
vault.processPnL(
    compoundTokenAddress,
    100e6, // +100 tokens interest earned
    abi.encodeWithSignature("redeem(uint256)", interestShares)
);

// Report lending losses (e.g., bad debt) - just accounting, no asset transfer
vault.processPnL(
    compoundTokenAddress,
    -50e6, // -50 tokens loss
    abi.encodeWithSignature("markBadDebt(uint256)", badDebtAmount)
);
```

### With DEX Liquidity Pools
```solidity
// Add liquidity to Uniswap
vault.deployFunds(
    uniswapRouter,
    amount,
    abi.encodeWithSelector(
        IUniswapV2Router.addLiquidity.selector,
        tokenA, tokenB, amountA, amountB, 0, 0, address(vault), deadline
    )
);

// Report trading profits from Uniswap (collects fees, keeps liquidity deployed)
vault.processPnL(
    uniswapPool,
    500e6, // +500 tokens profit
    abi.encodeWithSignature("collect(uint256,uint256)", 0, 0)
);

// Report trading losses from Uniswap (just accounting, no asset transfer)
vault.processPnL(
    uniswapPool,
    -200e6, // -200 tokens loss
    abi.encodeWithSignature("markLoss(uint256)", 200e6)
);
```

## Gas Optimization

The contract is optimized for gas efficiency:

- Uses `immutable` for constant values
- Efficient storage layout
- Minimal external calls
- Batch processing for withdrawals

## Upgradeability

The contract is not upgradeable by design for maximum security. Configuration changes are handled through parameter updates by the owner.

## License

MIT License - see LICENSE file for details.
