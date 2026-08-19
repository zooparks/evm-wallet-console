import { getChain } from "../chains/evm.js";
import { isAddress } from "../chains/evm.js";
import { ZERO_ADDRESS, getExecutionConfig } from "./config.js";

const tokenCache = new Map();

function chainId(value) {
  return getChain(value).id;
}

function addressOrThrow(value, label) {
  if (!isAddress(value)) throw new Error(`${label} returned an invalid EVM address`);
  return value;
}

function quantity(value, label) {
  try {
    if (value == null || value === "") return 0n;
    const parsed = typeof value === "bigint" ? value : BigInt(String(value));
    if (parsed < 0n) throw new Error(`${label} cannot be negative`);
    return parsed;
  } catch (error) {
    if (error.message?.includes("cannot be negative")) throw error;
    throw new Error(`${label} is not a valid integer`);
  }
}

/**
 * Validate the spend boundary of a provider-generated transaction before it
 * reaches the signer.  Li.Fi calldata is intentionally opaque, but the
 * native value and sender are observable and must match the requested spend.
 * ERC-20 routes must not smuggle an unrelated native transfer in `value`.
 */
export function validateQuoteTransaction({ transactionRequest, fromAddress, fromAsset, rawAmount, chain, estimate } = {}) {
  const tx = transactionRequest || {};
  const txTo = addressOrThrow(tx.to, "Li.Fi transaction");
  if (txTo.toLowerCase() === String(fromAddress || "").toLowerCase()) throw new Error("Li.Fi transaction recipient cannot be the signer");
  if (tx.from && String(tx.from).toLowerCase() !== String(fromAddress || "").toLowerCase()) throw new Error("Li.Fi quote signer mismatch");
  if (chain != null && Number(tx.chainId || chainId(chain)) !== chainId(chain)) throw new Error("Li.Fi quote chain mismatch");
  if (typeof tx.data !== "string" || !/^0x[0-9a-fA-F]+$/.test(tx.data)) throw new Error("Li.Fi quote returned invalid calldata");
  const value = quantity(tx.value, "Li.Fi transaction value");
  const requested = quantity(rawAmount, "Requested amount");
  const sourceChainId = chain == null ? null : chainId(chain);
  const nativeFees = (estimate?.feeCosts || []).reduce((sum, fee) => {
    const token = fee?.token || {};
    const tokenChain = Number(token.chainId || sourceChainId || 0);
    const tokenAddress = String(token.address || "").toLowerCase();
    if (fee?.included === false && sourceChainId != null && tokenChain === sourceChainId && (tokenAddress === ZERO_ADDRESS || tokenAddress === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")) {
      return sum + quantity(fee.amount, "Li.Fi native fee");
    }
    return sum;
  }, 0n);
  const expectedValue = (fromAsset?.isNative ? requested : 0n) + nativeFees;
  // Provider fees are allowed only when explicitly present in the quote and
  // denominated in the source-chain native token. Gas is paid separately.
  if (value !== expectedValue) throw new Error("Li.Fi transaction value exceeds the requested amount and quoted native fees");
  return { ...tx, to: txTo, value };
}

async function request(path, params = {}, options = {}) {
  const config = getExecutionConfig();
  const url = new URL(`${config.lifiBaseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`);
  Object.entries(params).forEach(([key, value]) => { if (value != null && value !== "") url.searchParams.set(key, String(value)); });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || config.lifiRequestTimeoutMs);
  try {
    const headers = { accept: "application/json", "x-integrator": config.lifiIntegrator };
    if (config.lifiApiKey) headers["x-lifi-api-key"] = config.lifiApiKey;
    const response = await fetch(url, { headers, signal: options.signal || controller.signal, cache: "no-store" });
    const body = await response.text();
    let payload = null;
    try { payload = body ? JSON.parse(body) : null; } catch { payload = { message: body }; }
    if (!response.ok) {
      const error = new Error(payload?.message || payload?.error || `Li.Fi HTTP ${response.status}`);
      error.code = `LIFI_HTTP_${response.status}`;
      error.retryable = response.status >= 500 || response.status === 429;
      throw error;
    }
    return payload;
  } finally { clearTimeout(timer); }
}

