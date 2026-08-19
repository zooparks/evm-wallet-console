"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CopyableAddress from "@/components/common/CopyableAddress";
import Select from "@/components/common/Select";
import { CHAIN_OPTIONS, chainKeyFromOption } from "@/components/common/chainOptions";
import { useI18n } from "@/i18n/I18nProvider";

const STEPS = ["Wallets", "Operation", "Amount", "Schedule", "Preview"];
const TOKENS = ["USDC", "USDT", "ETH", "WBTC"];
const input = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-teal-500";

function Summary({ label, value }) {
  return <div className="rounded-lg border border-gray-200 bg-gray-50 p-4"><div className="text-xs text-gray-500">{label}</div><div className="mt-1 font-semibold text-teal-700">{value}</div></div>;
}

export default function OperationWizard({ kind = "Swap" }) {
  const router = useRouter();
  const { t, formatNumber } = useI18n();
  const [allWallets, setAllWallets] = useState([]);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(allWallets.map((wallet) => wallet.id));
  const [search, setSearch] = useState("");
  const [sourceChain, setSourceChain] = useState("ETH");
  const [targetChain, setTargetChain] = useState("ARB");
  const [fromToken, setFromToken] = useState("USDC");
  const [toToken, setToToken] = useState("ETH");
  const [recipient, setRecipient] = useState("");
  const [amountMode, setAmountMode] = useState("range");
  const [min, setMin] = useState(80);
  const [max, setMax] = useState(300);
  const [customAmounts, setCustomAmounts] = useState({});
  const [csvText, setCsvText] = useState("");
  const [schedule, setSchedule] = useState("immediate");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("23:00");
  const [interval, setInterval] = useState(30);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [created, setCreated] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [quoteData, setQuoteData] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [executionStatus, setExecutionStatus] = useState(null);
  useEffect(() => { fetch("/api/wallets", { cache: "no-store" }).then((r) => r.json()).then((data) => { const wallets = data.wallets || []; setAllWallets(wallets); setSelected(wallets.map((wallet) => wallet.id)); }).catch(() => {}); }, []);
  useEffect(() => { fetch("/api/execution/status", { cache: "no-store" }).then((r) => r.json()).then((data) => setExecutionStatus(data.execution || null)).catch(() => {}); }, []);

  const visibleWallets = useMemo(() => allWallets.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()) || w.address.toLowerCase().includes(search.toLowerCase())), [allWallets, search]);
  const selectedWallets = useMemo(() => allWallets.filter((w) => selected.includes(w.id)), [allWallets, selected]);
  const csvAmounts = useMemo(() => {
    const values = {};
    csvText.split(/\r?\n/).slice(1).forEach((line) => {
      const [wallet, amount] = line.split(",").map((part) => part?.trim());
      if (wallet && Number.isFinite(Number(amount))) values[wallet.toLowerCase()] = Number(amount);
    });
    return values;
  }, [csvText]);
  const rows = useMemo(() => selectedWallets.map((wallet, index) => {
    const amount = amountMode === "fixed" ? Number(min) : amountMode === "percent" ? wallet.totalAssets * Number(min || 10) / 100 : amountMode === "custom" ? Number(customAmounts[wallet.id] || 0) : amountMode === "csv" ? Number(csvAmounts[wallet.id?.toLowerCase()] ?? csvAmounts[wallet.address.toLowerCase()] ?? 0) : Number(min) + ((index * 37) % Math.max(Number(max) - Number(min), 1));
    const scheduled = schedule === "immediate" ? "Now" : `${start} (+${index * Math.max(Number(interval), 5)}s)`;
    return { wallet, amount: Math.max(0, amount), scheduled };
  }), [selectedWallets, amountMode, min, max, customAmounts, csvAmounts, schedule, start, interval]);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const fmt = (value) => formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    if (step !== 4 || !selectedWallets[0] || kind === "Transfer") return undefined;
    const wallet = selectedWallets[0];
    const controller = new AbortController();
    const resetTimer = setTimeout(() => { setQuoteLoading(true); setQuoteError(""); setQuoteData(null); }, 0);
    fetch("/api/quotes", { method: "POST", headers: { "content-type": "application/json" }, signal: controller.signal, body: JSON.stringify({ type: kind.toLowerCase(), chain: chainKeyFromOption(sourceChain), targetChain: chainKeyFromOption(targetChain), fromToken, toToken, token: fromToken, amount: rows[0]?.amount, fromAddress: wallet.address, slippageBps: 50 }) })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Quote failed"); return data.quote; })
      .then((quote) => setQuoteData(quote))
      .catch((requestError) => { if (requestError.name !== "AbortError") setQuoteError(requestError.message); })
      .finally(() => setQuoteLoading(false));
    return () => { clearTimeout(resetTimer); controller.abort(); };
  }, [step, kind, selectedWallets, sourceChain, targetChain, fromToken, toToken, rows]);

  const error = step === 0 && selected.length === 0 ? t("Select at least one wallet to continue.") : step === 1 && kind === "Transfer" && !/^0x[0-9a-fA-F]{40}$/.test(recipient.trim()) ? t("Enter a valid EVM recipient address.") : step === 1 && kind === "Bridge" && sourceChain === targetChain ? t("Source and target chains must differ.") : step === 2 && (Number(min) <= 0 || (amountMode === "range" && Number(max) < Number(min)) || ((amountMode === "custom" || amountMode === "csv") && rows.some((row) => row.amount <= 0))) ? t("Check the amount values before continuing.") : step === 3 && schedule !== "immediate" && start >= end ? t("End time must be later than start time.") : "";
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const next = () => { if (!error) setStep((current) => Math.min(current + 1, STEPS.length - 1)); };
  const submit = async () => {
    setSubmitError("");
    try {
      // Keep short codes in the UI while sending canonical keys to the API.
      const response = await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: kind.toLowerCase(), chain: chainKeyFromOption(sourceChain), targetChain: kind === "Bridge" ? chainKeyFromOption(targetChain) : null, wallets: selected, amount: min, amountStrategy: { type: amountMode, amounts: Object.fromEntries(rows.map((row) => [row.wallet.id, row.amount])) }, schedule: { type: schedule, startTime: start, endTime: end, interval: Number(interval) }, token: fromToken, fromToken, targetToken: toToken, toToken, recipient, slippageBps: 50 }) });
      if (!response.ok) throw new Error("Task creation failed");
      setCreated(true); setConfirmOpen(false);
    } catch { setConfirmOpen(false); setSubmitError(t("Task creation failed. Please try again.")); }
  };

  return <div className="space-y-6">
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm"><div className="flex items-center">{STEPS.map((label, index) => <div key={label} className={`flex items-center ${index < STEPS.length - 1 ? "flex-1" : ""}`}><div className="flex items-center gap-2"><div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${index === step ? "bg-teal-600 text-white" : index < step ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"}`}>{index < step ? "✓" : index + 1}</div><span className="hidden text-xs font-medium sm:block">{t(label)}</span></div>{index < STEPS.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${index < step ? "bg-emerald-400" : "bg-gray-200"}`} />}</div>)}</div></div>
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-gray-100 px-6 py-4"><div><h1 className="font-semibold text-gray-900">{t("Batch {operation}", { operation: t(kind) })}</h1><p className="text-sm text-gray-500">{t("Step {current} of {total}", { current: step + 1, total: STEPS.length })} · {t(STEPS[step])}</p></div><span className="rounded-lg bg-gray-100 px-3 py-1 text-sm">{t("{count} wallets", { count: selected.length })}</span></div>
      <div className="p-6 md:p-8">
        {step === 0 && <div className="space-y-4"><input className={`${input} max-w-sm`} placeholder={t("Search wallet name or address")} value={search} onChange={(e) => setSearch(e.target.value)} /><div className="divide-y divide-gray-100 rounded-lg border border-gray-200">{visibleWallets.map((wallet) => <label key={wallet.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50"><input type="checkbox" checked={selected.includes(wallet.id)} onChange={() => toggle(wallet.id)} className="accent-teal-600" /><span className="font-medium text-gray-800">{wallet.name}</span><CopyableAddress address={wallet.address} /><span className="ml-auto font-medium text-teal-600">${fmt(wallet.totalAssets)}</span></label>)}</div>{visibleWallets.length === 0 && <p className="text-sm text-gray-500">{t("No matching wallets.")}</p>}</div>}
        {step === 1 && <div className="grid max-w-2xl grid-cols-2 gap-5"><label className="text-sm font-medium text-gray-700">{t("Source chain")}<Select options={CHAIN_OPTIONS} value={sourceChain} onChange={setSourceChain} /></label>{kind === "Bridge" && <label className="text-sm font-medium text-gray-700">{t("Target chain")}<Select options={CHAIN_OPTIONS} value={targetChain} onChange={setTargetChain} /></label>}<label className="text-sm font-medium text-gray-700">{t(kind === "Transfer" ? "Token" : "From token")}<Select options={TOKENS} value={fromToken} onChange={setFromToken} /></label>{kind === "Swap" && <label className="text-sm font-medium text-gray-700">{t("To token")}<Select options={TOKENS.filter((token) => token !== fromToken)} value={toToken} onChange={setToToken} /></label>}{kind === "Transfer" && <label className="col-span-2 text-sm font-medium text-gray-700">{t("Recipient address or group")}<input className={`${input} mt-1`} value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={t("0x... or Trading group")} /></label>}</div>}
        {step === 2 && <div className="space-y-5"><div className="grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-5">{[["fixed", "Fixed amount"], ["percent", "Percentage"], ["range", "Random range"], ["custom", "Custom"], ["csv", "CSV"]].map(([value, label]) => <button key={value} type="button" onClick={() => setAmountMode(value)} className={`rounded-lg border px-3 py-2 text-sm ${amountMode === value ? "border-teal-600 bg-teal-50 text-teal-700" : "border-gray-300"}`}>{t(label)}</button>)}</div>{["fixed", "percent", "range"].includes(amountMode) && <div className="grid max-w-md grid-cols-2 gap-4"><label className="text-sm">{t(amountMode === "percent" ? "Percent (%)" : "Minimum")}<input type="number" min="0" className={`${input} mt-1`} value={min} onChange={(e) => setMin(e.target.value)} /></label>{amountMode === "range" && <label className="text-sm">{t("Maximum")}<input type="number" min="0" className={`${input} mt-1`} value={max} onChange={(e) => setMax(e.target.value)} /></label>}</div>}{amountMode === "custom" && <div className="space-y-2"><p className="text-sm text-gray-500">{t("Set an amount for each selected wallet.")}</p><div className="grid max-w-xl gap-2">{selectedWallets.map((wallet) => <label key={wallet.id} className="flex items-center gap-3 text-sm"><span className="min-w-36 text-gray-700">{wallet.name}</span><input type="number" min="0" className={`${input} max-w-48`} value={customAmounts[wallet.id] ?? ""} onChange={(e) => setCustomAmounts((current) => ({ ...current, [wallet.id]: e.target.value }))} placeholder="0.00" /></label>)}</div></div>}{amountMode === "csv" && <label className="block max-w-2xl text-sm text-gray-700">{t("CSV amounts")}{<textarea className={`${input} mt-1 min-h-28 font-mono text-xs`} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="wallet,amount\n0x...,100" />}</label>}<p className="text-sm text-gray-500">{t("Preview")}: {rows.slice(0, 3).map((row) => `${fmt(row.amount)} ${fromToken}`).join(" · ")}</p></div>}
        {step === 3 && <div className="space-y-5"><div className="grid max-w-xl grid-cols-3 gap-2">{[["immediate", "Immediate"], ["window", "Time window"], ["fixed", "Scheduled"]].map(([value, label]) => <button key={value} type="button" onClick={() => setSchedule(value)} className={`rounded-lg border px-3 py-2 text-sm ${schedule === value ? "border-teal-600 bg-teal-50 text-teal-700" : "border-gray-300"}`}>{t(label)}</button>)}</div>{schedule !== "immediate" && <div className="grid max-w-lg grid-cols-3 gap-4"><label className="text-sm">{t("Start")}<input type="time" className={`${input} mt-1`} value={start} onChange={(e) => setStart(e.target.value)} /></label><label className="text-sm">{t("End")}<input type="time" className={`${input} mt-1`} value={end} onChange={(e) => setEnd(e.target.value)} /></label><label className="text-sm">{t("Interval (s)")}<input type="number" min="5" className={`${input} mt-1`} value={interval} onChange={(e) => setInterval(e.target.value)} /></label></div>}<p className="text-sm text-gray-500">{schedule === "immediate" ? t("Tasks will be submitted as soon as the batch is confirmed.") : t("Tasks run between {start} and {end}, at least {interval}s apart.", { start, end, interval })}</p></div>}
        {step === 4 && <div className="space-y-5"><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Summary label={t("Wallets")} value={rows.length} /><Summary label={t("Total amount")} value={`${fmt(total)} ${fromToken}`} /><Summary label={t("Estimated output")} value={kind === "Transfer" ? "-" : quoteLoading ? t("Loading...") : quoteData?.estimatedOutput ? `${quoteData.estimatedOutput} ${toToken}` : t("Unavailable")} /><Summary label={t("Estimated gas")} value={kind === "Transfer" ? t("Checked during execution") : quoteData?.gas?.gas ? `${quoteData.gas.gas} gas` : t("Unavailable")} /></div>{kind !== "Transfer" && <div className={`rounded-lg border px-4 py-3 text-sm ${quoteError ? "border-red-200 bg-red-50 text-red-700" : "border-teal-100 bg-teal-50 text-teal-700"}`}>{quoteLoading ? t("Fetching a live Li.Fi quote...") : quoteError ? quoteError : t("Live quote via {provider}; it will be refreshed before execution.", { provider: quoteData?.tool || "Li.Fi" })}</div>}{executionStatus && !executionStatus.enabled && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{t("Execution is disabled until the server signer vault is configured.")}</div>}<div className="overflow-x-auto rounded-lg border border-gray-200"><table className="w-full min-w-[620px] text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">{t("Wallet")}</th><th className="px-4 py-3">{t("Amount")}</th><th className="px-4 py-3">{t("Scheduled")}</th><th className="px-4 py-3">{t("Status")}</th></tr></thead><tbody className="divide-y divide-gray-100">{rows.map((row) => <tr key={row.wallet.id}><td className="px-4 py-2.5">{row.wallet.name}</td><td className="px-4 py-2.5 font-medium">{fmt(row.amount)} {fromToken}</td><td className="px-4 py-2.5 text-gray-500">{t(row.scheduled)}</td><td className="px-4 py-2.5"><span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{t("Ready")}</span></td></tr>)}</tbody></table></div></div>}
      </div>
      {error && <p className="border-t border-amber-100 bg-amber-50 px-6 py-3 text-sm text-amber-700">{error}</p>}
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4"><button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-40">{t("Back")}</button>{step < STEPS.length - 1 ? <button type="button" onClick={next} disabled={Boolean(error)} className="rounded-lg bg-teal-600 px-5 py-2 text-sm text-white disabled:opacity-40">{t("Continue")}</button> : <button type="button" onClick={() => setConfirmOpen(true)} disabled={rows.length === 0 || quoteLoading || Boolean(quoteError) || (kind !== "Transfer" && !quoteData)} className="rounded-lg bg-teal-600 px-5 py-2 text-sm text-white disabled:opacity-40">{t("Review & confirm")}</button>}</div>
    </section>
    {submitError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>}
    {confirmOpen && <div className="fixed inset-0 z-30 flex items-center justify-center bg-gray-900/40 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><h2 className="font-semibold text-gray-900">{t("Confirm batch {operation}", { operation: t(kind) })}</h2><p className="mt-2 text-sm text-gray-500">{t("Create {count} tasks for {total} {token}?", { count: rows.length, total: fmt(total), token: fromToken })}</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmOpen(false)} className="rounded-lg border px-4 py-2 text-sm">{t("Cancel")}</button><button type="button" onClick={submit} className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white">{t("Create tasks")}</button></div></div></div>}
    {created && <div className="fixed bottom-6 right-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-lg">{t("Batch task created.")} <button type="button" className="ml-2 font-semibold underline" onClick={() => router.push("/tasks")}>{t("View tasks")}</button></div>}
  </div>;
}
