import { revokeSigner } from "@/lib/execution/vault";

export const dynamic = "force-dynamic";

function assertAdmin(request) {
  const expected = process.env.EXECUTION_API_TOKEN;
  if (!expected) throw Object.assign(new Error("EXECUTION_API_TOKEN must be configured before managing signers"), { code: "SIGNER_API_UNCONFIGURED" });
  const supplied = request.headers.get("x-execution-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!supplied || supplied !== expected) throw new Error("Execution API authorization required");
}

export async function DELETE(request, context) {
  try { assertAdmin(request); const { id } = await context.params; return (await revokeSigner(id)) ? Response.json({ ok: true }) : Response.json({ error: "Signer not found" }, { status: 404 }); }
  catch (error) { return Response.json({ error: error.message }, { status: error.code === "SIGNER_API_UNCONFIGURED" ? 503 : error.message.includes("authorization") ? 401 : 400 }); }
}
