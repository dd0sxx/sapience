// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IPredictionStructs.sol";

/**
 * @title IPredictionEvents
 * @notice Interface containing all prediction-related events
 */
interface IPredictionEvents {
    // ============ Events ============

    event PredictionMinted(
        address indexed maker,
        address indexed taker,
        bytes encodedPredictedOutcomes,
        uint256 makerNftTokenId,
        uint256 takerNftTokenId,
        uint256 makerCollateral, // locked in the pool from maker
        uint256 takerCollateral, // delta paid by taker to reach the payout amount
        uint256 totalCollateral, // total payout to the winner,
        bytes32 refCode
    );

    event PredictionBurned(
        address indexed maker,
        address indexed taker,
        bytes encodedPredictedOutcomes,
        uint256 makerNftTokenId,
        uint256 takerNftTokenId,
        uint256 totalCollateral,
        bool makerWon,
        bytes32 refCode
    );

    event PredictionConsolidated(
        uint256 indexed makerNftTokenId,
        uint256 indexed takerNftTokenId,
        uint256 totalCollateral,
        bytes32 refCode
    );
}
