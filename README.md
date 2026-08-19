This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Backend API

The console includes server route handlers for multiple chains:

- `GET /api/chains` lists the nine configured EVM chains; non-EVM adapters are returned separately.
- `GET /api/chains/{chain}?action=balance&address=...` reads native balance; EVM also supports `blockNumber` and `transaction`.
- `GET /api/chains/solana?action=balance|blockHeight|transaction` and `GET /api/chains/bitcoin?action=balance|utxos|transaction|tipHeight` expose native chain data.
- `GET|POST /api/operations` creates and lists batch operations; `GET /api/operations/{id}` reads one operation.

RPC endpoints can be overridden with `EVM_RPC_ETHEREUM`, `EVM_RPC_ARBITRUM`, `EVM_RPC_LINEA`, `EVM_RPC_BSC`, `EVM_RPC_POLYGON`, `EVM_RPC_BASE`, `EVM_RPC_OPTIMISM`, `EVM_RPC_ZKSYNC_ERA`, and `EVM_RPC_SONEIUM`. Public endpoints are used by default for read-only development.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## MySQL

The schema uses the connection settings in `.env` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, and `DB_CHARSET`). Initialize or update it with:

```bash
npm install
npm run db:migrate
```

## Transaction execution

Swap, Bridge, and Transfer are executed by the separate task worker. The
worker consumes persisted MySQL task items, obtains an encrypted signer,
constructs and simulates the transaction, broadcasts it through the selected
chain RPC, and records the receipt. `npm run dev` starts both the Next.js web
server and the worker; in production run `npm run start` and `npm run worker`
as separate supervised processes.

Execution is disabled by default. Copy the keys from `execution.env.example`
to the runtime environment, generate a 32-byte `WALLET_VAULT_MASTER_KEY`,
configure an RPC for every chain you will use, and set
`EVM_EXECUTION_ENABLED=true` only after testing with a funded test wallet.
Private keys submitted through `POST /api/signers` are encrypted with AES-256-GCM
before being stored in the `signers` table; plaintext keys are never returned.
Li.Fi supplies token resolution, swap/bridge quotes, transaction calldata and
bridge status tracking. A Li.Fi API key is optional but recommended for
production rate limits.

Example signer registration (send only over a trusted local/private network):

```bash
curl -X POST http://localhost:3000/api/signers \
  -H "x-execution-token: $EXECUTION_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{"walletId":"wallet-id","privateKey":"0x...","label":"Primary signer"}'
```

The server verifies that the key derives the selected wallet address. Do not
put private keys in client-side code, CSV files, logs, or the browser URL.
If an older wallet import CSV exists in `wallets/`, treat every credential in
it as compromised: move it outside the workspace, rotate the wallets, and use
the encrypted signer API for any replacement key. Legacy plaintext signer rows
are intentionally refused until a vault key is configured for migration.

When execution is enabled, task and wallet write APIs require
`EXECUTION_API_TOKEN` in an `x-execution-token` header (or a Bearer token), and
the transaction audit write endpoint always requires it. The browser UI does
not receive this secret; use a trusted operator session or API client for these
protected writes. The worker renews a lease for
each running item; if a process disappears, the item is paused for manual chain
inspection instead of being automatically replayed. A submitted transaction is
always tracked by hash, including when receipt or bridge-status polling times
out.

The migration creates the wallet, asset, operation, task, quote, simulation, transaction, signer, RPC, and audit tables. Relationships are kept as application-managed ID columns; no database-level foreign-key constraints are created. Running the command again removes legacy relational constraints and verifies that none remain.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
