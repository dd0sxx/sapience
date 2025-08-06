# ParlayPool Deployment Scripts

This directory contains deployment scripts for the ParlayPool system, which implements a true orderbook-style parlay betting system.

## Scripts Overview

### 1. `DeployParlayPool.s.sol`
Deploys the complete ParlayPool system including:
- Maker NFT contract
- Taker NFT contract  
- ParlayPool contract
- Transfers NFT ownership to ParlayPool

### 2. `ConfigureParlayPool.s.sol`
Verifies and displays the configuration of a deployed ParlayPool system.

## Prerequisites

Before running the deployment scripts, ensure you have:

1. **Foundry installed** and configured
2. **Environment variables set** (see Environment Setup below)
3. **Sufficient funds** in your deployer account
4. **sUSDe token address** for the target network

## Environment Setup

Create a `.env` file in the project root with the following variables:

```bash
# Required for deployment
PRIVATE_KEY=your_private_key_here
COLLATERAL_TOKEN=0x... # sUSDe token address on target network
DEPLOYER_ADDRESS=0x... # Your deployer address

# Required for configuration check
PARLAY_POOL_ADDRESS=0x... # Deployed ParlayPool address
MAKER_NFT_ADDRESS=0x...   # Deployed Maker NFT address
TAKER_NFT_ADDRESS=0x...   # Deployed Taker NFT address
```

## Deployment Instructions

### Step 1: Deploy ParlayPool System

```bash
# Load environment variables
source .env

# Deploy the complete ParlayPool system
forge script DeployParlayPool.s.sol --rpc-url <your_rpc_url> --broadcast --verify
```

The deployment script will:
1. Deploy Maker NFT contract ("Parlay Maker", "PMKR")
2. Deploy Taker NFT contract ("Parlay Taker", "PTKR") 
3. Deploy ParlayPool contract with configuration:
   - Max parlay markets: 5
   - Min collateral: 100 sUSDe (18 decimals)
   - Min expiration time: 30 seconds
   - Max expiration time: 1 day
4. Transfer NFT ownership to ParlayPool
5. Display deployment summary and verification

### Step 2: Verify Configuration

After deployment, save the contract addresses and verify the configuration:

```bash
# Update your .env file with the deployed addresses
# Then run the configuration check
forge script ConfigureParlayPool.s.sol --rpc-url <your_rpc_url>
```

## Configuration Details

### ParlayPool Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `maxParlayMarkets` | 5 | Maximum number of markets per parlay |
| `minCollateral` | 100000000000000000000 | Minimum collateral (100 sUSDe, 18 decimals) |
| `minRequestExpirationTime` | 30 | Minimum order expiration (30 seconds) |
| `maxRequestExpirationTime` | 86400 | Maximum order expiration (1 day) |

### NFT Contracts

- **Maker NFT**: "Parlay Maker" (PMKR) - Represents maker positions
- **Taker NFT**: "Parlay Taker" (PTKR) - Represents taker positions
- Both NFTs are owned by the ParlayPool contract for minting/burning

## Network-Specific Addresses

### Base Mainnet
```bash
COLLATERAL_TOKEN=0x5875eee11cf8398102fdad704c9e96607675467a # sUSDS
```

### Base-Arb (Arbitrum Nova)
```bash
COLLATERAL_TOKEN=0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2 # sUSDe
```

### Sepolia Testnet
```bash
COLLATERAL_TOKEN=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 # USDC
```

## Usage After Deployment

Once deployed, users can:

1. **Approve sUSDe spending** to the ParlayPool address
2. **Submit parlay orders** as makers with collateral
3. **Fill parlay orders** as takers with delta amounts
4. **Settle parlays** after 30 days from creation
5. **Withdraw winnings** using their NFT tokens

## Troubleshooting

### Common Issues

1. **"Invalid collateral token"**: Ensure the sUSDe address is correct for your network
2. **"Insufficient balance"**: Ensure your deployer account has sufficient funds
3. **"NFT ownership not correctly set"**: The deployment script should handle this automatically

### Verification Commands

```bash
# Check if contracts are deployed
cast code <contract_address> --rpc-url <your_rpc_url>

# Verify ParlayPool configuration
cast call <parlay_pool_address> "getConfig()" --rpc-url <your_rpc_url>

# Check NFT ownership
cast call <maker_nft_address> "owner()" --rpc-url <your_rpc_url>
cast call <taker_nft_address> "owner()" --rpc-url <your_rpc_url>
```

## Security Notes

- The deployment script uses `vm.startBroadcast()` to ensure all transactions are executed
- NFT ownership is automatically transferred to ParlayPool during deployment
- Configuration parameters are hardcoded for consistency
- Always verify deployment on block explorers after deployment

## Next Steps

After successful deployment:

1. **Test the system** with small amounts first
2. **Monitor events** for parlay order submissions and fills
3. **Verify market integration** with your Sapience markets
4. **Document contract addresses** for your users

For detailed usage examples, see `ParlayPool_Usage_Examples.md` in the parlay directory. 