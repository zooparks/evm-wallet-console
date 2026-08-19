"use client";

import { useI18n } from "@/i18n/I18nProvider";

const STYLES = {
  Draft: "bg-teal-50 text-teal-700",
  Quoted: "bg-teal-50 text-teal-700",
  Simulated: "bg-teal-50 text-teal-700",
  Scheduled: "bg-teal-50 text-teal-700",
  Running: "bg-teal-50 text-teal-700",
  Submitted: "bg-teal-50 text-teal-700",
  Pending: "bg-teal-50 text-teal-700",
  Success: "bg-teal-50 text-teal-700",
  Failed: "bg-red-50 text-red-600",
  Retrying: "bg-teal-50 text-teal-700",
  Cancelled: "bg-teal-50 text-teal-700",
  Paused: "bg-gray-100 text-gray-600",
  Active: "bg-teal-50 text-teal-700",
  Inactive: "bg-teal-50 text-teal-500",
  Connected: "bg-teal-50 text-teal-700",
};

const STATUS_ALIASES = {
  confirmed: "Success",
  success: "Success",
  pending: "Pending",
  submitted: "Submitted",
  retrying: "Retrying",
  running: "Running",
  scheduled: "Scheduled",
  failed: "Failed",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  paused: "Paused",
};

export default function StatusBadge({ status }) {
  const { t } = useI18n();
  const rawStatus = String(status || "Unknown");
  const canonical = STATUS_ALIASES[rawStatus.toLowerCase()] || rawStatus;
  const cls = STYLES[canonical] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {t(canonical)}
    </span>
  );
}
