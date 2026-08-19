/**
 * Small, dependency-free EVM JSON-RPC client used by the route handlers.
 * RPC URLs can be overridden with the per-chain EVM_RPC_* environment variables.
 */
import { EVM_CHAIN_CATALOG, normalizeChainKey } from "./catalog.js";

// Keep the historical EVM_CHAINS export for route consumers while deriving it
// from one catalog so IDs, labels, and RPC defaults cannot drift apart.
export const EVM_CHAINS = Object.fromEntries(EVM_CHAIN_CATALOG.map((chain) => [chain.key, chain]));

const envKey = (chain) => EVM_CHAINS[chain]?.rpcEnv || `EVM_RPC_${chain.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;

export function getChain(chain) {
  const key = normalizeChainKey(chain);
  const config = EVM_CHAINS[key];
  if (!config) throw new Error(`Unsupported EVM chain: ${chain}`);
  return { ...config, key, rpc: process.env[envKey(key)] || config.rpc };
}

export function listChains() {
  return Object.entries(EVM_CHAINS).map(([key, value]) => {
    // Do not send resolved RPC URLs to browsers; expose the override variable instead.
    const { rpc: _rpc, ...publicValue } = value;
    return { key, ...publicValue };
  });
}

export async function rpcCall(chain, method, params = [], options = {}) {
  const config = getChain(chain);
  const retries = Math.max(0, Number(options.retries ?? 2));
  const timeoutMs = Math.max(1000, Number(options.timeoutMs ?? 10000));
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(config.rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
        signal: options.signal || controller.signal,
        cache: "no-store",
      });
      if (response.status === 429 || response.status >= 500) throw new Error(`RPC HTTP ${response.status}`);
      if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.error) {
        const error = new Error(payload.error.message || "RPC request failed");
        error.code = payload.error.code;
        throw error;
      }
      return payload.result;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    } finally { clearTimeout(timer); }
  }
  throw lastError || new Error("RPC request failed");
}

export const isAddress = (value) => /^0x[0-9a-fA-F]{40}$/.test(String(value || ""));
export const isTxHash = (value) => /^0x[0-9a-fA-F]{64}$/.test(String(value || ""));

function quantityToBigInt(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  return BigInt(value || "0x0");
}

export function formatUnits(value, decimals = 18) {
  const amount = quantityToBigInt(value);
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const fraction = (amount % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export async function getNativeBalance(chain, address, block = "latest") {
  if (!isAddress(address)) throw new Error("Invalid EVM address");
  const wei = await rpcCall(chain, "eth_getBalance", [address, block]);
  return { wei, formatted: formatUnits(wei), symbol: getChain(chain).nativeSymbol };
}

export async function getTokenBalance(chain, address, token, decimals = 18, block = "latest") {
  if (!isAddress(address) || !isAddress(token)) throw new Error("Invalid EVM address");
  const data = `0x70a08231${address.slice(2).padStart(64, "0")}`;
  const result = await rpcCall(chain, "eth_call", [{ to: token, data }, block]);
  return { token, address, raw: result, formatted: formatUnits(result, decimals), decimals };
}

export async function getNonce(chain, address, block = "pending") {
  if (!isAddress(address)) throw new Error("Invalid EVM address");
  const nonce = await rpcCall(chain, "eth_getTransactionCount", [address, block]);
  return { hex: nonce, nonce: Number(quantityToBigInt(nonce)) };
}

export async function getBlockNumber(chain) {
  const hex = await rpcCall(chain, "eth_blockNumber");
  return { hex, number: Number(quantityToBigInt(hex)) };
}

export async function getTransaction(chain, hash) {
  if (!isTxHash(hash)) throw new Error("Invalid transaction hash");
  const [transaction, receipt] = await Promise.all([
    rpcCall(chain, "eth_getTransactionByHash", [hash]),
    rpcCall(chain, "eth_getTransactionReceipt", [hash]),
  ]);
  return { transaction, receipt, status: receipt ? (receipt.status === "0x1" ? "success" : "failed") : "pending" };
}

export async function estimateGas(chain, transaction) {
  if (!transaction || typeof transaction !== "object") throw new Error("Transaction object is required");
  const gas = await rpcCall(chain, "eth_estimateGas", [transaction]);
  return { hex: gas, gas: quantityToBigInt(gas).toString() };
}

export async function sendRawTransaction(chain, rawTransaction) {
  if (typeof rawTransaction !== "string" || !/^0x[0-9a-fA-F]+$/.test(rawTransaction)) throw new Error("Invalid signed transaction");
  return rpcCall(chain, "eth_sendRawTransaction", [rawTransaction]);
}
