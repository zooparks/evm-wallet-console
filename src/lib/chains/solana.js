/**
 * Lightweight Solana JSON-RPC adapter. No Solana SDK is required; this keeps
 * the server usable in a minimal Next.js deployment and makes the adapter
 * interchangeable with other chain clients.
 */

const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";

function rpcUrl() {
  return process.env.SOLANA_RPC_URL || DEFAULT_RPC_URL;
}

function assertAddress(address, name = "address") {
  if (typeof address !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    throw new Error(`Invalid Solana ${name}`);
  }
}

async function rpcRequest(method, params = [], options = {}) {
  const retries = Math.max(0, Number(options.retries ?? 2));
  const timeoutMs = Math.max(1000, Number(options.timeoutMs ?? 10000));
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(rpcUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`Solana RPC HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (!response.ok || payload.error) {
        const message = payload.error?.message || `Solana RPC request failed (${response.status})`;
        const error = new Error(message);
        error.code = payload.error?.code;
        throw error;
      }
      return payload.result;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      // Exponential backoff also gives public RPC endpoints room to recover.
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("Solana RPC request failed");
}

export async function getBalance(address, commitment = "confirmed") {
  assertAddress(address);
  const result = await rpcRequest("getBalance", [address, { commitment }]);
  return {
    address,
    lamports: result.value,
    sol: result.value / 1_000_000_000,
    context: result.context,
  };
}

export async function getBlockHeight(commitment = "confirmed") {
  const blockHeight = await rpcRequest("getBlockHeight", [{ commitment }]);
  return { blockHeight, commitment };
}

export async function getTransaction(signature, options = {}) {
  if (typeof signature !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) {
    throw new Error("Invalid Solana transaction signature");
  }
  const params = [signature, {
    encoding: options.encoding || "jsonParsed",
    commitment: options.commitment || "confirmed",
    maxSupportedTransactionVersion: options.maxSupportedTransactionVersion ?? 0,
  }];
  return rpcRequest("getTransaction", params);
}

export const solana = {
  chain: "solana",
  nativeSymbol: "SOL",
  rpcRequest,
  getBalance,
  getBlockHeight,
  getTransaction,
};

export default solana;
