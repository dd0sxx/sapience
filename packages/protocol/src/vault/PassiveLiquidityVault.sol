// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "../predictionMarket/interfaces/IPredictionStructs.sol";
import "../predictionMarket/interfaces/IPredictionMarket.sol";
import "../predictionMarket/utils/SignatureProcessor.sol";
import "./interfaces/IPassiveLiquidityVault.sol";

/**
 * @title PassiveLiquidityVault
 * @notice An ERC-4626 compliant passive liquidity vault that allows users to deposit assets and earn yield through EOA-managed protocol interactions
 * 
 * HOW IT WORKS:
 * 1. Users deposit ERC-20 tokens and receive vault shares (1:1 initially)
 * 2. A designated EOA manager deploys vault funds to external protocols (lending, DEXs, etc.) to generate yield
 * 3. Users can request withdrawals, which are queued with a configurable delay to prevent bank runs
 * 4. Withdrawals are processed when liquidity is available, maintaining fair first-come-first-served order
 * 5. The vault tracks utilization rate to prevent over-leverage and includes emergency mechanisms
 * 
 * KEY FEATURES:
 * - ERC-4626 standard compliance for maximum DeFi interoperability
 * - Utilization rate limits (default 80%) to control risk exposure
 * - Withdrawal queue with delay (default 1 day) to manage liquidity
 * - Emergency mode for immediate withdrawals during crises
 * - EOA manager can deploy/recall funds to any protocol with custom calldata
 * - Comprehensive access controls and safety mechanisms
 * 
 * @dev Implements utilization rate management, withdrawal queue, and EOA-controlled fund deployment
 */
