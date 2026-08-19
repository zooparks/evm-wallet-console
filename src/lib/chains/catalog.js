/**
 * Canonical EVM chain metadata shared by server routes and client selectors.
 * The key is stable for storage/API use; labels and codes are presentation-only.
 */
export const EVM_CHAIN_CATALOG = [
  { key: "ethereum", code: "ETH", name: "Ethereum", label: "ETH", id: 1, nativeSymbol: "ETH", rpc: "https://ethereum-rpc.publicnode.com", rpcEnv: "EVM_RPC_ETHEREUM" },
  { key: "arbitrum", code: "ARB", name: "Arbitrum One", label: "ARB", id: 42161, nativeSymbol: "ETH", rpc: "https://arb1.arbitrum.io/rpc", rpcEnv: "EVM_RPC_ARBITRUM" },
  { key: "linea", code: "LINEA", name: "Linea", label: "LINEA", id: 59144, nativeSymbol: "ETH", rpc: "https://rpc.linea.build", rpcEnv: "EVM_RPC_LINEA" },
  { key: "bsc", code: "BSC", name: "BNB Smart Chain", label: "BSC", id: 56, nativeSymbol: "BNB", rpc: "https://bsc-rpc.publicnode.com", rpcEnv: "EVM_RPC_BSC" },
  { key: "polygon", code: "POLYGON", name: "Polygon", label: "POLYGON", id: 137, nativeSymbol: "POL", rpc: "https://polygon-bor-rpc.publicnode.com", rpcEnv: "EVM_RPC_POLYGON" },
  { key: "base", code: "BASE", name: "Base", label: "BASE", id: 8453, nativeSymbol: "ETH", rpc: "https://mainnet.base.org", rpcEnv: "EVM_RPC_BASE" },
  { key: "optimism", code: "OPTIMISM", name: "OP Mainnet", label: "OPTIMISM", id: 10, nativeSymbol: "ETH", rpc: "https://mainnet.optimism.io", rpcEnv: "EVM_RPC_OPTIMISM" },
  { key: "zksync-era", code: "ZKSYNC ERA", name: "zkSync Era", label: "ZKSYNC ERA", id: 324, nativeSymbol: "ETH", rpc: "https://mainnet.era.zksync.io", rpcEnv: "EVM_RPC_ZKSYNC_ERA" },
  { key: "soneium", code: "SONEIUM", name: "Soneium", label: "SONEIUM", id: 1868, nativeSymbol: "ETH", rpc: "https://rpc.soneium.org", rpcEnv: "EVM_RPC_SONEIUM" },
];

/** Requested short labels used by every client-side chain selector. */
export const EVM_CHAIN_OPTIONS = EVM_CHAIN_CATALOG.map((chain) => chain.label);

const aliases = {
  eth: "ethereum",
  ethereum: "ethereum",
  arb: "arbitrum",
  arbitrum: "arbitrum",
  "arbitrum-one": "arbitrum",
  linea: "linea",
  bsc: "bsc",
  "bnb-smart-chain": "bsc",
  "binance-smart-chain": "bsc",
  polygon: "polygon",
  pol: "polygon",
  matic: "polygon",
  base: "base",
  op: "optimism",
  optimism: "optimism",
  "op-mainnet": "optimism",
  "zksync-era": "zksync-era",
  zksync: "zksync-era",
  zksyncera: "zksync-era",
  soneium: "soneium",
};

/** Normalize user-facing names and short codes to the canonical storage key. */
export function normalizeChainKey(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  return aliases[normalized] || normalized;
}

/** Return the display label while preserving unknown values for diagnostics. */
export function chainLabel(value) {
  const key = normalizeChainKey(value);
  return EVM_CHAIN_CATALOG.find((chain) => chain.key === key)?.label || String(value || "");
}
