export { GET, POST } from "@/app/api/chains/solana/route";

// Keep segment configuration statically analyzable for Next.js 16.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
