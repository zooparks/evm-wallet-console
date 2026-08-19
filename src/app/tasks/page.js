"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import Select from "@/components/common/Select";
import { useI18n } from "@/i18n/I18nProvider";
import { EVM_CHAIN_OPTIONS, normalizeChainKey, chainLabel } from "@/lib/chains/catalog";

const TABS = ["All", "Scheduled", "Running", "Submitted", "Retrying", "Paused", "Success", "Failed"];
const ALL_TYPES = "__all_types__";
const ALL_CHAINS = "__all_chains__";
const TYPE_OPTIONS = ["Swap", "Bridge", "Transfer"];
const DATE_OPTIONS = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
];

const STATUS_PRIORITY = ["Failed", "Submitted", "Retrying", "Running", "Scheduled", "Success", "Cancelled"];

function effectiveTaskStatus(task) {
  const itemStatuses = (task.items || []).map((item) => String(item.status || "").toLowerCase());
  for (const status of STATUS_PRIORITY) {
    if (itemStatuses.includes(status.toLowerCase())) return status;
  }
  return task.status || "Scheduled";
}

function hasTaskStatus(task, status) {
  const target = String(status).toLowerCase();
  if (String(effectiveTaskStatus(task)).toLowerCase() === target) return true;
  return (task.items || []).some((item) => String(item.status || "").toLowerCase() === target)
    || Number(task.counts?.[target] || 0) > 0;
}

function withinDateRange(task, range) {
  if (range === "all") return true;
  const createdAt = new Date(task.createdAt || task.created_at || 0);
  if (Number.isNaN(createdAt.getTime())) return false;
  const now = new Date();
  const start = new Date(now);
  if (range === "today") start.setHours(0, 0, 0, 0);
  else if (range === "last_7_days") start.setDate(start.getDate() - 7);
  else if (range === "last_30_days") start.setDate(start.getDate() - 30);
  return createdAt >= start;
}

export default function TasksPage() {
  const { t } = useI18n();
  const [liveTasks, setLiveTasks] = useState([]);
  useEffect(() => { fetch("/api/tasks", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((data) => setLiveTasks(data?.tasks || [])).catch(() => {}); }, []);
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [type, setType] = useState(ALL_TYPES);
  const [chain, setChain] = useState(ALL_CHAINS);
  const [dateRange, setDateRange] = useState("all");
  const [notice, setNotice] = useState(null);
  const filtered = liveTasks.filter((task) => {
    const matchesTab = tab === "All" || hasTaskStatus(task, tab);
    const matchesQuery = !query || `${task.id} ${task.type} ${task.pair}`.toLowerCase().includes(query.toLowerCase());
    const matchesType = type === ALL_TYPES || String(task.type).toLowerCase() === type.toLowerCase();
    const matchesChain = chain === ALL_CHAINS || normalizeChainKey(task.chain) === normalizeChainKey(chain);
    const matchesDate = withinDateRange(task, dateRange);
    return matchesTab && matchesQuery && matchesType && matchesChain && matchesDate;
  });

  const countOf = (tabValue) => (tabValue === "All" ? liveTasks.length : liveTasks.filter((task) => hasTaskStatus(task, tabValue)).length);

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <svg viewBox="0 0 24 24" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
            <path d="M10 2a8 8 0 1 0 4.9 14.32l4.4 4.38 1.4-1.4-4.38-4.4A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" />
          </svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder={t("Search tasks...")}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-teal-500"
          />
        </div>
        <Select
          options={[
            { value: ALL_TYPES, label: t("All types") },
            ...TYPE_OPTIONS.map((value) => ({ value, label: t(value) })),
          ]}
          value={type}
          onChange={setType}
          className="w-full sm:w-36"
        />
        <Select
          options={[
            { value: ALL_CHAINS, label: t("All chains") },
            ...EVM_CHAIN_OPTIONS.map((value) => ({ value, label: t(chainLabel(value)) })),
          ]}
          value={chain}
          onChange={setChain}
          className="w-full sm:w-36"
        />
        <Select
          options={DATE_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))}
          value={dateRange}
          onChange={setDateRange}
          className="w-full sm:w-36"
        />
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <button onClick={() => { setQuery(""); setType(ALL_TYPES); setChain(ALL_CHAINS); setDateRange("all"); setTab("All"); setNotice({ message: "Filters reset." }); }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100"
            title={t("Reset filters")}
            aria-label={t("Reset filters")}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" />
            </svg>
          </button>
          <button onClick={() => { setNotice({ message: "Exported {count} task records.", values: { count: filtered.length } }); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            title={t("Export")}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 3v10.6l3.3-3.3 1.4 1.4-5.7 5.7-5.7-5.7 1.4-1.4 3.3 3.3V3h2zM5 19h14v2H5v-2z" />
            </svg>
            {t("Export")}
          </button>
        </div>
      </div>

      {notice && <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-700">{t(notice.message, notice.values)}</div>}

      {/* 分段式状态筛选 */}
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
        {TABS.map((tabValue) => (
          <button
            key={tabValue}
            onClick={() => setTab(tabValue)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              tab === tabValue ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t(tabValue)}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                tab === tabValue ? "bg-teal-50 text-teal-700" : "bg-gray-200/70 text-gray-500"
              }`}
            >
              {countOf(tabValue)}
            </span>
          </button>
        ))}
      </div>

      {/* 任务表格 */}
      <div className="card overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">{t("Task")}</th>
              <th className="px-4 py-3">{t("Type")}</th>
              <th className="px-4 py-3">{t("Chain")}</th>
              <th className="px-4 py-3">{t("Trading pair")}</th>
              <th className="px-4 py-3">{t("Progress")}</th>
              <th className="px-4 py-3">{t("Status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((task) => {
              const total = Number(task.walletCount || task.wallets || task.items?.length || 0); const done = Number(task.done || 0); const pct = total ? Math.round((done / total) * 100) : 0;
              const displayStatus = effectiveTaskStatus(task);
              return (
                <tr key={task.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/tasks/${task.id}`} className="font-mono text-teal-600 hover:underline">
                      #{task.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{t(task.type)}</td>
                  <td className="px-4 py-3 text-gray-700">{t(chainLabel(task.chain))}</td>
                  <td className="px-4 py-3 text-gray-500">{task.pair || task.token || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full ${displayStatus === "Failed" ? "bg-red-500" : "bg-teal-600"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {done} / {total} ({pct}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={displayStatus} />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-9 w-9 text-gray-300">
                        <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 5v2h10V8H7zm0 4v2h7v-2H7z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">{t("No tasks")}</h3>
                    <p className="mt-1 text-sm text-gray-500">{t("No task records match the current filters.")}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
