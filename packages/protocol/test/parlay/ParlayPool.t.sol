// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../src/parlay/ParlayPool.sol";
import "../../src/parlay/interfaces/IParlayPool.sol";
import "../../src/parlay/interfaces/IParlayEvents.sol";
import "../../src/parlay/interfaces/IParlayStructs.sol";
import "../../src/parlay/interfaces/IParlayNFT.sol";
import "../../src/parlay/ParlayNFT.sol";
import "./MockSapience.sol";
import "./MockERC20.sol";

contract ParlayPoolTest is Test {
    ParlayPool public pool;
    ParlayNFT public makerNFT;
    ParlayNFT public takerNFT;
    MockERC20 public collateralToken;
    MockSapience public mockSapience;
    
    address public ana;
    address public bob;
    address public carl;
    address public marketGroup1;
    address public marketGroup2;
    
    uint256 public constant MIN_COLLATERAL = 100e6;
    uint256 public constant MIN_EXPIRATION_TIME = 60;
    uint256 public constant MAX_EXPIRATION_TIME = 7 days;
    uint256 public constant MAX_PARLAY_MARKETS = 5;
    
    function setUp() public {
        // Deploy mock contracts
        collateralToken = new MockERC20("USDC", "USDC", 6);
        makerNFT = new ParlayNFT("Parlay Maker", "PMKR");
        takerNFT = new ParlayNFT("Parlay Taker", "PTKR");
        mockSapience = new MockSapience();
        
        // Deploy ParlayPool
        pool = new ParlayPool(
            address(collateralToken),
            address(makerNFT),
            address(takerNFT),
            MAX_PARLAY_MARKETS,
            MIN_COLLATERAL,
            MIN_EXPIRATION_TIME,
            MAX_EXPIRATION_TIME
        );
        
        // Transfer ownership of NFT contracts to ParlayPool
        makerNFT.transferOwnership(address(pool));
        takerNFT.transferOwnership(address(pool));
        
        // Setup test addresses
        ana = makeAddr("ana");
        bob = makeAddr("bob");
        carl = makeAddr("carl");
        marketGroup1 = address(mockSapience);
        marketGroup2 = address(mockSapience);
        
        // Fund test addresses
        collateralToken.mint(ana, 10000e6);
        collateralToken.mint(bob, 10000e6);
        collateralToken.mint(carl, 8000e6);
        
        // Setup mock Sapience markets (not settled)
        mockSapience.setMarketData(1, false, true, 0, 1000); // YES market
        mockSapience.setMarketData(2, false, true, 0, 1000); // YES market
        mockSapience.setMarketData(3, false, false, 0, 1000); // NO market
    }

    // ============ Helper Functions ============

    function createParlayRequest(
        address maker,
        uint256 collateral,
        uint256 payout,
        uint256 expirationTime
    ) internal returns (uint256 requestId) {
        IParlayStructs.PredictedOutcome[] memory outcomes = new IParlayStructs.PredictedOutcome[](2);
        outcomes[0] = IParlayStructs.PredictedOutcome({
            market: IParlayStructs.Market(marketGroup1, 1),
            prediction: true
        });
        outcomes[1] = IParlayStructs.PredictedOutcome({
            market: IParlayStructs.Market(marketGroup2, 2),
            prediction: true
        });
        
        vm.startPrank(maker);
        collateralToken.approve(address(pool), collateral);
        requestId = pool.submitParlayOrder(outcomes, collateral, payout, expirationTime);
        vm.stopPrank();
    }
    
    function fillParlayRequest(address taker, uint256 requestId) internal {
        vm.startPrank(taker);
        (IParlayStructs.ParlayData memory request, ) = pool.getParlayOrder(requestId);
        uint256 delta = request.payout - request.collateral;
        collateralToken.approve(address(pool), delta);
        pool.fillParlayOrder(requestId);
        vm.stopPrank();
    }

    // ============ Constructor Tests ============

    function testConstructor() public view {
        IParlayStructs.Settings memory config = pool.getConfig();
        assertEq(config.collateralToken, address(collateralToken));
        assertEq(config.makerNft, address(makerNFT));
        assertEq(config.takerNft, address(takerNFT));
        assertEq(config.maxParlayMarkets, MAX_PARLAY_MARKETS);
        assertEq(config.minCollateral, MIN_COLLATERAL);
        assertEq(config.minRequestExpirationTime, MIN_EXPIRATION_TIME);
        assertEq(config.maxRequestExpirationTime, MAX_EXPIRATION_TIME);
    }

    function testConstructorRevertInvalidCollateralToken() public {
        vm.expectRevert("Invalid collateral token");
        new ParlayPool(
            address(0),
            address(makerNFT),
            address(takerNFT),
            MAX_PARLAY_MARKETS,
            MIN_COLLATERAL,
            MIN_EXPIRATION_TIME,
            MAX_EXPIRATION_TIME
        );
    }

    function testConstructorRevertInvalidMakerNFT() public {
        vm.expectRevert("Invalid maker NFT");
        new ParlayPool(
            address(collateralToken),
            address(0),
            address(takerNFT),
            MAX_PARLAY_MARKETS,
            MIN_COLLATERAL,
            MIN_EXPIRATION_TIME,
            MAX_EXPIRATION_TIME
        );
    }

    function testConstructorRevertInvalidTakerNFT() public {
        vm.expectRevert("Invalid taker NFT");
        new ParlayPool(
            address(collateralToken),
            address(makerNFT),
            address(0),
            MAX_PARLAY_MARKETS,
            MIN_COLLATERAL,
            MIN_EXPIRATION_TIME,
            MAX_EXPIRATION_TIME
        );
    }

    function testConstructorRevertSameNFTs() public {
        vm.expectRevert("Maker and taker NFTs cannot be the same");
        new ParlayPool(
            address(collateralToken),
            address(makerNFT),
            address(makerNFT),
            MAX_PARLAY_MARKETS,
            MIN_COLLATERAL,
            MIN_EXPIRATION_TIME,
            MAX_EXPIRATION_TIME
        );
    }

    // ============ Submit Parlay Order Tests ============

    function testSubmitParlayOrder() public {
        uint256 collateral = 1000e6;
        uint256 payout = 1200e6;
        uint256 expirationTime = block.timestamp + 60;
        
        IParlayStructs.PredictedOutcome[] memory outcomes = new IParlayStructs.PredictedOutcome[](2);
        outcomes[0] = IParlayStructs.PredictedOutcome({
            market: IParlayStructs.Market(marketGroup1, 1),
            prediction: true
        });
        outcomes[1] = IParlayStructs.PredictedOutcome({
            market: IParlayStructs.Market(marketGroup2, 2),
            prediction: true
        });
        
        vm.startPrank(ana);
        collateralToken.approve(address(pool), collateral);
        
        vm.expectEmit(true, true, false, true);
        emit IParlayEvents.ParlayOrderSubmitted(ana, 1, outcomes, collateral, payout, expirationTime);
        
        uint256 requestId = pool.submitParlayOrder(outcomes, collateral, payout, expirationTime);
        vm.stopPrank();
        
        assertEq(requestId, 1);
        
        (IParlayStructs.ParlayData memory request, IParlayStructs.PredictedOutcome[] memory predictedOutcomes) = pool.getParlayOrder(requestId);
        assertEq(request.maker, ana);
        assertEq(request.collateral, collateral);
        assertEq(request.payout, payout);
        assertEq(request.orderExpirationTime, expirationTime);
        assertEq(request.filled, false);
        assertEq(request.settled, false);
        assertEq(predictedOutcomes.length, 2);
    }

    function testSubmitParlayOrderRevertNoMarkets() public {
        IParlayStructs.PredictedOutcome[] memory outcomes = new IParlayStructs.PredictedOutcome[](0);
        
        vm.startPrank(ana);
        vm.expectRevert("Must have at least one market");
        pool.submitParlayOrder(outcomes, 1000e6, 1200e6, block.timestamp + 60);
        vm.stopPrank();
    }

    function testSubmitParlayOrderRevertTooManyMarkets() public {
        IParlayStructs.PredictedOutcome[] memory outcomes = new IParlayStructs.PredictedOutcome[](6);
        for (uint256 i = 0; i < 6; i++) {
            outcomes[i] = IParlayStructs.PredictedOutcome({
                market: IParlayStructs.Market(marketGroup1, i + 1),
                prediction: true
            });
        }
        
        vm.startPrank(ana);
        vm.expectRevert("Too many markets");
        pool.submitParlayOrder(outcomes, 1000e6, 1200e6, block.timestamp + 60);
        vm.stopPrank();
    }

    function testSubmitParlayOrderRevertInsufficientCollateral() public {
        IParlayStructs.PredictedOutcome[] memory outcomes = new IParlayStructs.PredictedOutcome[](1);
        outcomes[0] = IParlayStructs.PredictedOutcome({
            market: IParlayStructs.Market(marketGroup1, 1),
            prediction: true
        });
        
        vm.startPrank(ana);
        vm.expectRevert("Collateral below minimum");
        pool.submitParlayOrder(outcomes, 50e6, 1200e6, block.timestamp + 60);
        vm.stopPrank();
    }

    function testSubmitParlayOrderRevertPayoutNotGreaterThanCollateral() public {
        IParlayStructs.PredictedOutcome[] memory outcomes = new IParlayStructs.PredictedOutcome[](1);
        outcomes[0] = IParlayStructs.PredictedOutcome({
            market: IParlayStructs.Market(marketGroup1, 1),
            prediction: true
        });
        
        vm.startPrank(ana);
        vm.expectRevert("Payout must be greater than collateral");
        pool.submitParlayOrder(outcomes, 1000e6, 1000e6, block.timestamp + 60);
        vm.stopPrank();
    }

    function testSubmitParlayOrderRevertInvalidMarketGroup() public {
        IParlayStructs.PredictedOutcome[] memory outcomes = new IParlayStructs.PredictedOutcome[](1);
        outcomes[0] = IParlayStructs.PredictedOutcome({
            market: IParlayStructs.Market(address(0), 1),
            prediction: true
        });
        
        vm.startPrank(ana);
        vm.expectRevert("Invalid market group address");
        pool.submitParlayOrder(outcomes, 1000e6, 1200e6, block.timestamp + 60);
        vm.stopPrank();
    }

    function testSubmitParlayOrderRevertExpirationInPast() public {
        IParlayStructs.PredictedOutcome[] memory outcomes = new IParlayStructs.PredictedOutcome[](1);
        outcomes[0] = IParlayStructs.PredictedOutcome({
            market: IParlayStructs.Market(marketGroup1, 1),
            prediction: true
        });
        
        vm.startPrank(ana);
        vm.expectRevert("Order expiration must be in future");
        pool.submitParlayOrder(outcomes, 1000e6, 1200e6, block.timestamp - 1);
        vm.stopPrank();
    }

    // ============ Fill Parlay Order Tests ============

    function testFillParlayOrder() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        
        uint256 bobBalanceBefore = collateralToken.balanceOf(bob);
        uint256 delta = 200e6; // 1200 - 1000
        
        vm.startPrank(bob);
        collateralToken.approve(address(pool), delta);
        
        vm.expectEmit(true, true, true, true);
        emit IParlayEvents.ParlayOrderFilled(requestId, ana, bob, 1, 2, 1000e6, delta, 1200e6);
        
        pool.fillParlayOrder(requestId);
        vm.stopPrank();
        
        (IParlayStructs.ParlayData memory parlay, ) = pool.getParlayOrder(requestId);
        assertEq(parlay.filled, true);
        assertEq(parlay.taker, bob);
        assertEq(parlay.payout, 1200e6);
        assertEq(parlay.makerNftTokenId, 1);
        assertEq(parlay.takerNftTokenId, 2);
        assertEq(parlay.createdAt, block.timestamp);
        
        // Check NFT ownership
        assertEq(makerNFT.ownerOf(1), ana);
        assertEq(takerNFT.ownerOf(2), bob);
        
        // Check token balances
        assertEq(collateralToken.balanceOf(bob), bobBalanceBefore - delta);
    }

    function testFillParlayOrderRevertAlreadyFilled() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        fillParlayRequest(bob, requestId);
        
        vm.startPrank(carl);
        vm.expectRevert("Order already filled");
        pool.fillParlayOrder(requestId);
        vm.stopPrank();
    }

    function testFillParlayOrderRevertExpired() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        
        // Fast forward past expiration
        vm.warp(block.timestamp + 61);
        
        vm.startPrank(bob);
        vm.expectRevert("Order expired");
        pool.fillParlayOrder(requestId);
        vm.stopPrank();
    }

    function testFillParlayOrderRevertInsufficientBalance() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        
        // Bob has insufficient balance
        collateralToken.burn(bob, collateralToken.balanceOf(bob) - 100e6);
        
        vm.startPrank(bob);
        vm.expectRevert("Insufficient taker balance");
        pool.fillParlayOrder(requestId);
        vm.stopPrank();
    }

    // ============ Settlement Tests ============

    function testSettleParlayMakerWins() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        fillParlayRequest(bob, requestId);
        
        // Settle the underlying markets
        mockSapience.setMarketData(1, true, true, 0, 1000); // Settle as YES
        mockSapience.setMarketData(2, true, true, 0, 1000); // Settle as YES
        
        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);
        
        vm.expectEmit(true, true, false, true);
        emit IParlayEvents.ParlaySettled(1, 2, 1200e6, true);
        
        pool.settleParlay(1); // Using maker NFT
        
        (IParlayStructs.ParlayData memory parlay, ) = pool.getParlayById(1);
        assertEq(parlay.settled, true);
        assertEq(parlay.makerWon, true);
        assertEq(parlay.payout, 1200e6); // collateral + delta (whole payout)
    }

    function testSettleParlayTakerWins() public {
        // Create a parlay with one wrong prediction
        IParlayStructs.PredictedOutcome[] memory outcomes = new IParlayStructs.PredictedOutcome[](2);
        outcomes[0] = IParlayStructs.PredictedOutcome({
            market: IParlayStructs.Market(marketGroup1, 1),
            prediction: true // Correct
        });
        outcomes[1] = IParlayStructs.PredictedOutcome({
            market: IParlayStructs.Market(marketGroup1, 3),
            prediction: true // Wrong - market settles as NO
        });
        
        vm.startPrank(ana);
        collateralToken.approve(address(pool), 1000e6);
        uint256 requestId = pool.submitParlayOrder(outcomes, 1000e6, 1200e6, block.timestamp + 60);
        vm.stopPrank();
        
        fillParlayRequest(bob, requestId);
        
        // Settle the underlying markets
        mockSapience.setMarketData(1, true, true, 0, 1000); // Settle as YES
        mockSapience.setMarketData(3, true, false, 0, 1000); // Settle as NO
        
        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);
        
        vm.expectEmit(true, true, false, true);
        emit IParlayEvents.ParlaySettled(1, 2, 1200e6, false);
        
        pool.settleParlay(1);
        
        (IParlayStructs.ParlayData memory parlay, ) = pool.getParlayById(1);
        assertEq(parlay.settled, true);
        assertEq(parlay.makerWon, false);
        assertEq(parlay.payout, 1200e6); // collateral + delta (whole payout)
    }

    function testSettleParlayRevertNotExpired() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        fillParlayRequest(bob, requestId);
        
        // Try to settle before 30 days
        vm.warp(block.timestamp + 29 days);
        
        vm.expectRevert("Parlay not expired yet");
        pool.settleParlay(1);
    }

    function testSettleParlayRevertAlreadySettled() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        fillParlayRequest(bob, requestId);
        
        // Settle the underlying markets
        mockSapience.setMarketData(1, true, true, 0, 1000); // Settle as YES
        mockSapience.setMarketData(2, true, true, 0, 1000); // Settle as YES
        
        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);
        
        pool.settleParlay(1);
        
        vm.expectRevert("Parlay already settled");
        pool.settleParlay(1);
    }

    // ============ Withdrawal Tests ============

    function testWithdrawParlayCollateralMakerWins() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        fillParlayRequest(bob, requestId);
        
        // Settle the underlying markets
        mockSapience.setMarketData(1, true, true, 0, 1000); // Settle as YES
        mockSapience.setMarketData(2, true, true, 0, 1000); // Settle as YES
        
        // Fast forward 30 days and settle
        vm.warp(block.timestamp + 30 days);
        pool.settleParlay(1);
        
        uint256 anaBalanceBefore = collateralToken.balanceOf(ana);
        
        vm.startPrank(ana);
        vm.expectEmit(true, true, false, true);
        emit IParlayEvents.ParlayCollateralWithdrawn(1, ana, 1200e6);
        
        pool.withdrawParlayCollateral(1);
        vm.stopPrank();
        
        assertEq(collateralToken.balanceOf(ana), anaBalanceBefore + 1200e6);
        
        // Verify payout is reset
        (IParlayStructs.ParlayData memory parlay, ) = pool.getParlayById(1);
        assertEq(parlay.payout, 0);
    }

    function testWithdrawParlayCollateralTakerWins() public {
        // Create parlay where maker loses
        IParlayStructs.PredictedOutcome[] memory outcomes = new IParlayStructs.PredictedOutcome[](1);
        outcomes[0] = IParlayStructs.PredictedOutcome({
            market: IParlayStructs.Market(marketGroup1, 3),
            prediction: true // Wrong prediction
        });
        
        vm.startPrank(ana);
        collateralToken.approve(address(pool), 1000e6);
        uint256 requestId = pool.submitParlayOrder(outcomes, 1000e6, 1200e6, block.timestamp + 60);
        vm.stopPrank();
        
        fillParlayRequest(bob, requestId);
        
        // Settle the underlying markets
        mockSapience.setMarketData(3, true, false, 0, 1000); // Settle as NO
        
        // Fast forward 30 days and settle
        vm.warp(block.timestamp + 30 days);
        pool.settleParlay(1);
        
        uint256 bobBalanceBefore = collateralToken.balanceOf(bob);
        
        vm.startPrank(bob);
        vm.expectEmit(true, true, false, true);
        emit IParlayEvents.ParlayCollateralWithdrawn(2, bob, 1200e6);
        
        pool.withdrawParlayCollateral(2); // Using taker NFT
        vm.stopPrank();
        
        assertEq(collateralToken.balanceOf(bob), bobBalanceBefore + 1200e6);
    }

    function testWithdrawParlayCollateralRevertNotSettled() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        fillParlayRequest(bob, requestId);
        
        vm.startPrank(ana);
        vm.expectRevert("Parlay not settled");
        pool.withdrawParlayCollateral(1);
        vm.stopPrank();
    }

    function testWithdrawParlayCollateralRevertNotOwner() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        fillParlayRequest(bob, requestId);
        
        // Settle the underlying markets
        mockSapience.setMarketData(1, true, true, 0, 1000); // Settle as YES
        mockSapience.setMarketData(2, true, true, 0, 1000); // Settle as YES
        
        // Fast forward 30 days and settle
        vm.warp(block.timestamp + 30 days);
        pool.settleParlay(1);
        
        vm.startPrank(carl);
        vm.expectRevert("Not NFT owner");
        pool.withdrawParlayCollateral(1);
        vm.stopPrank();
    }

    function testWithdrawParlayCollateralRevertWrongNFT() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        fillParlayRequest(bob, requestId);
        
        // Settle the underlying markets
        mockSapience.setMarketData(1, true, true, 0, 1000); // Settle as YES
        mockSapience.setMarketData(2, true, true, 0, 1000); // Settle as YES
        
        // Fast forward 30 days and settle
        vm.warp(block.timestamp + 30 days);
        pool.settleParlay(1);
        
        // Bob tries to withdraw with taker NFT when maker wins (should fail)
        vm.startPrank(bob);
        vm.expectRevert("Only maker can withdraw when maker wins");
        pool.withdrawParlayCollateral(2);
        vm.stopPrank();
    }

    function testWithdrawParlayCollateralRevertDoubleWithdrawal() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        fillParlayRequest(bob, requestId);
        
        // Settle the underlying markets
        mockSapience.setMarketData(1, true, true, 0, 1000); // Settle as YES
        mockSapience.setMarketData(2, true, true, 0, 1000); // Settle as YES
        
        // Fast forward 30 days and settle
        vm.warp(block.timestamp + 30 days);
        pool.settleParlay(1);
        
        vm.startPrank(ana);
        pool.withdrawParlayCollateral(1);
        
        vm.expectRevert("No payout to withdraw");
        pool.withdrawParlayCollateral(1);
        vm.stopPrank();
    }

    // ============ Cancel Expired Order Tests ============

    function testCancelExpiredOrder() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        
        // Fast forward past expiration
        vm.warp(block.timestamp + 61);
        
        uint256 anaBalanceBefore = collateralToken.balanceOf(ana);
        
        vm.startPrank(ana);
        vm.expectEmit(true, true, false, true);
        emit IParlayEvents.OrderExpired(requestId, ana, 1000e6);
        
        pool.cancelExpiredOrder(requestId);
        vm.stopPrank();
        
        assertEq(collateralToken.balanceOf(ana), anaBalanceBefore + 1000e6);
    }

    function testCancelExpiredOrderRevertNotExpired() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        
        vm.startPrank(ana);
        vm.expectRevert("Order not expired yet");
        pool.cancelExpiredOrder(requestId);
        vm.stopPrank();
    }

    function testCancelExpiredOrderRevertAlreadyFilled() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        fillParlayRequest(bob, requestId);
        
        vm.startPrank(ana);
        vm.expectRevert("Request does not exist");
        pool.cancelExpiredOrder(requestId);
        vm.stopPrank();
    }

    function testCancelExpiredOrderRevertNotMaker() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        
        // Fast forward past expiration
        vm.warp(block.timestamp + 61);
        
        vm.startPrank(bob);
        vm.expectRevert("Only maker can cancel expired order");
        pool.cancelExpiredOrder(requestId);
        vm.stopPrank();
    }

    // ============ View Function Tests ============

    function testCanFillParlayOrder() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        
        (bool canFill, uint256 reason) = pool.canFillParlayOrder(requestId);
        assertEq(canFill, true);
        assertEq(reason, 0);
        
        fillParlayRequest(bob, requestId);
        
        (canFill, reason) = pool.canFillParlayOrder(requestId);
        assertEq(canFill, false);
        assertEq(reason, 2); // Order already filled
    }

    function testCanFillParlayOrderExpired() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        
        // Fast forward past expiration
        vm.warp(block.timestamp + 61);
        
        (bool canFill, uint256 reason) = pool.canFillParlayOrder(requestId);
        assertEq(canFill, false);
        assertEq(reason, 3); // Order expired
    }

    // ============ Integration Tests ============

    function testCompleteParlayFlow() public {
        // Step 1: Ana submits parlay order
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        
        // Step 2: Bob fills the order
        fillParlayRequest(bob, requestId);
        
        // Step 3: Settle the underlying markets
        mockSapience.setMarketData(1, true, true, 0, 1000); // Settle as YES
        mockSapience.setMarketData(2, true, true, 0, 1000); // Settle as YES
        
        // Step 4: Fast forward 30 days and settle parlay
        vm.warp(block.timestamp + 30 days);
        pool.settleParlay(1);
        
        // Step 5: Ana withdraws winnings
        vm.startPrank(ana);
        pool.withdrawParlayCollateral(1);
        vm.stopPrank();
        
        // Verify final state
        (IParlayStructs.ParlayData memory parlay, ) = pool.getParlayById(1);
        assertEq(parlay.settled, true);
        assertEq(parlay.makerWon, true);
        assertEq(parlay.payout, 0); // Already withdrawn
    }

    function testCompetitionBetweenTakers() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        
        // Both Bob and Carl try to fill the same order
        vm.startPrank(bob);
        collateralToken.approve(address(pool), 200e6);
        pool.fillParlayOrder(requestId);
        vm.stopPrank();
        
        // Carl's transaction should fail
        vm.startPrank(carl);
        collateralToken.approve(address(pool), 200e6);
        vm.expectRevert("Order already filled");
        pool.fillParlayOrder(requestId);
        vm.stopPrank();
        
        // Verify Bob won
        (IParlayStructs.ParlayData memory parlay, ) = pool.getParlayOrder(requestId);
        assertEq(parlay.taker, bob);
        assertEq(takerNFT.ownerOf(2), bob);
    }

    // ============ Missing Function Tests ============

    function testSettleAndWithdrawParlayCollateral() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        fillParlayRequest(bob, requestId);
        
        // Settle the underlying markets
        mockSapience.setMarketData(1, true, true, 0, 1000); // Settle as YES
        mockSapience.setMarketData(2, true, true, 0, 1000); // Settle as YES
        
        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);
        
        uint256 anaBalanceBefore = collateralToken.balanceOf(ana);
        
        vm.startPrank(ana);
        vm.expectEmit(true, true, false, true);
        emit IParlayEvents.ParlaySettled(1, 2, 1200e6, true);
        
        vm.expectEmit(true, true, false, true);
        emit IParlayEvents.ParlayCollateralWithdrawn(1, ana, 1200e6);
        
        pool.settleAndWithdrawParlayCollateral(1);
        vm.stopPrank();
        
        assertEq(collateralToken.balanceOf(ana), anaBalanceBefore + 1200e6);
        
        // Verify final state
        (IParlayStructs.ParlayData memory parlay, ) = pool.getParlayById(1);
        assertEq(parlay.settled, true);
        assertEq(parlay.makerWon, true);
        assertEq(parlay.payout, 0); // Already withdrawn
    }

    function testGetParlay() public {
        uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        fillParlayRequest(bob, requestId);
        
        // Test getParlay with maker NFT
        (IParlayStructs.ParlayData memory parlayData, IParlayStructs.PredictedOutcome[] memory predictedOutcomes) = pool.getParlay(1);
        assertEq(parlayData.maker, ana);
        assertEq(parlayData.taker, bob);
        assertEq(parlayData.filled, true);
        assertEq(predictedOutcomes.length, 2);
        
        // Test getParlay with taker NFT
        (parlayData, predictedOutcomes) = pool.getParlay(2);
        assertEq(parlayData.maker, ana);
        assertEq(parlayData.taker, bob);
        assertEq(parlayData.filled, true);
        assertEq(predictedOutcomes.length, 2);
    }

    function testGetParlayRevertInvalidToken() public {
        vm.expectRevert("Parlay does not exist");
        pool.getParlay(999);
    }
} 