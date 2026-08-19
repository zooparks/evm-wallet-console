export function validateSwapConfig(config = {}) {
  const fromToken = String(config.fromToken || config.token || "").trim();
  const toToken = String(config.toToken || config.targetToken || "").trim();
  if (!fromToken || !toToken) throw new Error("Swap requires both source and target tokens");
  if (fromToken.toLowerCase() === toToken.toLowerCase()) throw new Error("Swap source and target tokens must differ");
  const slippageBps = Number(config.slippageBps ?? config.slippage ?? 50);
  if (!Number.isInteger(slippageBps) || slippageBps < 1 || slippageBps > 5000) throw new Error("Swap slippage must be between 1 and 5000 bps");
  return { fromToken, toToken, slippageBps };
}

function amountNumber(value) {
  const amount = String(value ?? "").trim();
  if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error("Swap amount must be a positive number");
  return amount;
}

export async function executeSwap(ctx) {
  const { fromToken, toToken, slippageBps } = validateSwapConfig(ctx.config || {});
  const amount = amountNumber(ctx.amount);
  const fromAsset = await ctx.resolveAsset(ctx.chain, fromToken);
  const toAsset = await ctx.resolveAsset(ctx.chain, toToken);
  if (fromAsset.address.toLowerCase() === toAsset.address.toLowerCase()) throw new Error("Swap source and target tokens resolve to the same asset");
  const rawAmount = ctx.parseAmount(amount, fromAsset.decimals);
  if (rawAmount <= 0n) throw new Error("Swap amount is too small for token decimals");
  if (fromAsset.isNative) {
    const balance = await ctx.getNativeBalance(ctx.wallet.address);
    if (balance < rawAmount) throw Object.assign(new Error(`Insufficient ${fromAsset.symbol} balance`), { code: "INSUFFICIENT_BALANCE", retryable: false });
  } else {
    const balance = await ctx.getTokenBalance(fromAsset, ctx.wallet.address);
    if (balance < rawAmount) throw Object.assign(new Error(`Insufficient ${fromAsset.symbol} balance`), { code: "INSUFFICIENT_BALANCE", retryable: false });
  }
  const quote = await ctx.lifi.getQuote({ fromChain: ctx.chain, toChain: ctx.chain, fromToken: fromAsset.address, toToken: toAsset.address, fromAmount: rawAmount.toString(), rawAmount, fromAsset, fromAddress: ctx.wallet.address, toAddress: ctx.wallet.address, slippage: slippageBps / 10000 });
  const transaction = quote.transactionRequest;
  const estimate = quote.estimate || {};
  if (String(estimate.fromAmount || quote.action?.fromAmount || rawAmount) !== rawAmount.toString()) throw new Error("Swap quote input amount mismatch");
  if (!estimate.toAmountMin || BigInt(estimate.toAmountMin) <= 0n) throw new Error("Swap quote has no minimum output");
  await ctx.recordQuote(quote);
  let approval = null;
  if (!fromAsset.isNative && estimate.approvalAddress) approval = await ctx.ensureAllowance({ token: fromAsset, spender: estimate.approvalAddress, amount: rawAmount });
  const simulation = await ctx.simulateTransaction(transaction);
  if (!simulation?.success) throw new Error("Swap simulation failed");
  const sent = await ctx.sendTransaction(transaction, { kind: "swap", tool: quote.tool, fromToken: fromAsset.address, toToken: toAsset.address, fromAmount: rawAmount.toString(), toAmount: estimate.toAmount, toAmountMin: estimate.toAmountMin });
  return { ...sent, approval, simulation, quote, fromAsset, toAsset, amount, rawAmount: rawAmount.toString() };
}
