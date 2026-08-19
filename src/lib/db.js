import mysql from "mysql2/promise";

let pool;
let unavailable = false;

function env(name, fallback = "") {
  return process.env[name] || fallback;
}

export function getDb() {
  if (pool || unavailable) return pool;
  try {
    pool = mysql.createPool({
      host: env("DB_HOST", "127.0.0.1"), port: Number(env("DB_PORT", 3306)),
      user: env("DB_USER", "root"), password: env("DB_PASS"), database: env("DB_NAME", "evm"),
      charset: env("DB_CHARSET", "utf8mb4"), waitForConnections: true, connectionLimit: 5,
      decimalNumbers: true, supportBigNumbers: true,
    });
  } catch { unavailable = true; }
  return pool;
}

export async function query(sql, params = []) {
  const client = getDb();
  if (!client) return null;
  try { const [rows] = await client.query(sql, params); return rows; }
  catch (error) { if (["ECONNREFUSED", "ENOTFOUND", "ER_BAD_DB_ERROR"].includes(error.code)) unavailable = true; throw error; }
}

// Use a short transaction for multi-row task creation so a partial batch is
// never exposed to the worker. Callers still manage application-level IDs and
// intentionally do not rely on database foreign keys.
export async function withTransaction(callback) {
  const client = getDb();
  if (!client) return null;
  const connection = await client.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback((sql, params = []) => connection.query(sql, params).then(([rows]) => rows));
    await connection.commit();
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch {}
    throw error;
  } finally { connection.release(); }
}

// MySQL named locks coordinate workers running in different Node processes.
// This keeps nonce allocation serialized for one wallet even when more than
// one worker instance is deployed. The lock is connection-scoped and released
// in the same connection that acquired it.
export async function withAdvisoryLock(name, callback, timeoutSeconds = 0) {
  const client = getDb();
  if (!client) throw new Error("MySQL is required for wallet execution locks");
  const connection = await client.getConnection();
  const lockName = `evm-wallet:${String(name).slice(0, 48)}`;
  let acquired = false;
  try {
    const [rows] = await connection.query("SELECT GET_LOCK(?, ?) AS acquired", [lockName, Math.max(0, Number(timeoutSeconds))]);
    acquired = Number(rows?.[0]?.acquired) === 1;
    if (!acquired) throw Object.assign(new Error("Wallet is busy in another worker"), { code: "WALLET_LOCK_BUSY", retryable: true });
    return await callback();
  } finally {
    if (acquired) { try { await connection.query("SELECT RELEASE_LOCK(?)", [lockName]); } catch {} }
    connection.release();
  }
}

export const json = (value) => value == null ? null : JSON.stringify(value);
export const parseJson = (value, fallback = null) => { if (value == null) return fallback; if (typeof value !== "string") return value; try { return JSON.parse(value); } catch { return fallback; } };
