import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { json, parseJson, query } from "../db.js";
import { getExecutionConfig } from "./config.js";

const SECRET_PREFIX = "v1";

function masterKey() {
  const value = getExecutionConfig().vaultMasterKey.trim();
  if (!value) throw new Error("WALLET_VAULT_MASTER_KEY is required for signer operations");
  let key;
  if (/^[0-9a-fA-F]{64}$/.test(value)) key = Buffer.from(value, "hex");
  else {
    try { key = Buffer.from(value, "base64"); } catch { key = null; }
  }
  if (!key || key.length !== 32) throw new Error("WALLET_VAULT_MASTER_KEY must be a 32-byte hex or base64 value");
  return key;
}

export function normalizePrivateKey(value) {
  const key = String(value || "").trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(key) || /^0x0{64}$/.test(key)) throw new Error("A valid 32-byte EVM private key is required");
  return key.toLowerCase();
}

export function encryptPrivateKey(privateKey) {
  const key = masterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(normalizePrivateKey(privateKey), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { version: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64"), tag: tag.toString("base64"), ciphertext: ciphertext.toString("base64") };
}

export function decryptPrivateKey(payload) {
  if (!payload || payload.algorithm !== "aes-256-gcm" || payload.version !== 1) throw new Error("Unsupported encrypted signer payload");
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64")), decipher.final()]).toString("utf8");
  return normalizePrivateKey(plain);
}

function envSigner(address) {
  const raw = process.env.WALLET_PRIVATE_KEYS_JSON;
  if (!raw) return null;
  let map;
  try { map = JSON.parse(raw); } catch { throw new Error("WALLET_PRIVATE_KEYS_JSON is not valid JSON"); }
  const wanted = String(address || "").toLowerCase();
  if (Array.isArray(map)) {
    const match = map.find((entry) => String(entry.address || "").toLowerCase() === wanted);
    return match?.privateKey || null;
  }
  return map?.[wanted] || map?.[address] || null;
}

export async function upsertSigner({ walletId = null, address, label = "Imported signer", privateKey }) {
  const normalizedKey = normalizePrivateKey(privateKey);
  const account = privateKeyToAccount(normalizedKey);
  if (String(account.address).toLowerCase() !== String(address || "").toLowerCase()) throw new Error("Private key does not match wallet address");
  const id = `signer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const encrypted = encryptPrivateKey(normalizedKey);
  const metadata = { walletId: walletId ? String(walletId) : null, keyVersion: encrypted.version };
  const existing = await query("SELECT id FROM signers WHERE LOWER(address)=LOWER(?) AND status <> 'revoked' ORDER BY created_at DESC LIMIT 1", [account.address]);
  if (existing?.[0]) {
    await query("UPDATE signers SET label=?, secret_ref=?, config_data=?, status='active', updated_at=CURRENT_TIMESTAMP WHERE id=?", [label, "db:aes-256-gcm:v1", json(encrypted), existing[0].id]);
    return { id: existing[0].id, address: account.address, label, status: "active" };
  }
  const inserted = await query("INSERT INTO signers (id,type,label,address,secret_ref,config_data,status) VALUES (?,?,?,?,?,?,?)", [id, "private-key", label, account.address, "db:aes-256-gcm:v1", json(encrypted), "active"]);
  if (!inserted) throw new Error("MySQL is unavailable; encrypted signer was not persisted");
  return { id, address: account.address, label, status: "active" };
}

export async function getSignerPrivateKey(address) {
  const fromEnv = envSigner(address);
  if (fromEnv) {
    const key = normalizePrivateKey(fromEnv);
    const account = privateKeyToAccount(key);
    if (String(account.address).toLowerCase() !== String(address || "").toLowerCase()) throw new Error("Configured signer does not match wallet address");
    return key;
  }
  const rows = await query("SELECT id,secret_ref,config_data FROM signers WHERE LOWER(address)=LOWER(?) AND status='active' ORDER BY created_at DESC LIMIT 1", [String(address)]);
  if (!rows?.[0]) throw new Error(`No active signer configured for ${address}`);
  const encrypted = parseJson(rows[0].config_data, null);
  if (encrypted?.algorithm === "aes-256-gcm") return decryptPrivateKey(encrypted);

  // Older development imports stored the key in secret_ref. Never use that
  // value directly. When a vault key is available, migrate it immediately and
  // erase the legacy plaintext field before returning the signer.
  if (/^0x[0-9a-fA-F]{64}$/.test(String(rows[0].secret_ref || ""))) {
    if (!getExecutionConfig().vaultMasterKey) throw new Error("Legacy plaintext signer detected; configure WALLET_VAULT_MASTER_KEY and re-register or migrate this signer");
    const legacyKey = normalizePrivateKey(rows[0].secret_ref);
    const account = privateKeyToAccount(legacyKey);
    if (account.address.toLowerCase() !== String(address).toLowerCase()) throw new Error("Legacy signer address does not match wallet address");
    const migrated = encryptPrivateKey(legacyKey);
    await query("UPDATE signers SET secret_ref=?,config_data=?,type='private-key',updated_at=CURRENT_TIMESTAMP WHERE id=?", ["db:aes-256-gcm:v1", json(migrated), rows[0].id]);
    return legacyKey;
  }
  throw new Error("Signer has no supported encrypted key material");
}

export async function listSigners() {
  const rows = await query("SELECT id,type,label,address,status,last_used_at,created_at,updated_at FROM signers ORDER BY created_at DESC");
  return (rows || []).map((row) => ({ id: row.id, type: row.type, label: row.label, address: row.address, status: row.status, lastUsedAt: row.last_used_at, createdAt: row.created_at, updatedAt: row.updated_at }));
}

export async function revokeSigner(id) {
  const result = await query("UPDATE signers SET status='revoked', updated_at=CURRENT_TIMESTAMP WHERE id=?", [String(id)]);
  return !!result?.affectedRows;
}
