// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.19;

// import "forge-std/Test.sol";
// import "../../src/parlay/ParlayPool.sol";
// import "../../src/parlay/interfaces/IParlayPool.sol";
// import "../../src/parlay/ParlayNFT.sol";
// import "./MockSapience.sol";
// import "./MockERC20.sol";

// contract ParlayPoolIntegrationTest is Test {
//     ParlayPool public pool;
//     ParlayNFT public makerNFT;
//     ParlayNFT public takerNFT;
//     MockERC20 public collateralToken;
//     MockSapience public mockSapience;
    
//     address public ana;
//     address public bob;
//     address public carl;
//     address public david;
//     address public marketGroup1;
//     address public marketGroup2;
//     address public marketGroup3;
    
//     uint256 public constant MIN_COLLATERAL = 100e6;
//     uint256 public constant MIN_EXPIRATION_TIME = 60;
//     uint256 public constant MAX_EXPIRATION_TIME = 7 days;
//     uint256 public constant MAX_PARLAY_MARKETS = 5;

//     function setUp() public {
//         // Deploy mock contracts
//         collateralToken = new MockERC20("USDC", "USDC", 6);
//         makerNFT = new ParlayNFT("Parlay Maker", "PMKR");
//         takerNFT = new ParlayNFT("Parlay Taker", "PTKR");
//         mockSapience = new MockSapience();
        
//         // Deploy ParlayPool
//         pool = new ParlayPool(
//             address(collateralToken),
//             address(makerNFT),
//             address(takerNFT),
//             MAX_PARLAY_MARKETS,
//             MIN_COLLATERAL,
//             MIN_EXPIRATION_TIME,
//             MAX_EXPIRATION_TIME
//         );
        
//         // Transfer ownership of NFT contracts to ParlayPool
//         makerNFT.transferOwnership(address(pool));
//         takerNFT.transferOwnership(address(pool));
        
//         // Setup test addresses
//         ana = makeAddr("ana");
//         bob = makeAddr("bob");
//         carl = makeAddr("carl");
//         david = makeAddr("david");
//         marketGroup1 = makeAddr("marketGroup1");
//         marketGroup2 = makeAddr("marketGroup2");
//         marketGroup3 = makeAddr("marketGroup3");
        
//         // Fund test addresses
//         collateralToken.mint(ana, 10000e6);
//         collateralToken.mint(bob, 10000e6);
//         collateralToken.mint(carl, 10000e6);
//         collateralToken.mint(david, 10000e6);
        
//         // Setup mock Sapience markets
//         mockSapience.setMarketData(1, true, true, 0, 1000); // YES
//         mockSapience.setMarketData(2, true, true, 0, 1000); // YES
//         mockSapience.setMarketData(3, true, false, 0, 1000); // NO
//     }

//     // ============ Complete Workflow Tests ============

//     function testCompleteParlayWorkflow() public {
//         // Step 1: Ana submits parlay order
//         uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        
//         // Step 2: Bob fills the order
//         fillParlayRequest(bob, requestId);
        
//         // Step 3: Fast forward 30 days and settle
//         vm.warp(block.timestamp + 30 days);
//         pool.settleParlay(1);
        
//         // Step 4: Ana withdraws winnings
//         vm.startPrank(ana);
//         pool.withdrawParlayCollateral(1);
//         vm.stopPrank();
        
//         // Verify final state
//         (IParlayPool.ParlayData memory parlay, ) = pool.getParlayById(1);
//         assertEq(parlay.settled, true);
//         assertEq(parlay.makerWon, true);
//         assertEq(parlay.payout, 0); // Already withdrawn
//         assertEq(collateralToken.balanceOf(ana), 10200e6); // 10000 + 1200
//     }

//     function testCompleteParlayWorkflowTakerWins() public {
//         // Create parlay where maker loses
//         IParlayPool.PredictedOutcome[] memory outcomes = new IParlayPool.PredictedOutcome[](1);
//         outcomes[0] = IParlayPool.PredictedOutcome({
//             market: IParlayPool.Market(marketGroup3, 1),
//             prediction: true // Wrong prediction
//         });
        
//         vm.startPrank(ana);
//         collateralToken.approve(address(pool), 1000e6);
//         uint256 requestId = pool.submitParlayOrder(outcomes, 1000e6, 1200e6, block.timestamp + 60);
//         vm.stopPrank();
        
//         fillParlayRequest(bob, requestId);
        
//         // Fast forward 30 days and settle
//         vm.warp(block.timestamp + 30 days);
//         pool.settleParlay(1);
        
//         // Bob withdraws winnings
//         vm.startPrank(bob);
//         pool.withdrawParlayCollateral(2);
//         vm.stopPrank();
        
//         // Verify final state
//         (IParlayPool.ParlayData memory parlay, ) = pool.getParlayById(1);
//         assertEq(parlay.settled, true);
//         assertEq(parlay.makerWon, false);
//         assertEq(parlay.payout, 0); // Already withdrawn
//         assertEq(collateralToken.balanceOf(bob), 11200e6); // 10000 + 1200
//     }

