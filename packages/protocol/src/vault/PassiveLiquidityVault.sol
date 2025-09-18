// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/*
intend to deposit / withdraw => min shares, collateral (shares) are moved to the contract
execute deposit/withdraw => sent by the manager with a price  (no minumum time)
expiration time => configurable => if not executed, the user can remove the intent

if at the time of execution the price is not good for the vault, the intent is removed and collateral/shares sent back to the user



delay between last interaction from the user on deposits and withdrawals

*/

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
 * @notice An ERC-4626 semi-compliant passive liquidity vault that allows users to deposit assets and earn yield through EOA-managed protocol interactions
 * 
 * HOW IT WORKS:
 * 1. Users deposit ERC-20 tokens into a queue system and receive vault shares after processing (1:1 initially)
 * 2. A designated EOA manager deploys vault funds to external protocols (lending, DEXs, etc.) to generate yield
 * 3. Users can request withdrawals, which are queued with a configurable delay to prevent bank runs
 * 4. Both deposits and withdrawals are processed when liquidity is available, maintaining fair first-come-first-served order
 * 5. The vault tracks utilization rate to prevent over-leverage and includes emergency mechanisms
 * 
 * KEY FEATURES:
 * - ERC-4626 standard (semi-compliant) for DeFi interoperability
 * - Queued deposit and withdrawal system for better liquidity management
 * - Utilization rate limits (default 80%) to control risk exposure
 * - Withdrawal delay (default 1 day) to prevent bank runs
 * - Emergency mode for immediate withdrawals during crises
 * - EOA manager can deploy/recall funds to any protocol with custom calldata
 * - Comprehensive access controls and safety mechanisms
 * - Custom errors for gas-efficient error handling
 * 
 * @dev Implements utilization rate management, queued deposit/withdrawal system, and EOA-controlled fund deployment with custom errors
 */
