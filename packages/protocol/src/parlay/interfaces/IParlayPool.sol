// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IParlayPool
 * @notice Main interface for the Parlay Pool contract
 */
interface IParlayPool {
    // ============ Structs ============

    struct Settings {
        address principleToken;
        address playerNft;
        address lpNft;
        uint256 minPrinciple;
        uint256 minRequestExpirationTime;
        uint256 maxRequestExpirationTime;
        uint256 parlayAfterExpirationTime;
    }
    
    struct Market {
        address marketGroup;
        uint256 marketId;
    }

    struct PredictedOutcome {
        Market market;
        bool prediction; // true for YES, false for NO
    }

    struct ParlayRequest {
        address player;
        Market[] markets;
        bool[] outcomes;
        uint256 principle;
        uint256 minPayout;
        uint256 orderExpirationTime;
        uint256 parlayExpirationTime;
        bool filled;
        uint256 bestFillPayout;
        address bestFillLP;
    }

    struct FillIntent {
        address lp;
        uint256 payout;
        uint256 timestamp;
    }

    struct Parlay {
        uint256 playerNftTokenId; // NFT token id of the player
        uint256 lpNftTokenId; // NFT token id of the LP
        uint256 principle; // in principleToken
        uint256 potentialPayout; // in principleToken
        uint256 payout; // in principleToken
        uint256 createdAt; // timestamp
        uint256 expirationTime; // timestamp
        bool settled; // true if the parlay has been settled
        PredictedOutcome[] predictedOutcomes;
    }


    // ============ Events ============
    
    event ParlayOrderSubmitted(
        address indexed player,
        uint256 indexed requestId,
        Market[] markets,
        bool[] outcomes,
        uint256 principle,
        uint256 minPayout,
        uint256 orderExpirationTime,
        uint256 parlayExpirationTime
    );

    event FillIntentRegistered(
        address indexed lp,
        uint256 indexed requestId,
        uint256 payout,
        uint256 timestamp
    );

    event FillIntentUpdated(
        address indexed lp,
        uint256 indexed requestId,
        uint256 newPayout,
        uint256 timestamp
    );

    event ParlayOrderFilled(
        uint256 indexed requestId,
        address indexed player,
        address indexed lp,
        uint256 playerNftTokenId,
        uint256 lpNftTokenId,
        uint256 principle,
        uint256 payout
    );

    event ParlaySettled(
        uint256 indexed playerNftTokenId,
        uint256 indexed lpNftTokenId,
        uint256 payout,
        bool playerWon
    );

    event ParlayPrincipleWithdrawn(
        uint256 indexed nftTokenId,
        address indexed owner,
        uint256 amount
    );

    event LPDeposit(
        address indexed lp,
        uint256 amount
    );

    event LPWithdrawal(
        address indexed lp,
        uint256 amount
    );

    event ParlayExpired(
        uint256 indexed playerNftTokenId,
        uint256 indexed lpNftTokenId,
        uint256 principleReclaimed
    );

    event OrderExpired(
        uint256 indexed requestId,
        address indexed player,
        uint256 principleReturned
    );

    // ============ Parlay Functions ============
    
    /**
     * @notice Submit a parlay order to the orderbook
     * @param markets Array of markets to include in parlay
     * @param outcomes Array of predicted outcomes (true = YES, false = NO)
     * @param principle Amount of principle to use for the parlay
     * @param minPayout Minimum acceptable payout for the parlay
     * @param orderExpirationTime Expiration time for the parlay order
     * @param parlayExpirationTime Expiration time for the parlay
     * @return requestId ID of the parlay request
     */
    function submitParlayOrder(
        Market[] calldata markets,
        bool[] calldata outcomes,
        uint256 principle,
        uint256 minPayout,
        uint256 orderExpirationTime,
        uint256 parlayExpirationTime 
    ) external returns (uint256 requestId);

    /**
     * @notice Register or update a fill intent for a parlay order
     * @param requestId ID of the parlay request
     * @param payout Amount of stablecoins to pay for the parlay (in principleToken)
     * @dev LP must have sufficient deposited balance to cover the payout
     */
    function registerFillIntent(
        uint256 requestId,
        uint256 payout
    ) external;

