// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/IParlayPool.sol";
import "./interfaces/IParlayNFT.sol";

/**
 * @title ParlayPool
 * @notice Implementation of the Parlay Pool contract with orderbook functionality
 */
contract ParlayPool is IParlayPool, ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;

    // ============ State Variables ============
    
    Settings public config;
    
    Counters.Counter private _requestIdCounter;
    Counters.Counter private _playerNftCounter;
    Counters.Counter private _lpNftCounter;
    
    // Mapping from request ID to parlay request
    mapping(uint256 => ParlayRequest) public parlayRequests;
    
    // Mapping from NFT token ID to parlay
    mapping(uint256 => Parlay) public parlays;
    
    // Mapping from LP address to amount used in unsettled parlays
    mapping(address => uint256) public lpUsedAmounts;
    
    // ============ Modifiers ============
    
    modifier onlyValidRequest(uint256 requestId) {
        require(parlayRequests[requestId].player != address(0), "Request does not exist");
        _;
    }
    
    modifier onlyRequestPlayer(uint256 requestId) {
        require(parlayRequests[requestId].player == msg.sender, "Only request player can call");
        _;
    }
    
    modifier onlyValidParlay(uint256 tokenId) {
        require(parlays[tokenId].playerNftTokenId != 0 || parlays[tokenId].lpNftTokenId != 0, "Parlay does not exist");
        _;
    }
    
    modifier onlyValidExpirationTime(uint256 orderExpirationTime, uint256 parlayExpirationTime) {
        require(orderExpirationTime > block.timestamp, "Order expiration must be in future");
        require(parlayExpirationTime > orderExpirationTime, "Parlay expiration must be after order expiration");
        require(parlayExpirationTime <= block.timestamp + config.maxRequestExpirationTime, "Parlay expiration too far");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _principleToken,
        address _playerNft,
        address _lpNft,
        uint256 _minRequestPayout,
        uint256 _minRequestExpirationTime,
        uint256 _maxRequestExpirationTime,
        uint256 _parlayAfterExpirationTime
    ) {
        config = Settings({
            principleToken: _principleToken,
            playerNft: _playerNft,
            lpNft: _lpNft,
            minRequestPayout: _minRequestPayout,
            minRequestExpirationTime: _minRequestExpirationTime,
            maxRequestExpirationTime: _maxRequestExpirationTime,
            parlayAfterExpirationTime: _parlayAfterExpirationTime
        });
    }
    
    // ============ Parlay Order Functions ============
    
    function submitParlayOrder(
        Market[] calldata markets,
        bool[] calldata outcomes,
        uint256 principle,
        uint256 minPayout,
        uint256 orderExpirationTime,
        uint256 parlayExpirationTime
    ) external onlyValidExpirationTime(orderExpirationTime, parlayExpirationTime) nonReentrant returns (uint256 requestId) {
        require(markets.length > 0, "Must have at least one market");
        require(markets.length == outcomes.length, "Markets and outcomes length mismatch");
        require(principle >= config.minPrinciple, "Principle below minimum");
        require(minPayout >= config.minPrinciple, "Payout below minimum");
        
        _requestIdCounter.increment();
        requestId = _requestIdCounter.current();

        uint256 balanceBefore = IERC20(config.principleToken).balanceOf(address(this));
        
        IERC20(config.principleToken).safeTransferFrom(msg.sender, address(this), principle);
        
        uint256 balanceAfter = IERC20(config.principleToken).balanceOf(address(this));
        require(balanceAfter - balanceBefore == principle, "Principle transfer failed");
        
        parlayRequests[requestId] = ParlayRequest({
            player: msg.sender,
            markets: markets,
            outcomes: outcomes,
            principle: principle,
            minPayout: minPayout,
            orderExpirationTime: orderExpirationTime,
            parlayExpirationTime: parlayExpirationTime,
            filled: false,
            filledBy: address(0),
            filledPayout: 0,
            filledAt: 0
        });
        
        emit ParlayOrderSubmitted(
            msg.sender,
            requestId,
            markets,
            outcomes,
            principle,
            minPayout,
            orderExpirationTime,
            parlayExpirationTime
        );
    }
    
    function fillParlayOrder(
        uint256 requestId,
        uint256 payout
    ) external onlyValidRequest(requestId) nonReentrant {
        ParlayRequest storage request = parlayRequests[requestId];
        
        require(!request.filled, "Order already filled");
        require(block.timestamp < request.orderExpirationTime, "Order expired");
        require(payout >= request.minPayout, "Payout below minimum");
        
        // Check if LP has sufficient balance by looking at their token balance
        uint256 lpBalance = IERC20(config.principleToken).balanceOf(msg.sender);
        require(lpBalance >= payout, "Insufficient LP balance");
        
        // Transfer payout from LP to contract
        uint256 balanceBefore = IERC20(config.principleToken).balanceOf(address(this));
        IERC20(config.principleToken).safeTransferFrom(msg.sender, address(this), payout);
        uint256 balanceAfter = IERC20(config.principleToken).balanceOf(address(this));
        require(balanceAfter - balanceBefore == payout, "Payout transfer failed");
        
        // Mark request as filled
        request.filled = true;
        request.filledBy = msg.sender;
        request.filledPayout = payout;
        request.filledAt = block.timestamp;
        
        // Update LP used amount
        lpUsedAmounts[msg.sender] += payout;
        
        // Mint NFTs
        _playerNftCounter.increment();
        _lpNftCounter.increment();
        
        uint256 playerNftTokenId = _playerNftCounter.current();
        uint256 lpNftTokenId = _lpNftCounter.current();
        
        // Create parlay
        parlays[playerNftTokenId] = Parlay({
            playerNftTokenId: playerNftTokenId,
            lpNftTokenId: lpNftTokenId,
            principle: request.principle,
            potentialPayout: payout,
            payout: 0,
            createdAt: block.timestamp,
            expirationTime: request.parlayExpirationTime,
            settled: false,
            predictedOutcomes: request.predictedOutcomes
        });
        
        parlays[lpNftTokenId] = parlays[playerNftTokenId];
        
        // Mint NFTs to respective owners
        IParlayNFT(config.playerNft).mint(request.player, playerNftTokenId, "");
        IParlayNFT(config.lpNft).mint(msg.sender, lpNftTokenId, "");
        
        emit ParlayOrderFilled(
            requestId,
            request.player,
            msg.sender,
            playerNftTokenId,
            lpNftTokenId,
            request.principle,
            payout
        );
    }
        
        // Mint NFTs
        _playerNftCounter.increment();
        _lpNftCounter.increment();
        
        uint256 playerNftTokenId = _playerNftCounter.current();
        uint256 lpNftTokenId = _lpNftCounter.current();
        
        // Create parlay
        parlays[playerNftTokenId] = Parlay({
            playerNftTokenId: playerNftTokenId,
            lpNftTokenId: lpNftTokenId,
            principle: request.principle,
            potentialPayout: bestIntent.payout,
            payout: 0,
            createdAt: block.timestamp,
            expirationTime: request.parlayExpirationTime,
            settled: false,
            predictedOutcomes: request.predictedOutcomes
        });
        
        parlays[lpNftTokenId] = parlays[playerNftTokenId];
        
        // Update LP used amount
        lpUsedAmounts[request.bestFillLP] += bestIntent.payout;
        
        // Mark request as filled
        request.filled = true;
        
        // Mint NFTs to respective owners
        IParlayNFT(config.playerNft).mint(request.player, playerNftTokenId, "");
        IParlayNFT(config.lpNft).mint(request.bestFillLP, lpNftTokenId, "");
        
        emit ParlayOrderFilled(
            requestId,
            request.player,
            request.bestFillLP,
            playerNftTokenId,
            lpNftTokenId,
            request.principle,
            bestIntent.payout
        );
    }
    
    // ============ Parlay Settlement Functions ============
    
    function settleParlay(uint256 tokenId) external onlyValidParlay(tokenId) {
        Parlay storage parlay = parlays[tokenId];
        require(!parlay.settled, "Parlay already settled");
        require(block.timestamp >= parlay.expirationTime, "Parlay not expired yet");
        
        // TODO: Implement market resolution logic here
        // For now, we'll assume player wins
        bool playerWon = true; // This should be determined by actual market resolution
        
        if (playerWon) {
            parlay.payout = parlay.principle + parlay.potentialPayout;
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
    
    function withdrawParlayPrinciple(uint256 tokenId) external onlyValidParlay(tokenId) nonReentrant {
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
        IERC20(config.principleToken).safeTransfer(msg.sender, withdrawAmount);
        
        emit ParlayPrincipleWithdrawn(tokenId, msg.sender, withdrawAmount);
    }
    
    function cancelExpiredOrder(uint256 requestId) external onlyValidRequest(requestId) {
        ParlayRequest storage request = parlayRequests[requestId];
        
        require(!request.filled, "Order already filled");
        require(block.timestamp >= request.orderExpirationTime, "Order not expired yet");
        require(msg.sender == request.player, "Only player can cancel expired order");
        
        // Return principle to player (in this implementation, principle is held by the contract)
        // In a real implementation, you might need to transfer tokens back to the player
        
        emit OrderExpired(requestId, request.player, request.principle);
    }
    
    function sweepExpiredParlay(uint256 tokenId) external onlyValidParlay(tokenId) {
        Parlay storage parlay = parlays[tokenId];
        require(!parlay.settled, "Parlay already settled");
        require(block.timestamp >= parlay.expirationTime + config.parlayAfterExpirationTime, "Parlay not expired enough");
        
        // Burn NFTs
        IParlayNFT(config.playerNft).burn(parlay.playerNftTokenId);
        IParlayNFT(config.lpNft).burn(parlay.lpNftTokenId);
        
        // Reclaim principle for the pool
        // In this implementation, principle stays in the contract
        
        emit ParlayExpired(parlay.playerNftTokenId, parlay.lpNftTokenId, parlay.principle);
    }
    

    
    // ============ View Functions ============
    
    function getConfig() external view returns (Settings memory config) {
        return config;
    }
    
    function getParlay(uint256 tokenId) external view returns (Parlay memory parlay) {
        return parlays[tokenId];
    }
    
    function getParlayOrder(uint256 requestId) external view returns (ParlayRequest memory parlayRequest) {
        return parlayRequests[requestId];
    }
    
    function getParlayOrderFillInfo(uint256 requestId) external view returns (
        bool filled,
        address filledBy,
        uint256 filledPayout,
        uint256 filledAt
    ) {
        ParlayRequest storage request = parlayRequests[requestId];
        return (
            request.filled,
            request.filledBy,
            request.filledPayout,
            request.filledAt
        );
    }
    
    function getLPUsedAmount(address lp) external view returns (uint256 amount) {
        return lpUsedAmounts[lp];
    }
    
    function canFillParlayOrder(uint256 requestId) external view returns (bool canFill, uint256 reason) {
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
        
        if (payout < request.minPayout) {
            return (false, 4); // Payout below minimum
        }
        
        uint256 lpBalance = IERC20(config.principleToken).balanceOf(lp);
        if (lpBalance < payout) {
            return (false, 5); // Insufficient LP balance
        }
        
        return (true, 0);
    }
} 