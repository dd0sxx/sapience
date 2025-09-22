// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./IPredictionStructs.sol";
import "./IPredictionEvents.sol";
import "./IPredictionMarketLimitOrder.sol";
import "./IPredictionMarketRFQ.sol";

/**
 * @title IPredictionMarket
 * @notice Main interface for the Prediction Market contract
 */
interface IPredictionMarket is
    IERC721,
    IPredictionStructs,
    IPredictionEvents,
    IPredictionMarketRFQ,
    IPredictionMarketLimitOrder
{
    // ============ View Functions ============

    /**
     * @notice Get the pool configuration
     * @return config Pool configuration
     */
    function getConfig()
        external
        view
        returns (IPredictionStructs.Settings memory config);

    /**
     * @notice Get prediction information
     * @param tokenId NFT token ID
     * @return predictionData Prediction details
     */
    function getPrediction(
        uint256 tokenId
    )
        external
        view
        returns (IPredictionStructs.PredictionData memory predictionData);

    /**
     * @notice Get total number of NFT IDs where `account` is the maker or taker
     * @param account Address to filter by
     */
    function getOwnedPredictionsCount(
        address account
    ) external view returns (uint256 count);

    /**
     * @notice Get all NFT IDs where `account` is the maker or taker
     * @param account Address to filter by
     */
    function getOwnedPredictions(
        address account
    ) external view returns (uint256[] memory nftTokenIds);

    /**
     * @notice Get the total collateral deposited by a user
     * @param user The address of the user
     * @return The total amount of collateral deposited by the user
     */
    function getUserCollateralDeposits(
        address user
    ) external view returns (uint256);
}
