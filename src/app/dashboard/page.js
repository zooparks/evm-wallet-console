"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import { useI18n } from "@/i18n/I18nProvider";
import { chainLabel } from "@/lib/chains/catalog";

const OPERATION_LABELS = {
  swap: "Swap",
  bridge: "Bridge",
  transfer: "Transfer",
};

export default function DashboardPage() {
  const { t, formatNumber } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await fetch("/api/dashboard", { cache: "no-store" }); if (!response.ok) throw new Error("Dashboard data could not be loaded"); setData(await response.json()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Dashboard data could not be loaded"); } finally { setLoading(false); }
  }, []);
  // Fetch dashboard data once when the page mounts.
  useEffect(() => { load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);
  if (loading) return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">{t("Loading dashboard...")}</div>;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"><p className="text-sm text-red-700">{t(error)}</p><button onClick={load} className="mt-3 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">{t("Retry")}</button></div>;
  const { stats: dashboardStats, chainDistribution, portfolioTrend, recentTasks: recentTasksMini } = data;
  const maxTrend = Math.max(...portfolioTrend, 1);
  const formatUsd = (value) => `$${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/operations/swap" className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">
          {t("Batch Swap")}
        </Link>
        <Link href="/operations/bridge" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-teal-300 hover:text-teal-700">
          {t("Batch Bridge")}
        </Link>
        <Link href="/wallets" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-teal-300 hover:text-teal-700">
          + {t("Add Wallet")}
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="text-xs uppercase tracking-wide text-gray-500">{t("Total Portfolio")}</div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-3xl font-semibold text-teal-600">{formatUsd(dashboardStats.totalPortfolio)}</span>
          <span className="text-sm font-medium text-emerald-600">{t("+{change}% Today", { change: formatNumber(dashboardStats.changeToday) })}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "Wallets", value: dashboardStats.wallets },
          { label: "Chains", value: dashboardStats.chains },
          { label: "Tokens", value: dashboardStats.tokens },
          { label: "Pending", value: dashboardStats.pending },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">{t(item.label)}</div>
            <div className="mt-1 text-2xl font-semibold text-teal-600">{formatNumber(item.value)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-gray-700">{t("Portfolio Trend")}</div>
          {portfolioTrend.length ? <div className="flex h-32 items-end gap-1.5">
            {portfolioTrend.map((v, i) => <div key={i} className="flex-1 rounded-t bg-teal-600/70" style={{ height: `${Math.max(4, (v / maxTrend) * 100)}%` }} />)}
          </div> : <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">{t("No portfolio trend data yet.")}</div>}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-gray-700">{t("Chain Distribution")}</div>
          <div className="space-y-3">
            {chainDistribution.map((c) => (
              <div key={c.chain} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{chainLabel(c.chain)}</span>
                <span className="font-medium text-teal-600">{formatUsd(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">{t("Recent Tasks")}</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">{t("Task")}</th>
              <th className="px-4 py-3">{t("Type")}</th>
              <th className="px-4 py-3">{t("Wallets")}</th>
              <th className="px-4 py-3">{t("Progress")}</th>
              <th className="px-4 py-3">{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {recentTasksMini.map((task) => (
              <tr key={task.id} className="border-t border-gray-200">
                <td className="px-4 py-2">
                  <Link href={`/tasks/${task.id}`} className="text-teal-600 hover:underline">#{task.id}</Link>
                </td>
                <td className="px-4 py-2 text-gray-700">{t(OPERATION_LABELS[String(task.type).toLowerCase()] || task.type)}</td>
                <td className="px-4 py-2 text-gray-700">{formatNumber(task.wallets)}</td>
                <td className="px-4 py-2 text-gray-700">{formatNumber(task.done)} / {formatNumber(task.wallets)}</td>
                <td className="px-4 py-2"><StatusBadge status={task.status} /></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
