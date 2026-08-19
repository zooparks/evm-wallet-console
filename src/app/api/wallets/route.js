import { listWallets, upsertWallet } from "@/lib/store";
import { assertWriteAccess, authStatus } from "@/lib/api-auth";
export const dynamic = "force-dynamic";
export async function GET(request) { const q = new URL(request.url).searchParams; return Response.json({ wallets: await listWallets({ q: q.get("q"), group: q.get("group"), status: q.get("status") }) }); }
export async function POST(request) {
  try {
    assertWriteAccess(request);
    return Response.json({ wallet: await upsertWallet(await request.json()) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: authStatus(error) });
  }
}
