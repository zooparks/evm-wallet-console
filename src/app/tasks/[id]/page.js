"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { chainLabel } from "@/lib/chains/catalog";
import StatusBadge from "@/components/common/StatusBadge";

const ICON = { Success: "✓", Running: "●", Scheduled: "○", Submitted: ">", Failed: "✕", Retrying: "↻", Cancelled: "-", Paused: "||" };
const COLOR = { Success: "text-emerald-600", Running: "text-blue-600", Scheduled: "text-gray-500", Submitted: "text-indigo-600", Failed: "text-red-600", Retrying: "text-amber-600", Cancelled: "text-gray-400", Paused: "text-gray-500" };

function canonicalStatus(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "confirmed" || normalized === "success") return "Success";
  if (normalized === "pending" || normalized === "submitted") return "Submitted";
  if (normalized === "running" || normalized === "processing") return "Running";
  if (normalized === "retrying" || normalized === "retry") return "Retrying";
  if (normalized === "paused") return "Paused";
  if (normalized === "failed" || normalized === "error") return "Failed";
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled";
  return "Scheduled";
}

function deriveCounts(items, fallback = {}) {
  if (!items.length) return { success: 0, running: 0, scheduled: 0, submitted: 0, retrying: 0, paused: 0, failed: 0, ...fallback };
  const counts = { success: 0, running: 0, scheduled: 0, submitted: 0, retrying: 0, paused: 0, failed: 0 };
  items.forEach((item) => {
    const status = canonicalStatus(item.status).toLowerCase();
    if (status in counts) counts[status] += 1;
    else counts.scheduled += 1;
  });
  return counts;
}

function amountText(value) {
  if (typeof value === "string") return value || "-";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : String(value ?? "-");
}

