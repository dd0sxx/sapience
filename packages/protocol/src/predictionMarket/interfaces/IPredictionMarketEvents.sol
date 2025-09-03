// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IPredictionMarketStructs.sol";

/**
 * @title IPredictionMarketEvents
 * @notice Interface containing all prediction-related events
 */
interface IPredictionMarketEvents {
    // ============ Events ============

    event PositionsOpened(
        address indexed long,
        address indexed short,
        uint256 longNftTokenId,
        uint256 shortNftTokenId,
        uint256 collateralLong,
        uint256 collateralShort,
        uint256 totalCollateral, // total payout to the winner,
        bytes32 referralCode
    );

    event PositionsResolved(
        address indexed long,
        address indexed short,
        uint256 longNftTokenId,
        uint256 shortNftTokenId,
        uint256 totalCollateral,
        bool didLongWin,
        bytes32 referralCode
    );

    event PositionsClosed(
        uint256 indexed longNftTokenId,
        uint256 indexed shortNftTokenId,
        uint256 totalCollateral,
        bytes32 referralCode
    );
}


