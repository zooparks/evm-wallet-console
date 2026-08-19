"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

const PAGE_META = [
  { match: "/dashboard", title: "Dashboard", subtitle: "Wallet portfolio and batch operations" },
  { match: "/wallets", title: "Wallet management", subtitle: "Manage EVM wallets and asset groups" },
  { match: "/operations/swap", title: "Batch Swap", subtitle: "Multi-wallet batch swap wizard" },
  { match: "/operations/bridge", title: "Batch Bridge", subtitle: "Cross-chain batch transfer wizard" },
  { match: "/operations/transfer", title: "Batch Transfer", subtitle: "Multi-wallet batch transfer wizard" },
  { match: "/tasks", title: "Task management", subtitle: "Batch task status and progress" },
  { match: "/transactions", title: "Transactions", subtitle: "On-chain transactions and confirmations" },
  { match: "/assets", title: "Asset management", subtitle: "Multi-chain balances and token valuations" },
  { match: "/settings", title: "Settings", subtitle: "Network, signing, and security policies" },
];

export default function Header() {
  const pathname = usePathname();
  const { locale, setLocale, t, formatNumber, languages } = useI18n();
  const [dashboardStats, setDashboardStats] = useState({ totalPortfolio: 0, pending: 0, wallets: 0 });
  useEffect(() => { fetch("/api/dashboard", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((data) => data?.stats && setDashboardStats(data.stats)).catch(() => {}); }, []);
  const meta =
    [...PAGE_META].sort((a, b) => b.match.length - a.match.length).find((m) => pathname.startsWith(m.match)) || {};
  const portfolioValue = `$${formatNumber(dashboardStats.totalPortfolio, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200/60 bg-white/70 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
        {/* 左侧:页面标题 */}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-gray-900">{meta.title ? t(meta.title) : "EVM Console"}</h1>
          <p className="truncate text-xs text-gray-500">{t(meta.subtitle || "Multi-wallet asset and batch transaction management")}</p>
        </div>

        {/* 右侧:操作区 */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* 通知 */}
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-all hover:scale-105 hover:bg-gray-100"
            aria-label={t("Notifications")}
            title={t("Notifications")}
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
            <span className="text-sm font-semibold text-teal-700">{portfolioValue}</span>
            <div className="pointer-events-none absolute right-0 top-full z-40 mt-2 hidden w-56 rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg group-hover:block">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t("Total portfolio")}</span>
                <span className="font-medium text-gray-900">{portfolioValue}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-gray-500">{t("Pending tasks")}</span>
                <span className="font-medium text-amber-700">{dashboardStats.pending}</span>
              </div>
              <div className="mt-2 border-t border-gray-100 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t("Wallet count")}</span>
                  <span className="font-semibold text-gray-900">{dashboardStats.wallets}</span>
                </div>
              </div>
            </div>
          </div>

          <div
            role="group"
            aria-label={t("Language")}
            className="flex h-9 shrink-0 items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5"
          >
            {languages.map((language) => (
              <button
                key={language.value}
                type="button"
                aria-pressed={locale === language.value}
                aria-label={t("Switch to {language}", { language: t(language.label) })}
                title={t(language.label)}
                onClick={() => setLocale(language.value)}
                className={`h-7 min-w-9 rounded-md px-1.5 text-xs font-semibold transition-colors ${
                  locale === language.value
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {language.shortLabel}
              </button>
            ))}
          </div>

          {/* 用户 */}
          <button type="button" className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-gray-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-sm font-medium text-white shadow-sm">
              AD
            </div>
            <div className="hidden text-left md:block">
              <div className="text-sm font-medium text-gray-900">admin</div>
              <div className="text-xs text-gray-500">{t("Administrator")}</div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