//     // ============ Multiple Parlays Tests ============

//     function testMultipleParlays() public {
//         // Create multiple parlays
//         uint256[] memory requestIds = new uint256[](3);
//         requestIds[0] = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
//         requestIds[1] = createParlayRequest(bob, 500e6, 600e6, block.timestamp + 60);
//         requestIds[2] = createParlayRequest(carl, 2000e6, 2400e6, block.timestamp + 60);
        
//         // Fill all parlays
//         fillParlayRequest(david, requestIds[0]);
//         fillParlayRequest(ana, requestIds[1]);
//         fillParlayRequest(bob, requestIds[2]);
        
//         // Fast forward 30 days and settle all
//         vm.warp(block.timestamp + 30 days);
//         pool.settleParlay(1);
//         pool.settleParlay(3);
//         pool.settleParlay(5);
        
//         // Withdraw all winnings
//         vm.startPrank(ana);
//         pool.withdrawParlayCollateral(1);
//         vm.stopPrank();
        
//         vm.startPrank(david);
//         pool.withdrawParlayCollateral(2);
//         vm.stopPrank();
        
//         vm.startPrank(carl);
//         pool.withdrawParlayCollateral(7);
//         vm.stopPrank();
        
//         // Verify all parlays are settled
//         for (uint256 i = 1; i <= 3; i++) {
//             (IParlayPool.ParlayData memory parlay, ) = pool.getParlayById(i * 2 - 1);
//             assertEq(parlay.settled, true);
//         }
//     }

//     // ============ Competition Tests ============

//     function testTakerCompetition() public {
//         uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        
//         // Multiple takers try to fill the same order
//         vm.startPrank(bob);
//         collateralToken.approve(address(pool), 200e6);
//         pool.fillParlayOrder(requestId);
//         vm.stopPrank();
        
//         // Carl's attempt should fail
//         vm.startPrank(carl);
//         collateralToken.approve(address(pool), 200e6);
//         vm.expectRevert("Order already filled");
//         pool.fillParlayOrder(requestId);
//         vm.stopPrank();
        
//         // Verify Bob won
//         (IParlayPool.ParlayData memory parlay, ) = pool.getParlayOrder(requestId);
//         assertEq(parlay.taker, bob);
//         assertEq(takerNFT.ownerOf(2), bob);
//     }

//     // ============ Complex Market Scenarios ============

//     function testComplexParlayWithMultipleMarkets() public {
//         // Create a parlay with 3 markets
//         IParlayPool.PredictedOutcome[] memory outcomes = new IParlayPool.PredictedOutcome[](3);
//         outcomes[0] = IParlayPool.PredictedOutcome({
//             market: IParlayPool.Market(marketGroup1, 1),
//             prediction: true
//         });
//         outcomes[1] = IParlayPool.PredictedOutcome({
//             market: IParlayPool.Market(marketGroup2, 1),
//             prediction: true
//         });
//         outcomes[2] = IParlayPool.PredictedOutcome({
//             market: IParlayPool.Market(marketGroup3, 1),
//             prediction: false // Correct prediction for NO market
//         });
        
//         vm.startPrank(ana);
//         collateralToken.approve(address(pool), 1000e6);
//         uint256 requestId = pool.submitParlayOrder(outcomes, 1000e6, 1200e6, block.timestamp + 60);
//         vm.stopPrank();
        
//         fillParlayRequest(bob, requestId);
        
//         // Fast forward 30 days and settle
//         vm.warp(block.timestamp + 30 days);
//         pool.settleParlay(1);
        
//         // Ana should win (all predictions correct)
//         vm.startPrank(ana);
//         pool.withdrawParlayCollateral(1);
//         vm.stopPrank();
        
//         (IParlayPool.ParlayData memory parlay, ) = pool.getParlayById(1);
//         assertEq(parlay.makerWon, true);
//     }

//     function testComplexParlayWithMixedOutcomes() public {
//         // Create a parlay where some predictions are wrong
//         IParlayPool.PredictedOutcome[] memory outcomes = new IParlayPool.PredictedOutcome[](2);
//         outcomes[0] = IParlayPool.PredictedOutcome({
//             market: IParlayPool.Market(marketGroup1, 1),
//             prediction: true // Correct
//         });
//         outcomes[1] = IParlayPool.PredictedOutcome({
//             market: IParlayPool.Market(marketGroup3, 1),
//             prediction: true // Wrong - market settles as NO
//         });
        
//         vm.startPrank(ana);
//         collateralToken.approve(address(pool), 1000e6);
//         uint256 requestId = pool.submitParlayOrder(outcomes, 1000e6, 1200e6, block.timestamp + 60);
//         vm.stopPrank();
        
//         fillParlayRequest(bob, requestId);
        
//         // Fast forward 30 days and settle
//         vm.warp(block.timestamp + 30 days);
//         pool.settleParlay(1);
        
