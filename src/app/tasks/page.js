"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import Select from "@/components/common/Select";
import { tasks } from "@/data/mock";

const TABS = ["All", "Scheduled", "Running", "Success", "Failed"];

export default function TasksPage() {
  const [tab, setTab] = useState("All");
  const filtered = tab === "All" ? tasks : tasks.filter((t) => t.status === tab);

  const countOf = (t) => (t === "All" ? tasks.length : tasks.filter((x) => x.status === t).length);

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <svg viewBox="0 0 24 24" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
            <path d="M10 2a8 8 0 1 0 4.9 14.32l4.4 4.38 1.4-1.4-4.38-4.4A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" />
          </svg>
          <input
            type="text"
            placeholder="搜索任务..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-teal-500"
          />
        </div>
        <Select options={["全部类型", "Swap", "Bridge", "Transfer"]} value="全部类型" onChange={() => {}} className="w-full sm:w-36" />
        <Select options={["全部链", "Ethereum", "Arbitrum", "Base"]} value="全部链" onChange={() => {}} className="w-full sm:w-36" />
        <Select options={["全部日期", "今天", "近 7 天", "近 30 天"]} value="全部日期" onChange={() => {}} className="w-full sm:w-36" />
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100"
            title="刷新"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" />
            </svg>
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            title="导出"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 3v10.6l3.3-3.3 1.4 1.4-5.7 5.7-5.7-5.7 1.4-1.4 3.3 3.3V3h2zM5 19h14v2H5v-2z" />
            </svg>
            导出
          </button>
        </div>
      </div>

      {/* 分段式状态筛选 */}
      <div className="flex w-fit gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                tab === t ? "bg-teal-50 text-teal-700" : "bg-gray-200/70 text-gray-500"
              }`}
            >
              {countOf(t)}
            </span>
          </button>
        ))}
      </div>

      {/* 任务表格 */}
      <div className="card overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">任务</th>
              <th className="px-4 py-3">类型</th>
              <th className="px-4 py-3">链</th>
              <th className="px-4 py-3">交易对</th>
              <th className="px-4 py-3">进度</th>
              <th className="px-4 py-3">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((t) => {
              const pct = Math.round((t.done / t.wallets) * 100);
              return (
                <tr key={t.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/tasks/${t.id}`} className="font-mono text-teal-600 hover:underline">
                      #{t.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{t.type}</td>
                  <td className="px-4 py-3 text-gray-700">{t.chain}</td>
                  <td className="px-4 py-3 text-gray-500">{t.pair}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full ${t.status === "Failed" ? "bg-red-500" : "bg-teal-600"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {t.done} / {t.wallets} ({pct}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
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
                    <h3 className="text-sm font-semibold text-gray-900">暂无任务</h3>
                    <p className="mt-1 text-sm text-gray-500">当前筛选条件下没有任务记录。</p>
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
