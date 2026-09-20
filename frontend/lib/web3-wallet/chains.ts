/**
 * Chain definitions for the in-house wallet's own signer.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * WHY THIS DOES NOT IMPORT `@/config/wallet`.
 *
 * That module constructs the wagmi adapter at module scope, throws when
 * `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is unset, and drags the whole AppKit
 * stack into whatever imports it. `config/dex-chain-ids.ts` exists in this repo
 * for exactly that reason and states it in its own header.
 *
 * The wallet needs something `dex-chain-ids.ts` does not carry, though: the
 * viem CHAIN OBJECTS — RPC URLs, EIP-1559 support, explorer links — because it
 * builds and broadcasts transactions itself rather than handing them to a
 * connector. So it takes them from `viem/chains`, which is the same upstream
 * source AppKit's own network definitions are built from.
 *
 * THE ID LIST IS STILL THE ONE LIST. `DEX_WALLET_CHAIN_IDS` is imported rather
 * than re-typed, so this file cannot support a chain the rest of the product
 * does not — `chains.test.ts` asserts every EVM id in that array resolves here.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import {
  arbitrum,
  avalanche,
  base,
  bsc,
  celo,
  cronos,
  fantom,
  linea,
  mainnet,
  optimism,
  polygon,
  rootstock,
  type Chain,
} from "viem/chains";

import {
  DEX_WALLET_CHAIN_IDS,
  SOLANA_CHAIN_ID,
  TON_CHAIN_ID,
  TRON_CHAIN_ID,
} from "@/config/dex-chain-ids";

/**
 * The EVM chains this wallet can sign for, by EIP-155 id.
 *
 * Keyed by number rather than an array so a lookup is a lookup — the provider
 * resolves a chain on every request, and a linear scan through twelve entries
 * per `eth_call` is a cost nobody needs to pay.
 */
export const EVM_CHAINS: Readonly<Record<number, Chain>> = Object.freeze({
  [mainnet.id]: mainnet,
  [optimism.id]: optimism,
  [cronos.id]: cronos,
  [rootstock.id]: rootstock,
  [bsc.id]: bsc,
  [polygon.id]: polygon,
  [fantom.id]: fantom,
  [base.id]: base,
  [arbitrum.id]: arbitrum,
  [celo.id]: celo,
  [avalanche.id]: avalanche,
  [linea.id]: linea,
});

/**
 * The non-EVM ids, which this file must be able to RECOGNISE without being able
 * to sign for them here.
 *
 * They are platform-internal keys, not EIP-155 ids — TON's real global id is
 * -239 and Solana's identifier is a base58 genesis hash — and `dex-chain-ids.ts`
 * explains at length why each number is what it is. The EVM provider needs them
 * only so it can say "that is not an EVM chain" rather than "unknown chain",
 * which are different problems with different fixes.
 */
export const NON_EVM_CHAIN_IDS: Readonly<Record<number, "SOLANA" | "TON" | "TRON">> =
  Object.freeze({
    [SOLANA_CHAIN_ID]: "SOLANA",
    [TON_CHAIN_ID]: "TON",
    [TRON_CHAIN_ID]: "TRON",
  });

/**
 * The RPC each EVM chain is actually read through, from a BROWSER.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * VIEM'S DEFAULTS ARE NOT BROWSER ENDPOINTS, AND FIVE OF TWELVE DO NOT WORK.
 *
 * Measured from a real page, not assumed. With `chain.rpcUrls.default` alone:
 *
 *   Ethereum   eth.merkle.io          — no CORS header, blocked outright
 *   Cronos     evm.cronos.org         — no CORS header, blocked outright
 *   Polygon    polygon-rpc.com        — 401, "API key disabled"
 *   BSC        rpc.ankr.com/bsc       — JSON-RPC error, no key
 *   Fantom     rpc.ankr.com/fantom    — JSON-RPC error, no key
 *
 * That includes ETHEREUM, and the failure was invisible: a blocked read
 * degrades to a null balance, a null balance renders as "no holdings", and the
 * page looked like an empty wallet rather than a broken one. Exactly the class
 * of defect `balances.ts` refuses to create for tokens, reintroduced one layer
 * down at the transport.
 *
 * The entries below were each verified with an `eth_chainId` round trip from
 * the browser and returned the right chain id. They are keyless, public and
 * rate-limited — an operator running real volume should set `publicRpcUrl` on
 * the chain row, which takes precedence.
 *
 * ── ANYTHING ADDED HERE MUST BE MEASURED THE SAME WAY ───────────────────────
 * "Public" and "usable from a browser" are different properties, and the
 * best-known endpoint for a chain is routinely the one that fails the second.
 * ═════════════════════════════════════════════════════════════════════════════
 */
