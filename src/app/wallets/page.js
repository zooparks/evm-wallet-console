"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/common/StatusBadge";
import CopyableAddress from "@/components/common/CopyableAddress";
import Select from "@/components/common/Select";
import { CHAIN_OPTIONS, chainMatches } from "@/components/common/chainOptions";
import { useI18n } from "@/i18n/I18nProvider";

const ALL_FILTER = "all";
const TAG_STYLES = { hot: "bg-amber-50 text-amber-700", test: "bg-gray-100 text-gray-500" };

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
    default:
      return value || "-";
  }
}

export default function WalletsPage() {
  const router = useRouter();
  const { t, formatNumber } = useI18n();
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState(ALL_FILTER);
  const [chain, setChain] = useState(ALL_FILTER);
  const [asset, setAsset] = useState(ALL_FILTER);
  const [status, setStatus] = useState(ALL_FILTER);
  const [notice, setNotice] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    fetch("/api/wallets", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setWallets(data.wallets || []))
      .catch(() => setNotice({ type: "load-error" }));
  }, []);

  const filtered = useMemo(
    () =>
      wallets.filter((wallet) => {
        const normalizedQuery = query.trim().toLowerCase();
        const matchesQuery =
          !normalizedQuery ||
          wallet.name.toLowerCase().includes(normalizedQuery) ||
          wallet.address.toLowerCase().includes(normalizedQuery);
        const matchesGroup = group === ALL_FILTER || wallet.group === group;
        // API stores canonical chain keys; compare them with the visible short code.
        const matchesChain =
          chain === ALL_FILTER ||
          Object.keys(wallet.chains || {}).some((key) => chainMatches(key, chain));
        const matchesAsset =
          asset === ALL_FILTER || (asset === "ETH" ? wallet.native > 0 : wallet.totalAssets > 0);
        const matchesStatus = status === ALL_FILTER || wallet.status === status;
        return matchesQuery && matchesGroup && matchesChain && matchesAsset && matchesStatus;
      }),
    [asset, chain, group, query, status, wallets]
  );

  const visibleIds = filtered.map((wallet) => wallet.id);
  const allChecked =
    visibleIds.length > 0 && visibleIds.every((walletId) => selected.includes(walletId));
  const toggleAll = () =>
    setSelected((previous) =>
      allChecked
        ? previous.filter((walletId) => !visibleIds.includes(walletId))
        : [...new Set([...previous, ...visibleIds])]
    );
  const toggleOne = (walletId) =>
    setSelected((previous) =>
      previous.includes(walletId)
        ? previous.filter((selectedId) => selectedId !== walletId)
        : [...previous, walletId]
    );
  const clearFilters = () => {
    setQuery("");
    setGroup(ALL_FILTER);
    setChain(ALL_FILTER);
    setAsset(ALL_FILTER);
    setStatus(ALL_FILTER);
  };
  const saveName = async (wallet) => {
    const name = nameDraft.trim();
    if (!name || name === wallet.name) { setEditingId(null); return; }
    setSavingId(wallet.id);
    try {
      const response = await fetch(`/api/wallets/${wallet.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Wallet name could not be updated");
      setWallets((current) => current.map((item) => item.id === wallet.id ? payload.wallet : item));
      setEditingId(null);
    } catch (error) { setNotice({ type: "rename-error", message: error instanceof Error ? error.message : "Wallet name could not be updated" }); }
    finally { setSavingId(null); }
  };

  const groupOptions = [
    { value: ALL_FILTER, label: t("All groups") },
    { value: "Trading", label: t("Trading") },
    { value: "Main", label: t("Main") },
    { value: "Operations", label: t("Operations") },
    { value: "Test", label: t("Test") },
  ];
  const chainOptions = [
    { value: ALL_FILTER, label: t("All chains") },
    ...CHAIN_OPTIONS.map((option) => ({ value: option, label: t(option) })),
  ];
  const assetOptions = [
    { value: ALL_FILTER, label: t("All assets") },
    ...["ETH", "USDC", "USDT"].map((option) => ({ value: option, label: t(option) })),
  ];
  const statusOptions = [
    { value: ALL_FILTER, label: t("All statuses") },
    { value: "Active", label: t("Active") },
    { value: "Inactive", label: t("Inactive") },
  ];

  const noticeText =
    notice?.type === "import"
      ? t("{file} selected. Import will be processed in the background.", { file: notice.file })
      : notice?.type === "add-wallet"
        ? t("Add Wallet is ready. Import a private key or connect a hardware wallet.")
        : notice?.type === "load-error"
          ? t("Wallets failed to load.")
          : notice?.type === "rename-error"
            ? t(notice.message)
          : "";

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            placeholder={t("Search address or name...")}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-3 text-sm outline-none focus:border-teal-500"
          />
        </div>
        <Select options={groupOptions} value={group} onChange={setGroup} className="w-full sm:w-40" />
        <Select options={chainOptions} value={chain} onChange={setChain} className="w-full sm:w-36" />
        <Select options={assetOptions} value={asset} onChange={setAsset} className="w-full sm:w-36" />
        <Select options={statusOptions} value={status} onChange={setStatus} className="w-full sm:w-36" />
        <button
          onClick={clearFilters}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          {t("Reset")}
        </button>
        <div className="flex flex-1 flex-wrap justify-end gap-2">
          <label className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            {t("Import CSV")}
            <input
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setNotice({ type: "import", file: file.name });
              }}
            />
          </label>
          <button
            onClick={() => setNotice({ type: "add-wallet" })}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            + {t("Add Wallet")}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{t("Showing {count} wallets", { count: formatNumber(filtered.length) })}</span>
        <span>{t("Selected {count}", { count: formatNumber(selected.length) })}</span>
      </div>
      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-800"
        >
          <span>{noticeText}</span>
          <button onClick={() => setNotice(null)} className="text-teal-700 hover:underline">
            {t("Close")}
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label={t("Select all visible wallets")}
                  className="h-4 w-4 accent-teal-600"
                  checked={allChecked}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3">{t("Name")}</th>
              <th className="px-4 py-3">{t("Address")}</th>
              <th className="px-4 py-3">{t("Group / Tags")}</th>
              <th className="px-4 py-3">{t("Total Assets")}</th>
              <th className="px-4 py-3">{t("Native Balance")}</th>
              <th className="px-4 py-3">{t("Last Synced")}</th>
              <th className="px-4 py-3">{t("Status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((wallet) => {
              const checked = selected.includes(wallet.id);
              return (
                <tr
                  key={wallet.id}
                  onClick={() => router.push(`/wallets/${wallet.address}`)}
                  className={`cursor-pointer ${checked ? "bg-teal-50/40" : "hover:bg-gray-50"}`}
                >
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={t("Select wallet {name}", { name: wallet.name })}
                      className="h-4 w-4 accent-teal-600"
                      checked={checked}
                      onChange={() => toggleOne(wallet.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900" onClick={(event) => event.stopPropagation()}>
                    {editingId === wallet.id ? <input autoFocus value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveName(wallet); if (event.key === "Escape") setEditingId(null); }} onBlur={() => saveName(wallet)} disabled={savingId === wallet.id} className="w-44 rounded-md border border-teal-400 px-2 py-1 text-sm outline-none" aria-label={t("Wallet name")} /> : <div className="flex items-center gap-2"><button type="button" onClick={() => router.push(`/wallets/${wallet.address}`)} className="text-left hover:text-teal-700 hover:underline">{wallet.name}</button><button type="button" onClick={(event) => { event.stopPropagation(); setEditingId(wallet.id); setNameDraft(wallet.name); }} className="inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-teal-50 hover:text-teal-700" title={t("Rename")} aria-label={t("Rename")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg></button></div>}
                  </td>
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <CopyableAddress address={wallet.address} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                      {translatedBusinessValue(t, wallet.group)}
                    </span>
                    <div className="mt-1 flex gap-1">
                      {(wallet.tags || []).map((tag) => (
                        <span
                          key={tag}
                          className={`rounded px-1.5 py-0.5 text-[10px] ${TAG_STYLES[tag] || "bg-gray-100 text-gray-500"}`}
                        >
                          {translatedBusinessValue(t, tag)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-teal-600">
                    ${formatNumber(wallet.totalAssets)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatNumber(wallet.native, { maximumFractionDigits: 8 })} ETH</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{wallet.lastActivity || "-"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={wallet.status} />
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-500">
                  {t("No wallets match your filters.")}
                  <br />
                  <button onClick={clearFilters} className="mt-2 text-teal-600 hover:underline">
                    {t("Clear filters")}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex justify-between border-t border-gray-100 bg-gray-50/60 px-4 py-3 text-xs text-gray-500">
          <span>
            {t("Page {page} of {total}", {
              page: formatNumber(1),
              total: formatNumber(Math.max(1, Math.ceil(filtered.length / 10))),
            })}
          </span>
          <span>{t("Last synced: Just now")}</span>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="fixed bottom-5 left-64 right-5 z-10 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xl">
          <span className="text-sm text-gray-700">
            {t("{count} wallets selected", { count: formatNumber(selected.length) })}
          </span>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/operations/swap?wallets=${selected.join(",")}`}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              {t("Batch Swap")}
            </Link>
            <Link
              href={`/operations/bridge?wallets=${selected.join(",")}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              {t("Batch Bridge")}
            </Link>
            <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
              {t("Batch Transfer")}
            </button>
            <button onClick={() => setSelected([])} className="px-3 py-1.5 text-sm text-gray-500">
              {t("Clear")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
