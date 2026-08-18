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
  Active: "bg-teal-50 text-teal-700",
  Inactive: "bg-teal-50 text-teal-500",
  Connected: "bg-teal-50 text-teal-700",
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || "bg-teal-50 text-teal-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
