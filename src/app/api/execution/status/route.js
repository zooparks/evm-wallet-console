import { query } from "@/lib/db";
import { getExecutionConfig } from "@/lib/execution/config";
import { hasExecutionAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const config = getExecutionConfig();
  const authorized = hasExecutionAccess(request);
  let signerCount = 0;
  let encryptedSignerCount = 0;
  let legacySignerCount = 0;
  if (authorized) {
    try {
      const rows = await query("SELECT status,secret_ref,config_data FROM signers WHERE status='active'");
      signerCount = rows?.length || 0;
      for (const row of rows || []) {
        const encrypted = typeof row.config_data === "string" ? (() => { try { return JSON.parse(row.config_data); } catch { return null; } })() : row.config_data;
        if (encrypted?.algorithm === "aes-256-gcm") encryptedSignerCount += 1;
        else if (/^0x[0-9a-fA-F]{64}$/.test(String(row.secret_ref || ""))) legacySignerCount += 1;
      }
    } catch {}
  }
  const execution = { enabled: config.enabled, lifiConfigured: Boolean(config.lifiBaseUrl), worker: { intervalMs: config.workerIntervalMs, concurrency: config.workerConcurrency } };
  // Signer inventory and legacy-key detection are operational details. Keep
  // them behind the same token used for signer management.
  if (authorized) Object.assign(execution, { vaultConfigured: Boolean(config.vaultMasterKey), signerCount, encryptedSignerCount, legacySignerCount });
  return Response.json({ execution });
}
