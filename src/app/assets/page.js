"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { EVM_CHAIN_CATALOG, normalizeChainKey, chainLabel } from "@/lib/chains/catalog";

const chains = EVM_CHAIN_CATALOG;
const tokens = [];
const ASSET_TABS = [
  { value: "overview", label: "Overview" },
  { value: "chains", label: "Chains" },
  { value: "tokens", label: "Tokens" },
];
const GROUP_OPTIONS = ["Trading", "Main", "Operations", "Test"];

async function fetchAssets() {
  const response = await fetch("/api/assets", { cache: "no-store" });
  if (!response.ok) throw new Error("Asset data could not be loaded");
  return response.json();
}

export default function AssetsPage() {
  const { t, formatNumber } = useI18n();
  const [assetData, setAssetData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [chain, setChain] = useState("all");
  const [token, setToken] = useState("all");
  const [group, setGroup] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [syncError, setSyncError] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetchAssets()
      .then((data) => { if (!cancelled) setAssetData(data); })
      .catch((error) => { if (!cancelled) setSyncError(error instanceof Error ? error.message : "Asset data could not be loaded"); });
    return () => { cancelled = true; };
  }, []);
  const refreshAssets = async () => {
    setRefreshing(true); setSyncError("");
    try { const response = await fetch("/api/assets", { method: "POST" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Asset balances could not be synchronized"); setAssetData(await fetchAssets()); }
    catch (error) { setSyncError(error instanceof Error ? error.message : "Asset balances could not be synchronized"); } finally { setRefreshing(false); }
  };
  const displayChains = useMemo(() => (assetData?.byChain ? Object.entries(assetData.byChain).map(([name, value]) => ({ name: chainLabel(name), symbol: name, value, wallets: assetData.wallets?.filter((wallet) => Object.keys(wallet.chains || {}).some((key) => normalizeChainKey(key) === normalizeChainKey(name))).length || 0, status: "synced" })) : chains.map((item) => ({ ...item, name: item.label, symbol: item.code, value: 0, wallets: 0, status: "pending" }))), [assetData]);
  const visibleTokens = useMemo(() => (assetData?.tokens || tokens).filter((item) => {
    const matchesChain = chain === "all" || normalizeChainKey(item.chain) === chain;
    const matchesToken = token === "all" || item.token === token;
    const walletGroup = assetData?.wallets?.find((wallet) => wallet.id === item.walletId)?.group;
    const matchesGroup = group === "all" || walletGroup === group;
    return matchesChain && matchesToken && matchesGroup;
  }), [assetData, chain, token, group]);
  const tokenOptions = useMemo(() => [...new Set((assetData?.tokens || tokens).map((item) => item.token))], [assetData]);
  const totalVisible = visibleTokens.reduce((sum, item) => sum + item.value, 0);
  const money = (value) => `$${formatNumber(value, { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t("Asset overview")}</h2>
          <p className="mt-1 text-sm text-gray-500">{t("Multi-chain balances, token valuations, and sync status")}</p>
        </div>
        <button disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50" onClick={refreshAssets}>
          <span aria-hidden="true">↻</span> {refreshing ? t("Syncing on-chain balances...") : t("Refresh balances")}
        </button>
      </div>
      {syncError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{t(syncError)}</div>}

      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {ASSET_TABS.map((item) => (
          <button key={item.value} onClick={() => setTab(item.value)} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === item.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>{t(item.label)}</button>
        ))}
      </div>

      {tab !== "tokens" && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayChains.map((item) => (
            <div key={item.name} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between"><div><div className="text-sm font-semibold text-gray-900">{t(item.name)}</div><div className="mt-1 text-xs text-gray-400">{t("{count} wallets", { count: formatNumber(item.wallets) })}</div></div><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${item.status === "synced" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{t(item.status === "synced" ? "Synced" : "Pending")}</span></div>
              <div className="mt-5 text-2xl font-semibold text-teal-700">{money(item.value)}</div>
              <div className="mt-3 h-1.5 rounded-full bg-gray-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, item.value / 5203)}%` }} /></div>
            </div>
          ))}
        </section>
      )}

      {tab !== "chains" && (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4"><div><h3 className="font-semibold text-gray-900">{t("Token balances")}</h3><p className="mt-1 text-xs text-gray-500">{t("Showing {amount} across matching balances", { amount: money(totalVisible) })}</p></div><div className="flex flex-wrap gap-2"><select value={chain} onChange={(e) => setChain(e.target.value)} aria-label={t("Filter by chain")} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"><option value="all">{t("All chains")}</option>{chains.map((item) => <option key={item.key} value={item.key}>{t(item.label)}</option>)}</select><select value={token} onChange={(e) => setToken(e.target.value)} aria-label={t("Filter by token")} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"><option value="all">{t("All tokens")}</option>{tokenOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={group} onChange={(e) => setGroup(e.target.value)} aria-label={t("Filter by wallet group")} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"><option value="all">{t("All groups")}</option>{GROUP_OPTIONS.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-5 py-3">{t("Token")}</th><th className="px-5 py-3">{t("Chain")}</th><th className="px-5 py-3">{t("Contract")}</th><th className="px-5 py-3 text-right">{t("Balance")}</th><th className="px-5 py-3 text-right">{t("USD value")}</th><th className="px-5 py-3 text-right">{t("24h")}</th></tr></thead><tbody className="divide-y divide-gray-100">{visibleTokens.map((item) => { const change = Number(item.change || 0); return <tr key={`${item.chain}-${item.token}`} className="hover:bg-gray-50"><td className="px-5 py-3 font-semibold text-gray-900">{item.token}</td><td className="px-5 py-3 text-gray-600">{t(chainLabel(item.chain))}</td><td className="px-5 py-3 font-mono text-xs text-gray-500">{t(item.contract)}</td><td className="px-5 py-3 text-right text-gray-700">{formatNumber(item.amount, { maximumFractionDigits: 8 })}</td><td className="px-5 py-3 text-right font-medium text-gray-900">{money(item.value)}</td><td className={`px-5 py-3 text-right font-medium ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}>{change >= 0 ? "+" : ""}{formatNumber(change, { maximumFractionDigits: 2 })}%</td></tr>; })}</tbody></table></div>
        </section>
      )}
    </div>
  );
}
