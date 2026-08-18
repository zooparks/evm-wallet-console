import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import { dashboardStats, chainDistribution, portfolioTrend, recentTasksMini } from "@/data/mock";

function fmtUsd(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardPage() {
  const maxTrend = Math.max(...portfolioTrend);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/operations/swap" className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">
          Batch Swap
        </Link>
        <button className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-400" disabled>
          Batch Bridge
        </button>
        <button className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-400" disabled>
          + Add Wallet
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="text-xs uppercase tracking-wide text-gray-500">Total Portfolio</div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-3xl font-semibold text-teal-600">{fmtUsd(dashboardStats.totalPortfolio)}</span>
          <span className="text-sm font-medium text-emerald-600">+{dashboardStats.changeToday}% Today</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          ["Wallets", dashboardStats.wallets],
          ["Chains", dashboardStats.chains],
          ["Tokens", dashboardStats.tokens],
          ["Pending", dashboardStats.pending],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-teal-600">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-gray-700">Portfolio Trend</div>
          <div className="flex h-32 items-end gap-1.5">
            {portfolioTrend.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-teal-600/70"
                style={{ height: `${(v / maxTrend) * 100}%` }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-gray-700">Chain Distribution</div>
          <div className="space-y-3">
            {chainDistribution.map((c) => (
              <div key={c.chain} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{c.chain}</span>
                <span className="font-medium text-teal-600">{fmtUsd(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">Recent Tasks</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Wallets</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentTasksMini.map((t) => (
              <tr key={t.id} className="border-t border-gray-200">
                <td className="px-4 py-2">
                  <Link href={`/tasks/${t.id}`} className="text-teal-600 hover:underline">#{t.id}</Link>
                </td>
                <td className="px-4 py-2 text-gray-700">{t.type}</td>
                <td className="px-4 py-2 text-gray-700">{t.wallets}</td>
                <td className="px-4 py-2 text-gray-700">{t.done} / {t.wallets}</td>
                <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
