// Centralized addresses mapping.
// Format: arrays of strings like "arb1:0xabc..." to allow simple parsing and future multi-network support.

export type NetworkTag = 'arb1' | 'base' | 'sepolia' | 'localhost' | string;

export interface AddressLists {
  predictionMarket: string[]; // e.g., ["arb1:0x8D1D..."]
  umaResolver: string[];
  passiveLiquidityVault: string[];
  collateralToken: string[]; // App collateral token
}

export const CONTRACT_ADDRESS_LISTS: AddressLists = {
  predictionMarket: [
    'arb1:0xb04841cad1147675505816e2ec5c915430857b40',
  ],
  umaResolver: [
    'arb1:0x2cc1311871b9fc7bfcb809c75da4ba25732eafb9',
  ],
  passiveLiquidityVault: [
    'arb1:0xcc1c64e849395d31d059a4bd19391af64d8855d7',
  ],
  collateralToken: [
    'arb1:0xfeb8c4d5efbaff6e928ea090bc660c363f883dba',
  ],
};

export function getAddressList(key: keyof AddressLists): string[] {
  return CONTRACT_ADDRESS_LISTS[key];
}

export function getAddressByTag(
  key: keyof AddressLists,
  tag: NetworkTag
): `0x${string}` | undefined {
  const list = getAddressList(key);
  const found = list.find((entry) => entry.toLowerCase().startsWith(`${String(tag).toLowerCase()}:`));
  if (!found) return undefined;
  const [, addr] = found.split(':');
  return addr as `0x${string}`;
}

 