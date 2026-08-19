-- EVM Wallet Console initial schema.
-- Compatible with MySQL 5.7. JSON columns intentionally have no defaults because
-- MySQL 5.7 does not allow expression defaults for JSON/TEXT columns.
-- Relationships are application-managed by design; no database-level
-- relational constraints are declared.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Identity and wallet organization.
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(191) NULL,
  display_name VARCHAR(120) NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'operator',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallet groups/tags are linked through ordinary ID columns and indexes.
CREATE TABLE IF NOT EXISTS wallet_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallet_groups_user_name (user_id, name),
  KEY idx_wallet_groups_user (user_id)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallet_tags (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  name VARCHAR(80) NOT NULL,
  color VARCHAR(16) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallet_tags_user_name (user_id, name),
  KEY idx_wallet_tags_user (user_id)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Network catalog and wallet records.
CREATE TABLE IF NOT EXISTS chains (
  chain_key VARCHAR(32) NOT NULL,
  chain_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  native_symbol VARCHAR(24) NOT NULL,
  rpc_url VARCHAR(512) CHARACTER SET ascii NULL,
  explorer_url VARCHAR(512) CHARACTER SET ascii NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (chain_key),
  UNIQUE KEY uq_chains_chain_id (chain_id),
  KEY idx_chains_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  group_id BIGINT UNSIGNED NULL,
  name VARCHAR(120) NOT NULL,
  address VARCHAR(128) NOT NULL,
  wallet_type VARCHAR(32) NOT NULL DEFAULT 'evm',
  status VARCHAR(32) NOT NULL DEFAULT 'Active',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  total_assets DECIMAL(38,18) NULL,
  native_balance DECIMAL(38,18) NULL,
  last_activity_at DATETIME NULL,
  last_sync_at DATETIME NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wallets_user (user_id),
  KEY idx_wallets_group (group_id),
  KEY idx_wallets_address (address),
  KEY idx_wallets_status (status),
  KEY idx_wallets_enabled (enabled),
  UNIQUE KEY uq_wallets_user_address (user_id, address)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallet_tag_relations (
  wallet_id VARCHAR(64) NOT NULL,
  tag_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (wallet_id, tag_id),
  KEY idx_wallet_tag_relations_tag (tag_id)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  chain_key VARCHAR(32) NOT NULL,
  contract_address VARCHAR(128) CHARACTER SET ascii NOT NULL DEFAULT '',
  symbol VARCHAR(32) NOT NULL,
  name VARCHAR(120) NULL,
  decimals TINYINT UNSIGNED NOT NULL DEFAULT 18,
  is_native TINYINT(1) NOT NULL DEFAULT 0,
  logo_url VARCHAR(512) CHARACTER SET ascii NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tokens_chain_contract (chain_key, contract_address),
  KEY idx_tokens_symbol (symbol)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallet_balances (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wallet_id VARCHAR(64) NOT NULL,
  chain_key VARCHAR(32) NOT NULL,
  token_id BIGINT UNSIGNED NOT NULL,
  raw_amount VARCHAR(80) NOT NULL DEFAULT '0',
  amount DECIMAL(38,18) NULL,
  usd_value DECIMAL(38,18) NULL,
  block_number BIGINT UNSIGNED NULL,
  synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallet_balances_wallet_chain_token (wallet_id, chain_key, token_id),
  KEY idx_wallet_balances_chain (chain_key),
  KEY idx_wallet_balances_token (token_id),
  KEY idx_wallet_balances_synced (synced_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS token_prices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_id BIGINT UNSIGNED NOT NULL,
  price_usd DECIMAL(38,18) NOT NULL,
  source VARCHAR(80) NULL,
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_token_prices_token_time (token_id, captured_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS batch_tasks (
  id VARCHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  type VARCHAR(32) NOT NULL,
  source_chain VARCHAR(32) NULL,
  destination_chain VARCHAR(32) NULL,
  from_token_id BIGINT UNSIGNED NULL,
  to_token_id BIGINT UNSIGNED NULL,
  from_token VARCHAR(128) NULL,
  to_token VARCHAR(128) NULL,
  pair VARCHAR(255) NULL,
  wallet_count INT UNSIGNED NOT NULL DEFAULT 0,
  done_count INT UNSIGNED NOT NULL DEFAULT 0,
  amount_strategy JSON NULL,
  schedule_strategy JSON NULL,
  execution_config JSON NULL,
  counts JSON NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Draft',
  error_message VARCHAR(1000) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_batch_tasks_user (user_id),
  KEY idx_batch_tasks_status (status),
  KEY idx_batch_tasks_type (type),
  KEY idx_batch_tasks_created (created_at),
  KEY idx_batch_tasks_source_chain (source_chain)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS swap_tasks (
  batch_task_id VARCHAR(64) NOT NULL,
  router VARCHAR(120) NULL,
  slippage_bps INT UNSIGNED NULL,
  quote_id BIGINT UNSIGNED NULL,
  metadata JSON NULL,
  PRIMARY KEY (batch_task_id)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bridge_tasks (
  batch_task_id VARCHAR(64) NOT NULL,
  provider VARCHAR(120) NULL,
  source_chain VARCHAR(32) NULL,
  destination_chain VARCHAR(32) NULL,
  source_token VARCHAR(128) NULL,
  destination_token VARCHAR(128) NULL,
  metadata JSON NULL,
  PRIMARY KEY (batch_task_id),
  KEY idx_bridge_tasks_route (source_chain, destination_chain)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transfer_tasks (
  batch_task_id VARCHAR(64) NOT NULL,
  recipient VARCHAR(128) NULL,
  token VARCHAR(128) NULL,
  metadata JSON NULL,
  PRIMARY KEY (batch_task_id)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_items (
  id VARCHAR(96) NOT NULL,
  batch_task_id VARCHAR(64) NOT NULL,
  wallet_id VARCHAR(64) NOT NULL,
  amount DECIMAL(38,18) NULL,
  amount_text VARCHAR(255) NULL,
  amount_data JSON NULL,
  scheduled_at DATETIME NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Queued',
  tx_hash VARCHAR(128) NULL,
  destination_tx_hash VARCHAR(128) NULL,
  claim_token VARCHAR(96) NULL,
  retry_count INT UNSIGNED NOT NULL DEFAULT 0,
  error_code VARCHAR(120) NULL,
  error_message VARCHAR(1000) NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_task_items_batch_wallet (batch_task_id, wallet_id),
  KEY idx_task_items_wallet (wallet_id),
  KEY idx_task_items_status_schedule (status, scheduled_at),
  KEY idx_task_items_tx_hash (tx_hash),
  KEY idx_task_items_claim (claim_token)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operations (
  id VARCHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  type VARCHAR(32) NOT NULL,
  chain VARCHAR(32) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  wallet_ids JSON NULL,
  amount_data JSON NULL,
  recipient VARCHAR(128) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_operations_user (user_id),
  KEY idx_operations_status (status),
  KEY idx_operations_type (type)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quotes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_task_id VARCHAR(64) NULL,
  task_item_id VARCHAR(96) NULL,
  chain VARCHAR(32) NULL,
  input_token VARCHAR(128) NULL,
  output_token VARCHAR(128) NULL,
  input_amount VARCHAR(255) NULL,
  estimated_output VARCHAR(255) NULL,
  gas_estimate VARCHAR(255) NULL,
  fee VARCHAR(255) NULL,
  slippage_bps INT UNSIGNED NULL,
  response_data JSON NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_quotes_task_item (task_item_id),
  KEY idx_quotes_batch_task (batch_task_id),
  KEY idx_quotes_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS simulations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_task_id VARCHAR(64) NULL,
  task_item_id VARCHAR(96) NULL,
  chain VARCHAR(32) NULL,
  request_data JSON NULL,
  result_data JSON NULL,
  success TINYINT(1) NULL,
  gas_hex VARCHAR(80) NULL,
  gas_amount VARCHAR(80) NULL,
  error_message VARCHAR(1000) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_simulations_task_item (task_item_id),
  KEY idx_simulations_batch_task (batch_task_id),
  KEY idx_simulations_created (created_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(128) NOT NULL,
  hash VARCHAR(128) NULL,
  wallet_id VARCHAR(64) NULL,
  batch_task_id VARCHAR(64) NULL,
  task_item_id VARCHAR(96) NULL,
  chain VARCHAR(32) NULL,
  type VARCHAR(32) NULL,
  amount_text VARCHAR(255) NULL,
  amount_data JSON NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  block_number BIGINT UNSIGNED NULL,
  gas_used VARCHAR(80) NULL,
  gas_price VARCHAR(80) NULL,
  fee_native DECIMAL(38,18) NULL,
  fee_usd DECIMAL(38,18) NULL,
  source_tx_hash VARCHAR(128) NULL,
  destination_tx_hash VARCHAR(128) NULL,
  error_code VARCHAR(120) NULL,
  error_message VARCHAR(1000) NULL,
  raw_data JSON NULL,
  submitted_at DATETIME NULL,
  confirmed_at DATETIME NULL,
  timestamp_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transactions_hash (hash),
  KEY idx_transactions_wallet_time (wallet_id, created_at),
  KEY idx_transactions_task_item (task_item_id),
  KEY idx_transactions_batch_task (batch_task_id),
  KEY idx_transactions_chain_status (chain, status)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transaction_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id VARCHAR(128) NOT NULL,
  log_index INT UNSIGNED NOT NULL,
  address VARCHAR(128) NULL,
  topic0 VARCHAR(132) NULL,
  topic1 VARCHAR(132) NULL,
  topic2 VARCHAR(132) NULL,
  topic3 VARCHAR(132) NULL,
  data LONGTEXT NULL,
  decoded_data JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transaction_logs_tx_index (transaction_id, log_index)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bridge_messages (
  id VARCHAR(96) NOT NULL,
  bridge_task_id VARCHAR(64) NOT NULL,
  source_tx_hash VARCHAR(128) NULL,
  destination_tx_hash VARCHAR(128) NULL,
  message_id VARCHAR(191) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  payload JSON NULL,
  observed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bridge_messages_message (message_id),
  KEY idx_bridge_messages_task (bridge_task_id),
  KEY idx_bridge_messages_status (status)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_task_id VARCHAR(64) NULL,
  task_item_id VARCHAR(96) NULL,
  strategy VARCHAR(32) NOT NULL,
  scheduled_at DATETIME NULL,
  window_start DATETIME NULL,
  window_end DATETIME NULL,
  min_interval_seconds INT UNSIGNED NULL,
  max_concurrency INT UNSIGNED NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_schedules_batch (batch_task_id),
  KEY idx_schedules_item (task_item_id),
  KEY idx_schedules_due (status, scheduled_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS retry_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_item_id VARCHAR(96) NOT NULL,
  attempt INT UNSIGNED NOT NULL,
  status VARCHAR(32) NOT NULL,
  error_code VARCHAR(120) NULL,
  error_message VARCHAR(1000) NULL,
  next_retry_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_retry_records_item_attempt (task_item_id, attempt),
  KEY idx_retry_records_next (status, next_retry_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rpc_endpoints (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  chain_key VARCHAR(32) NOT NULL,
  url VARCHAR(512) CHARACTER SET ascii NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  health_status VARCHAR(32) NOT NULL DEFAULT 'unknown',
  latency_ms INT UNSIGNED NULL,
  last_checked_at DATETIME NULL,
  failure_count INT UNSIGNED NOT NULL DEFAULT 0,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rpc_endpoints_chain_url (chain_key, url(191)),
  KEY idx_rpc_endpoints_priority (chain_key, enabled, priority)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS signers (
  id VARCHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  type VARCHAR(32) NOT NULL,
  label VARCHAR(120) NULL,
  address VARCHAR(128) NULL,
  secret_ref VARCHAR(255) NULL,
  config_data JSON NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  last_used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_signers_user (user_id),
  KEY idx_signers_address (address)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(80) NULL,
  resource_id VARCHAR(128) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_user_time (user_id, created_at),
  KEY idx_audit_logs_resource (resource_type(40), resource_id(120)),
  KEY idx_audit_logs_action_time (action, created_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Canonical EVM networks supported by the console. The chain_key values are
-- stable application identifiers; display labels stay in the name column.
-- Re-running the migration updates labels/endpoints without duplicating rows.
-- Rename the previous provisional key before the chain_id unique-key upsert;
-- otherwise MySQL would update the old row and retain `zksync` as its key.
UPDATE chains SET chain_key = 'zksync-era' WHERE chain_key = 'zksync' AND chain_id = 324;

INSERT INTO chains (chain_key, chain_id, name, native_symbol, rpc_url, enabled)
VALUES
  ('ethereum', 1, 'Ethereum', 'ETH', 'https://cloudflare-eth.com', 1),
  ('arbitrum', 42161, 'Arbitrum One', 'ETH', 'https://arb1.arbitrum.io/rpc', 1),
  ('linea', 59144, 'Linea', 'ETH', 'https://rpc.linea.build', 1),
  ('bsc', 56, 'BNB Smart Chain', 'BNB', 'https://bsc-rpc.publicnode.com', 1),
  ('polygon', 137, 'Polygon', 'POL', 'https://polygon-bor-rpc.publicnode.com', 1),
  ('base', 8453, 'Base', 'ETH', 'https://mainnet.base.org', 1),
  ('optimism', 10, 'OP Mainnet', 'ETH', 'https://mainnet.optimism.io', 1),
  ('zksync-era', 324, 'zkSync Era', 'ETH', 'https://mainnet.era.zksync.io', 1),
  ('soneium', 1868, 'Soneium', 'ETH', 'https://rpc.soneium.org', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  native_symbol = VALUES(native_symbol),
  rpc_url = VALUES(rpc_url),
  enabled = VALUES(enabled);

-- Keep legacy network rows for historical records, but prevent unsupported
-- networks from appearing as active choices after an existing database is
-- upgraded with this idempotent migration.
UPDATE chains
SET enabled = 0
WHERE chain_key NOT IN (
  'ethereum', 'arbitrum', 'linea', 'bsc', 'polygon', 'base', 'optimism',
  'zksync-era', 'soneium'
);
