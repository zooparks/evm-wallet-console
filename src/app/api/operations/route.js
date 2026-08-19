import { createOperation, listOperations } from "@/lib/operations";
import { assertWriteAccess, authStatus } from "@/lib/api-auth";
export const dynamic = "force-dynamic";
export async function GET() { return Response.json({ operations: await listOperations() }); }
export async function POST(request) { try { assertWriteAccess(request); const operation = await createOperation(await request.json()); return Response.json({ operation }, { status: 201 }); } catch (error) { return Response.json({ error: error.message || "Invalid operation" }, { status: authStatus(error) }); } }
