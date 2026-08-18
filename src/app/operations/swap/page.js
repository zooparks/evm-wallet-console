"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { wallets as allWallets } from "@/data/mock";
import CopyableAddress from "@/components/common/CopyableAddress";
import Select from "@/components/common/Select";

const STEPS = [
  { title: "选择钱包", desc: "勾选参与本次批量兑换的钱包" },
  { title: "交易对", desc: "选择网络与兑换的代币对" },
  { title: "金额策略", desc: "设置每个钱包的兑换金额" },
  { title: "执行计划", desc: "设置执行时间与间隔" },
  { title: "确认提交", desc: "预览全部任务并确认" },
];

// 确定性伪随机,避免每次渲染数字乱跳
function pseudoRandom(seed) {
  const x = Math.sin(seed * 9973) * 10000;
  return x - Math.floor(x);
}

function fmt(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addSeconds(base, secs) {
  const d = new Date(base.getTime() + secs * 1000);
  return d.toTimeString().slice(0, 8);
}

function SearchIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 ${className || ""}`}>
      <path d="M10 2a8 8 0 1 0 4.9 14.32l4.4 4.38 1.4-1.4-4.38-4.4A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" />
    </svg>
  );
}

export default function BatchSwapPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState(allWallets.map((w) => w.id));
  const [fromToken, setFromToken] = useState("USDC");
  const [toToken, setToToken] = useState("ETH");
  const [amountStrategy, setAmountStrategy] = useState("random");
  const [amountMin, setAmountMin] = useState(80);
  const [amountMax, setAmountMax] = useState(300);
  const [scheduleStrategy, setScheduleStrategy] = useState("window");
  const [windowStart, setWindowStart] = useState("18:00");
  const [windowEnd, setWindowEnd] = useState("23:00");
  const [minInterval, setMinInterval] = useState(30);
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedWallets = allWallets.filter((w) => selectedIds.includes(w.id));

  const rows = useMemo(() => {
    const base = new Date();
    base.setHours(18, 0, 0, 0);
    return selectedWallets.map((w, i) => {
      const amount =
        amountStrategy === "fixed"
          ? 100
          : amountStrategy === "percentage"
          ? w.totalAssets * (0.1 + pseudoRandom(i + 1) * 0.2)
          : amountMin + pseudoRandom(i + 1) * (amountMax - amountMin);
      const scheduled = addSeconds(base, i * Math.max(minInterval, 5));
      const quote = amount / 3260; // 假设 ETH 价格,仅用于原型展示
      return { wallet: w.name, amount, scheduled, quote, status: "Ready" };
    });
  }, [selectedWallets, amountStrategy, amountMin, amountMax, minInterval]);

  const totalInput = rows.reduce((s, r) => s + r.amount, 0);
  const totalOutput = rows.reduce((s, r) => s + r.quote, 0);

  function toggleWallet(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-teal-500";

  return (
    <div className="space-y-6">
      {/* 步骤条 */}
      <div className="card rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.title} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    i === step
                      ? "bg-teal-600 text-white shadow-sm"
                      : i < step
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <div className="hidden sm:block">
                  <div className={`text-sm font-medium ${i === step ? "text-gray-900" : "text-gray-500"}`}>{s.title}</div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-4 h-0.5 flex-1 rounded-full ${i < step ? "bg-emerald-400" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 主卡片 */}
      <div className="card rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* 步骤标题 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4 md:px-8">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Step {step + 1} · {STEPS[step].title}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">{STEPS[step].desc}</p>
          </div>
          <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
            已选 <span className="font-semibold text-teal-700">{selectedIds.length}</span> 个钱包
          </div>
        </div>

        <div className="p-6 md:p-8">
          {step === 0 && (
            <div className="space-y-4">
              <div className="relative w-full sm:w-72">
                <SearchIcon />
                <input type="text" placeholder="搜索钱包..." className={`${inputCls} pl-10`} />
              </div>
              <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200">
                {allWallets.map((w) => (
                  <label key={w.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-50">
                    <input type="checkbox" className="h-4 w-4 rounded accent-teal-600" checked={selectedIds.includes(w.id)} onChange={() => toggleWallet(w.id)} />
                    <span className="font-medium text-gray-800">{w.name}</span>
                    <span className="ml-auto"><CopyableAddress address={w.address} /></span>
                    <span className="w-24 text-right font-medium text-teal-600">${w.totalAssets.toLocaleString()}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid max-w-2xl grid-cols-2 gap-5">
              <div>
                <div className="mb-1.5 text-sm font-medium text-gray-700">网络</div>
                <Select options={["Ethereum"]} value="Ethereum" onChange={() => {}} className="w-full" />
              </div>
              <div />
              <div>
                <div className="mb-1.5 text-sm font-medium text-gray-700">支付代币 (From)</div>
                <Select options={["USDC", "USDT"]} value={fromToken} onChange={setFromToken} className="w-full" />
              </div>
              <div>
                <div className="mb-1.5 text-sm font-medium text-gray-700">目标代币 (To)</div>
                <Select options={["ETH", "WBTC"]} value={toToken} onChange={setToToken} className="w-full" />
              </div>
              <div className="col-span-2 mt-1 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                已选钱包:{selectedIds.length} 个 · {fromToken} 总余额:
                <span className="font-semibold text-teal-700"> {fmt(selectedWallets.reduce((s, w) => s + w.totalAssets, 0))}</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["fixed", "固定金额"],
                  ["percentage", "按百分比"],
                  ["random", "随机区间"],
                  ["custom", "自定义"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setAmountStrategy(val)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      amountStrategy === val
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {amountStrategy === "random" && (
                <div className="grid max-w-md grid-cols-2 gap-4">
                  <div>
                    <div className="mb-1.5 text-sm font-medium text-gray-700">最小值 ({fromToken})</div>
                    <input type="number" value={amountMin} onChange={(e) => setAmountMin(Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <div className="mb-1.5 text-sm font-medium text-gray-700">最大值 ({fromToken})</div>
                    <input type="number" value={amountMax} onChange={(e) => setAmountMax(Number(e.target.value))} className={inputCls} />
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-4 py-3">钱包</th>
                      <th className="px-4 py-3">生成金额(前 5 条)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.slice(0, 5).map((r) => (
                      <tr key={r.wallet}>
                        <td className="px-4 py-2.5 text-gray-700">{r.wallet}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{fmt(r.amount)} {fromToken}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["immediate", "立即执行"],
                  ["fixed", "指定时间"],
                  ["window", "时间窗口"],
                  ["custom", "自定义"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setScheduleStrategy(val)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      scheduleStrategy === val
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {scheduleStrategy === "window" && (
                <div className="grid max-w-2xl grid-cols-3 gap-4">
                  <div>
                    <div className="mb-1.5 text-sm font-medium text-gray-700">开始时间</div>
                    <input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <div className="mb-1.5 text-sm font-medium text-gray-700">结束时间</div>
                    <input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <div className="mb-1.5 text-sm font-medium text-gray-700">最小间隔 (秒)</div>
                    <input type="number" value={minInterval} onChange={(e) => setMinInterval(Number(e.target.value))} className={inputCls} />
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-4 py-3">钱包</th>
                      <th className="px-4 py-3">金额</th>
                      <th className="px-4 py-3">计划时间(前 5 条)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.slice(0, 5).map((r) => (
                      <tr key={r.wallet}>
                        <td className="px-4 py-2.5 text-gray-700">{r.wallet}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{fmt(r.amount)}</td>
                        <td className="px-4 py-2.5 text-gray-500">{r.scheduled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="text-sm text-gray-500">
                Ethereum · {fromToken} → {toToken} · 共 {rows.length} 个钱包
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <SummaryCard label="钱包数" value={rows.length} />
                <SummaryCard label="总投入" value={`${fmt(totalInput)} ${fromToken}`} />
                <SummaryCard label="预计产出" value={`${fmt(totalOutput)} ${toToken}`} />
                <SummaryCard label="预计 Gas" value="$183.20" />
              </div>
              <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-4 py-3">钱包</th>
                      <th className="px-4 py-3">金额</th>
                      <th className="px-4 py-3">计划时间</th>
                      <th className="px-4 py-3">报价</th>
                      <th className="px-4 py-3">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((r) => (
                      <tr key={r.wallet}>
                        <td className="px-4 py-2.5 text-gray-700">{r.wallet}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{fmt(r.amount)}</td>
                        <td className="px-4 py-2.5 text-gray-500">{r.scheduled}</td>
                        <td className="px-4 py-2.5 text-gray-800">{r.quote.toFixed(4)} {toToken}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-6 py-4 md:px-8">
          <button
            onClick={back}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M10.8 12l5.4-5.4-1.4-1.4L8 12l6.8 6.8 1.4-1.4L10.8 12z" />
            </svg>
            上一步
          </button>
          <div className="text-xs text-gray-400">
            Step {step + 1} / {STEPS.length}
          </div>
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">
              下一步
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M13.2 12L7.8 17.4l1.4 1.4L16 12 9.2 5.2 7.8 6.6 13.2 12z" />
              </svg>
            </button>
          ) : (
            <button onClick={() => setShowConfirm(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M9 16.2l-3.5-3.5L4 14.1l5 5 11-11-1.4-1.4L9 16.2z" />
              </svg>
              确认并创建批量任务
            </button>
          )}
        </div>
      </div>

      {/* 确认弹窗 */}
      {showConfirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
          <div className="w-[28rem] rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900">确认批量任务</h2>
            <p className="mt-2 text-sm text-gray-500">将创建 {rows.length} 个兑换任务,请在下方核对汇总信息。</p>
            <div className="mt-4 space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">预计总投入</span><span className="font-medium text-gray-900">{fmt(totalInput)} {fromToken}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">预计总产出</span><span className="font-medium text-gray-900">{fmt(totalOutput)} {toToken}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">预计 Gas</span><span className="font-medium text-gray-900">$183.20</span></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100">取消</button>
              <button onClick={() => router.push("/tasks")} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">确认创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</div>
      <div className="mt-1.5 text-lg font-semibold text-teal-600">{value}</div>
    </div>
  );
}
