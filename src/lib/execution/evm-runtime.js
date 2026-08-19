import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  http,
  parseUnits,
  getAddress,
  isAddress,
  maxUint256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChain } from "../chains/evm.js";
import { lifi } from "./lifi.js";
import { getExecutionConfig, requireExecutionEnabled, ZERO_ADDRESS } from "./config.js";
import { getSignerPrivateKey } from "./vault.js";

const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
];

const publicClients = new Map();
const walletClients = new Map();
const locks = new Map();

function viemChain(key) {
  const config = getChain(key);
  return defineChain({
    id: config.id,
    name: config.name,
    nativeCurrency: { name: config.nativeSymbol, symbol: config.nativeSymbol, decimals: 18 },
    rpcUrls: { default: { http: [config.rpc] } },
  });
}

function publicClient(chain) {
  const key = getChain(chain).key;
  if (!publicClients.has(key)) {
    const config = getChain(key);
    publicClients.set(key, createPublicClient({ chain: viemChain(key), transport: http(config.rpc, { timeout: 30000 }) }));
  }
  return publicClients.get(key);
}

function walletClient(chain, account) {
  const key = `${getChain(chain).key}:${account.address.toLowerCase()}`;
  if (!walletClients.has(key)) {
    const config = getChain(chain);
    walletClients.set(key, createWalletClient({ account, chain: viemChain(chain), transport: http(config.rpc, { timeout: 30000 }) }));
  }
  return walletClients.get(key);
}

function bigintValue(value, fallback = 0n) {
  if (value == null || value === "") return fallback;
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  const string = String(value);
  return /^0x/i.test(string) ? BigInt(string) : BigInt(string);
}

function address(value, label) {
  if (!isAddress(value)) throw new Error(`${label} must be a valid EVM address`);
  return getAddress(value);
}

async function withAddressLock(addressValue, callback) {
  const key = String(addressValue).toLowerCase();
  const previous = locks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  locks.set(key, queued);
  await previous;
  try { return await callback(); } finally {
    release();
    if (locks.get(key) === queued) locks.delete(key);
  }
}

async function waitForReceipt(client, hash) {
  const timeout = getExecutionConfig().receiptTimeoutMs;
  let timer;
  try {
    return await Promise.race([
      client.waitForTransactionReceipt({ hash, confirmations: getExecutionConfig().receiptConfirmations, pollingInterval: 1500 }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error("Transaction receipt timed out"), { code: "RECEIPT_TIMEOUT", retryable: true })), timeout); }),
    ]);
  } finally { clearTimeout(timer); }
}

function transactionRequest(input = {}) {
  const tx = { to: address(input.to, "Transaction recipient") };
  if (input.data != null) {
    if (typeof input.data !== "string" || !/^0x[0-9a-fA-F]*$/.test(input.data)) throw new Error("Transaction calldata must be hexadecimal");
    tx.data = input.data;
  }
  if (input.value != null) { tx.value = bigintValue(input.value); if (tx.value < 0n) throw new Error("Transaction value cannot be negative"); }
  if (input.gas != null || input.gasLimit != null) tx.gas = bigintValue(input.gas ?? input.gasLimit);
  if (input.gasPrice != null) tx.gasPrice = bigintValue(input.gasPrice);
  if (input.maxFeePerGas != null) tx.maxFeePerGas = bigintValue(input.maxFeePerGas);
  if (input.maxPriorityFeePerGas != null) tx.maxPriorityFeePerGas = bigintValue(input.maxPriorityFeePerGas);
  return tx;
}

