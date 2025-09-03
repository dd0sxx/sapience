// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../src/predictionMarket/interfaces/IPredictionMarketVerifier.sol";
import "../../src/predictionMarket/interfaces/IPredictionMarketStructs.sol";

contract MockVerifier is IPredictionMarketVerifier {
    bool public shouldValidate = true;
    bool public longWon = true;

    function setShouldValidate(bool _shouldValidate) external {
        shouldValidate = _shouldValidate;
    }

    function setLongWon(bool _longWon) external {
        longWon = _longWon;
    }

    function validatePredictionMarkets(
        bytes calldata
    ) external view returns (bool, Error) {
        return (shouldValidate, Error.NO_ERROR);
    }

    function resolvePrediction(
        bytes calldata
    ) external view returns (bool, Error, bool) {
        // Mock implementation - does nothing
        return (shouldValidate, Error.NO_ERROR, longWon);
    }
}
