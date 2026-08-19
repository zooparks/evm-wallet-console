import { EVM_CHAIN_CATALOG } from "@/lib/chains/catalog";
import { getNativeBalance, getTokenBalance, rpcCall } from "@/lib/chains/evm";
import { json, parseJson, query } from "@/lib/db";

const PRICE_IDS = { ETH: "ethereum", BNB: "binancecoin", POL: "polygon-ecosystem-token", ARB: "arbitrum", USDC: "usd-coin", USDT: "tether" };
const TOKEN_CATALOG = {
  arbitrum: [
    { symbol: "USDC", name: "USD Coin", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, priceId: "usd-coin" },
    { symbol: "USDT", name: "Tether USD", address: "0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9", decimals: 6, priceId: "tether" },
    { symbol: "ARB", name: "Arbitrum", address: "0x912CE59144191C1204E64559FE8253a0e49E6548", decimals: 18, priceId: "arbitrum" },
  ],
};
const CHAINLINK_FEEDS = { ETH: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", BNB: "0x14e613AC84a31f709eadbdf89C6CC390fDc9540A", POL: "0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676" };

async function getChainlinkPrices() {
  const entries = await Promise.all(Object.entries(CHAINLINK_FEEDS).map(async ([symbol, address]) => {
    const result = await rpcCall("ethereum", "eth_call", [{ to: address, data: "0xfeaf968c" }, "latest"]);
    // latestRoundData returns the signed price in its second 32-byte ABI word.
    const answer = BigInt(`0x${result.slice(2 + 64, 2 + 128)}`);
    return [symbol, { usd: Number(answer) / 1e8, change: 0 }];
  }));
  return Object.fromEntries(entries);
}

async function getNativePrices() {
  const ids = [...new Set(EVM_CHAIN_CATALOG.map((chain) => PRICE_IDS[chain.nativeSymbol]).filter(Boolean))];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`Price API HTTP ${response.status}`);
    const payload = await response.json();
    return Object.fromEntries(Object.entries(PRICE_IDS).map(([symbol, id]) => [symbol, { usd: Number(payload[id]?.usd || 0), change: Number(payload[id]?.usd_24h_change || 0) }]));
  } catch {
    // Chainlink is the fallback when the application host cannot reach the public price API.
    return getChainlinkPrices();
  } finally { clearTimeout(timer); }
}

async function ensureNativeToken(chain) {
  // Native assets use an empty contract address, matching the schema's unique key.
  await query("INSERT INTO chains (chain_key,chain_id,name,native_symbol,rpc_url,enabled) VALUES (?,?,?,?,?,1) ON DUPLICATE KEY UPDATE name=VALUES(name),native_symbol=VALUES(native_symbol),enabled=1", [chain.key, chain.id, chain.name, chain.nativeSymbol, chain.rpc]);
  await query("INSERT INTO tokens (chain_key,contract_address,symbol,name,decimals,is_native) VALUES (?,'',?,?,18,1) ON DUPLICATE KEY UPDATE symbol=VALUES(symbol),name=VALUES(name),is_native=1", [chain.key, chain.nativeSymbol, `${chain.name} native asset`]);
  return (await query("SELECT id FROM tokens WHERE chain_key=? AND contract_address=''", [chain.key]))[0].id;
}

async function ensureToken(chain, token) {
  await query("INSERT INTO tokens (chain_key,contract_address,symbol,name,decimals,is_native) VALUES (?,?,?,?,?,0) ON DUPLICATE KEY UPDATE symbol=VALUES(symbol),name=VALUES(name),decimals=VALUES(decimals),is_native=0", [chain.key, token.address.toLowerCase(), token.symbol, token.name, token.decimals]);
  return (await query("SELECT id FROM tokens WHERE chain_key=? AND contract_address=?", [chain.key, token.address.toLowerCase()]))[0].id;
}