function isNativeSymbol(chain, token) {
  const symbol = String(token || "").trim().toUpperCase();
  const config = getChain(chain);
  const aliases = {
    bsc: ["BNB", "ETH"],
    polygon: ["POL", "MATIC", "ETH"],
    ethereum: ["ETH"],
    arbitrum: ["ETH"],
    linea: ["ETH"],
    base: ["ETH"],
    optimism: ["ETH"],
    "zksync-era": ["ETH"],
    soneium: ["ETH"],
  };
  return (aliases[config.key] || [config.nativeSymbol]).includes(symbol);
}

export async function resolveToken(chain, token) {
  const config = getChain(chain);
  const value = String(token || "").trim();
  if (!value) throw new Error("Token is required");
  const cacheKey = `${config.id}:${value.toLowerCase()}`;
  if (tokenCache.has(cacheKey)) return tokenCache.get(cacheKey);
  if (isNativeSymbol(chain, value)) {
    const native = { address: ZERO_ADDRESS, chainId: config.id, symbol: config.nativeSymbol, name: config.name, decimals: 18, isNative: true };
    tokenCache.set(cacheKey, native);
    return native;
  }
  const tokenResponse = await request("token", { chain: config.id, token: value });
  const resolved = { ...tokenResponse, address: addressOrThrow(tokenResponse?.address, "Li.Fi token"), chainId: Number(tokenResponse.chainId || config.id), decimals: Number(tokenResponse.decimals), isNative: false };
  if (resolved.chainId !== config.id || !Number.isInteger(resolved.decimals) || resolved.decimals < 0 || resolved.decimals > 36) throw new Error("Li.Fi returned an invalid token definition");
  tokenCache.set(cacheKey, resolved);
  return resolved;
}

export async function getQuote(params) {
  const payload = await request("quote", {
    fromChain: chainId(params.fromChain),
    toChain: chainId(params.toChain),
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    toAddress: params.toAddress || params.fromAddress,
    slippage: Number(params.slippage ?? 0.005),
    integrator: getExecutionConfig().lifiIntegrator,
    order: params.order || "RECOMMENDED",
  });
  if (!payload?.transactionRequest?.to || !payload.transactionRequest.data) throw new Error("Li.Fi quote did not include an executable transaction");
  const tx = payload.transactionRequest;
  if (Number(tx.chainId || chainId(params.fromChain)) !== chainId(params.fromChain)) throw new Error("Li.Fi quote chain mismatch");
  if (params.fromAsset || params.rawAmount != null) {
    validateQuoteTransaction({ transactionRequest: tx, fromAddress: params.fromAddress, fromAsset: params.fromAsset, rawAmount: params.rawAmount, chain: params.fromChain, estimate: payload.estimate });
  } else {
    addressOrThrow(tx.to, "Li.Fi transaction");
    if (tx.from && String(tx.from).toLowerCase() !== String(params.fromAddress).toLowerCase()) throw new Error("Li.Fi quote signer mismatch");
    if (typeof tx.data !== "string" || !/^0x[0-9a-fA-F]+$/.test(tx.data)) throw new Error("Li.Fi quote returned invalid calldata");
  }
  return payload;
}

/** Fetch one bridge status snapshot without waiting. */
export async function getStatus(params) {
  return request("status", {
    txHash: params.txHash,
    bridge: params.bridge,
    fromChain: chainId(params.fromChain),
    toChain: chainId(params.toChain),
  }, { signal: params.signal });
}

export async function waitForStatus(params) {
  const config = getExecutionConfig();
  const deadline = Date.now() + (params.timeoutMs || config.bridgeTimeoutMs);
  let last;
  while (Date.now() < deadline) {
    last = await getStatus(params);
    const status = String(last?.status || last?.substatus || "").toUpperCase();
    if (["DONE", "FAILED", "INVALID", "NOT_FOUND"].includes(status)) return last;
    await new Promise((resolve) => setTimeout(resolve, Math.min(15000, Math.max(1000, Number(params.intervalMs || 5000)))));
  }
  const error = new Error("Bridge status polling timed out");
  error.code = "BRIDGE_TIMEOUT";
  error.retryable = true;
  error.lastStatus = last;
  throw error;
}

export const lifi = { resolveToken, getQuote, getStatus, waitForStatus };
