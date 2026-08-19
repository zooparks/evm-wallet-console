import {
  estimateGas,
  getBlockNumber,
  getChain,
  getNativeBalance,
  getTransaction,
  rpcCall,
  sendRawTransaction,
} from "@/lib/chains/evm";
import { assertExecutionToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function errorResponse(error) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = error?.code === "UNAUTHORIZED" ? 401 : error?.code === "EXECUTION_API_UNCONFIGURED" ? 503 : /Unsupported|Invalid|required/.test(message) ? 400 : 502;
  return Response.json({ error: message }, { status });
}

export async function GET(request, context) {
  try {
    const { chain } = await context.params;
    const config = getChain(chain);
    const query = new URL(request.url).searchParams;
    const action = query.get("action") || "info";
    if (action === "info") return Response.json({ chain: { key: config.key, code: config.code, label: config.label, id: config.id, name: config.name, nativeSymbol: config.nativeSymbol } });
    if (action === "balance") return Response.json({ chain: config.key, address: query.get("address"), ...(await getNativeBalance(config.key, query.get("address"), query.get("block") || "latest")) });
    if (action === "blockNumber") return Response.json({ chain: config.key, ...(await getBlockNumber(config.key)) });
    if (action === "transaction") return Response.json({ chain: config.key, hash: query.get("hash"), ...(await getTransaction(config.key, query.get("hash"))) });
    throw new Error(`Unknown action: ${action}`);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request, context) {
  try {
    const { chain: requestedChain } = await context.params;
    const config = getChain(requestedChain);
    const chain = config.key;
    const body = await request.json();
    const params = Array.isArray(body.params) ? body.params : [];
    const action = body.action || body.method;
    if (action === "estimateGas" || action === "eth_estimateGas") {
      return Response.json({ chain, ...(await estimateGas(chain, body.transaction || params[0])) });
    }
    if (action === "sendRawTransaction" || action === "eth_sendRawTransaction") {
      assertExecutionToken(request);
      return Response.json({ chain, hash: await sendRawTransaction(chain, body.rawTransaction || params[0]) });
    }
    if (action === "rpc") {
      const method = body.rpcMethod || body.rpc_method;
      if (typeof method !== "string" || !method) throw new Error("RPC method is required");
      // Treat every signing/submission RPC as privileged, including provider
      // aliases that can use an unlocked node account.
      if (["eth_sendrawtransaction", "eth_sendtransaction", "personal_sendtransaction", "eth_signtransaction", "eth_sign", "eth_signtypeddata", "eth_signtypeddata_v4", "personal_sign", "wallet_sendtransaction", "parity_sendtransaction"].includes(method.toLowerCase())) assertExecutionToken(request);
      return Response.json({ chain, result: await rpcCall(chain, method, params) });
    }
    throw new Error("Unsupported POST action");
  } catch (error) { return errorResponse(error); }
}
