import { getBalance, getBlockHeight, getTransaction, solana } from "@/lib/chains/solana";
import { assertExecutionToken } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error) {
  const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "EXECUTION_API_UNCONFIGURED" ? 503 : error.message?.startsWith("Invalid Solana") ? 400 : 502;
  return Response.json({ error: error.message || "Solana RPC request failed", chain: solana.chain }, { status });
}

/**
 * GET /api/chains/solana?action=balance&address=<pubkey>
 * GET /api/chains/solana?action=blockHeight
 * GET /api/chains/solana?action=transaction&signature=<sig>
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "blockHeight";
  try {
    if (action === "balance") {
      return Response.json({ chain: solana.chain, data: await getBalance(searchParams.get("address"), searchParams.get("commitment") || "confirmed") });
    }
    if (action === "transaction") {
      const data = await getTransaction(searchParams.get("signature"), {
        commitment: searchParams.get("commitment") || "confirmed",
        encoding: searchParams.get("encoding") || "jsonParsed",
      });
      return Response.json({ chain: solana.chain, data });
    }
    if (action === "blockHeight") {
      return Response.json({ chain: solana.chain, data: await getBlockHeight(searchParams.get("commitment") || "confirmed") });
    }
    return Response.json({ error: "Unsupported action", supported: ["balance", "blockHeight", "transaction"] }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body?.method) return Response.json({ error: "method is required" }, { status: 400 });
    const method = String(body.method).toLowerCase();
    // Protect RPC methods that can submit or otherwise mutate chain state;
    // read-only diagnostics remain available without operator credentials.
    if (["sendtransaction", "sendrawtransaction", "requestairdrop", "signtransaction", "signalltransactions"].includes(method)) assertExecutionToken(request);
    const data = await solana.rpcRequest(body.method, Array.isArray(body.params) ? body.params : []);
    return Response.json({ chain: solana.chain, data });
  } catch (error) {
    return jsonError(error);
  }
}
