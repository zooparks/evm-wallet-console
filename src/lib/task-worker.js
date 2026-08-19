import { query, json, parseJson, withAdvisoryLock } from "./db.js";
import { getExecutionConfig } from "./execution/config.js";
import { createExecutionContext } from "./execution/evm-runtime.js";
import { publicClient } from "./execution/evm-runtime.js";
import { executeTransfer } from "./execution/transfer.js";
import { executeSwap } from "./execution/swap.js";
import { executeBridge } from "./execution/bridge.js";
import { lifi } from "./execution/lifi.js";

const activeWallets = new Set();
let lastDisabledNotice = 0;

function serializable(value) {
  return JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item);
}

function errorInfo(error) {
  return { code: String(error?.code || "EXECUTION_ERROR").slice(0, 120), message: String(error?.message || error || "Execution failed").slice(0, 1000), retryable: error?.retryable !== false };
}

async function safeQuery(sql, params = []) {
  try { return await query(sql, params); }
  catch (error) { console.error(`[worker] persistence query failed: ${error.message}`); return null; }
}

function dueRows(limit) {
  return query(`SELECT ti.*, bt.type, bt.source_chain, bt.destination_chain, bt.execution_config, bt.status AS batch_status,
      bt.wallet_count, w.address, w.name AS wallet_name, w.status AS wallet_status, w.enabled AS wallet_enabled
    FROM task_items ti
    JOIN batch_tasks bt ON bt.id = ti.batch_task_id
    JOIN wallets w ON w.id = ti.wallet_id
    WHERE ti.status IN ('Queued','Scheduled','Retrying')
      AND (ti.scheduled_at IS NULL OR ti.scheduled_at <= CURRENT_TIMESTAMP)
      AND bt.status NOT IN ('Paused','Cancelled','Success','Failed')
      AND w.enabled = 1 AND w.status NOT IN ('Inactive','Disabled')
    ORDER BY COALESCE(ti.scheduled_at, ti.created_at), ti.created_at
    LIMIT ?`, [Number(limit)]);
}

async function claim(row) {
  const token = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const result = await query(`UPDATE task_items
    SET status='Running', claim_token=?, started_at=COALESCE(started_at, CURRENT_TIMESTAMP), updated_at=CURRENT_TIMESTAMP
    WHERE id=? AND status IN ('Queued','Scheduled','Retrying')
      AND (scheduled_at IS NULL OR scheduled_at <= CURRENT_TIMESTAMP)`, [token, row.id]);
  if (result?.affectedRows !== 1) return false;
  // Keep the token in memory so every completion/error write is fenced.  A
  // stale worker must not overwrite a task that an operator has reclaimed.
  row.claimToken = token;
  return true;
}

function startClaimHeartbeat(row) {
  const config = getExecutionConfig();
  const interval = Math.max(10000, Math.min(Math.floor(config.runningLeaseMs / 3), config.workerIntervalMs * 2));
  const timer = setInterval(() => {
    query("UPDATE task_items SET updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='Running' AND claim_token=?", [row.id, row.claimToken]).catch((error) => {
      console.warn(`[worker] claim heartbeat failed for ${row.id}: ${error.message}`);
    });
  }, interval);
  return () => clearInterval(timer);
}

async function reconcileStaleRunningItems() {
  const seconds = Math.max(60, Math.ceil(getExecutionConfig().runningLeaseMs / 1000));
  const rows = await query(`SELECT id,batch_task_id FROM task_items
    WHERE status='Running' AND updated_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${seconds} SECOND)`);
  for (const row of rows || []) {
    const result = await query(`UPDATE task_items SET status='Paused', error_code='WORKER_INTERRUPTED',
      error_message='Worker lease expired; inspect the chain before retrying', updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND status='Running'`, [row.id]);
    if (result?.affectedRows) await refreshTask(row.batch_task_id);
  }
}

async function recordQuote(task, item, quote) {
  const estimate = quote?.estimate || {};
  await query(`INSERT INTO quotes (batch_task_id,task_item_id,chain,input_token,output_token,input_amount,estimated_output,gas_estimate,slippage_bps,response_data,expires_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 SECOND))`, [
    task.id, item.id, task.source_chain, task.execution_config?.fromToken || task.execution_config?.token || null,
    task.execution_config?.toToken || task.execution_config?.targetToken || null, estimate.fromAmount || null, estimate.toAmount || null,
    estimate.gasCosts?.[0]?.estimate || null, Number(task.execution_config?.slippageBps || 50), serializable(quote),
  ]);
}

