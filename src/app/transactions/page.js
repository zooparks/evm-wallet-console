"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/common/StatusBadge";
import { useI18n } from "@/i18n/I18nProvider";
import { EVM_CHAIN_OPTIONS, normalizeChainKey, chainLabel } from "@/lib/chains/catalog";

const ALL_CHAINS = "__all_chains__";
const ALL_TYPES = "__all_types__";
const ALL_STATUSES = "__all_statuses__";
const TYPE_OPTIONS = ["Swap", "Bridge", "Transfer"];
const STATUS_OPTIONS = ["Success", "Pending", "Submitted", "Retrying", "Failed"];

function canonicalStatus(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "confirmed" || normalized === "success") return "Success";
  if (normalized === "submitted") return "Submitted";
  if (normalized === "retrying" || normalized === "retry") return "Retrying";
  if (normalized === "failed" || normalized === "error") return "Failed";
  return "Pending";
}

const TRANSACTIONS = [
  { hash: "0x1234...a91f", wallet: "Wallet 001", chain: "Ethereum", type: "Swap", amount: "127.43 USDC → 0.039 ETH", status: "Success", block: "19,284,112", time: "2026-08-18 10:32:11", gas: "$1.82" },
  { hash: "0x9ab2...c44e", wallet: "Wallet 002", chain: "Ethereum", type: "Swap", amount: "284.17 USDC → 0.087 ETH", status: "Success", block: "19,284,108", time: "2026-08-18 10:28:04", gas: "$1.75" },
  { hash: "0x77de...8b21", wallet: "Wallet 003", chain: "Arbitrum", type: "Bridge", amount: "96.82 USDC", status: "Pending", block: "1,943,022", time: "2026-08-18 10:21:44", gas: "$0.34" },
  { hash: "0xa21c...f019", wallet: "Wallet 005", chain: "Ethereum", type: "Swap", amount: "143.29 USDC", status: "Failed", block: "19,284,001", time: "2026-08-18 09:52:15", gas: "$0.00", error: "Insufficient native balance" },
  { hash: "0x4f20...d120", wallet: "Wallet 031", chain: "Base", type: "Transfer", amount: "500 USDT", status: "Success", block: "21,440,298", time: "2026-08-17 22:10:32", gas: "$0.08" },
];