export async function createExecutionContext({ task, item, wallet, record = {} }) {
  const config = requireExecutionEnabled();
  const chain = getChain(task.source_chain || task.chain || "ethereum").key;
  const privateKey = await getSignerPrivateKey(wallet.address);
  const account = privateKeyToAccount(privateKey);
  if (account.address.toLowerCase() !== String(wallet.address).toLowerCase()) throw new Error("Configured signer address does not match wallet address");
  const publicClientValue = publicClient(chain);
  const walletClientValue = walletClient(chain, account);
  const context = {
    task,
    item,
    wallet,
    chain,
    targetChain: task.destination_chain || task.targetChain || null,
    config: task.execution_config || task,
    amount: item.amount_text ?? item.amount ?? task.amount,
    account,
    publicClient: publicClientValue,
    lifi,
    resolveAsset: (chainKey, token) => lifi.resolveToken(chainKey, token),
    parseAmount: (value, decimals) => parseUnits(String(value), Number(decimals)),
    getNativeBalance: (addressValue) => publicClientValue.getBalance({ address: address(addressValue, "Wallet address") }),
    getTokenBalance: async (token, addressValue) => publicClientValue.readContract({ address: address(token.address, "Token address"), abi: ERC20_ABI, functionName: "balanceOf", args: [address(addressValue, "Wallet address")] }),
    recordQuote: record.recordQuote || (async () => {}),
    recordSimulation: record.recordSimulation || (async () => {}),
    lockHeld: false,
  };

  const sendUnlocked = async (input, metadata = {}) => {
    const tx = transactionRequest(input);
    const from = account.address;
    const balance = await publicClientValue.getBalance({ address: from });
    if (tx.value && tx.value > balance) throw Object.assign(new Error("Insufficient native balance for transaction value"), { code: "INSUFFICIENT_NATIVE_BALANCE", retryable: false });
    const nonce = await publicClientValue.getTransactionCount({ address: from, blockTag: "pending" });
    const gasEstimate = tx.gas || await publicClientValue.estimateGas({ account, to: tx.to, data: tx.data, value: tx.value });
    if (!tx.gasPrice && !tx.maxFeePerGas) {
      try {
        const gasPrice = await publicClientValue.getGasPrice();
        if (balance < (tx.value || 0n) + gasEstimate * gasPrice) throw Object.assign(new Error("Insufficient native balance for amount and gas"), { code: "INSUFFICIENT_GAS_BALANCE", retryable: false });
      } catch (error) {
        if (error.code === "INSUFFICIENT_GAS_BALANCE") throw error;
        // Some rollups do not expose eth_gasPrice consistently; the wallet
        // client can still estimate fees and submit in that case.
      }
    }
    const request = { ...tx, account, nonce, gas: gasEstimate };
    const hash = await walletClientValue.sendTransaction(request);
    let receipt;
    try { receipt = await waitForReceipt(publicClientValue, hash); }
    catch (error) {
      // A broadcast hash is durable evidence that funds may have moved. Do
      // not let the scheduler blindly retry this item after a receipt timeout.
      error.hash = hash;
      error.submitted = true;
      error.retryable = false;
      throw error;
    }
    if (receipt.status !== "success") throw Object.assign(new Error("Transaction reverted"), { code: "TRANSACTION_REVERTED", hash, receipt, retryable: false, terminal: true });
    return { hash, receipt, metadata };
  };

  context.runExclusive = (callback) => withAddressLock(account.address, async () => {
    context.lockHeld = true;
    try { return await callback(); } finally { context.lockHeld = false; }
  });
  context.sendTransaction = (input, metadata = {}) => context.lockHeld ? sendUnlocked(input, metadata) : withAddressLock(account.address, () => sendUnlocked(input, metadata));
  context.simulateTransaction = async (input) => {
    const tx = transactionRequest(input);
    const gas = await publicClientValue.estimateGas({ account, to: tx.to, data: tx.data, value: tx.value });
    const result = await publicClientValue.call({ account, to: tx.to, data: tx.data, value: tx.value });
    const simulation = { success: true, gas: gas.toString(), result: result.data || "0x", request: input };
    await context.recordSimulation(simulation);
    return simulation;
  };
  context.ensureAllowance = async ({ token, spender, amount }) => {
    if (token.isNative || token.address.toLowerCase() === ZERO_ADDRESS) return null;
    const tokenAddress = address(token.address, "Token address");
    const spenderAddress = address(spender, "Approval spender");
    const required = bigintValue(amount);
    const current = await publicClientValue.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: "allowance", args: [account.address, spenderAddress] });
    if (current >= required) return null;
    // Encode the approval explicitly so the transaction remains valid across
    // viem versions and does not depend on an internal simulation request.
    const approvalData = encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [spenderAddress, required] });
    const approval = await context.sendTransaction({ to: tokenAddress, data: approvalData, value: 0n }, { kind: "approve", token: tokenAddress, spender: spenderAddress, amount: required.toString() });
    return { ...approval, amount: required.toString() };
  };
  return context;
}

export { ERC20_ABI, ZERO_ADDRESS, publicClient, withAddressLock, transactionRequest, maxUint256 };
