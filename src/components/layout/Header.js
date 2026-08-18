"use client";

import { usePathname } from "next/navigation";
import { dashboardStats } from "@/data/mock";

const PAGE_META = [
  { match: "/dashboard", title: "仪表盘", subtitle: "钱包资产总览与批量操作" },
  { match: "/wallets", title: "钱包管理", subtitle: "管理所有 EVM 钱包与资产分组" },
  { match: "/operations/swap", title: "批量 Swap", subtitle: "多钱包批量兑换向导" },
  { match: "/tasks", title: "任务管理", subtitle: "批量任务执行状态与进度" },
];

function fmtUsd(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Header() {
  const pathname = usePathname();
  const meta =
    [...PAGE_META].sort((a, b) => b.match.length - a.match.length).find((m) => pathname.startsWith(m.match)) || {};

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200/60 bg-white/70 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
        {/* 左侧:页面标题 */}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-gray-900">{meta.title || "EVM Console"}</h1>
          <p className="truncate text-xs text-gray-500">{meta.subtitle || "多钱包资产与批量交易管理平台"}</p>
        </div>

        {/* 右侧:操作区 */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* 通知 */}
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-all hover:scale-105 hover:bg-gray-100"
            aria-label="通知"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm8-6v-1l-2-2v-4a6 6 0 0 0-5-5.91V2a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 9v4l-2 2v1h16z" />
            </svg>
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* 余额胶囊 + hover 明细 */}
          <div className="group relative hidden items-center gap-2 rounded-xl bg-teal-50 px-3 py-1.5 sm:flex">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-teal-600">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <span className="text-sm font-semibold text-teal-700">{fmtUsd(dashboardStats.totalPortfolio)}</span>
            <div className="pointer-events-none absolute right-0 top-full z-40 mt-2 hidden w-56 rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg group-hover:block">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">总资产</span>
                <span className="font-medium text-gray-900">{fmtUsd(dashboardStats.totalPortfolio)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-gray-500">待处理任务</span>
                <span className="font-medium text-amber-700">{dashboardStats.pending}</span>
              </div>
              <div className="mt-2 border-t border-gray-100 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">钱包数</span>
                  <span className="font-semibold text-gray-900">{dashboardStats.wallets}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 用户 */}
          <button className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-gray-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-sm font-medium text-white shadow-sm">
              AD
            </div>
            <div className="hidden text-left md:block">
              <div className="text-sm font-medium text-gray-900">admin</div>
              <div className="text-xs text-gray-500">管理员</div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
