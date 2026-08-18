// 全部为写死的 mock 数据,仅用于原型走查,不接真实接口。

export const dashboardStats = {
  totalPortfolio: 1283420.52,
  changeToday: 2.31,
  wallets: 500,
  chains: 8,
  tokens: 126,
  pending: 23,
};

export const chainDistribution = [
  { chain: "Ethereum", value: 520300 },
  { chain: "Arbitrum", value: 310200 },
  { chain: "Base", value: 180500 },
];

export const portfolioTrend = [42, 45, 44, 48, 52, 50, 55, 58, 56, 61, 65, 63];

export const wallets = [
  { id: "w001", name: "Wallet 001", address: "0x1234567890abcdef1234567890abcdef12345678", group: "Trading", tags: ["hot"], totalAssets: 18230.22, native: 1.24, lastActivity: "2026-08-17 20:12", status: "Active",
    chains: { Ethereum: 10230, Arbitrum: 5120, Base: 2880 } },
  { id: "w002", name: "Wallet 002", address: "0xabc1789abcdef0123456789abcdef0123456789a", group: "Trading", tags: ["hot"], totalAssets: 12800.00, native: 0.86, lastActivity: "2026-08-17 19:40", status: "Active",
    chains: { Ethereum: 7200, Arbitrum: 3600, Base: 2000 } },
  { id: "w003", name: "Wallet 003", address: "0xdef41230abcdef5678901234567890abcdef567890", group: "Main", tags: [], totalAssets: 31200.00, native: 2.10, lastActivity: "2026-08-17 18:05", status: "Active",
    chains: { Ethereum: 21000, Arbitrum: 6200, Base: 4000 } },
  { id: "w004", name: "Wallet 004", address: "0x9a01cc22abcdef0123456789012345678901234cc", group: "Operations", tags: [], totalAssets: 4520.10, native: 0.32, lastActivity: "2026-08-16 11:22", status: "Active",
    chains: { Ethereum: 2200, Arbitrum: 1820, Base: 500.10 } },
  { id: "w005", name: "Wallet 005", address: "0x77ee4401abcdef890123456789012345678901234", group: "Trading", tags: ["hot"], totalAssets: 9100.55, native: 0.51, lastActivity: "2026-08-17 21:02", status: "Active",
    chains: { Ethereum: 5100, Arbitrum: 2500, Base: 1500.55 } },
  { id: "w006", name: "Wallet 006", address: "0x55aa8890abcdef123456789012345678901234567", group: "Test", tags: ["test"], totalAssets: 320.00, native: 0.02, lastActivity: "2026-08-10 09:11", status: "Inactive",
    chains: { Ethereum: 120, Arbitrum: 100, Base: 100 } },
  { id: "w007", name: "Wallet 007", address: "0x33cc1102abcdef456789012345678901234567890", group: "Main", tags: [], totalAssets: 27650.00, native: 1.88, lastActivity: "2026-08-17 17:48", status: "Active",
    chains: { Ethereum: 18000, Arbitrum: 6650, Base: 3000 } },
  { id: "w008", name: "Wallet 008", address: "0x11bb9933abcdef789012345678901234567890123", group: "Operations", tags: [], totalAssets: 6600.40, native: 0.44, lastActivity: "2026-08-15 08:30", status: "Active",
    chains: { Ethereum: 3600, Arbitrum: 2000, Base: 1000.40 } },
];

export const recentTasksMini = [
  { id: "1001", type: "Swap", chain: "Ethereum", wallets: 100, done: 82, status: "Running" },
  { id: "1002", type: "Bridge", chain: "Arbitrum", wallets: 80, done: 50, status: "Running" },
];

export const tasks = [
  { id: "1001", type: "Swap", chain: "Ethereum", pair: "USDC → ETH", wallets: 100, done: 82, status: "Running" },
  { id: "1002", type: "Bridge", chain: "Arbitrum", pair: "USDC", wallets: 80, done: 50, status: "Running" },
  { id: "1003", type: "Transfer", chain: "Base", pair: "USDT", wallets: 200, done: 200, status: "Success" },
  { id: "1004", type: "Swap", chain: "Ethereum", pair: "USDC → ETH", wallets: 40, done: 30, status: "Failed" },
];

export const taskDetails = {
  1001: {
    id: "1001",
    type: "Batch Swap",
    chain: "Ethereum",
    pair: "USDC → ETH",
    counts: { success: 82, running: 5, scheduled: 8, failed: 5 },
    total: 100,
    items: [
      { wallet: "Wallet 001", amount: 127.43, scheduled: "18:07:32", status: "Success" },
      { wallet: "Wallet 002", amount: 284.17, scheduled: "18:23:51", status: "Success" },
      { wallet: "Wallet 003", amount: 96.82, scheduled: "18:41:08", status: "Running" },
      { wallet: "Wallet 004", amount: 231.55, scheduled: "19:16:44", status: "Scheduled" },
      { wallet: "Wallet 005", amount: 143.29, scheduled: "19:52:13", status: "Failed", error: "Insufficient native balance" },
    ],
  },
  1004: {
    id: "1004",
    type: "Batch Swap",
    chain: "Ethereum",
    pair: "USDC → ETH",
    counts: { success: 30, running: 0, scheduled: 0, failed: 10 },
    total: 40,
    items: [
      { wallet: "Wallet 031", amount: 88.10, scheduled: "18:02:00", status: "Failed", error: "Insufficient native gas" },
      { wallet: "Wallet 074", amount: 200.00, scheduled: "18:04:10", status: "Failed", error: "Token balance too low" },
      { wallet: "Wallet 091", amount: 45.60, scheduled: "18:06:40", status: "Failed", error: "Simulation failed" },
      { wallet: "Wallet 010", amount: 120.00, scheduled: "18:08:00", status: "Success" },
    ],
  },
};

export const groups = [
  { name: "Trading", count: 150 },
  { name: "Main", count: 100 },
  { name: "Operations", count: 80 },
  { name: "Test", count: 50 },
];
