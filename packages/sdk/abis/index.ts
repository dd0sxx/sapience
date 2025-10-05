import type { Abi } from 'abitype';

import PredictionMarket from './PredictionMarket.json';
import PassiveLiquidityVault from './PassiveLiquidityVault.json';
import UMAResolver from './UMAResolver.json';
import CollateralToken from './CollateralToken.json';
import Foil from './Foil.json';

export const predictionMarketAbi: Abi = (PredictionMarket as { abi: Abi }).abi;
export const passiveLiquidityVaultAbi: Abi = (PassiveLiquidityVault as { abi: Abi }).abi;
export const umaResolverAbi: Abi = (UMAResolver as { abi: Abi }).abi;
export const collateralTokenAbi: Abi = (CollateralToken as { abi: Abi }).abi;
export const foilAbi: Abi = (Foil as { abi: Abi }).abi;


