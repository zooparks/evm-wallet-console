import { getWallet, removeWallet, upsertWallet } from "@/lib/store";
import { syncWalletAssets } from "@/lib/asset-sync";
import { assertWriteAccess, authStatus } from "@/lib/api-auth";
export const dynamic = "force-dynamic";
export async function GET(request, context) {
  const { id } = await context.params;
  let wallet = await getWallet(id);
  if (!wallet) return Response.json({ error: "Wallet not found" }, { status: 404 });
  if (new URL(request.url).searchParams.get("sync") === "1") {
    try { await syncWalletAssets(wallet); wallet = await getWallet(id); } catch { /* Return the last stored snapshot when an RPC is unavailable. */ }
  }
  return Response.json({ wallet });
}
export async function PATCH(request, context) {
  try {
    assertWriteAccess(request);
    const { id } = await context.params;
    const current = await getWallet(id);
    if (!current) return Response.json({ error: "Wallet not found" }, { status: 404 });
    const input = await request.json();
    return Response.json({ wallet: await upsertWallet({ ...current, ...input, id: current.id, address: input.address || current.address }) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: authStatus(error) });
  }
}
export async function DELETE(request, context) {
  try {
    assertWriteAccess(request);
    const ref = (await context.params).id;
    const current = await getWallet(ref);
    return (await removeWallet(current?.id || ref))
      ? Response.json({ ok: true })
      : Response.json({ error: "Wallet not found" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: authStatus(error) });
  }
}
