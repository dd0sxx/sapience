import type { Address } from 'viem';

export type ChainId = 10 | 8453 | 42161 | number;

export interface ContractAddressEntry {
  address: Address;
  blockCreated?: number;
  legacy?: readonly Address[];
}

export type ChainAddressMap = Record<ChainId, ContractAddressEntry>;

export const predictionMarket: ChainAddressMap = {
  42161: {
    address: '0xb04841cad1147675505816e2ec5c915430857b40',
    legacy: [] as const,
  },
} as const;

export const umaResolver: ChainAddressMap = {
  42161: {
    address: '0x2cc1311871b9fc7bfcb809c75da4ba25732eafb9',
    legacy: [] as const,
  },
} as const;

export const passiveLiquidityVault: ChainAddressMap = {
  42161: {
    address: '0xcc1c64e849395d31d059a4bd19391af64d8855d7',
    legacy: [] as const,
  },
} as const;

export const collateralToken: ChainAddressMap = {
  42161: {
    address: '0xfeb8c4d5efbaff6e928ea090bc660c363f883dba',
    legacy: [] as const,
  },
} as const;

export const contracts = {
  predictionMarket,
  umaResolver,
  passiveLiquidityVault,
  collateralToken,
};


