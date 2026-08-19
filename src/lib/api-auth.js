import { timingSafeEqual } from "node:crypto";
import { getExecutionConfig } from "@/lib/execution/config";

/**
 * Keep write-route authorization in one place. The browser-facing console can
 * still be used for local task setup while execution is disabled, but enabling
 * the worker requires an explicit server token for every mutating API call.
 */
function suppliedToken(request) {
  return request?.headers?.get("x-execution-token")
    || request?.headers?.get("authorization")?.replace(/^Bearer\s+/i, "")
    || "";
}

function tokenMatches(expected, supplied) {
  const expectedBytes = Buffer.from(String(expected));
  const suppliedBytes = Buffer.from(String(supplied));
  return expectedBytes.length === suppliedBytes.length
    && timingSafeEqual(expectedBytes, suppliedBytes);
}

export function hasExecutionAccess(request) {
  const expected = String(process.env.EXECUTION_API_TOKEN || "").trim();
  return Boolean(expected) && tokenMatches(expected, suppliedToken(request).trim());
}

function authError(message, code) {
  return Object.assign(new Error(message), { code });
}

/**
 * Require the execution token unconditionally. Use this for endpoints that
 * write chain-observed data or manage encrypted signers.
 */
export function assertExecutionToken(request) {
  const expected = String(process.env.EXECUTION_API_TOKEN || "").trim();
  if (!expected) {
    throw authError("EXECUTION_API_TOKEN must be configured before this write operation", "EXECUTION_API_UNCONFIGURED");
  }
  if (!tokenMatches(expected, suppliedToken(request).trim())) {
    throw authError("Execution API authorization required", "UNAUTHORIZED");
  }
}

/**
 * Protect application write routes once real execution is enabled. When the
 * token is present it is always checked; with execution disabled and no token,
 * local development task setup remains available.
 */
export function assertWriteAccess(request) {
  const expected = String(process.env.EXECUTION_API_TOKEN || "").trim();
  if (!expected) {
    if (getExecutionConfig().enabled) {
      throw authError("EXECUTION_API_TOKEN must be configured before enabling execution", "EXECUTION_API_UNCONFIGURED");
    }
    return;
  }
  if (!tokenMatches(expected, suppliedToken(request).trim())) {
    throw authError("Execution API authorization required", "UNAUTHORIZED");
  }
}

export function authStatus(error) {
  if (error?.code === "EXECUTION_API_UNCONFIGURED") return 503;
  if (error?.code === "UNAUTHORIZED") return 401;
  return 400;
}
