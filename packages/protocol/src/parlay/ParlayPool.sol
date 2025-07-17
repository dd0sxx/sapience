pragma solidity ^0.8.0;

import "./interfaces/IOracle.sol";
import "./ParlayNFT.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ParlayPool is Ownable {

    // --- Data Structures ---
    struct Market {
        uint256 marketId;
        address oracleAddress;
    }

    struct Outcome {
        bool prediction; // true for YES, false for NO
    }

    struct Parlay {
        uint256 tokenId;
        address creator;
        uint256 principle;
        uint256 potentialPayout;
        Market[] markets;
        Outcome[] predictedOutcomes;
        uint256 createdAt;
        uint256 expirationTime;
        bool settled;
    }

    struct LPPosition {
        address lpAddress;
        uint256 shares;
        uint256 lastDepositTime;
    }

    // --- State Variables ---

    // Configurable Parameters
    uint256 public MAX_POOL_RISK_PERCENTAGE = 10;
    uint256 public MAX_PARLAY_EXPOSURE = 1;
    uint256 public MAX_MARKET_CONCENTRATION = 5;
    uint256 public DEFAULT_EDGE_PERCENTAGE = 20;
    uint256 public MIN_LP_DEPOSIT = 100 * 1e18; // Assuming 18 decimals for stablecoin
    uint256 public LP_DEPOSIT_LOCKUP = 7 days;
    uint256 public WITHDRAWAL_COOLDOWN = 24 hours;
    uint256 public PARLAY_EXPIRATION_BUFFER = 30 days;
    uint256 public ORACLE_TIMEOUT = 5 minutes;
    uint256 public MIN_PARLAY_AMOUNT = 1 * 1e18; // Assuming 18 decimals for stablecoin
    uint256 public MAX_MARKETS_PER_PARLAY = 10;

    // Oracle Addresses
    IOracle public oddsOracle;
    IOracle public correlationOracle;

    // Contract Addresses
    address public SAPIENCE_MARKET_REGISTRY;
    IERC20 public stablecoin;
    address public UMA_ORACLE_REGISTRY;
    ParlayNFT public parlayNft;

    // Pool State
    mapping(uint256 => Parlay) public parlays;
    mapping(address => LPPosition) public lpPositions;
    uint256 public totalShares;
    uint256 public totalPrinciple;

    // --- Events ---
    event ParlayRequested(address indexed user, uint256 amount);
    event ParlayCreated(uint256 indexed tokenId, address indexed creator, uint256 principle, uint256 potentialPayout);
    event ParlaySettled(uint256 indexed tokenId, address indexed winner, uint256 payout);
    event ParlayExpired(uint256 indexed tokenId);
    event Deposit(address indexed lp, uint256 amount, uint256 shares);
    event WithdrawalRequested(address indexed lp, uint256 shares);
    event WithdrawalCompleted(address indexed lp, uint256 amount, uint256 shares);

    // --- Constructor ---
    constructor(
        address _oddsOracleAddress,
        address _correlationOracleAddress,
        address _sapienceMarketRegistry,
        address _stablecoinAddress,
        address _umaOracleRegistry,
        address _parlayNftAddress
    ) Ownable(msg.sender) {
        oddsOracle = IOracle(_oddsOracleAddress);
        correlationOracle = IOracle(_correlationOracleAddress);
        SAPIENCE_MARKET_REGISTRY = _sapienceMarketRegistry;
        stablecoin = IERC20(_stablecoinAddress);
        UMA_ORACLE_REGISTRY = _umaOracleRegistry;
        parlayNft = ParlayNFT(_parlayNftAddress);
    }

    // --- Access Control & Configuration Functions ---
    function setMaxPoolRiskPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= 100, "Percentage cannot exceed 100");
        MAX_POOL_RISK_PERCENTAGE = _percentage;
    }

    function setMaxParlayExposure(uint256 _exposure) external onlyOwner {
        MAX_PARLAY_EXPOSURE = _exposure;
    }

    function setMaxMarketConcentration(uint256 _concentration) external onlyOwner {
        MAX_MARKET_CONCENTRATION = _concentration;
    }

    function setDefaultEdgePercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= 100, "Percentage cannot exceed 100");
        DEFAULT_EDGE_PERCENTAGE = _percentage;
    }

    function setMinLpDeposit(uint256 _amount) external onlyOwner {
        MIN_LP_DEPOSIT = _amount;
    }

    function setLpDepositLockup(uint256 _time) external onlyOwner {
        LP_DEPOSIT_LOCKUP = _time;
    }

    function setWithdrawalCooldown(uint256 _time) external onlyOwner {
        WITHDRAWAL_COOLDOWN = _time;
    }

    function setParlayExpirationBuffer(uint256 _time) external onlyOwner {
        PARLAY_EXPIRATION_BUFFER = _time;
    }

    function setOracleTimeout(uint256 _time) external onlyOwner {
        ORACLE_TIMEOUT = _time;
    }

    function setMinParlayAmount(uint256 _amount) external onlyOwner {
        MIN_PARLAY_AMOUNT = _amount;
    }

    function setMaxMarketsPerParlay(uint256 _count) external onlyOwner {
        MAX_MARKETS_PER_PARLAY = _count;
    }

    function setOddsOracleAddress(address _address) external onlyOwner {
        oddsOracle = IOracle(_address);
    }

    function setCorrelationOracleAddress(address _address) external onlyOwner {
        correlationOracle = IOracle(_address);
    }

    function setSapienceMarketRegistry(address _address) external onlyOwner {
        SAPIENCE_MARKET_REGISTRY = _address;
    }

    function setStablecoinAddress(address _address) external onlyOwner {
        stablecoin = IERC20(_address);
    }

    function setUmaOracleRegistry(address _address) external onlyOwner {
        UMA_ORACLE_REGISTRY = _address;
    }

    function setParlayNftAddress(address _address) external onlyOwner {
        parlayNft = ParlayNFT(_address);
    }

    function requestParlay(Market[] calldata _markets, Outcome[] calldata _outcomes, uint256 _minPayout) external payable {
        require(_markets.length > 0, "Parlay must include at least one market");
        require(_markets.length == _outcomes.length, "Market and outcome arrays must have same length");
        require(_markets.length <= MAX_MARKETS_PER_PARLAY, "Too many markets in parlay");
        require(msg.value >= MIN_PARLAY_AMOUNT, "Principle too low");
        require(stablecoin.transferFrom(msg.sender, address(this), msg.value), "Stablecoin transfer failed");

        // TODO: Implement risk limit checks (pool capacity, individual parlay exposure, market concentration)
        // TODO: Pull fresh odds data from oracle services
        // TODO: Calculate parlay probability using market odds and correlation adjustments
        // TODO: Apply configured edge percentage to determine quoted payout
        // TODO: If quoted payout meets user\"s minimum requirement:
        //   - Mint parlay NFT with all relevant data
        //   - Transfer NFT to user
        //   - Add user\"s payment to pool capital
        // TODO: If quoted payout below minimum or insufficient pool capacity:
        //   - Refund user\"s payment

        emit ParlayRequested(msg.sender, msg.value);
    }

    function _getPoolNAV() internal view returns (uint256) {
        uint256 liquidCapital = stablecoin.balanceOf(address(this));
        uint256 expectedValueOfOutstandingParlays = 0;

        // TODO: Iterate through outstanding parlays and calculate their expected value
        // Expected Value = Σ(Parlay Payout × Current Win Probability)
        // This will require fetching current odds for all markets in outstanding parlays.
        // This is a complex calculation and might be gas-intensive. Consider off-chain calculation or a more efficient on-chain approach.

        return liquidCapital - expectedValueOfOutstandingParlays;
    }

    function depositLP(uint256 _amount) external {
        require(_amount >= MIN_LP_DEPOSIT, "Deposit amount too low");
        require(stablecoin.transferFrom(msg.sender, address(this), _amount), "Stablecoin transfer failed");

        uint256 currentNAV = _getPoolNAV();
        uint256 sharesMinted;

        if (totalShares == 0 || currentNAV == 0) {
            sharesMinted = _amount; // First deposit or NAV is zero, 1 share = 1 stablecoin
        } else {
            sharesMinted = _amount * totalShares / currentNAV;
        }

        lpPositions[msg.sender].lpAddress = msg.sender;
        lpPositions[msg.sender].shares = lpPositions[msg.sender].shares + sharesMinted;
        lpPositions[msg.sender].lastDepositTime = block.timestamp;
        totalShares = totalShares + sharesMinted;
        totalPrinciple = totalPrinciple + _amount;

        emit Deposit(msg.sender, _amount, sharesMinted);
    }

    function requestWithdrawal(uint256 _shares) external {
        require(lpPositions[msg.sender].shares >= _shares, "Insufficient shares");
        require(block.timestamp >= lpPositions[msg.sender].lastDepositTime + LP_DEPOSIT_LOCKUP, "Deposit lockup period not over");

        // TODO: Implement withdrawal restrictions (risk limits, cool-down periods)

        uint256 currentNAV = _getPoolNAV();
        uint256 amountToWithdraw = _shares * currentNAV / totalShares;

        lpPositions[msg.sender].shares = lpPositions[msg.sender].shares - _shares;
        totalShares = totalShares - _shares;

        require(stablecoin.transfer(msg.sender, amountToWithdraw), "Stablecoin transfer failed");

        emit WithdrawalCompleted(msg.sender, amountToWithdraw, _shares);
    }

    function settleParlay(uint256 _tokenId, bytes[] calldata _oracleProofs) external {
        Parlay storage parlay = parlays[_tokenId];
        require(parlay.creator == msg.sender, "Only parlay creator can settle");
        require(!parlay.settled, "Parlay already settled");

        // TODO: Validate that all markets in the parlay have resolved using _oracleProofs
        // TODO: Check oracle resolution data against predicted outcomes in NFT

        bool allPredictionsCorrect = true; // Placeholder

        if (allPredictionsCorrect) {
            parlayNft.burn(_tokenId);
            parlay.settled = true;
            require(stablecoin.transfer(msg.sender, parlay.potentialPayout), "Payout transfer failed");
            emit ParlaySettled(parlay.tokenId, msg.sender, parlay.potentialPayout);
        } else {
            parlayNft.burn(_tokenId);
            parlay.settled = true;
            // User\"s principle remains with pool as profit
            emit ParlaySettled(parlay.tokenId, msg.sender, 0);
        }
    }

    function sweepExpiredParlay(uint256 _tokenId) external {
        Parlay storage parlay = parlays[_tokenId];
        require(!parlay.settled, "Parlay already settled");
        require(block.timestamp > parlay.expirationTime + PARLAY_EXPIRATION_BUFFER, "Parlay not expired yet");

        // TODO: Verify that the markets in the parlay have resolved as losses or are past their resolution time

        parlayNft.burn(_tokenId);
        parlay.settled = true;
        // Principle remains with pool as profit
        emit ParlayExpired(_tokenId);
    }
}

