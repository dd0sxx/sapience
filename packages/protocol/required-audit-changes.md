H-06:
Users can pass a desired `liquiditySlippage` parameter to `LiquidityModule.closeLiquidityPosition()` which should serve as a protection for the LPs during price movements. The `LiquidityModule` will calculate a minimum amount of tokens that should be received after the liquidity is removed based on that parameter.

```solidity
amount0Min: stack.previousAmount0.mulDecimal(DecimalMath.UNIT - params.liquiditySlippage),
amount1Min: stack.previousAmount1.mulDecimal(DecimalMath.UNIT - params.liquiditySlippage),
```

However, `stack.previousAmount0` and `stack.previousAmount1` are the amounts currently held by the liquidity position. Any price movement that happened before that will impact these amounts, and when all liquidity is removed the full amounts will be received. This makes the `liquiditySlippage` parameter meaningless.

An attacker can sandwich the liquidity removal transaction to change the price, the LP will then receive their tokens at a worse ratio causing loss for them and profit for the attacker when they complete the sandwich.

If the position in which the malicious trader is going is short, even the `tradeSlippage` parameter will be meaningless, since it is applied to `depositedCollateralAmount`, but short positions cause increase in the `base` token which is not added to that collateral.

---
