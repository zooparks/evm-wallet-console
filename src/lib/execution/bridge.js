export function validateBridgeConfig(config = {}, sourceChain, targetChain) {
  const from = String(sourceChain || config.sourceChain || "").trim();
  const to = String(targetChain || config.targetChain || "").trim();
  if (!from || !to || from.toLowerCase() === to.toLowerCase()) throw new Error("Bridge source and destination chains must differ");
  const fromToken = String(config.fromToken || config.token || "").trim();
  const toToken = String(config.toToken || config.targetToken || fromToken).trim();
  if (!fromToken || !toToken) throw new Error("Bridge token is required");
  const slippageBps = Number(config.slippageBps ?? config.slippage ?? 50);
  if (!Number.isInteger(slippageBps) || slippageBps < 1 || slippageBps > 5000) throw new Error("Bridge slippage must be between 1 and 5000 bps");
  return { from, to, fromToken, toToken, slippageBps };
}

export async function executeBridge(ctx) {
  const { from, to, fromToken, toToken, slippageBps } = validateBridgeConfig(ctx.config || {}, ctx.chain, ctx.targetChain);
  const amount = String(ctx.amount ?? "").trim();
  if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error("Bridge amount must be a positive number");
  const sourceAsset = await ctx.resolveAsset(from, fromToken);
  const destinationAsset = await ctx.resolveAsset(to, toToken);
  const rawAmount = ctx.parseAmount(amount, sourceAsset.decimals);
  if (rawAmount <= 0n) throw new Error("Bridge amount is too small for token decimals");
  if (sourceAsset.isNative) {
    const balance = await ctx.getNativeBalance(ctx.wallet.address);
    if (balance < rawAmount) throw Object.assign(new Error(`Insufficient ${sourceAsset.symbol} balance`), { code: "INSUFFICIENT_BALANCE", retryable: false });
  } else {
    const balance = await ctx.getTokenBalance(sourceAsset, ctx.wallet.address);
    if (balance < rawAmount) throw Object.assign(new Error(`Insufficient ${sourceAsset.symbol} balance`), { code: "INSUFFICIENT_BALANCE", retryable: false });
  }
  const quote = await ctx.lifi.getQuote({ fromChain: from, toChain: to, fromToken: sourceAsset.address, toToken: destinationAsset.address, fromAmount: rawAmount.toString(), rawAmount, fromAsset: sourceAsset, fromAddress: ctx.wallet.address, toAddress: ctx.wallet.address, slippage: slippageBps / 10000 });
  const estimate = quote.estimate || {};
  if (String(estimate.fromAmount || quote.action?.fromAmount || rawAmount) !== rawAmount.toString()) throw new Error("Bridge quote input amount mismatch");
  if (!estimate.toAmountMin || BigInt(estimate.toAmountMin) <= 0n) throw new Error("Bridge quote has no minimum destination amount");
  await ctx.recordQuote(quote);
  let approval = null;
  if (!sourceAsset.isNative && estimate.approvalAddress) approval = await ctx.ensureAllowance({ token: sourceAsset, spender: estimate.approvalAddress, amount: rawAmount });
  const simulation = await ctx.simulateTransaction(quote.transactionRequest);
  if (!simulation?.success) throw new Error("Bridge source transaction simulation failed");
  const sent = await ctx.sendTransaction(quote.transactionRequest, { kind: "bridge", tool: quote.tool, fromChain: from, toChain: to, fromToken: sourceAsset.address, toToken: destinationAsset.address, fromAmount: rawAmount.toString(), toAmount: estimate.toAmount, toAmountMin: estimate.toAmountMin });
  let status;
  try {
    status = await ctx.lifi.waitForStatus({ txHash: sent.hash, fromChain: from, toChain: to, bridge: quote.tool });
  } catch (error) {
    // The source transaction is already final from the signer's perspective.
    // Preserve its hash so a provider timeout can never trigger a duplicate
    // bridge submission on the next worker retry.
    error.hash = sent.hash;
    error.submitted = true;
    error.retryable = false;
    error.bridgeTool = quote.tool || null;
    error.bridgeStatus = error.lastStatus || null;
    throw error;
  }
  const normalizedStatus = String(status?.status || status?.substatus || "PENDING").toUpperCase();
  if (["FAILED", "INVALID", "NOT_FOUND"].includes(normalizedStatus)) throw Object.assign(new Error(`Bridge provider reported ${normalizedStatus}`), { code: "BRIDGE_FAILED", retryable: false, submitted: true, hash: sent.hash, terminal: true, bridgeTool: quote.tool || null, bridgeStatus: status });
  return { ...sent, approval, simulation, quote, status, sourceAsset, destinationAsset, amount, rawAmount: rawAmount.toString(), destinationTxHash: status?.receiving?.txHash || status?.destinationTxHash || status?.toTxHash || null };
}
