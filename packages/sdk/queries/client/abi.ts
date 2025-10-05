import type { Abi } from 'abitype';
import { foilAbi } from '../../constants/abis';
import sapienceFactory from '../../../protocol/deployments/SapienceFactory.json';

export const sapienceAbi = (): { abi: Abi } => ({ abi: foilAbi as Abi });

export const sapienceFactoryAbi = (): { abi: Abi } => {
  const abi: Abi = sapienceFactory.abi as Abi;
  return { abi };
};

export const useSapienceAbi = () => sapienceAbi();