async function recordSimulation(task, item, simulation) {
  await query("INSERT INTO simulations (batch_task_id,task_item_id,chain,request_data,result_data,success,gas_amount) VALUES (?,?,?,?,?,?,?)", [
    task.id, item.id, task.source_chain, serializable(simulation.request || {}), serializable(simulation), simulation.success ? 1 : 0, simulation.gas || null,
  ]);
}

async function recordTransaction(task, item, wallet, result, type) {
  const receipt = result.receipt || {};
  const hash = result.hash;
  await query(`INSERT INTO transactions (id,hash,wallet_id,batch_task_id,task_item_id,chain,type,amount_text,amount_data,status,block_number,gas_used,gas_price,source_tx_hash,destination_tx_hash,raw_data,submitted_at,confirmed_at,timestamp_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON DUPLICATE KEY UPDATE status=VALUES(status),block_number=VALUES(block_number),gas_used=VALUES(gas_used),gas_price=VALUES(gas_price),destination_tx_hash=VALUES(destination_tx_hash),raw_data=VALUES(raw_data),confirmed_at=VALUES(confirmed_at),timestamp_at=VALUES(timestamp_at)`, [
    hash, hash, wallet.id, task.id, item.id, task.source_chain, type, String(item.amount_text || item.amount || ""), serializable(result), "confirmed",
    receipt.blockNumber ? String(receipt.blockNumber) : null, receipt.gasUsed ? String(receipt.gasUsed) : null, receipt.effectiveGasPrice ? String(receipt.effectiveGasPrice) : null,
    hash, result.destinationTxHash || null, serializable(result),
  ]);
}

function bridgeStatusObject(value) {
  if (typeof value === "string") return { status: value };
  return value && typeof value === "object" ? value : {};
}

function bridgeDestinationHash(value) {
  const status = bridgeStatusObject(value);
  return status.receiving?.txHash || status.receiving?.transactionHash
    || status.destinationTxHash || status.toTxHash || null;
}

function bridgeStatusName(value) {
  const status = bridgeStatusObject(value);
  return String(status.status || status.substatus || "pending").toLowerCase();
}

function bridgePayload(result) {
  const status = bridgeStatusObject(result?.status || result?.bridgeStatus);
  return { status, tool: result?.quote?.tool || result?.bridgeTool || result?.tool || null };
}

async function recordBridgeMessage(task, item, result) {
  if (String(task.type).toLowerCase() !== "bridge" || !result?.hash) return;
  const payload = bridgePayload(result);
  const status = bridgeStatusName(payload.status);
  const messageId = payload.status.messageId || payload.status.bridgeMessageId || null;
  const id = `bridge_${task.id}_${item.id}`.slice(0, 96);
  await query(`INSERT INTO bridge_messages (id,bridge_task_id,source_tx_hash,destination_tx_hash,message_id,status,payload,observed_at)
    VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON DUPLICATE KEY UPDATE source_tx_hash=VALUES(source_tx_hash),destination_tx_hash=VALUES(destination_tx_hash),message_id=VALUES(message_id),status=VALUES(status),payload=VALUES(payload),observed_at=CURRENT_TIMESTAMP`, [
    id, task.id, result.hash, result.destinationTxHash || bridgeDestinationHash(payload.status), messageId, status, serializable(payload),
  ]);
}

async function safeRecordBridgeMessage(task, item, result) {
  try { await recordBridgeMessage(task, item, result); }
  catch (error) { console.error(`[worker] bridge message persistence failed: ${error.message}`); }
}

