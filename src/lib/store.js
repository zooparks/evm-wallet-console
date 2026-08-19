import { json, parseJson, query, withTransaction } from "@/lib/db";
import { enqueueTask } from "@/lib/queue";
import { normalizeChainKey, EVM_CHAIN_CATALOG } from "@/lib/chains/catalog";

const fallback = globalThis.__evmWalletFallback || {
  // In-memory mode is opt-in for UI prototyping; real execution always needs MySQL.
  wallets: new Map(),
  tasks: new Map(),
  transactions: new Map(),
};
globalThis.__evmWalletFallback = fallback;

const allowFallback = () => ["1", "true", "yes", "on"].includes(String(process.env.ALLOW_MEMORY_FALLBACK || "").toLowerCase());
const chainExists = (value) => EVM_CHAIN_CATALOG.some((chain) => chain.key === normalizeChainKey(value));
const evmAddress = (value) => /^0x[0-9a-fA-F]{40}$/.test(String(value || ""));
function positiveDecimal(value, label = "Amount") {
  const text = String(value ?? "").trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text) || Number(text) <= 0) throw new Error(`${label} must be a positive decimal number`);
  return text;
}

function walletRow(row) {
  if (!row) return null;
  const metadata = parseJson(row.metadata, {});
  return { ...metadata, id: row.id, name: row.name, address: row.address, group: metadata.group || row.group_name || null, status: row.status, enabled: !!row.enabled, totalAssets: Number(row.total_assets || 0), native: Number(row.native_balance || 0), lastActivity: row.last_activity_at || null, createdAt: row.created_at || null, chains: metadata.chains || {} };
}

function itemRow(row) {
  return {
    id: row.id,
    wallet: row.wallet_id,
    walletId: row.wallet_id,
    amount: Number(row.amount ?? row.amount_text ?? 0),
    amountText: row.amount_text,
    scheduled: row.scheduled_at || null,
    scheduledAt: row.scheduled_at || null,
    status: row.status,
    txHash: row.tx_hash || null,
    destinationTxHash: row.destination_tx_hash || null,
    retryCount: Number(row.retry_count || 0),
    error: row.error_message || null,
    errorCode: row.error_code || null,
    startedAt: row.started_at || null,
    completedAt: row.completed_at || null,
  };
}

// Only these execution fields are safe to expose through task APIs.  Task
// creation accepts JSON from the browser, so never spread the original input
// into a persisted config or response (it could contain a private key/token).
function publicTaskConfig(data = {}) {
  const strategy = data.amountStrategy && typeof data.amountStrategy === "object" ? data.amountStrategy : {};
  const schedule = data.schedule && typeof data.schedule === "object" ? data.schedule : {};
  const amounts = strategy.amounts && typeof strategy.amounts === "object"
    ? Object.fromEntries(Object.entries(strategy.amounts).filter(([key, value]) => /^[A-Za-z0-9_.:-]{1,96}$/.test(key) && /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(String(value))))
    : {};
  return {
    amount: data.amount == null ? null : String(data.amount),
    amountStrategy: { type: String(strategy.type || "fixed").slice(0, 32), amounts },
    schedule: { type: String(schedule.type || "immediate").slice(0, 32), startTime: schedule.startTime || null, endTime: schedule.endTime || null, interval: Number(schedule.interval || 30) },
    fromToken: data.fromToken || data.token || null,
    toToken: data.toToken || data.targetToken || null,
    token: data.token || data.fromToken || null,
    targetToken: data.targetToken || data.toToken || null,
    recipient: data.recipient || null,
    slippageBps: Number(data.slippageBps || 50),
  };
}

function taskRow(row, items = []) {
  const data = publicTaskConfig(parseJson(row.execution_config, {}));
  const counts = parseJson(row.counts, { success: 0, running: 0, submitted: 0, scheduled: row.wallet_count, failed: 0, retrying: 0, paused: 0 });
  return { ...data, id: row.id, type: row.type, chain: row.source_chain, targetChain: row.destination_chain, status: row.status, walletCount: Number(row.wallet_count || 0), wallets: Number(row.wallet_count || 0), done: Number(row.done_count || 0), total: Number(row.wallet_count || 0), counts, pair: row.pair || data.pair || null, createdAt: row.created_at, updatedAt: row.updated_at, items: items.map(itemRow) };
}

