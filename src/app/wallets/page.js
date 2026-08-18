"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/common/StatusBadge";
import CopyableAddress from "@/components/common/CopyableAddress";
import Select from "@/components/common/Select";
import { wallets } from "@/data/mock";

// 标签样式映射
const TAG_STYLES = {
  hot: "bg-amber-50 text-amber-700",
  test: "bg-gray-100 text-gray-500",
};

export default function WalletsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState([]);

  const allChecked = selected.length === wallets.length;

  function toggleAll() {
    setSelected(allChecked ? [] : wallets.map((w) => w.id));
  }

  function toggleOne(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-4 pb-24">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <svg viewBox="0 0 24 24" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
            <path d="M10 2a8 8 0 1 0 4.9 14.32l4.4 4.38 1.4-1.4-4.38-4.4A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" />
          </svg>
          <input
            type="text"
            placeholder="搜索地址 / 名称..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-teal-500"
          />
        </div>
        <Select options={["全部分组", "Trading", "Main", "Operations", "Test"]} value="全部分组" onChange={() => {}} className="w-full sm:w-40" />
        <Select options={["全部链", "Ethereum", "Arbitrum", "Base"]} value="全部链" onChange={() => {}} className="w-full sm:w-36" />
        <Select options={["全部资产", "ETH", "USDC", "USDT"]} value="全部资产" onChange={() => {}} className="w-full sm:w-36" />
        <Select options={["全部状态", "Active", "Inactive"]} value="全部状态" onChange={() => {}} className="w-full sm:w-36" />
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100" title="刷新">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" />
            </svg>
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 3v10.6l3.3-3.3 1.4 1.4-5.7 5.7-5.7-5.7 1.4-1.4 3.3 3.3V3h2zM5 19h14v2H5v-2z" />
            </svg>
            导入 CSV
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z" />
            </svg>
            添加钱包
          </button>
        </div>
      </div>

      {/* 钱包表格 */}
      <div className="card overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input type="checkbox" className="h-4 w-4 rounded accent-teal-600" checked={allChecked} onChange={toggleAll} />
              </th>
              <th className="px-4 py-3">名称</th>
              <th className="px-4 py-3">地址</th>
              <th className="px-4 py-3">分组</th>
              <th className="px-4 py-3">总资产</th>
              <th className="px-4 py-3">最近活动</th>
              <th className="px-4 py-3">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {wallets.map((w, i) => {
              const checked = selected.includes(w.id);
              return (
                <tr
                  key={w.id}
                  className={`cursor-pointer transition-colors ${checked ? "bg-teal-50/40" : "hover:bg-gray-50"}`}
                  onClick={() => router.push(`/wallets/${w.id}`)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="h-4 w-4 rounded accent-teal-600" checked={checked} onChange={() => toggleOne(w.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{w.name}</div>
                    {w.tags.length > 0 && (
                      <div className="mt-0.5 flex gap-1">
                        {w.tags.map((t) => (
                          <span key={t} className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TAG_STYLES[t] || "bg-gray-100 text-gray-500"}`}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <CopyableAddress address={w.address} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{w.group}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-teal-600">${w.totalAssets.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{w.lastActivity}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={w.status} />
                  </td>
                </tr>
              );
            })}
            {wallets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-9 w-9 text-gray-300">
                        <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 1-2.5 2.5H19v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm16 3h1.5a.5.5 0 0 1 .5.5V13a.5.5 0 0 1-.5.5H19V10z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">暂无钱包</h3>
                    <p className="mt-1 text-sm text-gray-500">导入或添加您的第一个钱包开始使用。</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 分页 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-3">
          <span className="text-xs text-gray-500">显示 1-{wallets.length},共 500 个钱包</span>
          <div className="flex items-center gap-1">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400" disabled>
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M15.4 7.4L14 6l-6 6 6 6 1.4-1.4L10.8 12l4.6-4.6z" /></svg>
            </button>
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                className={`h-8 min-w-8 rounded-lg px-2 text-sm font-medium transition-colors ${
                  p === 1 ? "bg-teal-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            ))}
            <span className="px-1 text-sm text-gray-400">...</span>
            <button className="h-8 min-w-8 rounded-lg border border-gray-200 bg-white px-2 text-sm font-medium text-gray-600 hover:bg-gray-100">63</button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M8.6 16.6L10 18l6-6-6-6-1.4 1.4L13.2 12l-4.6 4.6z" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* 批量操作悬浮卡 */}
      {selected.length > 0 && (
        <div className="fixed bottom-5 left-64 right-5 z-10 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xl">
          <span className="text-sm text-gray-700">
            已选 <span className="font-semibold text-teal-700">{selected.length}</span> 个钱包
          </span>
          <div className="flex flex-wrap gap-2">
            <Link href="/operations/swap" className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-700">
              批量 Swap
            </Link>
            <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100">批量 Bridge</button>
            <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100">批量 Transfer</button>
            <button onClick={() => setSelected([])} className="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700">
              清除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
