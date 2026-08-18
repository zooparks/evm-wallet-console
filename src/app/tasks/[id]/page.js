"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { taskDetails } from "@/data/mock";

const ICON = { Success: "✓", Running: "●", Scheduled: "○", Failed: "✕" };
const COLOR = { Success: "text-emerald-600", Running: "text-blue-600", Scheduled: "text-gray-500", Failed: "text-red-600" };

export default function TaskDetailPage() {
  const { id } = useParams();
  const task = taskDetails[id] || Object.values(taskDetails)[0];
  const [drawerItem, setDrawerItem] = useState(null);

  const pct = Math.round(((task.total - task.counts.scheduled - task.counts.running) / task.total) * 100);

  return (
    <div className="space-y-4">
      <Link href="/tasks" className="text-sm text-gray-500 hover:text-gray-700">← Tasks</Link>

      <div>
        <h1 className="text-lg font-semibold text-gray-900">{task.type} #{task.id}</h1>
        <div className="text-sm text-gray-500">{task.chain} · {task.pair}</div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
          <span>Progress</span>
          <span>{task.counts.success + task.counts.failed} / {task.total}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div className="h-full bg-teal-600" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
          <Count label="Success" value={task.counts.success} className="text-emerald-600" />
          <Count label="Running" value={task.counts.running} className="text-blue-600" />
          <Count label="Scheduled" value={task.counts.scheduled} className="text-gray-500" />
          <Count label="Failed" value={task.counts.failed} className="text-red-600" />
        </div>
      </div>

      <div className="flex gap-2">
        <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">Pause</button>
        <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">Resume</button>
        <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">Cancel Scheduled</button>
        <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">Retry Failed</button>
        <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">Export</button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Wallet</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Scheduled</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {task.items.map((it) => (
              <tr
                key={it.wallet}
                onClick={() => setDrawerItem(it)}
                className="cursor-pointer border-t border-gray-200 hover:bg-gray-50"
              >
                <td className="px-4 py-2 text-gray-800">{it.wallet}</td>
                <td className="px-4 py-2 text-gray-700">{it.amount.toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500">{it.scheduled}</td>
                <td className={`px-4 py-2 ${COLOR[it.status]}`}>{ICON[it.status]} {it.status}</td>
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
              <button onClick={() => setDrawerItem(null)} className="text-gray-400 hover:text-gray-700">×</button>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Status" value={<span className={COLOR[drawerItem.status]}>{drawerItem.status}</span>} />
              <Row label="Operation" value={task.type.replace("Batch ", "")} />
              <Row label="Chain" value={task.chain} />
              <Row label="Amount" value={drawerItem.amount.toFixed(2)} />
              <Row label="Scheduled" value={drawerItem.scheduled} />
            </dl>
            {drawerItem.error && (
              <div className="mt-4">
                <div className="text-xs uppercase text-gray-500">Error</div>
                <div className="mt-1 text-sm text-red-600">{drawerItem.error}</div>
                <button className="mt-3 rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">Retry</button>
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
