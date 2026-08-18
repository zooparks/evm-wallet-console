"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { wallets } from "@/data/mock";
import CopyableAddress from "@/components/common/CopyableAddress";

const TABS = ["Overview", "Assets", "Transactions", "Tasks"];

export default function WalletDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState("Overview");
  const wallet = wallets.find((w) => w.id === id) || wallets[0];

  return (
    <div className="space-y-4">
      <Link href="/wallets" className="text-sm text-gray-500 hover:text-gray-700">← Wallets</Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{wallet.name}</h1>
          <CopyableAddress address={wallet.address} />
        </div>
        <div className="flex gap-2">
          <Link href="/operations/swap" className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
            Batch Swap
          </Link>
          <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">Batch Bridge</button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-xs text-gray-500">Total Assets</div>
        <div className="mt-1 text-2xl font-semibold text-teal-600">${wallet.totalAssets.toLocaleString()}</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {Object.entries(wallet.chains).map(([chain, value]) => (
          <div key={chain} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">{chain}</div>
            <div className="mt-1 text-lg font-semibold text-teal-600">${value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-1 pb-2 text-sm ${
                tab === t ? "border-teal-600 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-gray-500">Group</div>
            <div className="mt-1 text-gray-800">{wallet.group}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-gray-500">Native Balance</div>
            <div className="mt-1 text-gray-800">{wallet.native} ETH</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-gray-500">Last Activity</div>
            <div className="mt-1 text-gray-800">{wallet.lastActivity}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-gray-500">Tags</div>
            <div className="mt-1 text-gray-800">{wallet.tags.length ? wallet.tags.join(", ") : "-"}</div>
          </div>
        </div>
      )}
      {tab !== "Overview" && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          {tab} - 原型第一阶段暂未展开
        </div>
      )}
    </div>
  );
}
