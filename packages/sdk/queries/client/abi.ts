import type { Abi } from 'abitype';
import { foilAbi } from '../../constants/abis';
import foilFactory from '../../abis/FoilFactory.json';

export const sapienceAbi = (): { abi: Abi } => ({ abi: foilAbi as Abi });

export const foilFactoryAbi = (): { abi: Abi } => {
  const abi: Abi = (foilFactory as { abi: Abi }).abi as Abi;
  return { abi };
};

export const useSapienceAbi = () => sapienceAbi();


