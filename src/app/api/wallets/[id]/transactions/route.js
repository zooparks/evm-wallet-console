import { getWallet } from "@/lib/store";

export const dynamic = "force-dynamic";

const EXPLORER_API = { ethereum: "https://eth.blockscout.com/api/v2/addresses", arbitrum: "https://arbitrum.blockscout.com/api/v2/addresses", base: "https://base.blockscout.com/api/v2/addresses", optimism: "https://optimism.blockscout.com/api/v2/addresses", polygon: "https://polygon.blockscout.com/api/v2/addresses", linea: "https://linea.blockscout.com/api/v2/addresses", "zksync-era": "https://zksync.blockscout.com/api/v2/addresses", soneium: "https://soneium.blockscout.com/api/v2/addresses" };
const CHAIN_IDS = { ethereum: 1, arbitrum: 42161, base: 8453, optimism: 10, polygon: 137, linea: 59144, "zksync-era": 324, soneium: 1868, bsc: 56 };

async function etherscanTransactions(address, chain) {
  const apiKey = process.env.ARBISCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
  if (!apiKey) return [];
  const base = `https://api.etherscan.io/v2/api?chainid=${CHAIN_IDS[chain] || 42161}&module=account&action=txlist`;
  const response = await fetch(`${base}&address=${address}&page=1&offset=100&sort=desc&apikey=${encodeURIComponent(apiKey)}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  const payload = await response.json();
  if (payload.status !== "1" || !Array.isArray(payload.result)) return [];
  return payload.result.filter((item) => /^0x[0-9a-fA-F]{64}$/.test(item.hash)).map((item) => ({
    id: item.hash, hash: item.hash, wallet: null, chain, type: "Transfer", amount: item.value || "0",
    status: item.isError === "0" ? "Success" : "Failed", timestamp: item.timeStamp ? new Date(Number(item.timeStamp) * 1000).toISOString() : null,
    direction: String(item.from || "").toLowerCase() === address.toLowerCase() ? "out" : "in",
  }));
}

export async function GET(request, context) {
  const { id } = await context.params;
  const wallet = await getWallet(id);
  if (!wallet) return Response.json({ error: "Wallet not found" }, { status: 404 });
  const chain = new URL(request.url).searchParams.get("chain") || "arbitrum";
  const base = EXPLORER_API[chain];
  if (!base && !CHAIN_IDS[chain]) return Response.json({ transactions: [] });
  try {
    if (!base) throw new Error("Explorer API unavailable");
    const [transactionResponse, transferResponse] = await Promise.all([
      fetch(`${base}/${wallet.address}/transactions`, { cache: "no-store", signal: AbortSignal.timeout(15000) }),
      fetch(`${base}/${wallet.address}/token-transfers`, { cache: "no-store", signal: AbortSignal.timeout(15000) }),
    ]);
    if (!transactionResponse.ok) throw new Error(`Explorer HTTP ${transactionResponse.status}`);
    const payload = await transactionResponse.json();
    const transfers = transferResponse.ok ? await transferResponse.json() : { items: [] };
    const address = wallet.address.toLowerCase();
    const transactions = (payload.items || []).map((item) => ({
      id: item.hash,
      hash: item.hash,
      wallet: wallet.id,
      chain,
      type: item.transaction_types?.[0] || "Transfer",
      amount: item.value || "0",
      status: item.status === "ok" ? "Success" : item.status === "error" ? "Failed" : "Pending",
      block: item.block,
      timestamp: item.timestamp,
      direction: String(item.from?.hash || "").toLowerCase() === address ? "out" : "in",
    }));
    const tokenTransactions = (transfers.items || []).map((item) => {
      const from = String(item.from?.hash || "").toLowerCase();
      const to = String(item.to?.hash || "").toLowerCase();
      const rawAmount = item.total?.value || item.value || "0";
      const decimals = Number(item.total?.decimals ?? item.token?.decimals ?? 0);
      const amount = decimals > 0 ? (() => { const text = String(rawAmount); const padded = text.padStart(decimals + 1, "0"); return `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`.replace(/\.?(0+)$/, ""); })() : rawAmount;
      return {
        id: `${item.transaction_hash || item.tx_hash}-${item.log_index || item.index || 0}`,
        hash: item.transaction_hash || item.tx_hash,
        wallet: wallet.id,
        chain,
        type: "Token Transfer",
        amount,
        token: item.token?.symbol || item.token?.name || "Token",
        status: "Success",
        timestamp: item.timestamp,
        direction: from === address ? "out" : to === address ? "in" : "unknown",
      };
    });
    return Response.json({ transactions: [...transactions, ...tokenTransactions] });
  } catch (error) {
    try {
      const fallback = (await etherscanTransactions(wallet.address, chain)).map((item) => ({ ...item, wallet: wallet.id }));
      return Response.json({ transactions: fallback, error: fallback.length ? null : error.message }, { status: 200 });
    } catch { return Response.json({ transactions: [], error: error.message }, { status: 200 }); }
  }
}
