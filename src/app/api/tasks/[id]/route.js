import { getTask, updateTask } from "@/lib/store";
import { assertWriteAccess, authStatus } from "@/lib/api-auth";
export const dynamic = "force-dynamic";
export async function GET(_request, context) { const { id } = await context.params; const task = await getTask(id); return task ? Response.json({ task }) : Response.json({ error: "Task not found" }, { status: 404 }); }
export async function PATCH(request, context) {
  try {
    assertWriteAccess(request);
    const { id } = await context.params;
    const body = await request.json();
    const task = await updateTask(id, body);
    return task ? Response.json({ task }) : Response.json({ error: "Task not found" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: authStatus(error) });
  }
}
