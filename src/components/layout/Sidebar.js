"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

const NAV_GROUPS = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "grid" },
      { label: "Wallets", href: "/wallets", icon: "wallet" },
      { label: "Assets", href: "/assets", icon: "coins" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Swap", href: "/operations/swap", icon: "swap" },
      { label: "Bridge", href: "/operations/bridge", icon: "bridge" },
      { label: "Transfer", href: "/operations/transfer", icon: "transfer" },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Tasks", href: "/tasks", icon: "tasks" },
      { label: "Transactions", href: "/transactions", icon: "list" },
      { label: "Settings", href: "/settings", icon: "gear" },
    ],
  },
];

const ICONS = {
  grid: (
    <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
  ),
  wallet: (
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 1-2.5 2.5H19v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm16 3h1.5a.5.5 0 0 1 .5.5V13a.5.5 0 0 1-.5.5H19V10z" />
  ),
  coins: (
    <path d="M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 9.7V12c0 1.7 3.6 3 8 3s8-1.3 8-3V9.7c-1.8 1.1-4.7 1.8-8 1.8s-6.2-.7-8-1.8zm0 5V17c0 1.7 3.6 3 8 3s8-1.3 8-3v-2.3c-1.8 1.1-4.7 1.8-8 1.8s-6.2-.7-8-1.8z" />
  ),
  swap: (
    <path d="M7 7h9.2l-2.6-2.6L15 3l5 5-5 5-1.4-1.4L16.2 9H7V7zm10 10H7.8l2.6 2.6L9 21l-5-5 5-5 1.4 1.4L7.8 15H17v2z" />
  ),
  bridge: (
    <path d="M2 12h2v6h16v-6h2v8H2v-8zM7 5h2v9H7V5zm8 0h2v9h-2V5zm-4 2h2v7h-2V7z" />
  ),
  transfer: (
    <path d="M6 4h9l-2-2 1.4-1.4L19.8 6l-5.4 5.4L13 10l2-2H8v4H6V4zm12 16H9l2 2-1.4 1.4L4.2 18l5.4-5.4L11 14l-2 2h9v-4h2v8z" />
  ),
  tasks: (
    <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 5v2h10V8H7zm0 4v2h7v-2H7z" />
  ),
  list: (
    <path d="M4 6h2v2H4V6zm4 0h12v2H8V6zM4 11h2v2H4v-2zm4 0h12v2H8v-2zM4 16h2v2H4v-2zm4 0h12v2H8v-2z" />
  ),
  gear: (
    <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4c0 .6-.05 1.1-.15 1.6l2 1.6-2 3.4-2.4-.9c-.8.7-1.7 1.2-2.7 1.5L15.4 22h-4l-.4-2.6c-1-.3-1.9-.8-2.7-1.5l-2.4.9-2-3.4 2-1.6C5.05 13.1 5 12.6 5 12s.05-1.1.15-1.6l-2-1.6 2-3.4 2.4.9c.8-.7 1.7-1.2 2.7-1.5L11.4 2h4l.4 2.6c1 .3 1.9.8 2.7 1.5l2.4-.9 2 3.4-2 1.6c.1.5.1 1 .1 1.9z" />
  ),
};

function Icon({ name, className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`h-[18px] w-[18px] shrink-0 ${className || ""}`} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [tasks, setTasks] = useState([]);
  useEffect(() => { fetch("/api/tasks", { cache: "no-store" }).then((r) => r.ok ? r.json() : { tasks: [] }).then((data) => setTasks(data.tasks || [])).catch(() => setTasks([])); }, []);
  const runningTasks = tasks.filter((t) => ["Running", "Queued"].includes(t.status)).length;
  const failedTasks = tasks.filter((t) => t.status === "Failed").length;

  const isActive = (href) => href && (pathname === href || pathname.startsWith(href + "/"));

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* 品牌区 */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 shadow-sm">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-white" aria-hidden="true">
            <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 1-2.5 2.5H19v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm16 3h1.5a.5.5 0 0 1 .5.5V13a.5.5 0 0 1-.5.5H19V10z" />
          </svg>
        </div>
        <div>
          <div className="text-[15px] font-semibold leading-tight text-gray-900">EVM Console</div>
          <div className="text-xs text-gray-400">{t("Multi-wallet assets and batch transactions")}</div>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              {t(group.title)}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavRow key={item.href || item.label} item={{ ...item, label: t(item.label) }} active={isActive(item.href)} comingSoon={t("Coming soon")} soon={t("Soon")} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* 底部任务状态卡片 */}
      <div className="border-t border-gray-100 p-4">
        <Link
          href="/tasks"
          className="block rounded-xl border border-gray-200 bg-gray-50 p-3.5 transition-colors hover:border-teal-200 hover:bg-teal-50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">{t("Task status")}</span>
            {runningTasks + failedTasks > 0 && (
              <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-medium text-white">
                {runningTasks + failedTasks}
              </span>
            )}
          </div>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-gray-700">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {runningTasks} {t("Running")}
            </span>
            <span className={`flex items-center gap-1.5 ${failedTasks > 0 ? "text-red-600" : "text-gray-400"}`}>
              <span className={`h-2 w-2 rounded-full ${failedTasks > 0 ? "bg-red-500" : "bg-gray-300"}`} />
              {failedTasks} {t("Failed")}
            </span>
          </div>
        </Link>
      </div>
    </aside>
  );
}

function NavRow({ item, active, comingSoon, soon }) {
  const base =
    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors";

  if (!item.href) {
    return (
      <div className={`${base} cursor-not-allowed text-gray-400`} title={comingSoon}>
        <Icon name={item.icon} className="text-gray-300 group-hover:text-gray-400" />
        <span>{item.label}</span>
        <span className="ml-auto rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">{soon}</span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${base} ${
        active
          ? "bg-teal-600 font-medium text-white shadow-sm"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <Icon name={item.icon} className={active ? "text-white" : "text-gray-400 group-hover:text-gray-600"} />
      <span>{item.label}</span>
    </Link>
  );
}
