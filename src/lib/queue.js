import { createClient } from "redis";

let client;
let connectPromise;
let disabled = false;

function getClient() {
  if (client || disabled) return client;
  try {
    const host = process.env.REDIS_HOST || "127.0.0.1";
    const port = process.env.REDIS_PORT || "6379";
    const password = process.env.REDIS_PASSWORD;
    client = createClient({ url: `redis://${host}:${port}`, ...(password ? { password } : {}) });
    client.on("error", () => { /* Redis may be restarted without taking down the API. */ });
    connectPromise = client.connect().catch(() => { disabled = true; client = null; });
  } catch { disabled = true; }
  return client;
}

export async function enqueueTask(task) {
  const redis = getClient();
  if (connectPromise) await connectPromise;
  if (!redis || !redis.isReady) return { queued: false, reason: "redis-unavailable" };
  await redis.lPush("evm:tasks", JSON.stringify({ taskId: task.id, createdAt: new Date().toISOString() }));
  return { queued: true };
}

export async function enqueueOperation(operation) {
  const redis = getClient();
  if (connectPromise) await connectPromise;
  if (!redis || !redis.isReady) return { queued: false, reason: "redis-unavailable" };
  await redis.lPush("evm:operations", JSON.stringify({ operationId: operation.id, createdAt: new Date().toISOString() }));
  return { queued: true };
}
