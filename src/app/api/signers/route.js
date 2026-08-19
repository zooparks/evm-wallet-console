import { getWallet } from "@/lib/store";
import { listSigners, upsertSigner } from "@/lib/execution/vault";

export const dynamic = "force-dynamic";

function assertAdmin(request) {
  const expected = process.env.EXECUTION_API_TOKEN;
  if (!expected) throw Object.assign(new Error("EXECUTION_API_TOKEN must be configured before managing signers"), { code: "SIGNER_API_UNCONFIGURED" });
  const supplied = request.headers.get("x-execution-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!supplied || supplied !== expected) throw new Error("Execution API authorization required");
}

export async function GET(request) {
  try { assertAdmin(request); return Response.json({ signers: await listSigners() }); }
  catch (error) { return Response.json({ error: error.message }, { status: error.code === "SIGNER_API_UNCONFIGURED" ? 503 : error.message.includes("authorization") ? 401 : 400 }); }
}

export async function POST(request) {
  try {
    assertAdmin(request);
    const body = await request.json();
    const wallet = body.walletId ? await getWallet(body.walletId) : null;
    const address = body.address || wallet?.address;
    if (!address) throw new Error("walletId or address is required");
    if (wallet && String(wallet.address).toLowerCase() !== String(address).toLowerCase()) throw new Error("Signer address does not match wallet");
    const signer = await upsertSigner({ walletId: body.walletId, address, label: body.label, privateKey: body.privateKey });
    return Response.json({ signer }, { status: 201 });
  } catch (error) { return Response.json({ error: error.message }, { status: error.code === "SIGNER_API_UNCONFIGURED" ? 503 : error.message.includes("authorization") ? 401 : 400 }); }
}

export function HEAD() { return new Response(null, { status: 204 }); }
