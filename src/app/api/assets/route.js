import { listWallets } from "@/lib/store";
import { listAssetBalances, syncAllWalletAssets } from "@/lib/asset-sync";
import { assertWriteAccess, authStatus } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [wallets, tokens] = await Promise.all([listWallets(), listAssetBalances()]);
  const byChain = {};
  for (const item of tokens) byChain[item.chain] = (byChain[item.chain] || 0) + item.value;
  return Response.json({ total: tokens.reduce((sum, item) => sum + item.value, 0), byChain, wallets, tokens });
}

export async function POST(request) {
  try { assertWriteAccess(request); return Response.json({ ok: true, sync: await syncAllWalletAssets() }); }
  catch (error) { return Response.json({ error: error.message || "Asset sync failed" }, { status: authStatus(error) }); }
}