export default function TaskDetailPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [drawerItem, setDrawerItem] = useState(null);
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [notice, setNotice] = useState(null);
  const [runState, setRunState] = useState("");
  useEffect(() => { fetch(`/api/tasks/${id}`, { cache: "no-store" }).then((r) => r.json()).then(({ task: value }) => { const nextItems = value?.items || []; setTask(value); setItems(nextItems); setCounts(deriveCounts(nextItems, value?.counts)); setRunState(value?.status || ""); }).catch(() => setNotice({ message: "Failed to load task." })); }, [id]);
  const patchTask = async (action, wallet) => { const r = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, wallet }) }); if (!r.ok) throw new Error(); const { task: value } = await r.json(); const nextItems = value?.items || []; setTask(value); setItems(nextItems); setCounts(deriveCounts(nextItems, value?.counts)); setRunState(value?.status || ""); };
  if (!task) return <div className="p-6 text-sm text-gray-500">{t("Loading...")}</div>;

  const total = Number(task.total || task.walletCount || items.length || 0);
  const completed = (counts.success || 0) + (counts.failed || 0);
  const pct = total ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const displayStatus = counts.failed > 0
    ? "Failed"
    : counts.submitted > 0
      ? "Submitted"
        : counts.retrying > 0
          ? "Retrying"
        : counts.paused > 0
          ? "Paused"
          : task.status;
  const retryItem = async (wallet) => {
    const target = items.find((item) => item.wallet === wallet);
    if (!target || canonicalStatus(target.status) !== "Failed" || target.txHash || target.errorCode === "WORKER_INTERRUPTED") {
      setNotice({ message: "Submitted transactions require chain review before retrying." });
      return;
    }
    try { await patchTask("retry", wallet); } catch { setNotice({ message: "Action failed." }); return; }
    setItems((current) => current.map((item) => item.wallet === wallet ? { ...item, status: "Retrying", error: undefined } : item));
    setCounts((current) => ({ ...current, failed: Math.max(0, (current.failed || 0) - 1), retrying: (current.retrying || 0) + 1 }));
    setNotice({ message: "{wallet} was added to the retry queue.", values: { wallet } });
    setDrawerItem((item) => item && item.wallet === wallet ? { ...item, status: "Retrying", error: undefined } : item);
  };
  const exportResults = () => setNotice({ message: "Exported {count} task results.", values: { count: items.length } });

  return (
    <div className="space-y-4">
      <Link href="/tasks" className="text-sm text-gray-500 hover:text-gray-700">← {t("Tasks")}</Link>

      <div>
        <div className="flex items-center gap-2"><h1 className="text-lg font-semibold text-gray-900">{t(task.type)} #{task.id}</h1><StatusBadge status={displayStatus} /></div>
        <div className="text-sm text-gray-500">{t(chainLabel(task.chain))} · {task.pair}</div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
          <span>{t("Progress")}</span>
          <span>{completed} / {total}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div className="h-full bg-teal-600" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <Count label={t("Success")} value={counts.success || 0} className="text-emerald-600" />
          <Count label={t("Running")} value={counts.running || 0} className="text-blue-600" />
          <Count label={t("Submitted")} value={counts.submitted || 0} className="text-indigo-600" />
          <Count label={t("Retrying")} value={counts.retrying || 0} className="text-amber-600" />
          <Count label={t("Paused")} value={counts.paused || 0} className="text-gray-500" />
          <Count label={t("Scheduled")} value={counts.scheduled || 0} className="text-gray-500" />
          <Count label={t("Failed")} value={counts.failed || 0} className="text-red-600" />
        </div>
      </div>

      <div className="flex gap-2">
        <button disabled={runState !== "Running"} onClick={async () => { try { await patchTask("pause"); setNotice({ message: "Batch paused." }); } catch { setNotice({ message: "Action failed." }); } }} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 enabled:hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50">{t("Pause")}</button>
        <button disabled={runState === "Running"} onClick={async () => { try { await patchTask("resume"); setNotice({ message: "Batch resumed." }); } catch { setNotice({ message: "Action failed." }); } }} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 enabled:hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50">{t("Resume")}</button>
        <button onClick={async () => { try { await patchTask("cancel"); setNotice({ message: "All scheduled tasks cancelled." }); } catch { setNotice({ message: "Action failed." }); } }} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">{t("Cancel scheduled")}</button>
        <button onClick={() => items.filter((item) => canonicalStatus(item.status) === "Failed").forEach((item) => retryItem(item.wallet))} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">{t("Retry failed")}</button>
        <button onClick={exportResults} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">{t("Export")}</button>
      </div>
      {notice && <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-700">{t(notice.message, notice.values)}</div>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">{t("Wallet")}</th>
              <th className="px-4 py-2 font-medium">{t("Amount")}</th>
              <th className="px-4 py-2 font-medium">{t("Scheduled")}</th>
              <th className="px-4 py-2 font-medium">{t("Tx hash")}</th>
              <th className="px-4 py-2 font-medium">{t("Destination tx hash")}</th>
              <th className="px-4 py-2 font-medium">{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr
                key={it.id || it.wallet}
                onClick={() => setDrawerItem(it)}
                className="cursor-pointer border-t border-gray-200 hover:bg-gray-50"
              >
                <td className="px-4 py-2 text-gray-800">{it.wallet}</td>
                <td className="px-4 py-2 text-gray-700">{amountText(it.amountText ?? it.amount)}</td>
                <td className="px-4 py-2 text-gray-500">{it.scheduled}</td>
                <td className="max-w-[180px] break-all px-4 py-2 font-mono text-xs text-gray-600">{it.txHash || "-"}</td>
                <td className="max-w-[180px] break-all px-4 py-2 font-mono text-xs text-gray-600">{it.destinationTxHash || "-"}</td>
                <td className={`px-4 py-2 ${COLOR[canonicalStatus(it.status)]}`}>{ICON[canonicalStatus(it.status)]} {t(canonicalStatus(it.status))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawerItem && (
        <div className="fixed inset-0 z-20 flex justify-end bg-gray-900/40" onClick={() => setDrawerItem(null)}>
          <div className="h-full w-80 border-l border-gray-200 bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{drawerItem.wallet}</h2>
              <button aria-label={t("Close")} onClick={() => setDrawerItem(null)} className="text-gray-400 hover:text-gray-700">×</button>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label={t("Status")} value={<span className={COLOR[canonicalStatus(drawerItem.status)]}>{t(canonicalStatus(drawerItem.status))}</span>} />
              <Row label={t("Operation")} value={t(task.type.replace("Batch ", ""))} />
              <Row label={t("Chain")} value={t(chainLabel(task.chain))} />
              <Row label={t("Amount")} value={amountText(drawerItem.amountText ?? drawerItem.amount)} />
              <Row label={t("Scheduled")} value={drawerItem.scheduled} />
              <Row label={t("Tx hash")} value={<span className="break-all font-mono text-xs">{drawerItem.txHash || "-"}</span>} />
              <Row label={t("Destination tx hash")} value={<span className="break-all font-mono text-xs">{drawerItem.destinationTxHash || "-"}</span>} />
            </dl>
              {drawerItem.error && (
                <div className="mt-4">
                <div className="text-xs uppercase text-gray-500">{t("Error")}</div>
                {drawerItem.errorCode && <div className="mt-1 font-mono text-xs text-red-500">{drawerItem.errorCode}</div>}
                <div className="mt-1 text-sm text-red-600">{t(drawerItem.error)}</div>
                {canonicalStatus(drawerItem.status) === "Failed" && !drawerItem.txHash && <button onClick={() => retryItem(drawerItem.wallet)} className="mt-3 rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">{t("Retry")}</button>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Count({ label, value, className }) {
  return (
    <div>
      <div className={`text-lg font-semibold ${className}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}
