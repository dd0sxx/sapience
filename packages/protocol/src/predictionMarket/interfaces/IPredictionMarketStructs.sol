// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IPredictionMarketStructs
 * @notice Interface containing all prediction-related structs
 */
interface IPredictionMarketStructs {
    // ============ Structs ============
    struct MarketConfig {
        address collateralToken;
        uint256 minCollateral;
    }

    struct MatchedPositions {
        uint256 predictionId;
        address verifier;
        address long;
        address short;
        bytes encodedOutcomes;
        uint256 longNftTokenId;
        uint256 shortNftTokenId;
        uint256 collateralLong;
        uint256 collateralShort;
        bool isSettled;
        bool didLongWin;
    }

    struct OpenPositionsRequest {
        bytes encodedOutcomes;
        address verifier;
        uint256 collateralLong;
        uint256 collateralShort;
        address long;
        address short;
        bytes shortSignature;
        uint256 shortDeadline;
        bytes32 referralCode;
    }
}


