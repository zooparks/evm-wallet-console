import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readEnv(text) {
  // The project .env uses `KEY = value`; parse it without exposing secrets.
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function identifier(value, label) {
  if (!/^[A-Za-z0-9_$-]+$/.test(value)) throw new Error(`Invalid ${label}`);
  return `\`${value.replaceAll("`", "``")}\``;
}

function charsetName(value) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error("Invalid charset");
  return value;
}

const env = readEnv(await readFile(resolve(projectRoot, ".env"), "utf8"));
if ((env.DB_TYPE || "mysql").toLowerCase() !== "mysql") {
  throw new Error("DB_TYPE must be mysql to run this migration");
}

const database = env.DB_NAME || "evm";
const charset = env.DB_CHARSET || "utf8mb4";
const host = env.DB_HOST || "127.0.0.1";
const port = Number(env.DB_PORT || 3306);
const user = env.DB_USER || "root";
const password = env.DB_PASS || "";
const expectedChainKeys = [
  "ethereum", "arbitrum", "linea", "bsc", "polygon", "base", "optimism", "zksync-era", "soneium",
];

const connection = await mysql.createConnection({
  host,
  port,
  user,
  password,
  charset,
  multipleStatements: true,
  supportBigNumbers: true,
  bigNumberStrings: true,
});

try {
  const dbIdentifier = identifier(database, "database name");
  const charsetIdentifier = charsetName(charset);
  if (charsetIdentifier.toLowerCase() !== "utf8mb4") {
    throw new Error("This schema requires DB_CHARSET=utf8mb4");
  }
  await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbIdentifier} CHARACTER SET ${charsetIdentifier} COLLATE utf8mb4_unicode_ci`);
  await connection.query(`ALTER DATABASE ${dbIdentifier} CHARACTER SET ${charsetIdentifier} COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE ${dbIdentifier}`);

  // The project intentionally keeps relationships application-managed. Remove
  // any legacy relational constraints before applying the schema.
  const [legacyRelations] = await connection.query(
    "SELECT TABLE_NAME, CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE()",
  );
  for (const relation of legacyRelations) {
    const tableIdentifier = identifier(String(relation.TABLE_NAME), "table name");
    const constraintIdentifier = identifier(String(relation.CONSTRAINT_NAME), "constraint name");
    await connection.query(`ALTER TABLE ${tableIdentifier} DROP FOREIGN KEY ${constraintIdentifier}`);
  }

  // DDL is idempotent, so this command is safe to run during deploys and locally.
  const migrationPath = resolve(projectRoot, "database", "migrations", "001_init.sql");
  const sql = await readFile(migrationPath, "utf8");
  await connection.query(sql);

  // Keep upgrades idempotent for databases created before the execution
  // worker was added. These are ordinary columns; no foreign keys are used.
  const compatibilityColumns = [
    ["destination_tx_hash", "ALTER TABLE task_items ADD COLUMN destination_tx_hash VARCHAR(128) NULL AFTER tx_hash"],
    ["claim_token", "ALTER TABLE task_items ADD COLUMN claim_token VARCHAR(96) NULL AFTER destination_tx_hash"],
  ];
  for (const [column, statement] of compatibilityColumns) {
    try { await connection.query(statement); }
    catch (error) { if (error.code !== "ER_DUP_FIELDNAME") throw error; }
  }
  try { await connection.query("ALTER TABLE task_items ADD KEY idx_task_items_claim (claim_token)"); }
  catch (error) { if (error.code !== "ER_DUP_KEYNAME") throw error; }
  await connection.query(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE applied_at = applied_at",
    ["001_init"],
  );

  const [remainingRelations] = await connection.query(
    "SELECT TABLE_NAME, CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE()",
  );
  if (remainingRelations.length) {
    throw new Error(`Relational constraint cleanup incomplete (${remainingRelations.length} remaining)`);
  }

  // Fail fast if a deployment leaves the enabled chain catalog out of sync.
  const [enabledChains] = await connection.query("SELECT chain_key FROM chains WHERE enabled = 1 ORDER BY chain_key");
  const activeChainKeys = enabledChains.map((row) => String(row.chain_key)).sort();
  const expectedSorted = [...expectedChainKeys].sort();
  if (JSON.stringify(activeChainKeys) !== JSON.stringify(expectedSorted)) {
    throw new Error(`Enabled chain catalog mismatch: ${activeChainKeys.join(", ")}`);
  }

  const [rows] = await connection.query("SHOW TABLES");
  const tableNames = rows.map((row) => Object.values(row)[0]).sort();
  console.log(`MySQL migration applied to ${database}: ${tableNames.length} tables`);
  console.log(tableNames.join(", "));
  console.log(`Enabled EVM chains: ${expectedChainKeys.join(", ")}`);
} finally {
  await connection.end();
}
