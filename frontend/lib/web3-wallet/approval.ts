/**
 * The consent queue — every signature this wallet makes passes through here.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * WHY A QUEUE, AND WHY IT IS NOT REACT STATE.
 *
 * The EIP-1193 provider is called by wagmi, by AppKit's modal, and by any script
 * on the page. None of them is inside a React tree, and all of them need the
 * user to be asked something. So the provider PUSHES a request here and awaits
 * a promise; a React host component subscribes, renders the review sheet, and
 * resolves or rejects it. The two halves never import each other.
 *
 * ── THE RULE THIS FILE ENFORCES ─────────────────────────────────────────────
 * There is no path from the provider to a private key that does not pass a
 * request through this queue. `signers/evm.ts` reads the seed; the provider
 * never does. That is what makes "the user approved this" checkable by reading
 * one file rather than by auditing every branch of a 400-line provider.
 *
 * ── REJECTION IS A NORMAL OUTCOME ───────────────────────────────────────────
 * A user declining a transaction is not an error condition, and it arrives as
 * EIP-1193's `4001 User rejected the request` — the code every dapp in the
 * ecosystem already special-cases so it can stay quiet. Inventing our own would
 * make a decline render as a red failure toast in software we do not control.
 *
 * ── EVERY REQUEST TIMES OUT ─────────────────────────────────────────────────
 * A promise nobody settles is a wagmi call that hangs forever, and the symptom
 * is a permanently spinning button with no error anywhere. The host resolves
 * most requests in seconds; the timeout exists for the case where the host was
 * never mounted at all, which is a wiring bug that must be loud.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import type { WalletVm } from "./types";

/** EIP-1193 / EIP-1474 codes, spelled out so call sites read as the spec does. */
export const RPC_ERROR = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,
  UNRECOGNIZED_CHAIN: 4902,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
} as const;

export class WalletRpcError extends Error {
  readonly code: number;
  readonly data?: unknown;
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "WalletRpcError";
    this.code = code;
    this.data = data;
  }
}

export function userRejected(): WalletRpcError {
  return new WalletRpcError(RPC_ERROR.USER_REJECTED, "User rejected the request.");
}

/* ── request shapes ───────────────────────────────────────────────────────── */

export interface EvmTransactionRequest {
  to?: string;
  from?: string;
  data?: string;
  value?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: string;
}

export type WalletRequest =
  /** The wallet is locked and something needs a key. The host shows the unlock sheet. */
  | { kind: "unlock"; reason: "sign" | "connect" }
  /** A site is asking which account it may see. */
  | { kind: "connect"; origin: string; chainId: number }
  | { kind: "signMessage"; vm: WalletVm; address: string; message: string }
  | {
      kind: "signTypedData";
      vm: WalletVm;
      address: string;
      /** Already-parsed EIP-712 payload. */
      typedData: Record<string, unknown>;
    }
  | {
      kind: "sendTransaction";
      vm: WalletVm;
      chainId: number;
      address: string;
      transaction: EvmTransactionRequest;
    }
  /**
   * A plain transfer on a chain that has no EVM calldata to decode.
   *
   * A SEPARATE KIND FROM `sendTransaction`, because the review sheet's job is
   * different. There, the honest thing is to decode opaque calldata and admit
   * when it cannot; here there is nothing opaque — the whole operation is
   * "move N of X to address Y", and the sheet should say exactly that rather
   * than dress a transfer up as a contract interaction.
   *
   * `amount` is a DECIMAL STRING in base units, not a bigint and not a number:
   * it crosses into React state and through `JSON.stringify` in devtools, and
   * a bigint throws in the second while a number silently rounds the first.
   */
  | {
      kind: "sendAsset";
      vm: Extract<WalletVm, "SOLANA" | "TON" | "TRON">;
      chainId: number;
      address: string;
      to: string;
      symbol: string;
      /** Base units, decimal string. */
      amount: string;
      decimals: number;
      /** Rendered verbatim beside "Network fee". Already formatted. */
      feeLabel?: string;
      /** Solana only: the recipient has no token account and rent is payable. */
      createsTokenAccount?: boolean;
    }
  | { kind: "switchChain"; chainId: number };

export interface PendingApproval {
  id: string;
  request: WalletRequest;
  createdAt: number;
}

interface QueueEntry extends PendingApproval {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Five minutes.
 *
 * Long enough that a user can go and find their password manager, and short
 * enough that a host that was never mounted surfaces as an error inside one
 * coffee break rather than never.
 */
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

const queue: QueueEntry[] = [];
const listeners = new Set<() => void>();

/** Identity changes on every mutation, for `useSyncExternalStore`. */
let snapshot: PendingApproval[] = [];
const EMPTY_SNAPSHOT: PendingApproval[] = [];

function publish(): void {
  snapshot = queue.map(({ id, request, createdAt }) => ({ id, request, createdAt }));
  for (const listener of listeners) listener();
}

export function subscribeApprovals(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getApprovals(): PendingApproval[] {
  return snapshot;
}

/** Stable identity — React throws if `getServerSnapshot` ever returns two. */
export function getServerApprovals(): PendingApproval[] {
  return EMPTY_SNAPSHOT;
}

/** The one the host renders. Requests are answered oldest-first. */
export function currentApproval(): PendingApproval | null {
  return snapshot[0] ?? null;
}

/* ── the provider side ────────────────────────────────────────────────────── */

let counter = 0;

/**
 * Ask the user. Resolves with whatever the host passes to {@link approve}.
 *
 * @throws {WalletRpcError} 4001 when declined, -32603 when nothing answered.
 */
export function requestApproval<T = unknown>(request: WalletRequest): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = `req-${++counter}`;

    const timer = setTimeout(() => {
      remove(id);
      reject(
        new WalletRpcError(
          RPC_ERROR.INTERNAL,
          "The wallet did not respond. Reload the page and try again."
        )
      );
    }, REQUEST_TIMEOUT_MS);

    queue.push({
      id,
      request,
      createdAt: Date.now(),
      resolve: resolve as (value: unknown) => void,
      reject,
      timer,
    });
    publish();
  });
}

/* ── the host side ────────────────────────────────────────────────────────── */

/** Settle a request successfully. `value` becomes the provider's return value. */
export function approve(id: string, value: unknown): void {
  const entry = remove(id);
  entry?.resolve(value);
}

/** Decline. Reaches the caller as EIP-1193 `4001`. */
export function reject(id: string, error?: unknown): void {
  const entry = remove(id);
  entry?.reject(error ?? userRejected());
}

/**
 * Decline everything.
 *
 * Called on lock and on sign-out. A pending sheet whose wallet has just
 * auto-locked cannot be approved — the seed is gone — so leaving the request
 * open would strand the caller until the timeout, showing a dialog whose
 * confirm button cannot work.
 */
export function rejectAll(error?: unknown): void {
  while (queue.length) {
    const entry = queue.pop()!;
    clearTimeout(entry.timer);
    entry.reject(error ?? userRejected());
  }
  publish();
}

function remove(id: string): QueueEntry | null {
  const index = queue.findIndex((entry) => entry.id === id);
  if (index === -1) return null;
  const [entry] = queue.splice(index, 1);
  clearTimeout(entry.timer);
  publish();
  return entry;
}
