// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";

/**
 * @title IPassiveLiquidityVault
 * @notice Interface for the ERC-4626 compliant PassiveLiquidityVault contract
 */
interface IPassiveLiquidityVault is IERC4626, IERC1271 {
    // ============ Structs ============
    struct WithdrawalRequest {
        address user;
        uint256 shares;
        uint256 timestamp;
        bool processed;
    }

    struct DepositRequest {
        address user;
        uint256 amount;
        uint256 timestamp;
        bool processed;
    }

    // ============ Events ============
    
    event WithdrawalRequested(address indexed user, uint256 shares, uint256 queuePosition);
    event WithdrawalProcessed(address indexed user, uint256 shares, uint256 amount);
    event DepositRequested(address indexed user, uint256 amount, uint256 queuePosition);
    event DepositProcessed(address indexed user, uint256 amount, uint256 shares);
    event FundsDeployed(address indexed manager, uint256 amount, address targetProtocol);
    event FundsRecalled(address indexed manager, uint256 amount, address targetProtocol);
    event UtilizationRateUpdated(uint256 oldRate, uint256 newRate);
    event EmergencyWithdrawal(address indexed user, uint256 shares, uint256 amount);
    event ManagerUpdated(address indexed oldManager, address indexed newManager);
    event MaxUtilizationRateUpdated(uint256 oldRate, uint256 newRate);
    event WithdrawalDelayUpdated(uint256 oldDelay, uint256 newDelay);

    // ============ State Variables ============
    
    function manager() external view returns (address);
    function maxUtilizationRate() external view returns (uint256);
    function utilizationRate() external view returns (uint256);
    function withdrawalDelay() external view returns (uint256);
    function availableAssets() external view returns (uint256);
    function totalDeployed() external view returns (uint256);
    function emergencyMode() external view returns (bool);
    function getReservedAssets() external view returns (uint256);
    function getReservedShares() external view returns (uint256);

    // ============ Custom Deposit/Withdrawal Functions ============
    
    function requestDeposit(uint256 amount) external returns (uint256 queuePosition);
    function processDeposits(uint256 maxRequests) external;
    function requestWithdrawal(uint256 shares) external returns (uint256 queuePosition);
    function processWithdrawals(uint256 maxRequests) external;
    function emergencyWithdraw(uint256 shares) external;

    // ============ Manager Functions ============
    
    // /**
    //  * @notice Approve funds usage to an external protocol
    //  * @param protocol Address of the target protocol (PredictionMarket)
    //  * @param amount Amount of assets to approve
    //  * @param (optional) data Calldata for the protocol interaction (e.g. mint()). Can be empty if not call
    //  */
    function approveFundsUsage(address protocol, uint256 amount, bytes calldata data) external;

    // ============ View Functions ============
    
    function getPendingWithdrawal(address user) external view returns (uint256 amount);
    function getWithdrawalQueueLength() external view returns (uint256);
    function getWithdrawalRequest(uint256 index) external view returns (WithdrawalRequest memory);
    function getActiveProtocolsCount() external view returns (uint256);
    function getActiveProtocol(uint256 index) external view returns (address);
    function getPendingDeposit(address user) external view returns (uint256 amount);
    function getDepositQueueLength() external view returns (uint256);
    function getDepositRequest(uint256 index) external view returns (DepositRequest memory);

    // ============ Admin Functions ============
    
    function setManager(address newManager) external;
    function setMaxUtilizationRate(uint256 newMaxRate) external;
    function setWithdrawalDelay(uint256 newDelay) external;
    function toggleEmergencyMode() external;
    function pause() external;
    function unpause() external;

    // ============ Additional Functions Available in Contract ============
    // Note: The following functions are implemented in the contract but not declared in this interface
    
    // ERC-4626 Standard Functions (inherited from IERC4626)
    // function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    // function mint(uint256 shares, address receiver) external returns (uint256 assets);
    // function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    // function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    // function totalAssets() external view returns (uint256);
    
    // IERC1271 Signature Validation Function
    // function isValidSignature(bytes32 messageHash, bytes memory signature) external view returns (bytes4);
}