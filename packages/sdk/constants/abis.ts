import type { Abi } from 'abitype';

import PredictionMarket from '../abis/PredictionMarket.json';
import LiquidityVault from '../abis/LiquidityVault.json';
import UMAResolver from '../abis/UMAResolver.json';
import CollateralToken from '../abis/CollateralToken.json';
import Foil from '../abis/Foil.json';

export const predictionMarketAbi: Abi = (PredictionMarket as { abi: Abi }).abi;
export const liquidityVaultAbi: Abi = (LiquidityVault as { abi: Abi }).abi;
export const umaResolverAbi: Abi = (UMAResolver as { abi: Abi }).abi;
export const collateralTokenAbi: Abi = (CollateralToken as { abi: Abi }).abi;
export const foilAbi: Abi = (Foil as { abi: Abi }).abi;


