import { listGroups } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() { return Response.json({ groups: await listGroups() }); }
