// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IParlayPool.sol";
import "./interfaces/IParlayNFT.sol";
import "../market/interfaces/ISapience.sol";
import "../market/interfaces/ISapienceStructs.sol";

/**
 * @title ParlayPool
 * @notice Implementation of the Parlay Pool contract with orderbook functionality
 */
contract ParlayPool is IParlayPool, ReentrancyGuard {
    using SafeERC20 for IERC20;
    // ============ State Variables ============

    Settings public config;

    uint256 private _requestIdCounter;
    uint256 private _playerNftCounter;
    uint256 private _lpNftCounter;

    // Mapping from request ID to parlay request
    mapping(uint256 => ParlayRequest) public parlayRequests;

    // Mapping from NFT token ID to parlay
    mapping(uint256 => Parlay) public parlays;

    // Mapping from LP address to amount used in unsettled parlays
    mapping(address => uint256) public lpUsedAmounts;

    // Mapping from NFT token ID to payout amount
    mapping(uint256 => uint256) public parlayPayouts;

    // ============ Modifiers ============

    modifier onlyValidRequest(uint256 requestId) {
        require(
            parlayRequests[requestId].player != address(0),
            "Request does not exist"
        );
        _;
    }

    modifier onlyRequestPlayer(uint256 requestId) {
        require(
            parlayRequests[requestId].player == msg.sender,
            "Only request player can call"
        );
        _;
    }

    modifier onlyValidParlay(uint256 tokenId) {
        require(
            parlays[tokenId].playerNftTokenId != 0 ||
                parlays[tokenId].lpNftTokenId != 0,
            "Parlay does not exist"
        );
        _;
    }

    modifier onlyValidExpirationTime(uint256 orderExpirationTime) {
        require(
            orderExpirationTime > block.timestamp,
            "Order expiration must be in future"
        );
        // require(parlayExpirationTime > orderExpirationTime, "Parlay expiration must be after order expiration");
        // require(parlayExpirationTime <= block.timestamp + config.maxRequestExpirationTime, "Parlay expiration too far");
        _;
    }

    // ============ Constructor ============

    constructor(
        address _collateralToken,
        address _playerNft,
        address _lpNft,
        uint256 _minCollateral,
        uint256 _minRequestExpirationTime,
        uint256 _maxRequestExpirationTime,
        uint256 _parlayAfterExpirationTime
    ) {
        require(_collateralToken != address(0), "Invalid collateral token");
        require(_playerNft != address(0), "Invalid player NFT");
        require(_lpNft != address(0), "Invalid LP NFT");
        require(_playerNft != _lpNft, "Player and LP NFTs cannot be the same");
        require(_minCollateral > 0, "Invalid min collateral");
        require(_minRequestExpirationTime > 0, "Invalid min expiration time");
        require(
            _maxRequestExpirationTime > _minRequestExpirationTime,
            "Invalid max expiration time"
        );
        require(
            _parlayAfterExpirationTime > 0,
            "Invalid parlay after expiration time"
        );

        config = Settings({
            collateralToken: _collateralToken,
            playerNft: _playerNft,
            lpNft: _lpNft,
            minCollateral: _minCollateral,
            minRequestExpirationTime: _minRequestExpirationTime,
            maxRequestExpirationTime: _maxRequestExpirationTime
        });

        _requestIdCounter = 0;
        _playerNftCounter = 0;
        _lpNftCounter = 0;
    }

    // ============ Parlay Order Functions ============

    function submitParlayOrder(
        PredictedOutcome[] calldata predictedOutcomes,
        uint256 collateral,
        uint256 expectedPayout,
        uint256 orderExpirationTime
    )
        external
        // uint256 parlayExpirationTime
        onlyValidExpirationTime(orderExpirationTime)
        nonReentrant
        returns (uint256 requestId)
    {
        require(predictedOutcomes.length > 0, "Must have at least one market");
        require(collateral >= config.minCollateral, "Collateral below minimum");
        require(
            expectedPayout > collateral,
            "Payout must be greater than collateral"
        );

        for (uint256 i = 0; i < predictedOutcomes.length; i++) {
            require(
                predictedOutcomes[i].market.marketGroup != address(0),
                "Invalid market group address"
            );

            // Check that the market is a Yes/No market
            require(
                _isYesNoMarket(predictedOutcomes[i].market),
                "Market is not a Yes/No market"
            );

            // Check that the market is not settled
            (, bool settled) = _getMarketOutcome(predictedOutcomes[i].market);
            require(!settled, "Market is already settled");
        }

        _requestIdCounter++;
        requestId = _requestIdCounter;

        uint256 balanceBefore = IERC20(config.collateralToken).balanceOf(
            address(this)
        );

        IERC20(config.collateralToken).safeTransferFrom(
            msg.sender,
            address(this),
            collateral
        );

        uint256 balanceAfter = IERC20(config.collateralToken).balanceOf(
            address(this)
        );
        require(
            balanceAfter - balanceBefore == collateral,
            "Collateral transfer failed"
        );

        parlayRequests[requestId] = ParlayRequest({
            player: msg.sender,
            predictedOutcomes: predictedOutcomes,
            collateral: collateral,
            expectedPayout: expectedPayout,
            orderExpirationTime: orderExpirationTime,
            filled: false,
            filledBy: address(0),
            filledPayout: 0,
            filledAt: 0
        });

        emit ParlayOrderSubmitted(
            msg.sender,
            requestId,
            predictedOutcomes,
            collateral,
            expectedPayout,
            orderExpirationTime
        );
    }

    function fillParlayOrder(
        uint256 requestId
    ) external onlyValidRequest(requestId) nonReentrant {
        ParlayRequest storage request = parlayRequests[requestId];

        require(!request.filled, "Order already filled");
        require(block.timestamp < request.orderExpirationTime, "Order expired");
        // TODO Add a require for a delay between order submission and order filling

        // Check if LP has sufficient balance by looking at their token balance
        uint256 lpBalance = IERC20(config.collateralToken).balanceOf(
            msg.sender
        );
        require(lpBalance >= request.expectedPayout, "Insufficient LP balance");

        // Transfer payout from LP to contract
        uint256 balanceBefore = IERC20(config.collateralToken).balanceOf(
            address(this)
        );
        IERC20(config.collateralToken).safeTransferFrom(
            msg.sender,
            address(this),
            request.expectedPayout
        );
        uint256 balanceAfter = IERC20(config.collateralToken).balanceOf(
            address(this)
        );
        require(
            balanceAfter - balanceBefore == request.expectedPayout,
            "Payout transfer failed"
        );

        // Mark request as filled
        request.filled = true;
        request.filledBy = msg.sender;
        request.filledPayout = request.expectedPayout;
        request.filledAt = block.timestamp;

        // Update LP used amount
        lpUsedAmounts[msg.sender] += request.expectedPayout;

        // Mint NFTs
        _playerNftCounter++;
        _lpNftCounter++;

        uint256 playerNftTokenId = _playerNftCounter;
        uint256 lpNftTokenId = _lpNftCounter;

        // Create parlay
        parlays[playerNftTokenId] = Parlay({
            playerNftTokenId: playerNftTokenId,
            lpNftTokenId: lpNftTokenId,
            collateral: request.collateral,
            payout: 0,
            createdAt: block.timestamp,
            settled: false,
            predictedOutcomes: request.predictedOutcomes
        });

        parlays[lpNftTokenId] = parlays[playerNftTokenId];

        // Store payout amounts for later settlement
        parlayPayouts[playerNftTokenId] = request.expectedPayout;
        parlayPayouts[lpNftTokenId] = request.expectedPayout;

        // Mint NFTs to respective owners
        IParlayNFT(config.playerNft).mint(request.player, playerNftTokenId, "");
        IParlayNFT(config.lpNft).mint(msg.sender, lpNftTokenId, "");

        emit ParlayOrderFilled(
            requestId,
            request.player,
            msg.sender,
            playerNftTokenId,
            lpNftTokenId,
            request.collateral,
            request.expectedPayout
        );
    }

    // ============ Parlay Settlement Functions ============

    function settleParlay(uint256 tokenId) public onlyValidParlay(tokenId) {
        Parlay storage parlay = parlays[tokenId];
        require(!parlay.settled, "Parlay already settled");
        require(
            block.timestamp >= parlay.createdAt + 30 days,
            "Parlay not expired yet"
        );

        bool playerWon = true;
        for (uint256 i = 0; i < parlay.predictedOutcomes.length; i++) {
            (bool marketOutcome, bool marketSettled) = _getMarketOutcome(
                parlay.predictedOutcomes[i].market
            );
            require(marketSettled, "At least one market not settled");
            if (parlay.predictedOutcomes[i].prediction != marketOutcome) {
                playerWon = false;
                break;
            }
        }

        if (playerWon) {
            parlay.payout = parlay.collateral + parlayPayouts[tokenId];
        } else {
            parlay.payout = 0;
        }

        parlay.settled = true;

        emit ParlaySettled(
            parlay.playerNftTokenId,
            parlay.lpNftTokenId,
            parlay.payout,
            playerWon
        );
    }

    function settleAndWithdrawParlayPrinciple(
        uint256 tokenId
    ) public onlyValidParlay(tokenId) nonReentrant {
        settleParlay(tokenId);
        withdrawParlayPrinciple(tokenId);
    }

    function withdrawParlayPrinciple(
        uint256 tokenId
    ) public onlyValidParlay(tokenId) nonReentrant {
        Parlay storage parlay = parlays[tokenId];
        require(parlay.settled, "Parlay not settled");

        // Check if caller owns the NFT
        bool isPlayerNFT = tokenId == parlay.playerNftTokenId;
        bool isLPNFT = tokenId == parlay.lpNftTokenId;

        require(isPlayerNFT || isLPNFT, "Not parlay NFT owner");

        address nftOwner;
        if (isPlayerNFT) {
            nftOwner = IParlayNFT(config.playerNft).ownerOf(tokenId);
        } else {
            nftOwner = IParlayNFT(config.lpNft).ownerOf(tokenId);
        }

        require(nftOwner == msg.sender, "Not NFT owner");

        uint256 withdrawAmount = parlay.payout;
        require(withdrawAmount > 0, "No payout to withdraw");

        // Reset payout to prevent double withdrawal
        parlay.payout = 0;

        // Transfer payout
        IERC20(config.collateralToken).safeTransfer(msg.sender, withdrawAmount);

        emit ParlayPrincipleWithdrawn(tokenId, msg.sender, withdrawAmount);
    }

    function cancelExpiredOrder(
        uint256 requestId
    ) external onlyValidRequest(requestId) {
        ParlayRequest storage request = parlayRequests[requestId];

        require(!request.filled, "Order already filled");
        require(
            block.timestamp >= request.orderExpirationTime,
            "Order not expired yet"
        );
        require(
            msg.sender == request.player,
            "Only player can cancel expired order"
        );

        // Return principle to player (in this implementation, principle is held by the contract)
        // In a real implementation, you might need to transfer tokens back to the player

        emit OrderExpired(requestId, request.player, request.collateral);
    }

    function sweepExpiredParlay(
        uint256 tokenId
    ) external onlyValidParlay(tokenId) {
        Parlay storage parlay = parlays[tokenId];
        require(!parlay.settled, "Parlay already settled");
        require(
            block.timestamp >= parlay.createdAt + 7 days,
            "Parlay not expired enough"
        );

        // Burn NFTs
        IParlayNFT(config.playerNft).burn(parlay.playerNftTokenId);
        IParlayNFT(config.lpNft).burn(parlay.lpNftTokenId);

        // Reclaim principle for the pool
        // In this implementation, principle stays in the contract

        emit ParlayExpired(
            parlay.playerNftTokenId,
            parlay.lpNftTokenId,
            parlay.collateral
        );
    }

    // ============ View Functions ============

    function getConfig() external view returns (Settings memory) {
        return config;
    }

    function getParlay(
        uint256 tokenId
    ) external view returns (Parlay memory parlay) {
        return parlays[tokenId];
    }

    function getParlayOrder(
        uint256 requestId
    ) external view returns (ParlayRequest memory parlayRequest) {
        return parlayRequests[requestId];
    }

    function getParlayOrderFillInfo(
        uint256 requestId
    )
        external
        view
        returns (
            bool filled,
            address filledBy,
            uint256 filledPayout,
            uint256 filledAt
        )
    {
        ParlayRequest storage request = parlayRequests[requestId];
        return (
            request.filled,
            request.filledBy,
            request.filledPayout,
            request.filledAt
        );
    }

    function getLPUsedAmount(
        address lp
    ) external view returns (uint256 amount) {
        return lpUsedAmounts[lp];
    }

    function canFillParlayOrder(
        uint256 requestId
    ) external view returns (bool canFill, uint256 reason) {
        ParlayRequest storage request = parlayRequests[requestId];

        if (request.player == address(0)) {
            return (false, 1); // Request does not exist
        }

        if (request.filled) {
            return (false, 2); // Order already filled
        }

        if (block.timestamp >= request.orderExpirationTime) {
            return (false, 3); // Order expired
        }

        return (true, 0);
    }

    function canFillParlayOrder(
        address lp,
        uint256 requestId,
        uint256 payout
    ) external view returns (bool canFill, uint256 reason) {
        ParlayRequest storage request = parlayRequests[requestId];

        if (request.player == address(0)) {
            return (false, 1); // Request does not exist
        }

        if (request.filled) {
            return (false, 2); // Order already filled
        }

        if (block.timestamp >= request.orderExpirationTime) {
            return (false, 3); // Order expired
        }

        if (payout < request.expectedPayout) {
            return (false, 4); // Payout below minimum
        }

        uint256 lpBalance = IERC20(config.collateralToken).balanceOf(lp);
        if (lpBalance < payout) {
            return (false, 5); // Insufficient LP balance
        }

        return (true, 0);
    }

    // ============ Internal Functions ============
    function _isYesNoMarket(Market memory market) internal view returns (bool) {
        // Validate market address
        require(
            market.marketGroup != address(0),
            "Invalid market group address"
        );

        // Get the specific market data from the Sapience market group
        (ISapienceStructs.MarketData memory marketData, ) = ISapience(
            market.marketGroup
        ).getMarket(market.marketId);

        // Check if this is a Yes/No market by examining the claimStatementNo
        // If claimStatementNo is not empty, it's a Yes/No market
        // If claimStatementNo is empty, it's a numeric market
        return marketData.claimStatementNo.length > 0;
    }

    /**
     * @notice Internal function to get the outcome and settlement status of a market
     * @dev it needs to go to the market address as a Sapience market group and check if the market is settled
     * and then get the outcome of the market. The market should be a Yes/No Sapience market.
     * @param market The market to check
     * @return outcome The outcome of the market (true = YES, false = NO)
     * @return settled Whether the market has been settled
     */
    function _getMarketOutcome(
        Market memory market
    ) internal view returns (bool outcome, bool settled) {
        // Validate market address
        require(
            market.marketGroup != address(0),
            "Invalid market group address"
        );

        // Get the specific market data from the Sapience market group
        (ISapienceStructs.MarketData memory marketData, ) = ISapience(
            market.marketGroup
        ).getMarket(market.marketId);

        // Check if the market is settled
        settled = marketData.settled;

        if (!settled) {
            return (false, false);
        }

        // For Yes/No markets, the settlement price will be at the extreme bounds
        // YES = maxPriceD18, NO = minPriceD18
        uint256 settlementPrice = marketData.settlementPriceD18;
        uint256 minPrice = marketData.minPriceD18;
        uint256 maxPrice = marketData.maxPriceD18;

        // Check if this is a Yes/No market by comparing settlement price to bounds
        if (settlementPrice >= maxPrice) {
            // Market settled as YES
            outcome = true;
        } else if (settlementPrice <= minPrice) {
            // Market settled as NO
            outcome = false;
        } else {
            // This is a numeric market, not Yes/No
            // For parlay purposes, we only support Yes/No markets
            revert(
                "Market is not a Yes/No market - settlement price is not at bounds"
            );
        }
    }
}