//         // Bob should win (maker loses)
//         vm.startPrank(bob);
//         pool.withdrawParlayCollateral(2);
//         vm.stopPrank();
        
//         (IParlayPool.ParlayData memory parlay, ) = pool.getParlayById(1);
//         assertEq(parlay.makerWon, false);
//     }

//     // ============ Expiration and Cancellation Tests ============

//     function testOrderExpirationAndCancellation() public {
//         uint256 requestId = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
        
//         // Fast forward past expiration
//         vm.warp(block.timestamp + 61);
        
//         uint256 anaBalanceBefore = collateralToken.balanceOf(ana);
        
//         vm.startPrank(ana);
//         pool.cancelExpiredOrder(requestId);
//         vm.stopPrank();
        
//         assertEq(collateralToken.balanceOf(ana), anaBalanceBefore + 1000e6);
        
//         // Verify request is cleared
//         (IParlayPool.ParlayData memory request, ) = pool.getParlayOrder(requestId);
//         assertEq(request.maker, address(0));
//         assertEq(request.collateral, 0);
//     }

//     function testMultipleExpiredOrders() public {
//         // Create multiple orders that will expire
//         uint256 requestId1 = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
//         uint256 requestId2 = createParlayRequest(bob, 500e6, 600e6, block.timestamp + 60);
//         uint256 requestId3 = createParlayRequest(carl, 2000e6, 2400e6, block.timestamp + 60);
        
//         // Fast forward past expiration
//         vm.warp(block.timestamp + 61);
        
//         // Cancel all expired orders
//         vm.startPrank(ana);
//         pool.cancelExpiredOrder(requestId1);
//         vm.stopPrank();
        
//         vm.startPrank(bob);
//         pool.cancelExpiredOrder(requestId2);
//         vm.stopPrank();
        
//         vm.startPrank(carl);
//         pool.cancelExpiredOrder(requestId3);
//         vm.stopPrank();
        
//         // Verify all orders are cleared
//         (IParlayPool.ParlayData memory request1, ) = pool.getParlayOrder(requestId1);
//         (IParlayPool.ParlayData memory request2, ) = pool.getParlayOrder(requestId2);
//         (IParlayPool.ParlayData memory request3, ) = pool.getParlayOrder(requestId3);
        
//         assertEq(request1.maker, address(0));
//         assertEq(request2.maker, address(0));
//         assertEq(request3.maker, address(0));
//     }

//     // ============ State Consistency Tests ============

//     function testStateConsistencyAcrossMultipleOperations() public {
//         // Create and fill multiple parlays
//         uint256 requestId1 = createParlayRequest(ana, 1000e6, 1200e6, block.timestamp + 60);
//         uint256 requestId2 = createParlayRequest(bob, 500e6, 600e6, block.timestamp + 60);
        
//         fillParlayRequest(carl, requestId1);
//         fillParlayRequest(david, requestId2);
        
//         // Fast forward and settle
//         vm.warp(block.timestamp + 30 days);
//         pool.settleParlay(1);
//         pool.settleParlay(3);
        
//         // Withdraw winnings
//         vm.startPrank(ana);
//         pool.withdrawParlayCollateral(1);
//         vm.stopPrank();
        
//         vm.startPrank(carl);
//         pool.withdrawParlayCollateral(2);
//         vm.stopPrank();
        
//         // Verify state consistency
//         (IParlayPool.ParlayData memory parlay1, ) = pool.getParlayById(1);
//         (IParlayPool.ParlayData memory parlay2, ) = pool.getParlayById(2);
        
//         assertEq(parlay1.settled, true);
//         assertEq(parlay1.payout, 0); // Withdrawn
//         assertEq(parlay2.settled, true);
//         assertEq(parlay2.payout, 0); // Withdrawn
//     }

//     // ============ Helper Functions ============

//     function createParlayRequest(
//         address maker,
//         uint256 collateral,
//         uint256 payout,
//         uint256 expirationTime
//     ) internal returns (uint256 requestId) {
//         IParlayPool.PredictedOutcome[] memory outcomes = new IParlayPool.PredictedOutcome[](2);
//         outcomes[0] = IParlayPool.PredictedOutcome({
//             market: IParlayPool.Market(marketGroup1, 1),
//             prediction: true
//         });
//         outcomes[1] = IParlayPool.PredictedOutcome({
//             market: IParlayPool.Market(marketGroup2, 1),
//             prediction: true
//         });
        
//         vm.startPrank(maker);
//         collateralToken.approve(address(pool), collateral);
//         requestId = pool.submitParlayOrder(outcomes, collateral, payout, expirationTime);
//         vm.stopPrank();
//     }
    
//     function fillParlayRequest(address taker, uint256 requestId) internal {
//         vm.startPrank(taker);
//         (IParlayPool.ParlayData memory request, ) = pool.getParlayOrder(requestId);
//         uint256 delta = request.payout - request.collateral;
//         collateralToken.approve(address(pool), delta);
//         pool.fillParlayOrder(requestId);
//         vm.stopPrank();
//     }
// } 