contract PassiveLiquidityVault is ERC4626, IPassiveLiquidityVault, Ownable2Step, ReentrancyGuard, Pausable, SignatureProcessor {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ============ Events ============
    // Events are defined in the IPassiveLiquidityVault interface

    // ============ State Variables ============
    
    /// @notice The EOA manager who can deploy funds to other protocols
    address public manager;
    
    /// @notice Maximum utilization rate (in basis points, e.g., 8000 = 80%)
    uint256 public maxUtilizationRate = 8000; // 80%
    
    /// @notice Withdrawal delay in seconds (default: 1 day)
    uint256 public withdrawalDelay = 1 days;
    
    /// @notice Withdrawal queue
    IPassiveLiquidityVault.WithdrawalRequest[] public withdrawalQueue;
    
    /// @notice Mapping of user to their withdrawal request index
    mapping(address => uint256) public userWithdrawalIndex;
    
    /// @notice Deposit queue
    IPassiveLiquidityVault.DepositRequest[] public depositQueue;
    
    /// @notice Mapping of user to their deposit request index
    mapping(address => uint256) public userDepositIndex;
    
    /// @notice List of active protocol addresses
    address[] public activeProtocols;
    
    /// @notice Mapping to check if protocol is in active list
    mapping(address => bool) public isActiveProtocol;
    // TOOD Use a set instead of mapping 
    
    /// @notice Emergency mode flag
    bool public emergencyMode = false;
    
    /// @notice Basis points denominator (10000 = 100%)
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Minimum deposit amount. Used also as min withdrawal amount unless available is less than minimum. A large enough amount to prevent DoS attacks on deposits or withdrawals
    uint256 public constant MIN_DEPOSIT = 100e6; // 100 token (assuming 6 decimals)

    /// @notice Maximum number of withdrawal or deposit requests to process in a single call
    uint256 public constant MAX_PROCESS_QUEUE_LENGTH = 100;
    
    /// @notice Last processed index in withdrawal queue
    uint256 private lastProcessedWithdrawalIndex = 0;
    
    /// @notice Last processed index in deposit queue
    uint256 private lastProcessedDepositIndex = 0;
    
    /// @notice Total assets reserved for pending withdrawals
    uint256 private reservedAssets = 0;
    
    /// @notice Total shares reserved for pending deposits
    uint256 private reservedShares = 0;
    
    /// @notice Lock to prevent concurrent withdrawal processing
    bool private processingWithdrawals = false;
    
    /// @notice Lock to prevent concurrent deposit processing
    bool private processingDeposits = false;

    // ============ Modifiers ============
    
    modifier onlyManager() {
        require(msg.sender == manager, "Only manager");
        _;
    }
    
    modifier notEmergency() {
        require(!emergencyMode, "Emergency mode active");
        _;
    }
    
    modifier notProcessing() {
        require(!processingWithdrawals && !processingDeposits, "Processing in progress");
        _;
    }

    // ============ Constructor ============
    
    constructor(
        address _asset,
        address _manager,
        string memory _name,
        string memory _symbol
    ) ERC4626(IERC20(_asset)) ERC20(_name, _symbol) Ownable(msg.sender) SignatureProcessor() {
        require(_asset != address(0), "Invalid asset");
        require(_manager != address(0), "Invalid manager");
        
        manager = _manager;
    }

    // ============ ERC-4626 Overrides ============
    
    /**
     * @notice Override deposit to add custom logic
     * @param assets Amount of assets to deposit
     * @param receiver Address to receive shares
     * @return shares Number of shares minted
     */
    function deposit(uint256 assets, address receiver) public override(ERC4626, IERC4626) nonReentrant whenNotPaused notEmergency returns (uint256 shares) {
        require(assets >= MIN_DEPOSIT, "Amount too small");
        return super.deposit(assets, receiver);
    }

    /**
     * @notice Override mint to add custom logic
     * @param shares Number of shares to mint
     * @param receiver Address to receive shares
     * @return assets Amount of assets deposited
     */
    function mint(uint256 shares, address receiver) public override(ERC4626, IERC4626) nonReentrant whenNotPaused notEmergency returns (uint256 assets) {
        assets = previewMint(shares);
        require(assets >= MIN_DEPOSIT, "Amount too small");
        return super.mint(shares, receiver);
    }

    /**
     * @notice Override withdraw to use withdrawal queue instead of immediate withdrawal
     * @param assets Amount of assets to withdraw
     * @param owner Address that owns the shares
     * @return shares Number of shares burned
     */
    function withdraw(uint256 assets, address /* receiver */, address owner) public override(ERC4626, IERC4626) nonReentrant whenNotPaused returns (uint256 shares) {
        shares = previewWithdraw(assets);
        _requestWithdrawal(shares, owner);
        return shares;
    }

    /**
     * @notice Override redeem to use withdrawal queue instead of immediate withdrawal
     * @param shares Number of shares to redeem
     * @param owner Address that owns the shares
     * @return assets Amount of assets withdrawn
     */
    function redeem(uint256 shares, address /* receiver */, address owner) public override(ERC4626, IERC4626) nonReentrant whenNotPaused returns (uint256 assets) {
        assets = previewRedeem(shares);
        _requestWithdrawal(shares, owner);
        return assets;
    }

    /**
     * @notice Override totalAssets to include deployed funds
     * @return Total assets (available + deployed)
     */
    function totalAssets() public view override(ERC4626, IERC4626) returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + _deployedLiquidity();
    }

    function availableAssets() public view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    function totalDeployed() public view returns (uint256) {
        return _deployedLiquidity();
    }

    function utilizationRate() public view returns (uint256) {
        uint256 deployedLiquidity = _deployedLiquidity();
        uint256 totalAssetsValue = availableAssets() + deployedLiquidity;
        return totalAssetsValue > 0 ? ((deployedLiquidity * BASIS_POINTS) / totalAssetsValue) : 0;
    }

    function _deployedLiquidity() internal view returns (uint256) {
        // get vault's owned NFTs and sum the collateral of each for each NFT
        uint256 totalDeployedAmount = 0;
        for(uint256 protocolIndex = 0; protocolIndex < activeProtocols.length; protocolIndex++) {
            address protocol = activeProtocols[protocolIndex];
            IPredictionMarket pm = IPredictionMarket(protocol);
            uint256[] memory nftIds = pm.getOwnedPredictions(address(this));
            for(uint256 nftIndex = 0; nftIndex < nftIds.length; nftIndex++) {
                IPredictionStructs.PredictionData memory prediction = pm.getPrediction(nftIds[nftIndex]);
                bool isTaker;
                if (prediction.maker == address(this)) {
                    isTaker = false;
                } else if (prediction.taker == address(this)) {
                    isTaker = true;
                } else {
                    continue;
                }
                uint256 collateral = isTaker ? prediction.takerCollateral : prediction.makerCollateral;
                totalDeployedAmount += collateral;
            }
        }
        return totalDeployedAmount;
    }


    // ============ Custom Withdrawal Functions ============
    
    /**
     * @notice Request withdrawal of shares (internal function used by withdraw/redeem)
     * @param shares Number of shares to withdraw
     * @param owner Address that owns the shares
     * @return queuePosition Position in withdrawal queue
     */
    function _requestWithdrawal(uint256 shares, address owner) internal returns (uint256 queuePosition) {
        require(shares > 0, "Invalid shares");
        require(balanceOf(owner) >= shares, "Insufficient balance");
        require(userWithdrawalIndex[owner] == 0, "Withdrawal already pending");
        
        // Don't burn shares immediately - keep them until processing
        // Don't reserve assets - calculate at processing time
        
        // Add to withdrawal queue without pre-calculating assets
        withdrawalQueue.push(IPassiveLiquidityVault.WithdrawalRequest({
            user: owner,
            shares: shares,
            assets: 0, // Will be calculated at processing time
            timestamp: block.timestamp,
            processed: false
        }));
        
        queuePosition = withdrawalQueue.length - 1;
        userWithdrawalIndex[owner] = queuePosition + 1; // 1-indexed
        
        emit WithdrawalRequested(owner, shares, queuePosition);
    }

    /**
     * @notice Request withdrawal of shares (public function for direct calls)
     * @param shares Number of shares to withdraw
     * @return queuePosition Position in withdrawal queue
     */
    function requestWithdrawal(uint256 shares) public returns (uint256 queuePosition) {
        return _requestWithdrawal(shares, msg.sender);
    }

    /**
     * @notice Request deposit of assets (queued for processing)
     * @param amount Amount of assets to deposit
     * @return queuePosition Position in deposit queue
     */
    function requestDeposit(uint256 amount) external nonReentrant whenNotPaused notEmergency returns (uint256 queuePosition) {
        require(amount >= MIN_DEPOSIT, "Amount too small");
        require(userDepositIndex[msg.sender] == 0, "Deposit already pending");
        
        // Transfer assets from user to vault
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate shares to reserve at current share price (round down to favor vault)
        uint256 sharesToReserve = _convertToShares(amount, Math.Rounding.Floor);
        
        // Reserve shares to maintain correct share-to-asset ratio
        reservedShares += sharesToReserve;
        
        // Add to deposit queue
        depositQueue.push(IPassiveLiquidityVault.DepositRequest({
            user: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            processed: false
        }));
        
        queuePosition = depositQueue.length - 1;
        userDepositIndex[msg.sender] = queuePosition + 1; // 1-indexed
        
        emit DepositRequested(msg.sender, amount, queuePosition);
        return queuePosition;
    }

    /**
     * @notice Process withdrawal requests (can be called by anyone)
     * @param maxRequests Maximum number of requests to process in this call
     */
    function processWithdrawals(uint256 maxRequests) external nonReentrant notProcessing {
        require(maxRequests <= MAX_PROCESS_QUEUE_LENGTH, "Too many requests");
        require(!processingWithdrawals, "Withdrawal processing in progress");
        
        processingWithdrawals = true;
        
        uint256 processed = 0;
        // Include reserved assets in available amount since they can be used for withdrawals
        uint256 availableAssetsAmount = IERC20(asset()).balanceOf(address(this));
        
        // Start from the last processed index to avoid reprocessing
        uint256 examined = 0;
        for (uint256 i = lastProcessedWithdrawalIndex; i < withdrawalQueue.length && processed < maxRequests; i++) {
            IPassiveLiquidityVault.WithdrawalRequest storage request = withdrawalQueue[i];
            examined++;
            
            if (request.processed) {
                continue;
            }
            
            if (block.timestamp < request.timestamp + withdrawalDelay) {
                continue;
            }
            
            // Calculate withdrawal amount at processing time
            uint256 withdrawAmount = _convertToAssets(request.shares, Math.Rounding.Floor);
            
            // Check if we have enough liquidity
            if (withdrawAmount > availableAssetsAmount) {
                break; // Not enough liquidity
            }
            
            // Process withdrawal
            request.processed = true;
            availableAssetsAmount -= withdrawAmount;
            
            // Burn shares and transfer assets
            _burn(request.user, request.shares);
            
            // Reset user withdrawal index
            userWithdrawalIndex[request.user] = 0;
            
            // Transfer assets to user
            IERC20(asset()).safeTransfer(request.user, withdrawAmount);
            
            emit WithdrawalProcessed(request.user, request.shares, withdrawAmount);
            processed++;
        }
        
        // Update the last processed index to the current position
        lastProcessedWithdrawalIndex = lastProcessedWithdrawalIndex + examined;
        
        // Release the processing lock
        processingWithdrawals = false;
    }

    /**
     * @notice Process deposit requests (can be called by anyone)
     * @param maxRequests Maximum number of requests to process in this call
     */
    function processDeposits(uint256 maxRequests) external nonReentrant notProcessing {
        require(maxRequests <= MAX_PROCESS_QUEUE_LENGTH, "Too many requests");
        require(!processingDeposits, "Deposit processing in progress");
        
        processingDeposits = true;
        
        uint256 processed = 0;
        
        // Start from the last processed index to avoid reprocessing
        uint256 examined = 0;
        for (uint256 i = lastProcessedDepositIndex; i < depositQueue.length && processed < maxRequests; i++) {
            IPassiveLiquidityVault.DepositRequest storage request = depositQueue[i];
            examined++;
            
            if (request.processed) {
                continue;
            }
            
            // Calculate shares to mint (round down to favor vault - user gets fewer shares)
            uint256 shares = _convertToShares(request.amount, Math.Rounding.Floor);
            
            // Release reserved shares
            reservedShares -= shares;
            
            // Mint shares to user
            _mint(request.user, shares);
            
            // Mark as processed
            request.processed = true;
            
            // Reset user deposit index
            userDepositIndex[request.user] = 0;
            
            emit DepositProcessed(request.user, request.amount, shares);
            processed++;
        }
        
        // Update the last processed index to the current position
        lastProcessedDepositIndex = lastProcessedDepositIndex + examined;
        
        // Release the processing lock
        processingDeposits = false;
    }

    /**
     * @notice Emergency withdrawal (bypasses queue and delay)
     * @param shares Number of shares to withdraw
     */
    function emergencyWithdraw(uint256 shares) external nonReentrant {
        require(emergencyMode, "Emergency mode not active");
        require(shares > 0, "Invalid shares");
        require(balanceOf(msg.sender) >= shares, "Insufficient balance");
        
        uint256 withdrawAmount = _convertToAssets(shares, Math.Rounding.Floor);
        require(withdrawAmount <= _getAvailableAssets(), "Insufficient liquidity");
        
        _burn(msg.sender, shares);
        IERC20(asset()).safeTransfer(msg.sender, withdrawAmount);
        
        emit EmergencyWithdrawal(msg.sender, shares, withdrawAmount);
    }

    // ============ Manager Functions ============
    
    /**
     * @notice Approve funds usage to an external protocol
     * @param protocol Address of the target protocol (PredictionMarket)
     * @param amount Amount of assets to approve
     * @param data Calldata for the protocol interaction (e.g. mint()). Can be empty if not call
     */
    function approveFundsUsage(address protocol, uint256 amount, bytes calldata data) external onlyManager nonReentrant {
        require(protocol != address(0), "Invalid protocol");
        require(amount > 0, "Invalid amount");
        require(amount <= _getAvailableAssets(), "Insufficient available assets");
        
        // Check utilization rate limits
        uint256 currentUtilization = utilizationRate();
        uint256 newUtilization = ((_deployedLiquidity() + amount) * BASIS_POINTS) / totalAssets();
        require(newUtilization <= maxUtilizationRate, "Exceeds max utilization");
        
        // Update deployment info
        if (!isActiveProtocol[protocol]) {
            activeProtocols.push(protocol);
            isActiveProtocol[protocol] = true;
        }
        
        // Safe approval: reset to 0 first, then approve (prevents approval race conditions)
        IERC20(asset()).approve(protocol, 0);
        IERC20(asset()).approve(protocol, amount);
        
        // Call protocol function if data provided
        if (data.length > 0) {
            (bool success, ) = protocol.call(data);
            require(success, "Protocol call failed");
        }
        
        emit FundsDeployed(msg.sender, amount, protocol);
        emit UtilizationRateUpdated(currentUtilization, newUtilization);
    }

    // ============ Signature Functions ============

    function isValidSignature(bytes32 messageHash, bytes memory signature) public view returns (bytes4) {
        // check if the signer was the manager
        if (_isApprovalValid(messageHash, manager, signature)) {
            return IERC1271.isValidSignature.selector;
        }
        return 0xFFFFFFFF;
    }

    // ============ View Functions ============
    
    /**
     * @notice Get available assets for withdrawals
     * @return Available assets
     */
    function _getAvailableAssets() internal view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    /**
     * @notice Get pending withdrawal amount for a user
     * @param user User address
     * @return amount Pending withdrawal amount
     */
    function getPendingWithdrawal(address user) external view returns (uint256 amount) {
        uint256 index = userWithdrawalIndex[user];
        if (index == 0) return 0;
        
        IPassiveLiquidityVault.WithdrawalRequest storage request = withdrawalQueue[index - 1];
        if (request.processed) return 0;
        
        return _convertToAssets(request.shares, Math.Rounding.Floor);
    }

    /**
     * @notice Get withdrawal queue length
     * @return Length of withdrawal queue
     */
    function getWithdrawalQueueLength() external view returns (uint256) {
        return withdrawalQueue.length;
    }

    /**
     * @notice Get withdrawal request by index
     * @param index Index in withdrawal queue
     * @return request Withdrawal request data
     */
    function getWithdrawalRequest(uint256 index) external view returns (IPassiveLiquidityVault.WithdrawalRequest memory) {
        require(index < withdrawalQueue.length, "Invalid index");
        return withdrawalQueue[index];
    }

    /**
     * @notice Get number of active protocols
     * @return Number of active protocols
     */
    function getActiveProtocolsCount() external view returns (uint256) {
        return activeProtocols.length;
    }

    /**
     * @notice Get active protocol by index
     * @param index Index in active protocols array
     * @return protocol Protocol address
     */
    function getActiveProtocol(uint256 index) external view returns (address) {
        require(index < activeProtocols.length, "Invalid index");
        return activeProtocols[index];
    }

    /**
     * @notice Get pending deposit amount for a user
     * @param user User address
     * @return amount Pending deposit amount
     */
    function getPendingDeposit(address user) external view returns (uint256 amount) {
        uint256 index = userDepositIndex[user];
        if (index == 0) return 0;
        
        IPassiveLiquidityVault.DepositRequest storage request = depositQueue[index - 1];
        if (request.processed) return 0;
        
        return request.amount;
    }

    /**
     * @notice Get deposit queue length
     * @return Length of deposit queue
     */
    function getDepositQueueLength() external view returns (uint256) {
        return depositQueue.length;
    }

    /**
     * @notice Get deposit request by index
     * @param index Index in deposit queue
     * @return request Deposit request data
     */
    function getDepositRequest(uint256 index) external view returns (IPassiveLiquidityVault.DepositRequest memory) {
        require(index < depositQueue.length, "Invalid index");
        return depositQueue[index];
    }

    function getReservedAssets() external view returns (uint256) {
        return reservedAssets;
    }

    function getReservedShares() external view returns (uint256) {
        return reservedShares;
    }

    function isProcessingWithdrawals() external view returns (bool) {
        return processingWithdrawals;
    }

    function isProcessingDeposits() external view returns (bool) {
        return processingDeposits;
    }

    // ============ Admin Functions ============
    
    /**
     * @notice Set new manager
     * @param newManager Address of new manager
     */
    function setManager(address newManager) external onlyOwner {
        require(newManager != address(0), "Invalid manager");
        address oldManager = manager;
        manager = newManager;
        emit ManagerUpdated(oldManager, newManager);
    }

    /**
     * @notice Set maximum utilization rate
     * @param newMaxRate New maximum utilization rate (in basis points)
     */
    function setMaxUtilizationRate(uint256 newMaxRate) external onlyOwner {
        require(newMaxRate <= BASIS_POINTS, "Invalid rate");
        uint256 oldRate = maxUtilizationRate;
        maxUtilizationRate = newMaxRate;
        emit MaxUtilizationRateUpdated(oldRate, newMaxRate);
    }

    /**
     * @notice Set withdrawal delay
     * @param newDelay New withdrawal delay in seconds
     */
    function setWithdrawalDelay(uint256 newDelay) external onlyOwner {
        uint256 oldDelay = withdrawalDelay;
        withdrawalDelay = newDelay;
        emit WithdrawalDelayUpdated(oldDelay, newDelay);
    }

    /**
     * @notice Toggle emergency mode
     */
    function toggleEmergencyMode() external onlyOwner {
        emergencyMode = !emergencyMode;
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Internal Functions ============
    
    /**
     * @notice Remove protocol from active protocols list
     * @param protocol Protocol address to remove
     */
    function _removeActiveProtocol(address protocol) internal {
        for (uint256 i = 0; i < activeProtocols.length; i++) {
            if (activeProtocols[i] == protocol) {
                activeProtocols[i] = activeProtocols[activeProtocols.length - 1];
                activeProtocols.pop();
                isActiveProtocol[protocol] = false;
                break;
            }
        }
    }
}