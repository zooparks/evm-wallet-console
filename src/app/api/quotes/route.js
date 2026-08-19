import { formatUnits, isAddress, parseUnits } from "viem";
import { getChain, estimateGas } from "@/lib/chains/evm";
import { lifi } from "@/lib/execution/lifi";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const type = String(body.type || "swap").toLowerCase();
    const chain = getChain(body.chain || "ethereum").key;
    const targetChain = getChain(body.targetChain || chain).key;
    const address = body.fromAddress || body.address;
    if (!isAddress(address)) throw new Error("fromAddress must be a valid EVM address");
    const fromAsset = await lifi.resolveToken(chain, body.fromToken || body.token);
    const toAsset = await lifi.resolveToken(type === "bridge" ? targetChain : chain, body.toToken || body.targetToken || body.token);
    const amount = String(body.amount ?? "").trim();
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error("amount must be a positive number");
    const rawAmount = parseUnits(amount, fromAsset.decimals);
    const quote = await lifi.getQuote({ fromChain: chain, toChain: type === "bridge" ? targetChain : chain, fromToken: fromAsset.address, toToken: toAsset.address, fromAmount: rawAmount.toString(), rawAmount, fromAsset, fromAddress: address, toAddress: body.toAddress || address, slippage: Number(body.slippageBps ?? 50) / 10000 });
    let gas = null;
    try { gas = await estimateGas(chain, quote.transactionRequest); } catch {}
    const estimate = quote.estimate || {};
    return Response.json({ quote: {
      provider: "lifi",
      type,
      chain,
      targetChain,
      fromToken: fromAsset,
      toToken: toAsset,
      inputAmount: amount,
      inputRaw: rawAmount.toString(),
      estimatedOutput: estimate.toAmount ? formatUnits(BigInt(estimate.toAmount), toAsset.decimals) : null,
      minimumOutput: estimate.toAmountMin ? formatUnits(BigInt(estimate.toAmountMin), toAsset.decimals) : null,
      gas,
      fee: estimate.gasCosts || [],
      tool: quote.tool || null,
      approvalAddress: estimate.approvalAddress || null,
      transactionRequest: quote.transactionRequest,
      raw: quote,
      expiresAt: new Date(Date.now() + 30000).toISOString(),
    } });
  } catch (error) { return Response.json({ error: error.message, code: error.code || "QUOTE_ERROR" }, { status: 400 }); }
}
