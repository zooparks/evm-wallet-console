import test from "node:test";
import assert from "node:assert/strict";
import { validateSwapConfig } from "./swap.js";

test("swap validation requires distinct tokens", () => {
  assert.throws(() => validateSwapConfig({ fromToken: "USDC", toToken: "USDC" }), /must differ/);
});

test("swap validation bounds slippage", () => {
  assert.throws(() => validateSwapConfig({ fromToken: "USDC", toToken: "ETH", slippageBps: 6000 }), /between 1 and 5000/);
});

