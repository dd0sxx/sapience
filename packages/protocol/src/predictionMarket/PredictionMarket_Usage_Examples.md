# PredictionMarket Contract Usage Examples

This guide reflects the current `PredictionMarket` implementation with a simple long/short flow, an off-chain short approval signature, and on-chain ERC20 transfers via `transferFrom`.

## Overview

- **Long** initiates a prediction by calling `mint()` and paying `collateralLong`.
- **Short** pre-approves the contract for `collateralShort` and provides an off-chain signature authorizing this specific prediction; the long submits that signature to `mint()`.
- The verifier validates markets on `mint()`. Two NFTs are minted (long and short) and collateral is escrowed.
- After referenced markets settle, anyone calls `burn(tokenId, referralCode)` to resolve and pay the winner.
- If long and short are the same address, `consolidatePrediction(tokenId, referralCode)` settles immediately in favor of the long.

## Contracts

```solidity
// PredictionMarket constructor (current)
PredictionMarket market = new PredictionMarket(
    "Prediction Market NFT",
    "PMKT",
    collateralToken,   // ERC20 used as collateral
    minCollateral      // minimum collateralLong
);

// Verifier with max number of markets per prediction
FoilMarketVerifier verifier = new FoilMarketVerifier(
    FoilMarketVerifier.Settings({ maxPredictionMarkets: 5 })
);
```

Settings available via `getConfig()`:

```solidity
struct MarketConfig {
    address collateralToken;
    uint256 minCollateral;
}
```

## Encoding prediction outcomes

Use the verifier to encode your predicted outcomes as bytes:

```solidity
FoilMarketVerifier.PredictedOutcome[] memory outcomes = new FoilMarketVerifier.PredictedOutcome[](2);
outcomes[0] = FoilMarketVerifier.PredictedOutcome({
    market: FoilMarketVerifier.MarketIdentifier({ marketGroup: marketGroup1, marketId: 1 }),
    prediction: true // YES
});
outcomes[1] = FoilMarketVerifier.PredictedOutcome({
    market: FoilMarketVerifier.MarketIdentifier({ marketGroup: marketGroup2, marketId: 2 }),
    prediction: true // YES
});

bytes memory encodedOutcomes = verifier.encodePredictionOutcomes(outcomes);
```

## Short approval signature (off-chain)

The short must sign an approval for a specific prediction using EIP-712. The contract verifies signatures using the `SignatureProcessor` domain: name `"SignatureProcessor"`, version `"1"`, verifying contract = `PredictionMarket` address.

Message to approve (hashed inside `mint()`):

```solidity
bytes32 messageHash = keccak256(abi.encode(
    encodedOutcomes,
    collateralShort,
    collateralLong,
    address(verifier),
    long,
    shortDeadline
));
```

Typed data struct signed by short:

```solidity
// typehash: keccak256("Approve(bytes32 messageHash,address owner)")
struct Approve {
    bytes32 messageHash;
    address owner; // short
}
```

The on-chain check is equivalent to verifying the signature over `_hashTypedDataV4(Approve(messageHash, short))`.

For client libraries, build EIP-712 typed data with:
- domain: `{ name: "SignatureProcessor", version: "1", chainId, verifyingContract: market.address }`
- types: `{ Approve: [{ name: "messageHash", type: "bytes32" }, { name: "owner", type: "address" }] }`
- message: `{ messageHash, owner: short }`

Alternatively, you can compute the exact digest the contract expects via `market.getApprovalHash(messageHash, short)` and sign that digest as an ECDSA personal signature.

## Mint a prediction

Prerequisites:
- Long and Short both `approve(market, amount)` on the collateral token (no ERC20 permit is used by the contract).
- Short provides `shortSignature` and a `shortDeadline` in the future.

