import type { Abi } from 'abitype';

import PredictionMarket from './PredictionMarket.json';
import LiquidityVault from './LiquidityVault.json';
import UMAResolver from './UMAResolver.json';
import CollateralToken from './CollateralToken.json';
import Foil from './Foil.json';

export const predictionMarketAbi: Abi = (PredictionMarket as { abi: Abi }).abi;
export const liquidityVaultAbi: Abi = (LiquidityVault as { abi: Abi }).abi;
export const umaResolverAbi: Abi = (UMAResolver as { abi: Abi }).abi;
export const collateralTokenAbi: Abi = (CollateralToken as { abi: Abi }).abi;
export const foilAbi: Abi = (Foil as { abi: Abi }).abi;

// Note: Do not re-export raw JSONs to avoid exposing addresses.


