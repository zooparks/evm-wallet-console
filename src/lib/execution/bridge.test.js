import test from "node:test";
import assert from "node:assert/strict";
import { validateBridgeConfig } from "./bridge.js";

test("bridge validation requires different chains", () => {
  assert.throws(() => validateBridgeConfig({ fromToken: "USDC" }, "ethereum", "ethereum"), /must differ/);
});

test("bridge validation accepts a supported route shape", () => {
  assert.deepEqual(validateBridgeConfig({ fromToken: "USDC", toToken: "USDC", slippageBps: 50 }, "ethereum", "arbitrum"), { from: "ethereum", to: "arbitrum", fromToken: "USDC", toToken: "USDC", slippageBps: 50 });
});