```solidity
IPredictionMarketStructs.OpenPositionsRequest memory req = IPredictionMarketStructs.OpenPositionsRequest({
    encodedOutcomes: encodedOutcomes,
    verifier: address(verifier),
    collateralLong: 1_000e6,
    collateralShort: 200e6,
    long: ana,
    short: bob,
    shortSignature: bobApprovalSignature, // EIP-712 Approve over messageHash
    shortDeadline: block.timestamp + 60,
    referralCode: bytes32(0)
});

(uint256 longNftTokenId, uint256 shortNftTokenId) = market.mint(req);
```

What `mint()` does:
- Checks `msg.sender == long` and `shortDeadline >= block.timestamp`.
- Verifies the short signature matches the exact prediction parameters.
- Verifier validates markets are valid, unsolved Yes/No markets.
- Pulls `collateralLong` and `collateralShort` via `transferFrom`.
- Mints two NFTs: `longNftTokenId` to `long`, `shortNftTokenId` to `short`.
- Stores the `MatchedPositions` and emits `PositionsOpened`.

Event:

```solidity
event PositionsOpened(
    address indexed long,
    address indexed short,
    uint256 longNftTokenId,
    uint256 shortNftTokenId,
    uint256 collateralLong,
    uint256 collateralShort,
    uint256 totalCollateral,
    bytes32 referralCode
);
```

## Get prediction details

`getPrediction(tokenId)` returns `IPredictionMarketStructs.MatchedPositions` for the underlying prediction (pass either the long or short NFT tokenId):

```solidity
IPredictionMarketStructs.MatchedPositions memory p = market.getPrediction(longNftTokenId);
// To decode outcomes for display:
FoilMarketVerifier.PredictedOutcome[] memory decoded = verifier.decodePredictionOutcomes(p.encodedOutcomes);
```

`MatchedPositions` fields:

```solidity
struct MatchedPositions {
    uint256 predictionId;
    address verifier;
    address long;
    address short;
    bytes encodedOutcomes;
    uint256 longNftTokenId;
    uint256 shortNftTokenId;
    uint256 collateralLong;
    uint256 collateralShort;
    bool isSettled;
    bool didLongWin;
}
```

## Resolve and settle

After markets settle, anyone can settle by burning either NFT:

```solidity
market.burn(longNftTokenId, bytes32(0));
```

What `burn()` does:
- Verifier checks all referenced markets are settled and computes whether the long won.
- Transfers the full payout (`collateralLong + collateralShort`) to the winner (`long` if `didLongWin`, else `short`).
- Marks the prediction as settled and burns both NFTs.

Event:

```solidity
event PositionsResolved(
    address indexed long,
    address indexed short,
    uint256 longNftTokenId,
    uint256 shortNftTokenId,
    uint256 totalCollateral,
    bool didLongWin,
    bytes32 referralCode
);
```

## Consolidation (self-trading)

If the long and short are the same address, you can consolidate before market settlement:

```solidity
market.consolidatePrediction(longNftTokenId, bytes32(0));
```

What `consolidatePrediction()` does:
- Requires `long == short`.
- Sends the full payout to the long, marks as settled, and burns both NFTs.

Event:

```solidity
event PositionsClosed(
    uint256 indexed longNftTokenId,
    uint256 indexed shortNftTokenId,
    uint256 totalCollateral,
    bytes32 referralCode
);
```

## Errors (selected)

- `InvalidCollateralToken()`
- `InvalidMinCollateral()`
- `LongIsNotCaller()`
- `CollateralBelowMinimum()`
- `LongCollateralMustBeGreaterThanZero()`
- `ShortCollateralMustBeGreaterThanZero()`
- `InvalidShortSignature()`
- `InvalidMarketsAccordingToVerifier()`
- `PredictionNotFound()`
- `OutcomeVerificationFailed()`
- `LongAndShortAreDifferent()`
- `PredictionDoesNotExist()`
- `TakerDeadlineExpired()`

## Notes

- The contract uses on-chain ERC20 `transferFrom`. Ensure both parties approve the market contract beforehand.
- The short’s signature is only valid for the exact tuple hashed in `messageHash` and within `shortDeadline`.
- Verifier supports only Yes/No markets and enforces `maxPredictionMarkets`.