// Server-side execution settings. Secrets are read only at runtime and are
// never included in responses sent to the browser.
const asBoolean = (value, fallback = false) => {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};

const asNumber = (value, fallback, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function getExecutionConfig() {
  return {
    enabled: asBoolean(process.env.EVM_EXECUTION_ENABLED, false),
    lifiBaseUrl: process.env.LIFI_API_URL || "https://li.quest/v1",
    lifiApiKey: process.env.LIFI_API_KEY || "",
    lifiIntegrator: process.env.LIFI_INTEGRATOR || "evm-wallet-console",
    workerIntervalMs: asNumber(process.env.EVM_WORKER_INTERVAL_MS, 5000, 500, 300000),
    workerConcurrency: asNumber(process.env.EVM_WORKER_CONCURRENCY, 2, 1, 32),
    maxRetries: asNumber(process.env.EVM_TASK_MAX_RETRIES, 3, 0, 20),
    retryBaseSeconds: asNumber(process.env.EVM_RETRY_BASE_SECONDS, 15, 1, 86400),
    receiptConfirmations: asNumber(process.env.EVM_RECEIPT_CONFIRMATIONS, 1, 1, 12),
    receiptTimeoutMs: asNumber(process.env.EVM_RECEIPT_TIMEOUT_MS, 180000, 10000, 3600000),
    bridgeTimeoutMs: asNumber(process.env.EVM_BRIDGE_TIMEOUT_MS, 1800000, 30000, 86400000),
    // A worker that disappears while an item is Running must never leave an
    // item eligible for an automatic duplicate broadcast.  The worker renews
    // this lease while it is alive and pauses stale items for manual review.
    runningLeaseMs: asNumber(process.env.EVM_RUNNING_LEASE_MS, 7200000, 60000, 172800000),
    lifiRequestTimeoutMs: asNumber(process.env.LIFI_REQUEST_TIMEOUT_MS, 30000, 3000, 180000),
    vaultMasterKey: process.env.WALLET_VAULT_MASTER_KEY || "",
  };
}

export function requireExecutionEnabled() {
  const config = getExecutionConfig();
  if (!config.enabled) {
    const error = new Error("On-chain execution is disabled. Set EVM_EXECUTION_ENABLED=true after configuring a signer and RPC.");
    error.code = "EXECUTION_DISABLED";
    error.retryable = false;
    throw error;
  }
  return config;
}
