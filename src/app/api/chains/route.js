import { listChains } from "@/lib/chains/evm";

export const dynamic = "force-dynamic";

export async function GET() {
  const evmChains = listChains();
  // Keep the primary `chains` field EVM-only; non-EVM adapters remain explicit
  // so consumers do not accidentally treat Solana/Bitcoin as EVM RPC networks.
  const nonEvmChains = [
    { key: "solana", name: "Solana", id: 101, nativeSymbol: "SOL", family: "solana" },
    { key: "bitcoin", name: "Bitcoin", id: 0, nativeSymbol: "BTC", family: "bitcoin" },
  ];
  return Response.json({ chains: evmChains, evmChains, nonEvmChains });
}
