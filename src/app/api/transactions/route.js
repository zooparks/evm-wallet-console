import { listTransactions, recordTransaction } from "@/lib/store";
import { assertExecutionToken, authStatus } from "@/lib/api-auth";
export const dynamic = "force-dynamic";
export async function GET() { return Response.json({ transactions: await listTransactions() }); }
export async function POST(request) {
  try {
    assertExecutionToken(request);
    const body = await request.json();
    // Keep the audit endpoint intentionally narrow. In particular, never
    // persist or echo arbitrary request fields such as private keys.
    const transaction = {
      id: body.id,
      hash: body.hash,
      walletId: body.walletId || body.wallet_id,
      chain: body.chain,
      type: body.type,
      amount: body.amount,
      status: body.status,
      sourceTxHash: body.sourceTxHash || body.source_tx_hash,
      destinationTxHash: body.destinationTxHash || body.destination_tx_hash,
      errorCode: body.errorCode || body.error_code,
      errorMessage: body.errorMessage || body.error_message,
    };
    return Response.json({ transaction: await recordTransaction(transaction) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: authStatus(error) });
  }
}
