// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IPredictionMarket.sol";
import "./interfaces/IPredictionMarketStructs.sol";
import "./interfaces/IPredictionMarketVerifier.sol";
import "./interfaces/IPredictionMarketEvents.sol";
import "./utils/SignatureProcessor.sol";
import "../market/interfaces/ISapience.sol";
import "../market/interfaces/ISapienceStructs.sol";

/**
 * @title PredictionMarket
 * @notice Implementation of the Prediction Market contract with orderbook functionality
 */
contract PredictionMarket is
    ERC721,
    IPredictionMarket,
    ReentrancyGuard,
    SignatureProcessor
{
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;

    // ============ Custom Errors ============
    error InvalidCollateralToken();
    error InvalidMinCollateral();
    error LongIsNotCaller();
    error CollateralBelowMinimum();
    error LongCollateralMustBeGreaterThanZero();
    error ShortCollateralMustBeGreaterThanZero();
    error InvalidShortSignature();
    error InvalidMarketsAccordingToVerifier();
    error PredictionNotFound();
    error OutcomeVerificationFailed();
    error LongAndShortAreDifferent();
    error PredictionDoesNotExist();
    error TakerDeadlineExpired();

    // ============ State Variables ============
    IPredictionMarketStructs.MarketConfig public config;

    // ============ Counters ============
    uint256 private _predictionIdCounter; // Single ID for both requests and predictions
    uint256 private _nftTokenIdCounter; // Single counter for both long and short NFTs

    // ============ Mappings ============
    mapping(uint256 => IPredictionMarketStructs.MatchedPositions) private predictions;

    mapping(uint256 => uint256) private nftToPredictionId; // nftTokenId => predictionId

    // (no auxiliary owner mappings; use ERC721Enumerable)

    // ============ Constructor ============

    constructor(
        string memory name,
        string memory symbol,
        address _collateralToken,
        uint256 _minCollateral
    ) ERC721(name, symbol) {
        if (_collateralToken == address(0)) revert InvalidCollateralToken();
        if (_minCollateral == 0) revert InvalidMinCollateral();

        config = IPredictionMarketStructs.MarketConfig({
            collateralToken: _collateralToken,
            minCollateral: _minCollateral
        });

        _predictionIdCounter = 0;
        _nftTokenIdCounter = 0;
    }

    function mint(
        IPredictionMarketStructs.OpenPositionsRequest
            calldata mintPredictionRequestData
    )
        external
        nonReentrant
        returns (uint256 longNftTokenId, uint256 shortNftTokenId)
    {
        // 1- Initial checks
        if (mintPredictionRequestData.long != msg.sender) revert LongIsNotCaller();
        if (mintPredictionRequestData.shortDeadline < block.timestamp) revert TakerDeadlineExpired();   

        if (mintPredictionRequestData.collateralLong < config.minCollateral) revert CollateralBelowMinimum();
        if (mintPredictionRequestData.collateralLong == 0) revert LongCollateralMustBeGreaterThanZero();
        if (mintPredictionRequestData.collateralShort == 0) revert ShortCollateralMustBeGreaterThanZero();

        // 2- Confirm the short signature is valid for this prediction (hash of predicted outcomes, short collateral and long collateral, verifier and long address)
        bytes32 messageHash = keccak256(
            abi.encode(
                mintPredictionRequestData.encodedOutcomes,
                mintPredictionRequestData.collateralShort,
                mintPredictionRequestData.collateralLong,
                mintPredictionRequestData.verifier,
                mintPredictionRequestData.long,
                mintPredictionRequestData.shortDeadline
            )
        );

        if (
            !_isApprovalValid(
                messageHash,
                mintPredictionRequestData.short,
                mintPredictionRequestData.shortSignature
            )
        ) {
            revert InvalidShortSignature();
        }

        // 3- Ask verifier if markets are OK
        (bool isValid, ) = IPredictionMarketVerifier(
            mintPredictionRequestData.verifier
        ).validatePredictionMarkets(
                mintPredictionRequestData.encodedOutcomes
            );

        if (!isValid) revert InvalidMarketsAccordingToVerifier();

        // 4- Set the prediction data
        uint256 predictionId = _predictionIdCounter++;

        longNftTokenId = _nftTokenIdCounter++;
        shortNftTokenId = _nftTokenIdCounter++;
        predictions[predictionId] = IPredictionMarketStructs.MatchedPositions({
            encodedOutcomes: mintPredictionRequestData
                .encodedOutcomes,
            predictionId: predictionId,
            verifier: mintPredictionRequestData.verifier,
            long: mintPredictionRequestData.long,
            short: mintPredictionRequestData.short,
            longNftTokenId: longNftTokenId,
            shortNftTokenId: shortNftTokenId,
            collateralLong: mintPredictionRequestData.collateralLong,
            collateralShort: mintPredictionRequestData.collateralShort,
            isSettled: false,
            didLongWin: false
        });

        // 5- Collact collateral
        IERC20(config.collateralToken).safeTransferFrom(
            mintPredictionRequestData.long,
            address(this),
            mintPredictionRequestData.collateralLong
        );
        IERC20(config.collateralToken).safeTransferFrom(
            mintPredictionRequestData.short,
            address(this),
            mintPredictionRequestData.collateralShort
        );

        // 6- Mint NFTs and set prediction
        _safeMint(mintPredictionRequestData.long, longNftTokenId);
        _safeMint(mintPredictionRequestData.short, shortNftTokenId);

        // 7- Set NFT mappings
        nftToPredictionId[longNftTokenId] = predictionId;
        nftToPredictionId[shortNftTokenId] = predictionId;

        // 8- Enumeration handled by ERC721Enumerable

        // 9- Create and store prediction data
        predictions[predictionId]
            .encodedOutcomes = mintPredictionRequestData
            .encodedOutcomes;
        predictions[predictionId].verifier = mintPredictionRequestData.verifier;
        predictions[predictionId].long = mintPredictionRequestData.long;
        predictions[predictionId].short = mintPredictionRequestData.short;
        predictions[predictionId].longNftTokenId = longNftTokenId;
        predictions[predictionId].shortNftTokenId = shortNftTokenId;
        predictions[predictionId].collateralLong = mintPredictionRequestData
            .collateralLong;
        predictions[predictionId].collateralShort = mintPredictionRequestData
            .collateralShort;
        predictions[predictionId].isSettled = false;
        predictions[predictionId].didLongWin = false;

        emit PositionsOpened(
            mintPredictionRequestData.long,
            mintPredictionRequestData.short,
            longNftTokenId,
            shortNftTokenId,
            mintPredictionRequestData.collateralLong,
            mintPredictionRequestData.collateralShort,
            mintPredictionRequestData.collateralLong +
                mintPredictionRequestData.collateralShort,
            mintPredictionRequestData.referralCode
        );

        return (longNftTokenId, shortNftTokenId);
    }

    function burn(uint256 tokenId, bytes32 referralCode) external nonReentrant {
        uint256 predictionId = nftToPredictionId[tokenId];

        // 1- Get prediction from Store
        IPredictionMarketStructs.MatchedPositions memory prediction = predictions[
            predictionId
        ];

        // 2- Initial checks
        if (prediction.long == address(0)) revert PredictionNotFound();
        if (prediction.short == address(0)) revert PredictionNotFound();

        // 3- Ask verifier if all referenced markets have settled and verify predicted outcomes determine if long won
        (bool isValid, , bool didLongWin) = IPredictionMarketVerifier(
            prediction.verifier
        ).resolvePrediction(prediction.encodedOutcomes);

        if (!isValid) revert OutcomeVerificationFailed();

        // 4- Send collateral to winner
        uint256 payout = prediction.collateralLong +
            prediction.collateralShort;
        address winner = didLongWin ? prediction.long : prediction.short;
        IERC20(config.collateralToken).safeTransfer(winner, payout);

        // 5- Set the prediction state (identify who won and set as closed)
        prediction.isSettled = true;
        prediction.didLongWin = didLongWin;

        // 6- Burn NFTs
        _burn(prediction.longNftTokenId);
        _burn(prediction.shortNftTokenId);

        emit PositionsResolved(
            prediction.long,
            prediction.short,
            prediction.longNftTokenId,
            prediction.shortNftTokenId,
            payout,
            didLongWin,
            referralCode
        );
    }

    // ============ Prediction Consolidation (pre-close) ============
    function consolidatePrediction(
        uint256 tokenId,
        bytes32 referralCode
    ) external nonReentrant {
        uint256 predictionId = nftToPredictionId[tokenId];

        // 1- Get prediction from store
        IPredictionMarketStructs.MatchedPositions memory prediction = predictions[
            predictionId
        ];

        // 2- Initial checks
        if (prediction.long == address(0)) revert PredictionNotFound();
        if (prediction.short == address(0)) revert PredictionNotFound();

        if (prediction.long != prediction.short) revert LongAndShortAreDifferent();

        // 3- Set as settled and long won and send the collateral to the long
        prediction.isSettled = true;
        prediction.didLongWin = true;
        uint256 payout = prediction.collateralLong +
            prediction.collateralShort;
        IERC20(config.collateralToken).safeTransfer(prediction.long, payout);

        // 4- Burn NFTs
        _burn(prediction.longNftTokenId);
        _burn(prediction.shortNftTokenId);

        emit PositionsClosed(
            prediction.longNftTokenId,
            prediction.shortNftTokenId,
            payout,
            referralCode
        );
    }

    // ============ View Functions ============

    function getConfig()
        external
        view
        returns (IPredictionMarketStructs.MarketConfig memory)
    {
        return config;
    }

    function getPrediction(
        uint256 tokenId
    )
        external
        view
        returns (IPredictionMarketStructs.MatchedPositions memory predictionData)
    {
        uint256 predictionId = nftToPredictionId[tokenId];
        if (predictionId == 0 || !_isPrediction(predictionId)) revert PredictionDoesNotExist();

        predictionData = predictions[predictionId];
    }

    // Removed: use ERC-721 Enumerable interfaces off-chain

    // ============ Internal Functions ============

    function _isPrediction(uint256 id) internal view returns (bool) {
        return
            predictions[id].long != address(0) &&
            predictions[id].short != address(0);
    }
}