function scheduleDate(schedule = {}, index = 0) {
  const now = new Date();
  if (!schedule || schedule.type === "immediate") return now;
  const raw = String(schedule.startTime || "").trim();
  let start = raw ? new Date(raw) : null;
  if (!start || Number.isNaN(start.getTime())) {
    const match = /^(\d{2}):(\d{2})$/.exec(raw);
    start = new Date(now);
    if (match) { start.setHours(Number(match[1]), Number(match[2]), 0, 0); if (start < now) start.setDate(start.getDate() + 1); }
  }
  if (schedule.type === "window") {
    const interval = Math.max(5, Number(schedule.interval || 30));
    start = new Date(start.getTime() + index * interval * 1000);
  }
  return start;
}

export async function listWallets(filters = {}) {
  try {
    let sql = "SELECT w.*, g.name AS group_name FROM wallets w LEFT JOIN wallet_groups g ON g.id=w.group_id WHERE 1=1"; const params = [];
    if (filters.q) { sql += " AND (w.name LIKE ? OR w.address LIKE ?)"; params.push(`%${filters.q}%`, `%${filters.q}%`); }
    if (filters.status) { sql += " AND w.status=?"; params.push(filters.status); }
    if (filters.group) { sql += " AND g.name=?"; params.push(filters.group); }
    const rows = await query(`${sql} ORDER BY w.created_at DESC`, params); if (rows) return rows.map(walletRow);
  } catch (error) { if (!allowFallback()) throw error; }
  let result = [...fallback.wallets.values()]; if (filters.q) result = result.filter((w) => `${w.name} ${w.address}`.toLowerCase().includes(String(filters.q).toLowerCase())); if (filters.status) result = result.filter((w) => w.status === filters.status); if (filters.group) result = result.filter((w) => w.group === filters.group); return result;
}

export async function getWallet(id) {
  try {
    const rows = await query("SELECT w.*, g.name AS group_name FROM wallets w LEFT JOIN wallet_groups g ON g.id=w.group_id WHERE w.id=? OR LOWER(w.address)=LOWER(?) LIMIT 1", [String(id), String(id)]);
    if (rows?.[0]) {
      const wallet = walletRow(rows[0]);
      const balances = await query("SELECT chain_key,SUM(COALESCE(usd_value,0)) value FROM wallet_balances WHERE wallet_id=? GROUP BY chain_key", [wallet.id]);
      if (balances?.length) wallet.chains = Object.fromEntries(balances.map((row) => [row.chain_key, Number(row.value || 0)]));
      return wallet;
    }
  }
  catch (error) { if (!allowFallback()) throw error; }
  return fallback.wallets.get(String(id)) || null;
}

export async function upsertWallet(input) {
  if (!input?.address || !evmAddress(input.address)) throw new Error("Valid EVM address is required");
  const id = String(input.id || `w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`); const status = input.enabled === false ? "Inactive" : (input.status || "Active");
  try {
    await query("INSERT INTO wallets (id,name,address,status,enabled,total_assets,native_balance,metadata) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),address=VALUES(address),status=VALUES(status),enabled=VALUES(enabled),total_assets=VALUES(total_assets),native_balance=VALUES(native_balance),metadata=VALUES(metadata)", [id, input.name || id, input.address, status, input.enabled === false ? 0 : 1, Number(input.totalAssets || 0), Number(input.native || input.nativeBalance || 0), json({ group: input.group || null, tags: input.tags || [], chains: input.chains || {} })]);
    return getWallet(id);
  } catch (error) {
    if (!allowFallback()) throw error;
    const wallet = {
      ...(fallback.wallets.get(id) || {}), id, name: input.name || id, address: input.address,
      status, enabled: status === "Active", totalAssets: Number(input.totalAssets || 0), native: Number(input.native || input.nativeBalance || 0),
      group: input.group || null, tags: Array.isArray(input.tags) ? input.tags : [], chains: input.chains && typeof input.chains === "object" ? input.chains : {},
    };
    fallback.wallets.set(id, wallet);
    return wallet;
  }
}

