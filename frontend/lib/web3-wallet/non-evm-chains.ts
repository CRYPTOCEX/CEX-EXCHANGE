/**
 * The three non-EVM chains, as the wallet needs to know them.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * THE DECIMALS ARE THE DANGEROUS PART OF THIS FILE.
 *
 * None of the three is 18, and every one of them is routinely assumed to be:
 *
 *   SOL   9  (lamports)
 *   TON   9  (nanotons)
 *   TRX   6  (SUN)
 *
 * An 18-decimal assumption on TRX overstates every figure by a factor of a
 * trillion, and — far worse — a SEND built on it moves a trillionth of what the
 * user typed. `non-evm-chains.test.ts` asserts these against the server's own
 * `DEX_CHAIN_STATIC`, which is the authority, so the two cannot drift.
 *
 * ── THE RPC IS THE OPERATOR'S FIRST, OURS SECOND ────────────────────────────
 * `GET /api/dex/chain` returns `publicRpcUrl` — a browser-safe, keyless endpoint
 * the operator configured. It is preferred whenever set. The fallbacks below are
 * the canonical public endpoints for each network and exist so a wallet still
 * works on an install where nobody has configured one; they are rate-limited and
 * an operator running real volume should set their own.
 *
 * They are NOT secrets and must never become keyed URLs: this file ships to the
 * browser. `dexChain.rpcUrl`/`rpcUrlOverride` — which routinely embed a provider
 * key in the path — are deliberately server-only and never reach here.
 *
 * EVERY FALLBACK BELOW WAS TESTED FROM AN ACTUAL PAGE. "Public" and
 * "usable from a browser" are different properties, and the best-known Solana
 * endpoint fails the second — see the note on that entry. Anything added here
 * must be checked the same way rather than by reputation.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { SOLANA_CHAIN_ID, TON_CHAIN_ID, TRON_CHAIN_ID } from "@/config/dex-chain-ids";

import type { WalletVm } from "./types";

export interface NonEvmChain {
  chainId: number;
  vm: Extract<WalletVm, "SOLANA" | "TON" | "TRON">;
  name: string;
  symbol: string;
  decimals: number;
  explorerUrl: string;
  /** Used only when the server supplies no `publicRpcUrl`. */
  fallbackRpc: string;
}

export const NON_EVM_CHAINS: Readonly<Record<number, NonEvmChain>> = Object.freeze({
  [SOLANA_CHAIN_ID]: {
    chainId: SOLANA_CHAIN_ID,
    vm: "SOLANA",
    name: "Solana",
    symbol: "SOL",
    decimals: 9,
    explorerUrl: "https://solscan.io",
    /*
      NOT `api.mainnet-beta.solana.com`, WHICH 403s FROM A BROWSER.

      That is the endpoint every Solana tutorial names and it is server-only:
      it refuses browser-origin requests outright ("Access forbidden"), so it
      would have shipped as a fallback that never once worked. Measured in a
      real page, not assumed — `publicnode` answers `getHealth` with 200 and
      the CORS headers a browser needs.

      The requirement here is BROWSER-USABLE, which is a strictly smaller set
      than "public": `rpc.ankr.com/solana` also 403s without a key, and
      `solana.drpc.org` answers "chain is not available".
    */
    fallbackRpc: "https://solana-rpc.publicnode.com",
  },
  [TON_CHAIN_ID]: {
    chainId: TON_CHAIN_ID,
    vm: "TON",
    name: "TON",
    symbol: "TON",
    decimals: 9,
    explorerUrl: "https://tonviewer.com",
    fallbackRpc: "https://toncenter.com/api/v2/jsonRPC",
  },
  [TRON_CHAIN_ID]: {
    chainId: TRON_CHAIN_ID,
    vm: "TRON",
    name: "TRON",
    symbol: "TRX",
    decimals: 6,
    explorerUrl: "https://tronscan.org/#",
    fallbackRpc: "https://api.trongrid.io",
  },
});

export const NON_EVM_CHAIN_LIST: readonly NonEvmChain[] = Object.freeze(
  Object.values(NON_EVM_CHAINS)
);

export function nonEvmChain(chainId: number): NonEvmChain | null {
  return NON_EVM_CHAINS[chainId] ?? null;
}

export function chainIdForVm(
  vm: Extract<WalletVm, "SOLANA" | "TON" | "TRON">
): number {
  const found = NON_EVM_CHAIN_LIST.find((c) => c.vm === vm);
  if (!found) throw new Error(`No chain registered for ${vm}`);
  return found.chainId;
}

/* ── endpoint resolution ──────────────────────────────────────────────────── */

/**
 * Operator-configured endpoints, once fetched.
 *
 * A MODULE CACHE RATHER THAN A HOOK, because the signers are plain functions
 * called from a dialog's submit handler and from the provider shims, none of
 * which sit in a React tree. It is populated by `primeNonEvmRpc` at the point
 * the wallet page loads its chain list, and every read falls back safely when it
 * has not been.
 */
const operatorRpc = new Map<number, string>();

/** Feed in whatever `GET /api/dex/chain` returned. Ignores anything unusable. */
export function primeNonEvmRpc(
  chains: Array<{ chainId?: number; publicRpcUrl?: string | null }> | null | undefined
): void {
  for (const chain of chains ?? []) {
    const id = Number(chain?.chainId);
    const url = String(chain?.publicRpcUrl ?? "").trim();
    /*
      https ONLY. A wallet that would talk to a plain-http RPC is one whose
      transaction can be rewritten in flight by anything on the path — and the
      browser would block it as mixed content anyway, producing a failure with a
      far less useful message than simply not using it.
    */
    if (Number.isInteger(id) && url.startsWith("https://")) operatorRpc.set(id, url);
  }
}

export function rpcUrlFor(chainId: number): string {
  const chain = nonEvmChain(chainId);
  if (!chain) throw new Error(`Not a supported non-EVM chain: ${chainId}`);
  return operatorRpc.get(chainId) ?? chain.fallbackRpc;
}

/** True when the endpoint in use is the operator's rather than our fallback. */
export function isOperatorRpc(chainId: number): boolean {
  return operatorRpc.has(chainId);
}
