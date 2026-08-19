import { createTask, listTasks } from "@/lib/store";
import { assertWriteAccess, authStatus } from "@/lib/api-auth";
export const dynamic = "force-dynamic";
export async function GET(request) { const q = new URL(request.url).searchParams; return Response.json({ tasks: await listTasks({ status: q.get("status"), type: q.get("type") }) }); }
export async function POST(request) {
  try {
    assertWriteAccess(request);
    return Response.json({ task: await createTask(await request.json()) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: authStatus(error) });
  }
}
