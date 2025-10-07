import type { Abi } from 'abitype';
import { foilAbi, foilFactoryAbi } from '../../constants/abis';

export const sapienceAbi = (): { abi: Abi } => ({ abi: foilAbi as Abi });

export const foilFactoryAbiFn = (): { abi: Abi } => ({ abi: foilFactoryAbi as Abi });

export const useSapienceAbi = () => sapienceAbi();


