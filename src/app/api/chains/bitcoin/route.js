import { bitcoin } from "@/lib/chains/bitcoin";
import { assertExecutionToken } from "@/lib/api-auth";
export const dynamic = "force-dynamic";
function fail(error) {
  const message = error.message || "Bitcoin request failed";
  const status = error.code === "UNAUTHORIZED" ? 401
    : error.code === "EXECUTION_API_UNCONFIGURED" ? 503
      : /Invalid|required|Unsupported/.test(message) ? 400 : 502;
  return Response.json({ chain: "bitcoin", error: message }, { status });
}
export async function GET(request) { const q = new URL(request.url).searchParams; try { const action = q.get("action") || "tipHeight"; if (action === "tipHeight") return Response.json({ chain: "bitcoin", data: await bitcoin.getTipHeight() }); if (action === "address" || action === "balance") return Response.json({ chain: "bitcoin", data: await bitcoin.getAddress(q.get("address")) }); if (action === "utxos") return Response.json({ chain: "bitcoin", data: await bitcoin.getUtxos(q.get("address")) }); if (action === "transaction") return Response.json({ chain: "bitcoin", data: await bitcoin.getTransaction(q.get("txid")) }); throw new Error("Unsupported action"); } catch (error) { return fail(error); } }
export async function POST(request) { try { const body = await request.json(); if (body.action === "broadcast") { assertExecutionToken(request); return Response.json({ chain: "bitcoin", data: await bitcoin.broadcast(body.rawTx) }); } throw new Error("Unsupported action"); } catch (error) { return fail(error); } }