contract PassiveLiquidityVault is ERC4626, IPassiveLiquidityVault, Ownable2Step, ReentrancyGuard, Pausable, SignatureProcessor {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ============ Custom Errors ============
    
    // Non ERC-4626 compliant errors
    error NotImplemented();

    // Access control errors
    error OnlyManager(address caller, address expectedManager);
    error OnlyOwner(address caller, address owner);
    
    // Validation errors
    error InvalidAsset(address asset);
    error InvalidManager(address manager);
    error InvalidProtocol(address protocol);
    error InvalidAmount(uint256 amount);
    error InvalidShares(uint256 shares);
    error InvalidRate(uint256 rate, uint256 maxRate);
    error InvalidIndex(uint256 index, uint256 length);
    
    // State errors
    error EmergencyModeActive();
    error ProcessingInProgress(bool pendingRequests);
    error InsufficientBalance(address user, uint256 requested, uint256 available);
    error InsufficientAvailableAssets(uint256 requested, uint256 available);
    error ExceedsMaxUtilization(uint256 current, uint256 max);
    error AmountTooSmall(uint256 amount, uint256 minimum);
    
    // Queue errors
    error NoPendingRequests(address user);
    error NoPendingWithdrawal(address user);
    error NoPendingDeposit(address user);
    error PendingRequestNotProcessed(address user);
    error ProcessingRequestsInProgress();
    error TransferFailed(uint256 balanceBefore, uint256 amount, uint256 balanceAfter);
    error RequestNotExpired();
    error InteractionDelayNotExpired();
    
    // Emergency errors
    error EmergencyModeNotActive();
    
    // ============ Events ============
    // Events are defined in the IPassiveLiquidityVault interface

    // ============ State Variables ============
    
    /// @notice The EOA manager who can deploy funds to other protocols
    address public manager;
    
    /// @notice Maximum utilization rate (in basis points, e.g., 8000 = 80%)
    uint256 public maxUtilizationRate = 8000; // 80%
    
    /// @notice Interaction delay in seconds for users (deposits and withdrawals)(default: 1 day)
    uint256 public interactionDelay = 1 days;

    /// @notice Expiration time in seconds for user requests (default: 10 minutes)
    uint256 public expirationTime = 10 minutes;
    
    /// @notice Mapping of user to their last interaction timestamp
    mapping(address => uint256) public lastUserInteractionTimestamp;

    /// @notice List of active protocol addresses
    address[] public activeProtocols;
    
    /// @notice Mapping to check if protocol is in active list
    mapping(address => bool) public isActiveProtocol;
    
    /// @notice Emergency mode flag
    bool public emergencyMode = false;
    
    /// @notice Basis points denominator (10000 = 100%)
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Minimum deposit amount. Used also as min withdrawal amount unless available is less than minimum. A large enough amount to prevent DoS attacks on deposits or withdrawals
    uint256 public constant MIN_DEPOSIT = 100e18; // 100 token (assuming 18 decimals)

    /// @notice Total assets reserved for pending requests
    uint256 private unconfirmedAssets = 0;
    
    /// @notice Total shares reserved for pending requests
    uint256 private unconfirmedShares = 0;

    /// @notice Mapping of user to their pending request
    mapping(address => PendingRequest) public pendingRequests;

    bool private processingRequests = false;
    
    // ============ Modifiers ============
    
    modifier onlyManager() {
        if (msg.sender != manager) revert OnlyManager(msg.sender, manager);
        _;
    }
    
    modifier notEmergency() {
        if (emergencyMode) revert EmergencyModeActive();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _asset,
        address _manager,
        string memory _name,
        string memory _symbol
    ) ERC4626(IERC20(_asset)) ERC20(_name, _symbol) Ownable(msg.sender) SignatureProcessor() {
        if (_asset == address(0)) revert InvalidAsset(_asset);
        if (_manager == address(0)) revert InvalidManager(_manager);
        
        manager = _manager;
    }

    // ============ ERC-4626 Overrides ============
    
    function deposit(uint256 /* assets */, address /* receiver */) public override(ERC4626, IERC4626) returns (uint256 shares) {
        revert NotImplemented();
    }

    function mint(uint256 /* shares */, address /* receiver */) public override(ERC4626, IERC4626) returns (uint256 assets) {
        revert NotImplemented();
    }

    function withdraw(uint256 /* assets */, address /* receiver */, address owner) public override(ERC4626, IERC4626) returns (uint256 shares) {
        revert NotImplemented();
    }

    function redeem(uint256 /* shares */, address /* receiver */, address owner) public override(ERC4626, IERC4626) returns (uint256 assets) {
        revert NotImplemented();
    }

    function totalAssets() public view override(ERC4626, IERC4626) returns (uint256) {
        revert NotImplemented();
        // return IERC20(asset()).balanceOf(address(this)) + _deployedLiquidity();
    }

    function previewDeposit(uint256 assets) public view override(ERC4626, IERC4626) returns (uint256 shares) {
        revert NotImplemented();
    }

    function previewMint(uint256 shares) public view override(ERC4626, IERC4626) returns (uint256 assets) {
        revert NotImplemented();
    }

    // ============ Custom totals, Withdrawal and Deposit Functions ============

    function availableAssets() public view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    function totalDeployed() external view returns (uint256) {
        return _deployedLiquidity();
    }

    function utilizationRate() external view returns (uint256) {
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
            totalDeployedAmount += pm.getUserCollateralDeposits(address(this));
        }
        return totalDeployedAmount;
    }
    
    /**
     * @notice Request withdrawal of shares (function for direct calls)
     * @param shares Number of shares to withdraw
     * @param expectedAssets Expected assets to receive
     */
    function requestWithdrawal(uint256 shares, uint256 expectedAssets) external nonReentrant whenNotPaused {
        if (shares == 0) revert InvalidShares(shares);
        if (balanceOf(msg.sender) < shares) revert InsufficientBalance(msg.sender, shares, balanceOf(msg.sender));
        if (lastUserInteractionTimestamp[msg.sender] + interactionDelay > block.timestamp) revert InteractionDelayNotExpired();
        if (pendingRequests[msg.sender].user == msg.sender && !pendingRequests[msg.sender].processed) revert PendingRequestNotProcessed(msg.sender);

        // Revert if withdrawal is small unless it's the full balance
        if(shares < balanceOf(msg.sender) && expectedAssets < MIN_DEPOSIT) revert AmountTooSmall(expectedAssets, MIN_DEPOSIT);

        pendingRequests[msg.sender] = IPassiveLiquidityVault.PendingRequest({
            user: msg.sender,
            isDeposit: false,
            shares: shares,
            assets: expectedAssets,
            timestamp: block.timestamp,
            processed: false
        });
        
        emit PendingRequestCreated(msg.sender, false, shares, expectedAssets);
    }

    function requestDeposit(uint256 assets, uint256 expectedShares) external nonReentrant whenNotPaused notEmergency {
        if (assets < MIN_DEPOSIT) revert AmountTooSmall(assets, MIN_DEPOSIT);
        if (lastUserInteractionTimestamp[msg.sender] + interactionDelay > block.timestamp) revert InteractionDelayNotExpired();
        if (pendingRequests[msg.sender].user == msg.sender && !pendingRequests[msg.sender].processed) revert PendingRequestNotProcessed(msg.sender);
        
        // Transfer assets from user to vault
        uint256 balanceBefore = IERC20(asset()).balanceOf(address(this));
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);
        uint256 balanceAfter = IERC20(asset()).balanceOf(address(this));
        if (balanceBefore + assets != balanceAfter) revert TransferFailed(balanceBefore, assets, balanceAfter);

        pendingRequests[msg.sender] = IPassiveLiquidityVault.PendingRequest({
            user: msg.sender,
            isDeposit: true,
            shares: expectedShares,
            assets: assets,
            timestamp: block.timestamp,
            processed: false
        });

        unconfirmedAssets += assets;

        lastUserInteractionTimestamp[msg.sender] = block.timestamp;
        
        emit PendingRequestCreated(msg.sender, true, expectedShares, assets);
    }

    function cancelWithdrawal() external nonReentrant {
        PendingRequest storage request = pendingRequests[msg.sender];
        if (request.user == address(0) || request.processed) revert NoPendingRequests(msg.sender);
        if (request.isDeposit) revert NoPendingWithdrawal(msg.sender);
        if (request.timestamp + expirationTime > block.timestamp) revert RequestNotExpired();

        request.user = address(0);

        emit PendingRequestCancelled(msg.sender, false, request.shares, request.assets);
    }

    function cancelDeposit() external nonReentrant {
        PendingRequest storage request = pendingRequests[msg.sender];
        if (request.user == address(0) || request.processed) revert NoPendingRequests(msg.sender);
        if (!request.isDeposit) revert NoPendingDeposit(msg.sender);
        if (request.timestamp + expirationTime > block.timestamp) revert RequestNotExpired();

        request.user = address(0);
        unconfirmedAssets -= request.assets;

        // Transfer assets from vault to user
        uint256 balanceBefore = IERC20(asset()).balanceOf(address(this));
        IERC20(asset()).safeTransfer(msg.sender, request.assets);
        uint256 balanceAfter = IERC20(asset()).balanceOf(address(this));
        if (balanceBefore != request.assets + balanceAfter) revert TransferFailed(balanceBefore, request.assets, balanceAfter);

        emit PendingRequestCancelled(msg.sender, true, request.shares, request.assets);
    }

    function processDeposit(address requestedBy) external nonReentrant {
        // Check if the processing is already in progress
        if (processingRequests) revert ProcessingRequestsInProgress();
        processingRequests = true;

        // Check if the caller is the manager
        if (msg.sender != manager) revert OnlyManager(msg.sender, manager);

        PendingRequest storage request = pendingRequests[requestedBy];
        if (request.user == address(0) || request.processed) revert NoPendingRequests(requestedBy);
        if (!request.isDeposit) revert NoPendingDeposit(requestedBy);
        
        request.processed = true;
        unconfirmedAssets -= request.assets;

        _mint(requestedBy, request.shares);
        
        emit PendingRequestProcessed(requestedBy, true, request.shares, request.assets);

        // Release the processing lock
        processingRequests = false;
    }

    function processWithdrawal(address requestedBy) external nonReentrant {
        // Check if the processing is already in progress
        if (processingRequests) revert ProcessingRequestsInProgress();
        processingRequests = true;

        // Check if the caller is the manager
        if (msg.sender != manager) revert OnlyManager(msg.sender, manager);

        PendingRequest storage request = pendingRequests[requestedBy];
        if (request.user == address(0) || request.processed) revert NoPendingRequests(requestedBy);
        if (request.isDeposit) revert NoPendingWithdrawal(requestedBy);
    
        request.processed = true;
        _burn(requestedBy, request.shares);
        
        // Transfer assets from vault to user
        uint256 balanceBefore = IERC20(asset()).balanceOf(address(this));
        IERC20(asset()).safeTransfer(request.user, request.assets);
        uint256 balanceAfter = IERC20(asset()).balanceOf(address(this));
        if (balanceBefore != request.assets + balanceAfter) revert TransferFailed(balanceBefore, request.assets, balanceAfter);
    
        emit PendingRequestProcessed(requestedBy, false, request.shares, request.assets);

        // Release the processing lock
        processingRequests = false;
    }

    /**
     * @notice Emergency withdrawal (bypasses delay but uses just the vault's balance)
     * @param shares Number of shares to withdraw
     */
    function emergencyWithdraw(uint256 shares) external nonReentrant {
        if (!emergencyMode) revert EmergencyModeNotActive();
        if (shares == 0) revert InvalidShares(shares);
        if (balanceOf(msg.sender) < shares) revert InsufficientBalance(msg.sender, shares, balanceOf(msg.sender));

        // Convert shares to assets using just the vault's balance and not the total assets
        uint256 vaultBalance = _getAvailableAssets();
        uint256 withdrawAmount = Math.mulDiv(shares, vaultBalance, totalSupply(), Math.Rounding.Floor);

        if (withdrawAmount > vaultBalance) revert InsufficientAvailableAssets(withdrawAmount, vaultBalance);
        
        _burn(msg.sender, shares);
        uint256 balanceBefore = IERC20(asset()).balanceOf(address(this));
        IERC20(asset()).safeTransfer(msg.sender, withdrawAmount);
        uint256 balanceAfter = IERC20(asset()).balanceOf(address(this));
        if (balanceBefore != withdrawAmount + balanceAfter) revert TransferFailed(balanceBefore, withdrawAmount, balanceAfter);
        
        emit EmergencyWithdrawal(msg.sender, shares, withdrawAmount);
    }

    // ============ Manager Functions ============
    
    /**
     * @notice Approve funds usage to an external protocol
     * @param protocol Address of the target protocol (PredictionMarket)
     * @param amount Amount of assets to approve
     */
    function approveFundsUsage(address protocol, uint256 amount) external onlyManager nonReentrant {
        if (protocol == address(0)) revert InvalidProtocol(protocol);
        if (amount == 0) revert InvalidAmount(amount);
        if (amount > _getAvailableAssets()) revert InsufficientAvailableAssets(amount, _getAvailableAssets());
        
        // Check utilization rate limits
        uint256 currentUtilization = this.utilizationRate();
        uint256 totalAssetsValue = availableAssets() + _deployedLiquidity();
        uint256 newUtilization = ((_deployedLiquidity() + amount) * BASIS_POINTS) / totalAssetsValue;
        if (newUtilization > maxUtilizationRate) revert ExceedsMaxUtilization(newUtilization, maxUtilizationRate);
        
        // Update deployment info
        if (!isActiveProtocol[protocol]) {
            activeProtocols.push(protocol);
            isActiveProtocol[protocol] = true;
        }
        
        IERC20(asset()).forceApprove(protocol, amount);
        
        emit FundsApproved(msg.sender, amount, protocol);
        emit UtilizationRateUpdated(currentUtilization, newUtilization);
    }

    // ============ Signature Functions ============

    function isValidSignature(bytes32 messageHash, bytes memory signature) external view returns (bytes4) {
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
        if (index >= activeProtocols.length) revert InvalidIndex(index, activeProtocols.length);
        return activeProtocols[index];
    }

    // ============ Admin Functions ============
    
    /**
     * @notice Set new manager
     * @param newManager Address of new manager
     */
    function setManager(address newManager) external onlyOwner {
        if (newManager == address(0)) revert InvalidManager(newManager);
        address oldManager = manager;
        manager = newManager;
        emit ManagerUpdated(oldManager, newManager);
    }

    /**
     * @notice Set maximum utilization rate
     * @param newMaxRate New maximum utilization rate (in basis points)
     */
    function setMaxUtilizationRate(uint256 newMaxRate) external onlyOwner {
        if (newMaxRate > BASIS_POINTS) revert InvalidRate(newMaxRate, BASIS_POINTS);
        uint256 oldRate = maxUtilizationRate;
        maxUtilizationRate = newMaxRate;
        emit UtilizationRateUpdated(oldRate, newMaxRate);
    }

    /**
     * @notice Set withdrawal delay
     * @param newDelay New withdrawal delay in seconds
     */
    function setInteractionDelay(uint256 newDelay) external onlyOwner {
        uint256 oldDelay = interactionDelay;
        interactionDelay = newDelay;
        emit InteractionDelayUpdated(oldDelay, newDelay);
    }

    /**
     * @notice Set expiration time
     * @param newExpirationTime New expiration time in seconds
     */
    function setExpirationTime(uint256 newExpirationTime) external onlyOwner {
        uint256 oldExpirationTime = expirationTime;
        expirationTime = newExpirationTime;
        emit ExpirationTimeUpdated(oldExpirationTime, newExpirationTime);
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