import { listTasks, listWallets } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  const wallets = await listWallets(); const tasks = await listTasks();
  const chainDistribution = {}; wallets.forEach((wallet) => Object.entries(wallet.chains || {}).forEach(([chain, value]) => { chainDistribution[chain] = (chainDistribution[chain] || 0) + Number(value || 0); }));
  const values = Object.values(chainDistribution); const total = values.reduce((sum, value) => sum + value, 0);
  // Trend is derived from current chain totals until historical snapshots are available.
  // Historical snapshots are added later; repeat the current total as a visible baseline meanwhile.
  const portfolioTrend = total > 0 ? Array.from({ length: 12 }, () => Math.round(total)) : [];
  return Response.json({ stats: { totalPortfolio: total, changeToday: 0, wallets: wallets.length, chains: Object.keys(chainDistribution).length, tokens: 0, pending: tasks.filter((task) => ["pending", "running", "scheduled"].includes(String(task.status).toLowerCase())).length }, chainDistribution: Object.entries(chainDistribution).map(([chain, value]) => ({ chain, value })), portfolioTrend, recentTasks: tasks.slice(0, 5).map((task) => ({ ...task, wallets: task.walletCount || task.wallets || task.items?.length || 0, done: task.done || 0 })) });
}
