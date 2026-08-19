"use client";

import { useState } from "react";
import { EVM_CHAIN_CATALOG } from "@/lib/chains/catalog";
import { useI18n } from "@/i18n/I18nProvider";

// Render the same nine canonical EVM networks exposed by the chain API.
const chainRows = EVM_CHAIN_CATALOG;
const TABS = [
  { value: "chains", label: "Chains" },
  { value: "rpc", label: "RPC" },
  { value: "signers", label: "Signers" },
  { value: "security", label: "Security" },
  { value: "audit", label: "Audit Logs" },
];

const SIGNERS = [
  ["Primary signer", "Hardware wallet", "Active"],
  ["Backup signer", "Vault / multisig", "Standby"],
];

const AUDIT_LOGS = [
  "admin created Batch Swap #1001",
  "admin updated RPC endpoint",
  "admin imported 8 wallets",
];

export default function SettingsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("chains");
  const [approval, setApproval] = useState(true);
  const [notice, setNotice] = useState("");

  const securityControls = [
    ["Approval required", "Batch tasks require approval before signing", approval, setApproval],
    ["Session timeout", "Automatically lock the console after 30 minutes", true, () => {}],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{t("Settings")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("Network connections, signing policies, and operational audits")}</p>
      </div>

      {notice && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} className="text-teal-700 hover:underline">{t("Close")}</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:block lg:space-y-1" aria-label={t("Settings sections")}>
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={`block whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium ${
                tab === item.value ? "bg-teal-50 text-teal-700" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t(item.label)}
            </button>
          ))}
        </nav>

        <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          {tab === "chains" && (
            <div>
              <h3 className="font-semibold text-gray-900">{t("Supported chains")}</h3>
              <div className="mt-4 divide-y divide-gray-100">
                {chainRows.map((chain) => (
                  <div key={chain.key} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{chain.label}</div>
                      <div className="mt-0.5 text-xs text-gray-400">{chain.name} · {t("Chain ID {id}", { id: chain.id })}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotice(t("{chain} connection check started", { chain: chain.label }))}
                      className={`rounded-full px-2 py-1 text-[11px] font-medium ${chain.key === "polygon" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
                    >
                      {t(chain.key === "polygon" ? "Syncing" : "Connected")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "rpc" && (
            <div>
              <h3 className="font-semibold text-gray-900">{t("RPC endpoints")}</h3>
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500">
                    <tr><th className="px-4 py-3">{t("Network")}</th><th className="px-4 py-3">{t("Provider")}</th><th className="px-4 py-3">{t("Latency")}</th><th className="px-4 py-3">{t("Status")}</th><th><span className="sr-only">{t("Actions")}</span></th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {chainRows.map((chain, index) => (
                      <tr key={chain.key}>
                        <td className="px-4 py-3 text-gray-800">{chain.label}</td>
                        <td className="px-4 py-3 text-gray-600">{t("Provider {provider}", { provider: index % 2 ? "B" : "A" })}</td>
                        <td className="px-4 py-3 text-gray-600">{80 + index * 14} ms</td>
                        <td className="px-4 py-3 text-emerald-600">{t("Healthy")}</td>
                        <td className="px-4 py-3 text-right"><button type="button" onClick={() => setNotice(t("{chain} RPC test passed", { chain: chain.label }))} className="text-teal-600 hover:underline">{t("Test")}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "signers" && (
            <div>
              <h3 className="font-semibold text-gray-900">{t("Signers")}</h3>
              <p className="mt-1 text-sm text-gray-500">{t("Key policies used to sign batch tasks.")}</p>
              <div className="mt-4 space-y-3">
                {SIGNERS.map(([name, kind, state]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                    <div><div className="text-sm font-medium text-gray-800">{t(name)}</div><div className="text-xs text-gray-500">{t(kind)}</div></div>
                    <span className="text-xs font-medium text-emerald-600">{t(state)}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setNotice(t("Signer setup opened"))} className="mt-4 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">{t("Add signer")}</button>
            </div>
          )}

          {tab === "security" && (
            <div>
              <h3 className="font-semibold text-gray-900">{t("Security controls")}</h3>
              <div className="mt-4 space-y-4">
                {securityControls.map(([title, description, checked, setter]) => (
                  <label key={title} className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
                    <span><span className="block text-sm font-medium text-gray-800">{t(title)}</span><span className="mt-1 block text-xs text-gray-500">{t(description)}</span></span>
                    <input type="checkbox" checked={checked} onChange={(event) => setter(event.target.checked)} className="h-4 w-4 shrink-0 accent-teal-600" />
                  </label>
                ))}
              </div>
            </div>
          )}

          {tab === "audit" && (
            <div>
              <h3 className="font-semibold text-gray-900">{t("Audit logs")}</h3>
              <p className="mt-1 text-sm text-gray-500">{t("Recent administrative actions are recorded here.")}</p>
              <div className="mt-4 space-y-3">
                {AUDIT_LOGS.map((log, index) => (
                  <div key={log} className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 text-sm">
                    <span className="text-gray-700">{t(log)}</span>
                    <span className="shrink-0 text-xs text-gray-400">{t("{hours}h ago", { hours: index + 1 })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
