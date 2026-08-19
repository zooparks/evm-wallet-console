import { getOperation } from "@/lib/operations";
export const dynamic = "force-dynamic";
export async function GET(_request, context) { const { id } = await context.params; const operation = await getOperation(id); return operation ? Response.json({ operation }) : Response.json({ error: "Operation not found" }, { status: 404 }); }
