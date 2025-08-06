// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import {ParlayPool} from "../parlay/ParlayPool.sol";
import {ParlayNFT} from "../parlay/ParlayNFT.sol";

contract ConfigureParlayPool is Script {
    function run() external {
        // Replace these with your deployed contract addresses
        address parlayPoolAddress = vm.envAddress("PARLAY_POOL_ADDRESS");
        address makerNftAddress = vm.envAddress("MAKER_NFT_ADDRESS");
        address takerNftAddress = vm.envAddress("TAKER_NFT_ADDRESS");
        
        ParlayPool pool = ParlayPool(parlayPoolAddress);
        ParlayNFT makerNFT = ParlayNFT(makerNftAddress);
        ParlayNFT takerNFT = ParlayNFT(takerNftAddress);

        console.log("=== ParlayPool Configuration Check ===");
        
        // Get ParlayPool configuration
        (address collateralToken, address configMakerNft, address configTakerNft, 
         uint256 maxParlayMarkets, uint256 minCollateral, 
         uint256 minRequestExpirationTime, uint256 maxRequestExpirationTime) = pool.getConfig();
        
        console.log("ParlayPool Address:", parlayPoolAddress);
        console.log("Collateral Token:", collateralToken);
        console.log("Maker NFT:", configMakerNft);
        console.log("Taker NFT:", configTakerNft);
        console.log("Max Parlay Markets:", maxParlayMarkets);
        console.log("Min Collateral:", minCollateral, "wei");
        console.log("Min Expiration Time:", minRequestExpirationTime, "seconds");
        console.log("Max Expiration Time:", maxRequestExpirationTime, "seconds");
        
        // Verify NFT ownership
        console.log("\n=== NFT Ownership Verification ===");
        console.log("Maker NFT Owner:", makerNFT.owner());
        console.log("Taker NFT Owner:", takerNFT.owner());
        console.log("Expected Owner (ParlayPool):", parlayPoolAddress);
        
        bool makerOwnershipCorrect = makerNFT.owner() == parlayPoolAddress;
        bool takerOwnershipCorrect = takerNFT.owner() == parlayPoolAddress;
        
        console.log("Maker NFT ownership correct:", makerOwnershipCorrect);
        console.log("Taker NFT ownership correct:", takerOwnershipCorrect);
        
        // Check NFT details
        console.log("\n=== NFT Contract Details ===");
        console.log("Maker NFT Name:", makerNFT.name());
        console.log("Maker NFT Symbol:", makerNFT.symbol());
        console.log("Taker NFT Name:", takerNFT.name());
        console.log("Taker NFT Symbol:", takerNFT.symbol());
        
        // Verify configuration consistency
        console.log("\n=== Configuration Verification ===");
        bool configConsistent = 
            configMakerNft == makerNftAddress &&
            configTakerNft == takerNftAddress &&
            maxParlayMarkets == 5 &&
            minCollateral == 100e6 &&
            minRequestExpirationTime == 60 &&
            maxRequestExpirationTime == 86400 * 7;
            
        console.log("Configuration consistent with deployment:", configConsistent);
        
        if (!configConsistent) {
            console.log("WARNING: Configuration differs from expected deployment values!");
        }
        
        if (!makerOwnershipCorrect || !takerOwnershipCorrect) {
            console.log("WARNING: NFT ownership not correctly set!");
            console.log("The ParlayPool will not be able to mint/burn NFTs.");
        }
        
        console.log("\n=== System Status ===");
        if (configConsistent && makerOwnershipCorrect && takerOwnershipCorrect) {
            console.log("✅ ParlayPool system is properly configured and ready for use!");
        } else {
            console.log("❌ ParlayPool system has configuration issues that need to be resolved.");
        }
        
        console.log("\n=== Usage Instructions ===");
        console.log("1. Users must approve USDC spending to ParlayPool:", parlayPoolAddress);
        console.log("2. Makers can submit parlay orders with minimum collateral:", minCollateral, "wei");
        console.log("3. Takers can fill orders within expiration time limits");
        console.log("4. Only Yes/No markets are supported for parlays");
        console.log("5. Parlays can only be settled after 30 days from creation");
    }
} 