"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import CopyableAddress from "@/components/common/CopyableAddress";
import StatusBadge from "@/components/common/StatusBadge";
import { useI18n } from "@/i18n/I18nProvider";
import { chainLabel, normalizeChainKey } from "@/lib/chains/catalog";

function translatedBusinessValue(t, value) {
  switch (String(value || "").toLowerCase()) {
    case "trading":
      return t("Trading");
    case "main":
      return t("Main");
    case "operations":
      return t("Operations");
    case "test":
      return t("Test");
    case "hot":
      return t("Hot");
    case "swap":
      return t("Swap");
    case "bridge":
      return t("Bridge");
    case "transfer":
      return t("Transfer");
    case "batch swap":
      return t("Batch Swap");
    case "batch bridge":
      return t("Batch Bridge");
    case "batch transfer":
      return t("Batch Transfer");
    default:
      return value || "-";
  }
}

export default function WalletDetailPage() {
  const { id } = useParams();
  const { t, formatNumber } = useI18n();
  const [tab, setTab] = useState("overview");
  const [selectedChain, setSelectedChain] = useState("all");
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assetBalances, setAssetBalances] = useState([]);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/wallets/${id}`, { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/transactions", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/tasks", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/assets", { cache: "no-store" }).then((response) => response.json()),
    ])
      .then(([walletData, transactionData, taskData, assetData]) => {
        setWallet(walletData.wallet);
        setNameDraft(walletData.wallet?.name || "");
        setTransactions(transactionData.transactions || []);
        setTasks(taskData.tasks || []);
        setAssetBalances((assetData.tokens || []).filter((item) => item.walletId === walletData.wallet?.id));
        fetch(`/api/wallets/${id}/transactions?chain=arbitrum`, { cache: "no-store" })
          .then((response) => response.json())
          .then((data) => { if (data.transactions?.length) setTransactions((current) => [...current, ...data.transactions]); })
          .catch(() => {});
        // Do not block the detail page on RPC calls. Refresh the stored snapshot in the background.
        fetch(`/api/wallets/${id}?sync=1`, { cache: "no-store" })
          .then((response) => response.json())
          .then(async (data) => { if (data.wallet) { setWallet(data.wallet); setNameDraft(data.wallet.name || ""); } const assets = await fetch("/api/assets", { cache: "no-store" }).then((response) => response.json()); setAssetBalances((assets.tokens || []).filter((item) => item.walletId === data.wallet?.id)); })
          .catch(() => {});
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (selectedChain === "all") return;
    fetch(`/api/wallets/${id}/transactions?chain=${encodeURIComponent(selectedChain)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (data.transactions) setTransactions((current) => [...current.filter((item) => normalizeChainKey(item.chain) !== selectedChain), ...data.transactions]); })
      .catch(() => {});
  }, [id, selectedChain]);

  const saveName = async () => {
    const name = nameDraft.trim();
    if (!name || !wallet) return;
    setNameSaving(true); setNameError("");
    try {
      const response = await fetch(`/api/wallets/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Wallet name could not be updated");
      setWallet(payload.wallet); setNameDraft(payload.wallet.name); setEditingName(false);
    } catch (error) { setNameError(error instanceof Error ? error.message : "Wallet name could not be updated"); }
    finally { setNameSaving(false); }
  };

  if (!wallet) return <div className="p-6 text-sm text-gray-500">{t("Loading wallet...")}</div>;

  const tabs = [
    { value: "overview", label: t("Overview") },
    { value: "assets", label: t("Assets") },
    { value: "transactions", label: t("Transactions") },
    { value: "tasks", label: t("Tasks") },
  ];
  const chainMatches = (value) => selectedChain === "all" || normalizeChainKey(value) === selectedChain;
  const selectedAssets = assetBalances.filter((item) => chainMatches(item.chain));
  const syncedChainValues = assetBalances.reduce((values, item) => { values[normalizeChainKey(item.chain)] = (values[normalizeChainKey(item.chain)] || 0) + Number(item.value || 0); return values; }, {});
  const selectedValue = selectedChain === "all" ? (assetBalances.length ? assetBalances.reduce((sum, item) => sum + Number(item.value || 0), 0) : wallet.totalAssets) : (syncedChainValues[selectedChain] ?? Number(wallet.chains?.[selectedChain] || 0));
  const selectedNative = selectedAssets.filter((item) => item.token === "ETH").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const assetRows = selectedAssets.length
    ? selectedAssets
      .filter((item) => Number(item.value || 0) > 0.001)
      .sort((left, right) => Number(right.value || 0) - Number(left.value || 0))
      .map((item) => [
        item.token || t("Native"),
        chainLabel(item.chain),
        formatNumber(item.amount, { maximumFractionDigits: 8 }),
        `$${formatNumber(item.value, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`,
      ])
    : Object.entries(wallet.chains || {})
      .filter(([chain]) => chainMatches(chain))
      .filter(([, value]) => Number(value) > 0.001)
      .sort(([, left], [, right]) => Number(right) - Number(left))
      .map(([chain, value]) => [t("Native"), chainLabel(chain), "-", `$${formatNumber(value, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`]);
  const formatAmount = (value) => (typeof value === "number" ? formatNumber(value) : value || "-");
  const transactionRows = transactions
    .filter((transaction) => (transaction.wallet === wallet.id || transaction.walletId === wallet.id || transaction.wallet === id || transaction.walletId === id) && chainMatches(transaction.chain))
    .map((transaction) => [
      /^0x[0-9a-fA-F]{64}$/.test(String(transaction.hash || "")) ? transaction.hash : "-",
      translatedBusinessValue(t, transaction.type),
      transaction.direction === "in" ? t("Incoming") : transaction.direction === "out" ? t("Outgoing") : "-",
      `${formatAmount(transaction.amount)}${transaction.token ? ` ${transaction.token}` : ""}`,
      transaction.status || "-",
      transaction.timestamp || transaction.time || "-",
    ]);
  const taskRows = tasks
    .filter((task) => (task.items || []).some((item) => item.walletId === wallet.id || item.walletId === id) && chainMatches(task.chain || task.sourceChain))
    .map((task) => [
      `#${task.id}`,
      translatedBusinessValue(t, task.type),
      formatAmount(task.amount),
      task.status,
      task.updatedAt || task.createdAt,
    ]);
  const executionRows = transactionRows.length ? transactionRows : tasks
    .filter((task) => (task.items || []).some((item) => item.walletId === wallet.id || item.walletId === id) && chainMatches(task.chain || task.sourceChain))
    .flatMap((task) => (task.items || []).filter((item) => item.walletId === wallet.id || item.walletId === id).map((item) => [
      /^0x[0-9a-fA-F]{64}$/.test(String(item.txHash || "")) ? item.txHash : "-",
      translatedBusinessValue(t, task.type),
      "-",
      formatAmount(item.amount),
      item.status || task.status || "-",
      item.completedAt || item.updatedAt || task.updatedAt || task.createdAt || "-",
    ]));

  return (
    <div className="space-y-5 pb-10">
      <Link
        href="/wallets"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-teal-700"
      >
        &larr; {t("Back to Wallets")}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {editingName ? <input autoFocus value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveName(); if (event.key === "Escape") setEditingName(false); }} className="w-56 rounded-lg border border-teal-400 px-2 py-1 text-lg font-semibold text-gray-900 outline-none" aria-label={t("Wallet name")} /> : <h1 className="text-xl font-semibold text-gray-900">{wallet.name}</h1>}
            <StatusBadge status={wallet.status} />
            {editingName ? <><button type="button" onClick={saveName} disabled={nameSaving || !nameDraft.trim()} className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">{nameSaving ? t("Saving") : t("Save")}</button><button type="button" onClick={() => setEditingName(false)} className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600">{t("Cancel")}</button></> : <button type="button" onClick={() => { setNameDraft(wallet.name); setEditingName(true); }} className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:border-teal-400 hover:text-teal-700">{t("Rename")}</button>}
          </div>
          {nameError && <p className="mt-1 text-xs text-red-600">{t(nameError)}</p>}
          <div className="mt-1">
            <CopyableAddress address={wallet.address} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/operations/swap?wallets=${wallet.id}`}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            {t("Batch Swap")}
          </Link>
          <Link
            href={`/operations/bridge?wallets=${wallet.id}`}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            {t("Batch Bridge")}
          </Link>
        </div>
      </div>
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="text-xs uppercase tracking-wide text-gray-500">{t("Total Assets")}</div>
        <div className="mt-1 text-3xl font-semibold text-teal-600">
          $
          {formatNumber(selectedValue, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          })}
        </div>
        <div className="mt-1 text-xs text-gray-500">{t("From the latest sync")}</div>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        {Object.entries(wallet.chains || {}).map(([chain, storedValue]) => {
          const value = syncedChainValues[normalizeChainKey(chain)] ?? storedValue;
          const share = wallet.totalAssets > 0 ? Math.min(100, (value / wallet.totalAssets) * 100) : 0;
          return (
            <button type="button" key={chain} onClick={() => setSelectedChain((current) => current === normalizeChainKey(chain) ? "all" : normalizeChainKey(chain))} className={`rounded-xl border bg-white p-4 text-left transition-colors hover:border-teal-400 ${selectedChain === normalizeChainKey(chain) ? "border-teal-500 ring-1 ring-teal-200" : "border-gray-200"}`}>
              <div className="text-xs text-gray-500">{chainLabel(chain)}</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">${formatNumber(value)}</div>
              <div className="mt-2 h-1 rounded bg-teal-100">
                <div className="h-1 rounded bg-teal-500" style={{ width: `${share}%` }} />
              </div>
            </button>
          );
        })}
      </div>
      <div className="border-b border-gray-200">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((item) => (
            <button
              key={item.value}
              onClick={() => setTab(item.value)}
              className={`whitespace-nowrap border-b-2 px-1 pb-2 text-sm ${
                tab === item.value
                  ? "border-teal-600 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "overview" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label={t("Group")} value={translatedBusinessValue(t, wallet.group)} />
          <Info label={t("Native Balance")} value={`${formatNumber(selectedNative || (selectedChain === "all" ? wallet.native : 0), { maximumFractionDigits: 8 })} ETH`} />
          <Info label={t("Recent Activity")} value={wallet.lastActivity || "-"} />
          <Info label={t("Created At")} value={wallet.createdAt || "-"} />
          <Info
            label={t("Tags")}
            value={
              wallet.tags?.length
                ? wallet.tags.map((tag) => translatedBusinessValue(t, tag)).join(", ")
                : "-"
            }
          />
          <Info
            label={t("Address Status")}
            value={wallet.enabled ? t("Enabled") : t("Disabled")}
          />
        </div>
      )}
      {tab === "assets" && (
        <DataTable
          headers={[t("Asset"), t("Chain"), t("Balance"), t("USD Value")]}
          rows={assetRows}
        />
      )}
      {tab === "transactions" && (
        <DataTable
          headers={[t("Tx Hash"), t("Type"), t("Direction"), t("Amount"), t("Status"), t("Time")]}
          rows={executionRows}
          statusColumn={4}
        />
      )}
      {tab === "tasks" && (
        <DataTable
          headers={[t("Task"), t("Operation"), t("Amount"), t("Status"), t("Updated")]}
          rows={taskRows}
          statusColumn={3}
        />
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-800">{value}</div>
    </div>
  );
}

function DataTable({ headers, rows, statusColumn }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[620px] table-fixed text-sm">
        <thead className="bg-gray-50 text-left text-xs text-gray-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 py-3 ${cellIndex === 0 && headers.length === 6 ? "break-all font-mono text-xs" : ""} ${
                    cellIndex === 0 ? "font-medium text-gray-800" : "text-gray-600"
                  }`}
                >
                  {cellIndex === statusColumn ? <StatusBadge status={cell} /> : cell}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-sm text-gray-500">暂无记录</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
