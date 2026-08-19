const DEFAULT_API = "https://mempool.space/api";

function apiBase() { return (process.env.BITCOIN_API_URL || DEFAULT_API).replace(/\/$/, ""); }
function assertAddress(address) { if (typeof address !== "string" || address.length < 14 || address.length > 90) throw new Error("Invalid Bitcoin address"); }
async function request(path, options = {}) {
  const retries = Math.max(0, Number(options.retries ?? 2));
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${apiBase()}${path}`, { cache: "no-store", signal: options.signal });
      if (response.status === 429 || response.status >= 500) throw new Error(`Bitcoin API HTTP ${response.status}`);
      if (!response.ok) throw new Error(`Bitcoin API HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") || "";
      return contentType.includes("json") ? response.json() : response.text();
    } catch (error) { lastError = error; if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt)); }
  }
  throw lastError || new Error("Bitcoin API request failed");
}
export async function getTipHeight() { return { height: Number(await request("/blocks/tip/height")) }; }
export async function getAddress(address) { assertAddress(address); const data = await request(`/address/${encodeURIComponent(address)}`); const chain = data.chain_stats || {}; const mempool = data.mempool_stats || {}; return { address, confirmed: chain.funded_txo_sum - chain.spent_txo_sum, unconfirmed: mempool.funded_txo_sum - mempool.spent_txo_sum, txCount: chain.tx_count }; }
export async function getUtxos(address) { assertAddress(address); return { address, utxos: await request(`/address/${encodeURIComponent(address)}/utxo`) }; }
export async function getTransaction(txid) { if (typeof txid !== "string" || !/^[a-fA-F0-9]{64}$/.test(txid)) throw new Error("Invalid Bitcoin transaction id"); return { txid, transaction: await request(`/tx/${txid}`) }; }
export async function broadcast(rawTx) { if (typeof rawTx !== "string" || !/^[a-fA-F0-9]+$/.test(rawTx)) throw new Error("Invalid raw Bitcoin transaction"); const response = await fetch(`${apiBase()}/tx`, { method: "POST", headers: { "content-type": "text/plain" }, body: rawTx, cache: "no-store" }); if (!response.ok) throw new Error(`Bitcoin API HTTP ${response.status}`); return { txid: await response.text() }; }
export const bitcoin = { chain: "bitcoin", nativeSymbol: "BTC", getTipHeight, getAddress, getUtxos, getTransaction, broadcast };
