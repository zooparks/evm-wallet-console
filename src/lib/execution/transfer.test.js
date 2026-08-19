import test from "node:test";
import assert from "node:assert/strict";
import { buildTransferTransaction, validateTransferConfig, executeTransfer } from "./transfer.js";

const recipient = "0x0000000000000000000000000000000000000002";

test("transfer validation rejects non-EVM recipients", () => {
  assert.throws(() => validateTransferConfig({ recipient: "alice", token: "ETH" }), /valid EVM address/);
});

test("native transfer builds a value transaction", () => {
  const tx = buildTransferTransaction({ asset: { isNative: true }, recipient, rawAmount: 12n });
  assert.deepEqual(tx, { to: recipient, value: 12n });
});

test("ERC20 transfer builds calldata without broadcasting", () => {
  const tx = buildTransferTransaction({ asset: { isNative: false, address: "0x0000000000000000000000000000000000000003" }, recipient, rawAmount: 12n });
  assert.equal(tx.to, "0x0000000000000000000000000000000000000003");
  assert.match(tx.data, /^0xa9059cbb/);
});

test("transfer executor checks balance before send", async () => {
  let sent = false;
  await assert.rejects(() => executeTransfer({
    config: { recipient, token: "ETH" }, amount: "1", chain: "ethereum", wallet: { address: "0x0000000000000000000000000000000000000004" },
    resolveAsset: async () => ({ isNative: true, decimals: 18, symbol: "ETH", address: "0x0000000000000000000000000000000000000000" }), parseAmount: () => 100n,
    getNativeBalance: async () => 10n, sendTransaction: async () => { sent = true; },
  }), /Insufficient/);
  assert.equal(sent, false);
});