async function refreshTask(taskId) {
  const rows = await query("SELECT status, COUNT(*) AS count FROM task_items WHERE batch_task_id=? GROUP BY status", [taskId]);
  const counts = { success: 0, running: 0, submitted: 0, scheduled: 0, failed: 0, retrying: 0, paused: 0 };
  for (const row of rows || []) {
    const status = String(row.status || "").toLowerCase();
    const count = Number(row.count || 0);
    if (status === "success" || status === "confirmed") counts.success += count;
    else if (status === "running") counts.running += count;
    else if (status === "submitted") counts.submitted += count;
    else if (status === "failed") counts.failed += count;
    else if (status === "retrying") counts.retrying += count;
    else if (status === "paused") counts.paused += count;
    else counts.scheduled += count;
  }
  const taskRows = await query("SELECT status,wallet_count FROM batch_tasks WHERE id=?", [taskId]);
  if (!taskRows?.[0]) return;
  const current = String(taskRows[0].status || "");
  const total = Number(taskRows[0].wallet_count || 0);
  let status = current;
  const done = counts.success + counts.failed;
  if (!["Paused", "Cancelled"].includes(current)) {
    if (done >= total && total > 0) status = counts.failed ? "Failed" : "Success";
    else if (counts.running > 0 || counts.submitted > 0) status = "Running";
    else if (counts.paused > 0) status = "Paused";
    else status = "Scheduled";
  }
  await query("UPDATE batch_tasks SET status=?, done_count=?, counts=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [status, done, json(counts), taskId]);
}

async function markSuccess(row, result) {
  const claimToken = row.claimToken || row.claim_token;
  // Persist the audit rows before publishing Success.  If any audit write
  // fails, the caller fences the item as Submitted instead of retrying funds.
  await recordTransaction({ id: row.batch_task_id, source_chain: row.source_chain, execution_config: parseJson(row.execution_config, {}) }, { id: row.id, amount_text: row.amount_text }, { id: row.wallet_id, address: row.address }, result, row.type);
  await recordBridgeMessage({ id: row.batch_task_id, type: row.type }, { id: row.id }, result);
  const updated = await query(`UPDATE task_items SET status='Success', tx_hash=?, destination_tx_hash=?, error_code=NULL, error_message=NULL,
      completed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='Running' AND claim_token=?`, [result.hash || null, result.destinationTxHash || null, row.id, claimToken]);
  if (updated?.affectedRows !== 1) throw Object.assign(new Error("Task claim was lost before completion was persisted"), { code: "CLAIM_LOST", retryable: false });
  await refreshTask(row.batch_task_id);
}

async function markPersistenceFailure(row, result, error) {
  const hash = result?.hash || error?.hash || null;
  const info = { code: "PERSISTENCE_ERROR", message: `On-chain transaction ${hash || "completed"}, but task state could not be fully persisted: ${String(error?.message || error).slice(0, 800)}` };
  const claimToken = row.claimToken || row.claim_token;
  const status = hash ? "Submitted" : "Paused";
  await safeQuery(`UPDATE task_items SET status=?, tx_hash=COALESCE(?,tx_hash), destination_tx_hash=COALESCE(?,destination_tx_hash),
    error_code=?, error_message=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND claim_token=?`, [status, hash, result?.destinationTxHash || null, info.code, info.message, row.id, claimToken]);
  if (hash) {
    await safeQuery(`INSERT INTO transactions (id,hash,wallet_id,batch_task_id,task_item_id,chain,type,amount_text,status,error_code,error_message,submitted_at,raw_data)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status='pending',error_code=VALUES(error_code),error_message=VALUES(error_message),raw_data=VALUES(raw_data)`, [
      hash, hash, row.wallet_id, row.batch_task_id, row.id, row.source_chain, row.type, String(row.amount_text || row.amount || ""), "pending", info.code, info.message, new Date(), serializable(result || {}),
    ]);
    await safeRecordBridgeMessage({ id: row.batch_task_id, type: row.type }, { id: row.id }, {
      hash, bridgeTool: result?.quote?.tool || result?.bridgeTool, status: result?.status || result?.bridgeStatus,
      destinationTxHash: result?.destinationTxHash,
    });
  }
  await safeQuery("UPDATE batch_tasks SET error_message=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [info.message, row.batch_task_id]);
  try { await refreshTask(row.batch_task_id); } catch (refreshError) { console.error(`[worker] refresh after persistence failure: ${refreshError.message}`); }
}

async function markFailure(row, error) {
  const info = errorInfo(error);
  const retryCount = Number(row.retry_count || 0);
  const config = getExecutionConfig();
  const claimToken = row.claimToken || row.claim_token;
  // A bridge provider can report a terminal failure after the source hash was
  // broadcast.  Keep it terminal (no retry) while retaining the source hash.
  if (error?.terminal && error?.hash) {
    await query("UPDATE task_items SET status='Failed', tx_hash=COALESCE(?,tx_hash), error_code=?, error_message=?, completed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=? AND claim_token=?", [error.hash, info.code, info.message, row.id, claimToken]);
    await safeQuery(`INSERT INTO transactions (id,hash,wallet_id,batch_task_id,task_item_id,chain,type,amount_text,status,error_code,error_message,submitted_at,raw_data)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status='failed',error_code=VALUES(error_code),error_message=VALUES(error_message),raw_data=VALUES(raw_data)`, [
      error.hash, error.hash, row.wallet_id, row.batch_task_id, row.id, row.source_chain, row.type, String(row.amount_text || row.amount || ""), "failed", info.code, info.message, new Date(), serializable({ error: info.message, bridgeStatus: error.bridgeStatus || null }),
    ]);
    await safeRecordBridgeMessage({ id: row.batch_task_id, type: row.type }, { id: row.id }, {
      hash: error.hash, bridgeTool: error.bridgeTool, bridgeStatus: error.bridgeStatus,
      destinationTxHash: bridgeDestinationHash(error.bridgeStatus),
    });
    await refreshTask(row.batch_task_id);
    return;
  }
  // A hash means the node accepted a transaction. Mark it Submitted and let
  // the receipt monitor resolve it; never issue a blind duplicate retry.
  if (error?.hash || error?.submitted) {
    await query("UPDATE task_items SET status='Submitted', tx_hash=COALESCE(?,tx_hash), error_code=?, error_message=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND claim_token=?", [error.hash || null, info.code, info.message, row.id, claimToken]);
    await query(`INSERT INTO transactions (id,hash,wallet_id,batch_task_id,task_item_id,chain,type,amount_text,status,error_code,error_message,submitted_at,raw_data)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status='pending',error_code=VALUES(error_code),error_message=VALUES(error_message),raw_data=VALUES(raw_data)`, [
      error.hash || `submitted_${row.id}`, error.hash || null, row.wallet_id, row.batch_task_id, row.id, row.source_chain, row.type, String(row.amount_text || row.amount || ""), "pending", info.code, info.message, new Date(), serializable({ error: info.message }),
    ]);
    await safeRecordBridgeMessage({ id: row.batch_task_id, type: row.type }, { id: row.id }, {
      hash: error.hash, bridgeTool: error.bridgeTool, bridgeStatus: error.bridgeStatus,
      destinationTxHash: bridgeDestinationHash(error.bridgeStatus),
    });
    await refreshTask(row.batch_task_id);
    return;
  }
  const shouldRetry = info.retryable && retryCount < config.maxRetries;
  if (shouldRetry) {
    const delay = Math.round(config.retryBaseSeconds * 2 ** retryCount);
    await query(`UPDATE task_items SET status='Retrying', retry_count=retry_count+1, scheduled_at=DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND),
      error_code=?, error_message=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND claim_token=?`, [delay, info.code, info.message, row.id, claimToken]);
    await query("INSERT INTO retry_records (task_item_id,attempt,status,error_code,error_message,next_retry_at) VALUES (?,?,?,?,?,DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE status=VALUES(status),error_code=VALUES(error_code),error_message=VALUES(error_message),next_retry_at=VALUES(next_retry_at)", [row.id, retryCount + 1, "scheduled", info.code, info.message, delay]);
  } else {
    await query("UPDATE task_items SET status='Failed', error_code=?, error_message=?, completed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=? AND claim_token=?", [info.code, info.message, row.id, claimToken]);
  }
  await refreshTask(row.batch_task_id);
}

async function executeRow(row) {
  const task = { id: row.batch_task_id, type: String(row.type || "").toLowerCase(), source_chain: row.source_chain, destination_chain: row.destination_chain, execution_config: parseJson(row.execution_config, {}) };
  const item = { ...row, amount_text: row.amount_text ?? row.amount };
  const wallet = { id: row.wallet_id, address: row.address, name: row.wallet_name, status: row.wallet_status, enabled: !!row.wallet_enabled };
  const record = { recordQuote: (quote) => recordQuote(task, item, quote), recordSimulation: (simulation) => recordSimulation(task, item, simulation) };
  const context = await createExecutionContext({ task, item, wallet, record });
  return context.runExclusive(async () => {
    if (task.type === "transfer") return executeTransfer(context);
    if (task.type === "swap") return executeSwap(context);
    if (task.type === "bridge") return executeBridge(context);
    throw Object.assign(new Error(`Unsupported task type: ${task.type}`), { code: "UNSUPPORTED_TASK", retryable: false });
  });
}

async function monitorSubmittedItems(limit = 32) {
  const rows = await query(`SELECT ti.id,ti.batch_task_id,ti.tx_hash,ti.wallet_id,ti.amount_text,
      bt.source_chain,bt.destination_chain,bt.type,tx.raw_data AS transaction_raw_data,
      bm.payload AS bridge_payload,bm.status AS bridge_status
    FROM task_items ti JOIN batch_tasks bt ON bt.id=ti.batch_task_id
    LEFT JOIN transactions tx ON tx.hash=ti.tx_hash
    LEFT JOIN bridge_messages bm ON bm.source_tx_hash=ti.tx_hash
    WHERE ti.status='Submitted' AND ti.tx_hash IS NOT NULL ORDER BY ti.updated_at LIMIT ?`, [limit]);
  for (const row of rows || []) {
    try {
      const client = publicClient(row.source_chain);
      const receipt = await client.getTransactionReceipt({ hash: row.tx_hash });
      if (!receipt) continue;

      if (receipt.status !== "success") {
        await query("UPDATE task_items SET status='Failed',error_code='TRANSACTION_REVERTED',error_message='Transaction reverted on chain',completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?", [row.id]);
        await query("UPDATE transactions SET status='failed',block_number=?,gas_used=?,confirmed_at=CURRENT_TIMESTAMP,timestamp_at=CURRENT_TIMESTAMP WHERE hash=?", [String(receipt.blockNumber), String(receipt.gasUsed), row.tx_hash]);
        if (String(row.type).toLowerCase() === "bridge") {
          await safeRecordBridgeMessage({ id: row.batch_task_id, type: row.type }, { id: row.id }, { hash: row.tx_hash, bridgeStatus: { status: "FAILED", substatusMessage: "Source transaction reverted" } });
        }
        await refreshTask(row.batch_task_id);
        continue;
      }

      if (String(row.type).toLowerCase() !== "bridge") {
        await query("UPDATE task_items SET status='Success',error_code=NULL,error_message=NULL,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?", [row.id]);
        await query("UPDATE transactions SET status='confirmed',block_number=?,gas_used=?,confirmed_at=CURRENT_TIMESTAMP,timestamp_at=CURRENT_TIMESTAMP WHERE hash=?", [String(receipt.blockNumber), String(receipt.gasUsed), row.tx_hash]);
        await refreshTask(row.batch_task_id);
        continue;
      }

      // A bridge is not complete when the source transaction is mined. Keep
      // the item Submitted until Li.Fi reports a terminal destination state.
      const transactionData = parseJson(row.transaction_raw_data, {});
      const savedBridge = parseJson(row.bridge_payload, {});
      const savedStatus = savedBridge.status || savedBridge;
      const bridgeTool = transactionData?.quote?.tool || transactionData?.bridgeTool || savedBridge.tool || null;
      let bridgeStatus;
      try {
        bridgeStatus = await lifi.getStatus({
          txHash: row.tx_hash,
          bridge: bridgeTool,
          fromChain: row.source_chain,
          toChain: row.destination_chain,
        });
      } catch (error) {
        // Provider indexing/network errors are transient; keep the source
        // receipt and retry the status query on the next worker poll.
        console.warn(`[worker] bridge status ${row.tx_hash}: ${error.message}`);
        continue;
      }
      const normalized = String(bridgeStatus?.status || bridgeStatus?.substatus || savedStatus?.status || "PENDING").toUpperCase();
      const destinationTxHash = bridgeDestinationHash(bridgeStatus);
      await safeRecordBridgeMessage({ id: row.batch_task_id, type: row.type }, { id: row.id }, { hash: row.tx_hash, bridgeTool, bridgeStatus, destinationTxHash });

      if (normalized === "DONE") {
        await query("UPDATE task_items SET status='Success',destination_tx_hash=COALESCE(?,destination_tx_hash),error_code=NULL,error_message=NULL,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?", [destinationTxHash, row.id]);
        await query("UPDATE transactions SET status='confirmed',block_number=?,gas_used=?,destination_tx_hash=COALESCE(?,destination_tx_hash),confirmed_at=CURRENT_TIMESTAMP,timestamp_at=CURRENT_TIMESTAMP,raw_data=? WHERE hash=?", [String(receipt.blockNumber), String(receipt.gasUsed), destinationTxHash, serializable({ ...transactionData, bridgeStatus }), row.tx_hash]);
      } else if (["FAILED", "INVALID", "NOT_FOUND"].includes(normalized)) {
        const message = String(bridgeStatus?.substatusMessage || bridgeStatus?.message || `Bridge provider reported ${normalized}`).slice(0, 1000);
        await query("UPDATE task_items SET status='Failed',destination_tx_hash=COALESCE(?,destination_tx_hash),error_code='BRIDGE_FAILED',error_message=?,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?", [destinationTxHash, message, row.id]);
        await query("UPDATE transactions SET status='failed',block_number=?,gas_used=?,destination_tx_hash=COALESCE(?,destination_tx_hash),error_code='BRIDGE_FAILED',error_message=?,confirmed_at=CURRENT_TIMESTAMP,timestamp_at=CURRENT_TIMESTAMP,raw_data=? WHERE hash=?", [String(receipt.blockNumber), String(receipt.gasUsed), destinationTxHash, message, serializable({ ...transactionData, bridgeStatus }), row.tx_hash]);
      } else {
        await query("UPDATE task_items SET destination_tx_hash=COALESCE(?,destination_tx_hash),updated_at=CURRENT_TIMESTAMP WHERE id=?", [destinationTxHash, row.id]);
        await query("UPDATE transactions SET status='pending',block_number=?,gas_used=?,destination_tx_hash=COALESCE(?,destination_tx_hash),confirmed_at=COALESCE(confirmed_at,CURRENT_TIMESTAMP),raw_data=? WHERE hash=?", [String(receipt.blockNumber), String(receipt.gasUsed), destinationTxHash, serializable({ ...transactionData, bridgeStatus }), row.tx_hash]);
      }
      await refreshTask(row.batch_task_id);
    } catch (error) { console.warn(`[worker] receipt monitor ${row.tx_hash}: ${error.message}`); }
  }
}

export async function processDueItems() {
  const config = getExecutionConfig();
  if (!config.enabled) {
    if (Date.now() - lastDisabledNotice > 60000) { console.warn("[worker] EVM_EXECUTION_ENABLED is false; waiting without signing or broadcasting"); lastDisabledNotice = Date.now(); }
    return { claimed: 0, processed: 0, skipped: true };
  }
  await reconcileStaleRunningItems();
  await monitorSubmittedItems();
  const rows = await dueRows(Math.max(config.workerConcurrency * 3, 3));
  let claimed = 0;
  const jobs = [];
  for (const row of rows || []) {
    // Wallet IDs are application records, not signing identities.  The same
    // EVM address can be represented by more than one record, so concurrency
    // and nonce serialization must be keyed by the normalized address.
    const walletLockKey = String(row.address || row.wallet_id || "").trim().toLowerCase();
    if (!walletLockKey || jobs.length >= config.workerConcurrency || activeWallets.has(walletLockKey)) continue;
    if (!(await claim(row))) continue;
    claimed += 1;
    activeWallets.add(walletLockKey);
    jobs.push((async () => {
      const stopHeartbeat = startClaimHeartbeat(row);
      try {
        let result;
        try {
          // Keep the cross-process wallet lock around signing/broadcasting,
          // then persist the result separately so a DB failure cannot trigger
          // a second on-chain attempt.
          result = await withAdvisoryLock(walletLockKey, () => executeRow(row), 0);
        } catch (error) {
          try { await markFailure(row, error); }
          catch (failureError) { console.error(`[worker] failed to persist execution error for ${row.id}: ${failureError.message}`); }
          return;
        }
        try { await markSuccess(row, result); }
        catch (persistenceError) { await markPersistenceFailure(row, result, persistenceError); }
      } finally {
        stopHeartbeat();
        activeWallets.delete(walletLockKey);
      }
    })());
  }
  await Promise.all(jobs);
  return { claimed, processed: jobs.length, skipped: false };
}

export async function runWorker() {
  const config = getExecutionConfig();
  console.log(`[worker] started; interval=${config.workerIntervalMs}ms concurrency=${config.workerConcurrency}`);
  let stopping = false;
  const stop = () => { stopping = true; };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  while (!stopping) {
    try { await processDueItems(); } catch (error) { console.error("[worker] poll failed:", error.message); }
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, getExecutionConfig().workerIntervalMs));
  }
  console.log("[worker] stopped");
}
