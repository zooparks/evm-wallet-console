"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/common/StatusBadge";
import CopyableAddress from "@/components/common/CopyableAddress";
import Select from "@/components/common/Select";
import { wallets } from "@/data/mock";

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
    <div className="space-y-4 pb-20">
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
        <Select key="Group" options={["全部分组", "Trading", "Main", "Operations", "Test"]} value="全部分组" onChange={() => {}} className="w-full sm:w-40" />
        <Select key="Chain" options={["全部链", "Ethereum", "Arbitrum", "Base"]} value="全部链" onChange={() => {}} className="w-full sm:w-36" />
        <Select key="Asset" options={["全部资产", "ETH", "USDC", "USDT"]} value="全部资产" onChange={() => {}} className="w-full sm:w-36" />
        <Select key="Status" options={["全部状态", "Active", "Inactive"]} value="全部状态" onChange={() => {}} className="w-full sm:w-36" />
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
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

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input type="checkbox" className="h-4 w-4 rounded accent-teal-600" checked={allChecked} onChange={toggleAll} />
              </th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3">Total Assets</th>
              <th className="px-4 py-3">Last Activity</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((w) => (
              <tr
                key={w.id}
                className="cursor-pointer border-t border-gray-200 hover:bg-gray-50"
                onClick={() => router.push(`/wallets/${w.id}`)}
              >
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" className="accent-teal-600" checked={selected.includes(w.id)} onChange={() => toggleOne(w.id)} />
                </td>
                <td className="px-4 py-2 text-gray-900">{w.name}</td>
                <td className="px-4 py-2"><CopyableAddress address={w.address} /></td>
                <td className="px-4 py-2 text-gray-700">{w.group}</td>
                <td className="px-4 py-2 font-medium text-teal-600">${w.totalAssets.toLocaleString()}</td>
                <td className="px-4 py-2 text-gray-500">{w.lastActivity}</td>
                <td className="px-4 py-2"><StatusBadge status={w.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 left-64 z-10 flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
          <span className="text-sm text-gray-700">{selected.length} wallets selected</span>
          <div className="flex gap-2">
            <Link href="/operations/swap" className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
              Batch Swap
            </Link>
            <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">Batch Bridge</button>
            <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">Batch Transfer</button>
            <button onClick={() => setSelected([])} className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
