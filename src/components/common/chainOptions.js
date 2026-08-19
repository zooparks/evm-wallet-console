import { EVM_CHAIN_CATALOG, normalizeChainKey } from "@/lib/chains/catalog";

/**
 * Short codes are the consistent presentation used by wallet selectors.
 * Storage and API payloads still use the catalog's canonical chain keys.
 */
export const CHAIN_OPTIONS = EVM_CHAIN_CATALOG.map(({ code }) => code);

/** Convert a selector value (code or full name) to the storage/API key. */
export function chainKeyFromOption(value) {
  return normalizeChainKey(value);
}

/** Compare short codes, full names, and canonical keys safely. */
export function chainMatches(left, right) {
  return normalizeChainKey(left) === normalizeChainKey(right);
}

/** Render API values using the requested short code when the chain is known. */
export function chainCode(value) {
  const key = normalizeChainKey(value);
  return EVM_CHAIN_CATALOG.find((chain) => chain.key === key)?.code || String(value || "");
}