    /**
     * @notice Cancel a fill intent for a parlay order
     * @param requestId ID of the parlay request
     */
    function cancelFillIntent(uint256 requestId) external;

    /**
     * @notice Fill a parlay order with the best available fill intent
     * @dev This function is called by the player to fill the parlay order, will mint both the player and lp NFTs
     * @param requestId ID of the parlay request
     */
    function fillParlayOrder(
        uint256 requestId
    ) external;

    /**
     * @notice Settle a parlay after all markets have resolved
     * @param tokenId The NFT token ID representing the parlay
     */
    function settleParlay(
        uint256 tokenId
    ) external;

    /**
     * @notice Withdraw the principle and payout of a settled parlay
     * @param tokenId The NFT token ID of the parlay (player or lp depending on the result of the parlay)
     */
    function withdrawParlayPrinciple(uint256 tokenId) external;

    /**
     * @notice Cancel an expired parlay order and return principle to player
     * @param requestId ID of the expired parlay request
     */
    function cancelExpiredOrder(uint256 requestId) external;

    /**
     * @notice Sweep an expired parlay to reclaim principle for the pool
     * @param tokenId The NFT token ID of the expired parlay
     */
    function sweepExpiredParlay(uint256 tokenId) external;

    // ============ LP Functions ============

    /**
     * @notice Deposit stablecoins to become a liquidity provider
     * @param amount Amount of stablecoins to deposit
     */
    function depositLP(uint256 amount) external;

    /**
     * @notice Withdraw LP position
     * @param amount Amount of stablecoins to withdraw
     * @dev Only can withdraw deposited - non-settled parlays that were filled by this lp
     */
    function withdrawLP(uint256 amount) external;

    // ============ View Functions ============
    
    /**
     * @notice Get the pool configuration
     * @return config Pool configuration
     */
    function getConfig() external view returns (Settings memory config);

    /**
     * @notice Get parlay information
     * @param tokenId NFT token ID
     * @return parlay Parlay details
     */
    function getParlay(uint256 tokenId) external view returns (Parlay memory parlay);

    /**
     * @notice Get parlay order information
     * @param requestId ID of the parlay request
     * @return parlayRequest Parlay request details
     */
    function getParlayOrder(uint256 requestId) external view returns (ParlayRequest memory parlayRequest);

    /**
     * @notice Get fill intent for a parlay order
     * @param requestId ID of the parlay request
     * @return fillIntent Fill intent details
     */
    function getFillIntent(uint256 requestId) external view returns (FillIntent memory fillIntent);

    /**
     * @notice Get all fill intents for a parlay order
     * @param requestId ID of the parlay request
     * @return fillIntents Array of fill intents
     */
    function getFillIntents(uint256 requestId) external view returns (FillIntent[] memory fillIntents);

    /**
     * @notice Get best fill intent for a parlay order
     * @param requestId ID of the parlay request
     * @return fillIntent Best fill intent details
     */
    function getBestFillIntent(uint256 requestId) external view returns (FillIntent memory fillIntent);

    /**
     * @notice Get LP deposited balance
     * @param lp Address of the liquidity provider
     * @return balance Current deposited balance
     */
    function getLPBalance(address lp) external view returns (uint256 balance);

    /**
     * @notice Get LP withdrawable amount (deposited - used in unsettled parlays)
     * @param lp Address of the liquidity provider
     * @return amount Withdrawable amount
     */
    function getLPWithdrawableAmount(address lp) external view returns (uint256 amount);

    /**
     * @notice Check if a parlay order can be filled
     * @param requestId ID of the parlay request
     * @return canFill Whether the order can be filled
     * @return reason Reason if cannot be filled
     */
    function canFillParlayOrder(uint256 requestId) external view returns (bool canFill, uint256 reason);

    /**
     * @notice Check if an LP can register a fill intent
     * @param lp Address of the liquidity provider
     * @param requestId ID of the parlay request
     * @param payout Proposed payout amount
     * @return canRegister Whether the LP can register the fill intent
     * @return reason Reason if cannot register
     */
    function canRegisterFillIntent(
        address lp,
        uint256 requestId,
        uint256 payout
    ) external view returns (bool canRegister, uint256 reason);

}