export async function removeWallet(id) {
  try { const rows = await query("DELETE FROM wallets WHERE id=?", [String(id)]); if (rows) return rows.affectedRows > 0; }
  catch (error) { if (!allowFallback()) throw error; }
  return fallback.wallets.delete(String(id));
}

export async function listGroups() {
  try { const rows = await query("SELECT g.name, COUNT(w.id) count FROM wallet_groups g LEFT JOIN wallets w ON w.group_id=g.id GROUP BY g.id,g.name ORDER BY g.name"); if (rows) return rows.map((r) => ({ name: r.name, count: Number(r.count) })); }
  catch (error) { if (!allowFallback()) throw error; }
  const grouped = {}; for (const w of fallback.wallets.values()) if (w.group) grouped[w.group] = (grouped[w.group] || 0) + 1; return Object.entries(grouped).map(([name, count]) => ({ name, count }));
}

export async function createTask(input) {
  const type = String(input?.type || "").toLowerCase();
  if (!['transfer', 'swap', 'bridge'].includes(type)) throw new Error("type must be transfer, swap, or bridge");
  if (!Array.isArray(input.wallets) || !input.wallets.length) throw new Error("wallets are required");
  const requestedWallets = [...new Set(input.wallets.map(String))];
  if (requestedWallets.length !== input.wallets.length) throw new Error("Duplicate wallets are not allowed in a batch");
  const sourceChain = normalizeChainKey(input.chain || "ethereum");
  const targetChain = input.targetChain ? normalizeChainKey(input.targetChain) : null;
  if (!chainExists(sourceChain)) throw new Error(`Unsupported source chain: ${input.chain}`);
  if (type === "bridge" && (!targetChain || !chainExists(targetChain) || targetChain === sourceChain)) throw new Error("Bridge requires a different supported destination chain");
  if (type !== "bridge" && targetChain && !chainExists(targetChain)) throw new Error(`Unsupported destination chain: ${input.targetChain}`);
  const token = String(input.token || input.fromToken || "").trim();
  const targetToken = String(input.targetToken || input.toToken || (type === "bridge" ? token : "")).trim();
  if (!token) throw new Error("Token is required");
  if (type === "swap" && (!targetToken || token.toLowerCase() === targetToken.toLowerCase())) throw new Error("Swap requires different source and target tokens");
  if (type === "transfer" && !evmAddress(input.recipient)) throw new Error("Transfer recipient must be a valid EVM address");
  const slippageBps = Number(input.slippageBps ?? 50);
  if (!Number.isInteger(slippageBps) || slippageBps < 1 || slippageBps > 5000) throw new Error("Slippage must be between 1 and 5000 bps");
  const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const schedule = { type: input.schedule?.type || "immediate", startTime: input.schedule?.startTime || null, endTime: input.schedule?.endTime || null, interval: Math.max(5, Number(input.schedule?.interval || 30)) };
  const rows = requestedWallets.map((walletId, index) => ({ id: `${id}_${index + 1}`, walletId, amount: positiveDecimal(input.amountStrategy?.amounts?.[walletId] ?? input.amount, "Every task amount"), scheduledAt: scheduleDate(schedule, index) }));
  const safeAmountStrategy = { type: String(input.amountStrategy?.type || "fixed").slice(0, 32), amounts: Object.fromEntries(rows.map((row) => [row.walletId, row.amount])) };
  const executionConfig = { type, chain: sourceChain, sourceChain, targetChain, fromToken: token, toToken: targetToken || null, token, targetToken: targetToken || null, recipient: type === "transfer" ? input.recipient : null, slippageBps, amount: input.amount == null ? null : String(input.amount), amountStrategy: safeAmountStrategy, schedule };
  const task = { ...executionConfig, id, type, chain: sourceChain, targetChain, status: "Scheduled", walletCount: rows.length, wallets: rows.length, total: rows.length, done: 0, counts: { success: 0, running: 0, submitted: 0, scheduled: rows.length, failed: 0, retrying: 0, paused: 0 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), items: rows.map((row) => ({ id: row.id, walletId: row.walletId, amount: row.amount, status: "Scheduled", scheduledAt: row.scheduledAt.toISOString(), retryCount: 0 })) };
  try {
    const persisted = await withTransaction(async (tx) => {
      const walletRows = await tx(`SELECT id FROM wallets WHERE id IN (${requestedWallets.map(() => "?").join(",")})`, requestedWallets);
      if (!walletRows || walletRows.length !== requestedWallets.length) throw new Error("One or more wallets do not exist");
      await tx("INSERT INTO batch_tasks (id,type,source_chain,destination_chain,from_token,to_token,pair,wallet_count,done_count,amount_strategy,schedule_strategy,execution_config,counts,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [id, type, sourceChain, targetChain, token, targetToken || null, type === "swap" ? `${token} -> ${targetToken}` : type === "bridge" ? `${sourceChain} -> ${targetChain}` : token, rows.length, 0, json(safeAmountStrategy), json(schedule), json(executionConfig), json(task.counts), "Scheduled"]);
      for (const row of rows) await tx("INSERT INTO task_items (id,batch_task_id,wallet_id,amount,amount_text,scheduled_at,status,retry_count) VALUES (?,?,?,?,?,?,?,?)", [row.id, id, row.walletId, row.amount, row.amount, row.scheduledAt, "Scheduled", 0]);
      if (type === "swap") await tx("INSERT INTO swap_tasks (batch_task_id,router,slippage_bps,metadata) VALUES (?,?,?,?)", [id, "lifi", executionConfig.slippageBps, json({ provider: "lifi" })]);
      if (type === "bridge") await tx("INSERT INTO bridge_tasks (batch_task_id,provider,source_chain,destination_chain,source_token,destination_token,metadata) VALUES (?,?,?,?,?,?,?)", [id, "lifi", sourceChain, targetChain, token, targetToken, json({ provider: "lifi" })]);
      if (type === "transfer") await tx("INSERT INTO transfer_tasks (batch_task_id,recipient,token,metadata) VALUES (?,?,?,?)", [id, input.recipient, token, json({ recipient: input.recipient })]);
      return true;
    });
    if (!persisted) throw new Error("MySQL is unavailable; task was not persisted");
    const queue = await enqueueTask(task);
    return { ...task, queue };
  } catch (error) {
    if (!allowFallback()) throw error;
    fallback.tasks.set(id, task);
    return { ...task, queue: { queued: false, reason: "memory-fallback" } };
  }
}

export async function listTasks(filters = {}) {
  try {
    let sql = "SELECT * FROM batch_tasks WHERE 1=1"; const params = [];
    if (filters.status) {
      const requestedStatus = String(filters.status).trim().toLowerCase();
      if (["submitted", "retrying"].includes(requestedStatus)) {
        sql += " AND EXISTS (SELECT 1 FROM task_items ti_filter WHERE ti_filter.batch_task_id=batch_tasks.id AND LOWER(ti_filter.status)=?)";
        params.push(requestedStatus);
      } else {
        sql += " AND LOWER(status)=?";
        params.push(requestedStatus);
      }
    }
    if (filters.type) { sql += " AND type=?"; params.push(filters.type); }
    const rows = await query(`${sql} ORDER BY created_at DESC`, params);
    if (rows) {
      const out = [];
      for (const row of rows) { const items = await query("SELECT * FROM task_items WHERE batch_task_id=? ORDER BY created_at", [row.id]); out.push(taskRow(row, items || [])); }
      return out;
    }
  } catch (error) { if (!allowFallback()) throw error; }
  return [...fallback.tasks.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getTask(id) { return (await listTasks()).find((task) => String(task.id) === String(id)) || null; }

export async function updateTask(id, patch = {}) {
  const task = await getTask(id); if (!task) return null;
  const action = String(patch.action || "").toLowerCase();
  if (!['pause', 'resume', 'cancel', 'retry'].includes(action)) throw new Error("Unsupported task action");
  try {
    if (action === "pause") await query("UPDATE batch_tasks SET status='Paused', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status NOT IN ('Success','Failed','Cancelled')", [id]);
    // Never turn an item with a broadcast hash back into an executable state.
    // It may represent a confirmed transfer or a bridge still being tracked.
    if (action === "resume") { await query("UPDATE task_items SET status='Scheduled', scheduled_at=CURRENT_TIMESTAMP, error_code=NULL, error_message=NULL WHERE batch_task_id=? AND status IN ('Paused','Retrying','Failed') AND tx_hash IS NULL AND (error_code IS NULL OR error_code <> 'WORKER_INTERRUPTED')", [id]); await query("UPDATE batch_tasks SET status='Scheduled', updated_at=CURRENT_TIMESTAMP WHERE id=?", [id]); }
    if (action === "cancel") { await query("UPDATE task_items SET status='Cancelled', updated_at=CURRENT_TIMESTAMP WHERE batch_task_id=? AND status IN ('Queued','Scheduled','Retrying','Paused')", [id]); await query("UPDATE batch_tasks SET status='Cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=?", [id]); }
    if (action === "retry") {
      const wallet = String(patch.wallet || "");
      await query("UPDATE task_items SET status='Scheduled', scheduled_at=CURRENT_TIMESTAMP, error_code=NULL, error_message=NULL WHERE batch_task_id=? AND (wallet_id=? OR id=?) AND status='Failed' AND tx_hash IS NULL AND (error_code IS NULL OR error_code <> 'WORKER_INTERRUPTED')", [id, wallet, wallet]);
      await query("UPDATE batch_tasks SET status='Scheduled', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='Failed'", [id]);
    }
    return getTask(id);
  } catch (error) { if (!allowFallback()) throw error; const updated = { ...task, status: action === "cancel" ? "Cancelled" : action === "pause" ? "Paused" : "Scheduled" }; fallback.tasks.set(String(id), updated); return updated; }
}

export async function listTransactions() {
  try { const rows = await query("SELECT id,hash,wallet_id AS wallet,chain,type,amount_text AS amount,status,block_number AS block,fee_usd AS gas,source_tx_hash AS sourceTxHash,destination_tx_hash AS destinationTxHash,error_code AS errorCode,error_message AS errorMessage,timestamp_at AS timestamp FROM transactions ORDER BY COALESCE(timestamp_at,created_at) DESC"); if (rows) return rows; }
  catch (error) { if (!allowFallback()) throw error; }
  return [...fallback.transactions.values()];
}

export async function recordTransaction(tx) {
  const id = tx.id || tx.hash || `tx_${Date.now()}`;
  try {
    await query("INSERT INTO transactions (id,hash,wallet_id,chain,type,amount_text,status,source_tx_hash,destination_tx_hash,error_code,error_message,timestamp_at,raw_data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),source_tx_hash=VALUES(source_tx_hash),destination_tx_hash=VALUES(destination_tx_hash),error_code=VALUES(error_code),error_message=VALUES(error_message),raw_data=VALUES(raw_data)", [
      id, tx.hash || id, tx.walletId || null, tx.chain || null, tx.type || null, tx.amount || null, tx.status || "pending", tx.sourceTxHash || null, tx.destinationTxHash || null, tx.errorCode || null, tx.errorMessage || null, new Date(), json(tx),
    ]);
  }
  catch (error) { if (!allowFallback()) throw error; }
  const value = { id, timestamp: new Date().toISOString(), ...tx }; fallback.transactions.set(id, value); return value;
}
