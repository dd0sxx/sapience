import { encodeAbiParameters, keccak256 } from 'viem';
import UMAResolver from '@/protocol/deployments/UMAResolver.json';

// Contract addresses
const UMA_RESOLVER_ADDRESS = UMAResolver.address as `0x${string}`;

export interface PredictedOutcomeInputStub {
  marketGroup: string; // address
  marketId: number;
  prediction: boolean;
}

function isHexAddress(value: string | undefined): value is `0x${string}` {
  return !!value && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function encodePredictedOutcomes(
  outcomes: PredictedOutcomeInputStub[]
): `0x${string}` {
  const normalized = outcomes.map((o) => ({
    // Generate marketId as bytes32 hash from marketGroup and marketId
    marketId: (() => {
      const marketGroup = isHexAddress(o.marketGroup)
        ? o.marketGroup
        : '0x0000000000000000000000000000000000000000';
      // Create a bytes32 hash from marketGroup + marketId
      const combinedData = encodeAbiParameters(
        [{ type: 'address' }, { type: 'uint256' }],
        [marketGroup as `0x${string}`, BigInt(o.marketId)]
      );
      // Use keccak256 to generate bytes32 marketId
      return keccak256(combinedData);
    })(),
    prediction: !!o.prediction,
  }));

  return encodeAbiParameters(
    [
      {
        type: 'tuple[]',
        components: [
          { name: 'marketId', type: 'bytes32' },
          { name: 'prediction', type: 'bool' },
        ],
      },
    ],
    [normalized]
  );
}

export function buildAuctionStartPayload(
  outcomes: PredictedOutcomeInputStub[],
  resolverOverride?: string
): { resolver: `0x${string}`; predictedOutcomes: `0x${string}`[] } {
  const resolver: `0x${string}` = isHexAddress(resolverOverride)
    ? resolverOverride
    : UMA_RESOLVER_ADDRESS;

  // Resolver expects a single bytes blob with abi.encode(PredictedOutcome[])
  const encoded = encodePredictedOutcomes(outcomes);
  const predictedOutcomes = [encoded];
  return { resolver, predictedOutcomes };
}
