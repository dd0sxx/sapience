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
    
    // Mapping from request ID to fill intents (LP address => FillIntent)
    mapping(uint256 => mapping(address => FillIntent)) public fillIntents;
    
    // Mapping from NFT token ID to parlay
    mapping(uint256 => Parlay) public parlays;
    
    // Mapping from LP address to deposited balance
    mapping(address => uint256) public lpBalances;
    
    // Mapping from LP address to amount used in unsettled parlays
    mapping(address => uint256) public lpUsedAmounts;
    
    // Mapping from request ID to array of LP addresses who registered fill intents
    mapping(uint256 => address[]) public requestFillIntents;
    
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
            bestFillPayout: 0,
            bestFillLP: address(0)
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
    
    function registerFillIntent(
        uint256 requestId,
        uint256 payout
    ) external onlyValidRequest(requestId) {
        ParlayRequest storage request = parlayRequests[requestId];
        
        require(!request.filled, "Order already filled");
        require(block.timestamp < request.orderExpirationTime, "Order expired");
        require(payout >= request.minPayout, "Payout below minimum");
        require(payout > request.bestFillPayout, "Payout is not greater than existing fill intent");
        
        uint256 availableBalance = lpBalances[msg.sender] - lpUsedAmounts[msg.sender];
        require(availableBalance >= payout, "Insufficient LP balance");
        
        FillIntent storage intent = fillIntents[requestId][msg.sender];
        
        // Update best fill if this is better
        request.bestFillPayout = payout;
        request.bestFillLP = msg.sender;

        if (intent.lp == address(0)) {
            // New fill intent
            intent.lp = msg.sender;
            intent.payout = payout;
            intent.timestamp = block.timestamp;
            requestFillIntents[requestId].push(msg.sender);
        } else {
            // Update existing fill intent
            intent.payout = payout;
            intent.timestamp = block.timestamp;            
        }        

        emit FillIntentUpdated(msg.sender, requestId, payout, block.timestamp);
    }
    
    function cancelFillIntent(uint256 requestId) external onlyValidRequest(requestId) {
        // TODO: check if we need this function or not
        FillIntent storage intent = fillIntents[requestId][msg.sender];
        require(intent.lp != address(0), "No fill intent to cancel");
        
        ParlayRequest storage request = parlayRequests[requestId];
        require(!request.filled, "Order already filled");

        require(request.bestFillLP != msg.sender, "Cannot cancel best fill intent");
        
        // Remove from request fill intents array 
        // TODO use the mapping instead of the array and initialize as not used for this request
        address[] storage intents = requestFillIntents[requestId];
        for (uint256 i = 0; i < intents.length; i++) {
            if (intents[i] == msg.sender) {
                intents[i] = intents[intents.length - 1];
                intents.pop();
                break;
            }
        }
                
        delete fillIntents[requestId][msg.sender];
    }
    
    function fillParlayOrder(uint256 requestId) external onlyValidRequest(requestId) {
        ParlayRequest storage request = parlayRequests[requestId];
        
        require(!request.filled, "Order already filled");
        require(block.timestamp >= request.orderExpirationTime, "Order not expired yet");
        require(block.timestamp < request.parlayExpirationTime, "Parlay expired");
        require(request.bestFillLP != address(0), "No fill intent available");
        // require(msg.sender == request.player, "Only player can fill order");
        
        FillIntent storage bestIntent = fillIntents[requestId][request.bestFillLP];
        require(bestIntent.lp != address(0), "Best fill intent not found");
        
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
    
    // ============ LP Functions ============
    
    function depositLP(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        IERC20(config.principleToken).transferFrom(msg.sender, address(this), amount);
        lpBalances[msg.sender] += amount;
        
        emit LPDeposit(msg.sender, amount);
    }
    
    function withdrawLP(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 withdrawableAmount = getLPWithdrawableAmount(msg.sender);
        require(amount <= withdrawableAmount, "Insufficient withdrawable amount");
        
        lpBalances[msg.sender] -= amount;
        IERC20(config.principleToken).transfer(msg.sender, amount);
        
        emit LPWithdrawal(msg.sender, amount);
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
    
    function getFillIntent(uint256 requestId) external view returns (FillIntent memory fillIntent) {
        return fillIntents[requestId][msg.sender];
    }
    
    function getFillIntents(uint256 requestId) external view returns (FillIntent[] memory fillIntents) {
        address[] memory lpAddresses = requestFillIntents[requestId];
        fillIntents = new FillIntent[](lpAddresses.length);
        
        for (uint256 i = 0; i < lpAddresses.length; i++) {
            fillIntents[i] = fillIntents[requestId][lpAddresses[i]];
        }
    }
    
    function getBestFillIntent(uint256 requestId) external view returns (FillIntent memory fillIntent) {
        ParlayRequest storage request = parlayRequests[requestId];
        if (request.bestFillLP != address(0)) {
            return fillIntents[requestId][request.bestFillLP];
        }
        return FillIntent({lp: address(0), payout: 0, timestamp: 0});
    }
    
    function getLPBalance(address lp) external view returns (uint256 balance) {
        return lpBalances[lp];
    }
    
    function getLPWithdrawableAmount(address lp) external view returns (uint256 amount) {
        return lpBalances[lp] - lpUsedAmounts[lp];
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
        
        if (request.bestFillLP == address(0)) {
            return (false, 4); // No fill intent available
        }
        
        return (true, 0);
    }
    
    function canRegisterFillIntent(
        address lp,
        uint256 requestId,
        uint256 payout
    ) external view returns (bool canRegister, uint256 reason) {
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
        
        uint256 availableBalance = lpBalances[lp] - lpUsedAmounts[lp];
        if (availableBalance < payout) {
            return (false, 5); // Insufficient LP balance
        }
        
        return (true, 0);
    }
    
    // ============ Internal Functions ============
    
    function _updateBestFill(uint256 requestId) internal {
        ParlayRequest storage request = parlayRequests[requestId];
        address[] storage intents = requestFillIntents[requestId];
        
        uint256 bestPayout = 0;
        address bestLP = address(0);
        
        for (uint256 i = 0; i < intents.length; i++) {
            FillIntent storage intent = fillIntents[requestId][intents[i]];
            if (intent.payout > bestPayout) {
                bestPayout = intent.payout;
                bestLP = intents[i];
            }
        }
        
        request.bestFillPayout = bestPayout;
        request.bestFillLP = bestLP;
    }
} 