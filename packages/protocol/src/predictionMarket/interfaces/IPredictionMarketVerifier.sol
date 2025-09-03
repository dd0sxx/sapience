// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IPredictionMarketStructs.sol";

/**
 * @title IPredictionMarketVerifier
 */
interface IPredictionMarketVerifier {
    enum Error {
        NO_ERROR,
        INVALID_MARKET_GROUP,
        INVALID_MARKET,
        MARKET_SETTLED,
        MARKET_NOT_SETTLED
    }

    function validatePredictionMarkets(
        bytes calldata encodedOutcomes
    ) external view returns (bool isValid, Error error);

    function resolvePrediction(
        bytes calldata encodedOutcomes
    ) external view returns (bool isValid, Error error, bool didLongWin);
}