const BROWSER_RPC: Readonly<Record<number, string>> = Object.freeze({
  [mainnet.id]: "https://ethereum-rpc.publicnode.com",
  [optimism.id]: "https://mainnet.optimism.io",
  [cronos.id]: "https://cronos-evm-rpc.publicnode.com",
  [rootstock.id]: "https://public-node.rsk.co",
  [bsc.id]: "https://bsc-rpc.publicnode.com",
  [polygon.id]: "https://polygon-bor-rpc.publicnode.com",
  [fantom.id]: "https://rpc.fantom.network",
  [base.id]: "https://mainnet.base.org",
  [arbitrum.id]: "https://arb1.arbitrum.io/rpc",
  [celo.id]: "https://forno.celo.org",
  [avalanche.id]: "https://api.avax.network/ext/bc/C/rpc",
  [linea.id]: "https://rpc.linea.build",
});

/** Operator-configured endpoints, primed from `GET /api/dex/chain`. */
const operatorEvmRpc = new Map<number, string>();

/** Feed in whatever the chain list returned. https only — see `non-evm-chains`. */
export function primeEvmRpc(
  chains: Array<{ chainId?: number; publicRpcUrl?: string | null }> | null | undefined
): void {
  for (const chain of chains ?? []) {
    const id = Number(chain?.chainId);
    const url = String(chain?.publicRpcUrl ?? "").trim();
    if (Number.isInteger(id) && url.startsWith("https://")) operatorEvmRpc.set(id, url);
  }
}

/** The endpoint to read `chainId` through. Operator first, measured default second. */
export function evmRpcUrl(chainId: number): string | undefined {
  return operatorEvmRpc.get(chainId) ?? BROWSER_RPC[chainId];
}

export const DEFAULT_EVM_CHAIN_ID = mainnet.id;

export function isEvmChainId(chainId: number): boolean {
  return Object.prototype.hasOwnProperty.call(EVM_CHAINS, chainId);
}

/** The viem chain, or null. Never throws — the provider turns null into a 4902. */
export function evmChain(chainId: number): Chain | null {
  return EVM_CHAINS[chainId] ?? null;
}

/** Every EVM id this wallet supports, in the order `DEX_WALLET_CHAIN_IDS` lists them. */
export const SUPPORTED_EVM_CHAIN_IDS: readonly number[] = DEX_WALLET_CHAIN_IDS.filter(
  (id) => isEvmChainId(id)
);

/** `1` -> `0x1`. The wire format for `eth_chainId` and `wallet_switchEthereumChain`. */
export function toHexChainId(chainId: number): `0x${string}` {
  return `0x${chainId.toString(16)}` as `0x${string}`;
}

/**
 * `0x1` | `1` | `"1"` -> `1`.
 *
 * TOLERANT ON PURPOSE. `wallet_switchEthereumChain` is specified to take a hex
 * string and real callers send all three of these — including wagmi, whose own
 * switch path sends a number. Refusing the ones that are unambiguous would make
 * this wallet the only one in the ecosystem that could not switch chains.
 */
export function parseChainId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string") {
    const n = value.startsWith("0x") ? Number.parseInt(value, 16) : Number(value);
    return Number.isInteger(n) ? n : null;
  }
  return null;
}
