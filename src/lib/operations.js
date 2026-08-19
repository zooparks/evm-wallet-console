import { json, parseJson, query } from "@/lib/db";
import { normalizeChainKey } from "@/lib/chains/catalog";
import { enqueueOperation } from "@/lib/queue";

function mapOperation(row) {
  const metadata = parseJson(row.metadata, {});
  return {
    id: row.id,
    type: row.type,
    chain: row.chain,
    status: row.status,
    wallets: parseJson(row.wallet_ids, []),
    amount: parseJson(row.amount_data, null),
    recipient: row.recipient,
    token: metadata.token || metadata.fromToken || null,
    targetToken: metadata.targetToken || metadata.toToken || null,
    slippageBps: Number(metadata.slippageBps || 50),
    createdAt: row.created_at,
  };
}

export async function createOperation(input) {
  if (!input || !["transfer", "swap", "bridge"].includes(String(input.type).toLowerCase())) throw new Error("type must be transfer, swap, or bridge");
  if (!Array.isArray(input.wallets) || !input.wallets.length) throw new Error("wallets must contain at least one wallet");
  const id = `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const operation = { id, type: String(input.type).toLowerCase(), chain: normalizeChainKey(input.chain || "ethereum"), status: "pending", wallets: input.wallets, amount: input.amount ?? null, recipient: input.recipient ?? null, createdAt: new Date().toISOString() };
  try {
    const metadata = { token: input.token || input.fromToken || null, targetToken: input.targetToken || input.toToken || null, slippageBps: Number(input.slippageBps || 50) };
    await query("INSERT INTO operations (id,type,chain,status,wallet_ids,amount_data,recipient,metadata) VALUES (?,?,?,?,?,?,?,?)", [id, operation.type, operation.chain, operation.status, json(operation.wallets), json(operation.amount), operation.recipient, json(metadata)]);
    await enqueueOperation(operation);
  } catch { globalThis.__evmOperations = globalThis.__evmOperations || new Map(); globalThis.__evmOperations.set(id, operation); }
  return operation;
}
export async function listOperations() { try { const rows = await query("SELECT * FROM operations ORDER BY created_at DESC"); if (rows) return rows.map(mapOperation); } catch {} return [...(globalThis.__evmOperations || new Map()).values()]; }
export async function getOperation(id) { return (await listOperations()).find((operation) => operation.id === id) || null; }
