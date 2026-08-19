import { encodeFunctionData, isAddress } from "viem";

const ERC20_TRANSFER_ABI = [{ type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] }];

export function validateTransferConfig(config = {}) {
  const recipient = String(config.recipient || "").trim();
  if (!isAddress(recipient)) throw new Error("Transfer recipient must be a valid EVM address");
  const token = String(config.token || config.fromToken || "").trim();
  if (!token) throw new Error("Transfer token is required");
  return { recipient, token };
}

export function buildTransferTransaction({ asset, recipient, rawAmount }) {
  if (asset.isNative) return { to: recipient, value: rawAmount };
  return { to: asset.address, data: encodeFunctionData({ abi: ERC20_TRANSFER_ABI, functionName: "transfer", args: [recipient, rawAmount] }), value: 0n };
}

export async function executeTransfer(ctx) {
  const { recipient, token } = validateTransferConfig(ctx.config || {});
  const amount = String(ctx.amount ?? "").trim();
  if (!amount || Number(amount) <= 0 || !Number.isFinite(Number(amount))) throw new Error("Transfer amount must be a positive number");
  const asset = await ctx.resolveAsset(ctx.chain, token);
  const rawAmount = ctx.parseAmount(amount, asset.decimals);
  if (rawAmount <= 0n) throw new Error("Transfer amount is too small for token decimals");
  const sender = ctx.wallet.address;
  if (asset.isNative) {
    const balance = await ctx.getNativeBalance(sender);
    if (balance < rawAmount) throw Object.assign(new Error(`Insufficient ${asset.symbol || "native token"} balance`), { code: "INSUFFICIENT_BALANCE", retryable: false });
  } else {
    const balance = await ctx.getTokenBalance(asset, sender);
    if (balance < rawAmount) throw Object.assign(new Error(`Insufficient ${asset.symbol || "token"} balance`), { code: "INSUFFICIENT_BALANCE", retryable: false });
  }
  const tx = buildTransferTransaction({ asset, recipient, rawAmount });
  const sent = await ctx.sendTransaction(tx, { kind: "transfer", token: asset.address, symbol: asset.symbol, amount: rawAmount.toString(), recipient });
  return { ...sent, asset, amount, rawAmount: rawAmount.toString(), recipient, token };
}