async function saveBalance(wallet, chain, tokenId, balance, symbol, price, change, contract = "") {
  const amount = Number(balance.formatted);
  const usdValue = amount * price;
  await query("INSERT INTO wallet_balances (wallet_id,chain_key,token_id,raw_amount,amount,usd_value,synced_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE raw_amount=VALUES(raw_amount),amount=VALUES(amount),usd_value=VALUES(usd_value),synced_at=CURRENT_TIMESTAMP", [wallet.id, chain.key, tokenId, balance.raw || balance.wei, amount, usdValue]);
  if (price > 0) await query("INSERT INTO token_prices (token_id,price_usd,source) VALUES (?,?,?)", [tokenId, price, "coingecko"]);
  return { chain: chain.key, token: symbol, amount, price, usdValue, change, contract, status: "synced" };
}

export async function syncWalletAssets(wallet) {
  const prices = await getNativePrices().catch(() => ({}));
  const results = [];

  // Different networks are independent, so query them concurrently to keep refresh latency bounded.
  await Promise.all(EVM_CHAIN_CATALOG.map(async (chain) => {
    try {
      const [tokenId, balance] = await Promise.all([ensureNativeToken(chain), getNativeBalance(chain.key, wallet.address)]);
      const price = prices[chain.nativeSymbol]?.usd || 0;
      results.push(await saveBalance(wallet, chain, tokenId, balance, chain.nativeSymbol, price, prices[chain.nativeSymbol]?.change || 0));
      for (const token of TOKEN_CATALOG[chain.key] || []) {
        try {
          const tokenId = await ensureToken(chain, token);
          const balance = await getTokenBalance(chain.key, wallet.address, token.address, token.decimals);
          const tokenPrice = prices[token.symbol]?.usd || (["USDC", "USDT"].includes(token.symbol) ? 1 : 0);
          results.push(await saveBalance(wallet, chain, tokenId, balance, token.symbol, tokenPrice, prices[token.symbol]?.change || 0, token.address));
        } catch (error) { results.push({ chain: chain.key, token: token.symbol, status: "failed", error: error.message }); }
      }
    } catch (error) { results.push({ chain: chain.key, token: chain.nativeSymbol, status: "failed", error: error.message }); }
  }));

  const successful = results.filter((item) => item.status === "synced");
  const chains = Object.fromEntries(successful.map((item) => [item.chain, item.usdValue]));
  const totalAssets = successful.reduce((sum, item) => sum + item.usdValue, 0);
  // Keep the wallet-level native balance useful for the list view. ETH is
  // native on several EVM networks, so sum only those ETH chains and leave
  // unrelated native assets such as BNB/POL out of this field.
  const nativeBalance = successful
    .filter((item) => item.token === "ETH")
    .reduce((sum, item) => sum + item.amount, 0);
  const metadata = parseJson((await query("SELECT metadata FROM wallets WHERE id=?", [wallet.id]))?.[0]?.metadata, {});
  await query("UPDATE wallets SET total_assets=?,native_balance=?,last_sync_at=CURRENT_TIMESTAMP,metadata=? WHERE id=?", [totalAssets, nativeBalance, json({ ...metadata, chains }), wallet.id]);
  return { walletId: wallet.id, totalAssets, native: nativeBalance, chains, results, syncedAt: new Date().toISOString() };
}

export async function syncAllWalletAssets() {
  const rows = await query("SELECT id,address FROM wallets WHERE enabled=1 ORDER BY created_at");
  const wallets = rows || [];
  const synced = await Promise.all(wallets.map(syncWalletAssets));
  return { wallets: synced, syncedAt: new Date().toISOString() };
}

export async function listAssetBalances() {
  const rows = await query("SELECT wb.wallet_id,wb.chain_key,t.symbol,t.contract_address,wb.amount,wb.usd_value,wb.synced_at,(SELECT tp.price_usd FROM token_prices tp WHERE tp.token_id=t.id ORDER BY tp.captured_at DESC LIMIT 1) price_usd FROM wallet_balances wb JOIN tokens t ON t.id=wb.token_id ORDER BY wb.usd_value DESC");
  return (rows || []).map((row) => ({ walletId: row.wallet_id, token: row.symbol, chain: row.chain_key, contract: row.contract_address || "Native", amount: Number(row.amount || 0), value: Number(row.usd_value || 0), price: Number(row.price_usd || 0), syncedAt: row.synced_at }));
}