export default function TransactionsPage() {
  const { t } = useI18n();
  const [transactions, setTransactions] = useState(TRANSACTIONS);
  const [query, setQuery] = useState("");
  const [chain, setChain] = useState(ALL_CHAINS);
  const [type, setType] = useState(ALL_TYPES);
  const [status, setStatus] = useState(ALL_STATUSES);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState(null);
  useEffect(() => { fetch("/api/transactions", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((data) => { if (data?.transactions) setTransactions(data.transactions.map((tx) => ({ ...tx, status: canonicalStatus(tx.status), error: tx.error || tx.errorMessage, errorCode: tx.errorCode, time: tx.time || tx.timestamp, hash: tx.hash || tx.id }))); }).catch(() => {}); }, []);
  const reset = () => { setQuery(""); setChain(ALL_CHAINS); setType(ALL_TYPES); setStatus(ALL_STATUSES); };
  const exportRows = () => {
    const header = "hash,wallet,chain,type,amount,status,time,gas\n";
    const csv = header + rows.map((tx) => [tx.hash, tx.wallet, chainLabel(tx.chain), tx.type, tx.amount, tx.status, tx.time, tx.gas].map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click(); URL.revokeObjectURL(url);
    setNotice({ message: "Exported {count} transaction records.", values: { count: rows.length } });
  };
  const rows = transactions.filter((tx) => {
    const q = query.toLowerCase();
    return (!q || `${tx.hash} ${tx.wallet} ${tx.amount}`.toLowerCase().includes(q)) &&
      (chain === ALL_CHAINS || normalizeChainKey(tx.chain) === normalizeChainKey(chain)) && (type === ALL_TYPES || tx.type === type) && (status === ALL_STATUSES || canonicalStatus(tx.status) === status);
  });
  return <div className="space-y-4">
    <div><h1 className="text-xl font-semibold text-gray-900">{t("Transactions")}</h1><p className="mt-1 text-sm text-gray-500">{t("On-chain transactions and confirmations")}</p></div>
    <div className="flex flex-wrap items-center gap-2">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search transaction or wallet")} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 sm:w-64" />
      <select value={chain} onChange={(e) => setChain(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value={ALL_CHAINS}>{t("All chains")}</option>{EVM_CHAIN_OPTIONS.map((option) => <option key={option} value={option}>{t(chainLabel(option))}</option>)}</select>
      <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value={ALL_TYPES}>{t("All types")}</option>{TYPE_OPTIONS.map((option) => <option key={option} value={option}>{t(option)}</option>)}</select>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value={ALL_STATUSES}>{t("All statuses")}</option>{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{t(option)}</option>)}</select>
      <div className="ml-auto flex gap-2"><button onClick={reset} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">{t("Reset")}</button><button onClick={exportRows} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">{t("Export CSV")}</button></div>
    </div>
    {notice && <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-700">{t(notice.message, notice.values)}</div>}
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3">{t("Tx hash")}</th><th className="px-4 py-3">{t("Wallet")}</th><th className="px-4 py-3">{t("Chain")}</th><th className="px-4 py-3">{t("Type")}</th><th className="px-4 py-3">{t("Amount")}</th><th className="px-4 py-3">{t("Status")}</th><th className="px-4 py-3">{t("Time")}</th></tr></thead><tbody className="divide-y divide-gray-100">{rows.map((tx) => <tr key={tx.hash || tx.id} onClick={() => setSelected(tx)} className="cursor-pointer hover:bg-gray-50"><td className="px-4 py-3 font-mono text-teal-600">{tx.hash || "-"}</td><td className="px-4 py-3 text-gray-700">{tx.wallet}</td><td className="px-4 py-3 text-gray-700">{t(chainLabel(tx.chain))}</td><td className="px-4 py-3 text-gray-700">{t(tx.type)}</td><td className="px-4 py-3 text-gray-700">{tx.amount}</td><td className="px-4 py-3"><StatusBadge status={canonicalStatus(tx.status)} /></td><td className="px-4 py-3 text-gray-500">{tx.time || "-"}</td></tr>)}{rows.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">{t("No transactions found.")}</td></tr>}</tbody></table></div>
    {selected && <div className="fixed inset-0 z-20 flex justify-end bg-gray-900/40" onClick={() => setSelected(null)}><aside className="h-full w-full max-w-md overflow-y-auto border-l border-gray-200 bg-white p-6" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-gray-900">{t("Transaction detail")}</h2><button aria-label={t("Close")} onClick={() => setSelected(null)} className="text-2xl text-gray-400">×</button></div><div className="mt-6 space-y-4 text-sm"><Detail label={t("Hash")} value={selected.hash || "-"} mono /><Detail label={t("Wallet")} value={selected.wallet} /><Detail label={t("Chain")} value={t(chainLabel(selected.chain))} /><Detail label={t("Type")} value={t(selected.type)} /><Detail label={t("Status")} value={<StatusBadge status={canonicalStatus(selected.status)} />} /><Detail label={t("Amount")} value={selected.amount} /><Detail label={t("Block")} value={selected.block || "-"} /><Detail label={t("Gas used")} value={selected.gas || "-"} /><Detail label={t("Destination tx hash")} value={selected.destinationTxHash || "-"} mono /><Detail label={t("Timestamp")} value={selected.time || "-"} />{selected.error && <div className="rounded-lg bg-red-50 p-3 text-red-700"><div className="text-xs font-semibold uppercase">{t("Error")}</div>{selected.errorCode && <div className="mt-1 font-mono text-xs">{selected.errorCode}</div>}<div className="mt-1">{t(selected.error)}</div></div>}<button onClick={() => setNotice({ message: "Explorer link copied to clipboard." })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">{t("Open explorer")} ↗</button></div></aside></div>}
  </div>;
}

function Detail({ label, value, mono }) { return <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3"><span className="text-gray-500">{label}</span><span className={`${mono ? "font-mono" : ""} text-right text-gray-900`}>{value}</span></div>; }
