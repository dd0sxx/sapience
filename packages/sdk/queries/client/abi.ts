import type { Abi } from 'abitype';
import sapience from '../../../protocol/deployments/Sapience.json';
import sapienceFactory from '../../../protocol/deployments/SapienceFactory.json';

export const sapienceAbi = (): { abi: Abi } => {
  const abi: Abi = sapience.abi as Abi;
  return { abi };
};

export const sapienceFactoryAbi = (): { abi: Abi } => {
  const abi: Abi = sapienceFactory.abi as Abi;
  return { abi };
};

// Backwards-compatible hook alias so this is a pure move
export const useSapienceAbi = () => sapienceAbi();

