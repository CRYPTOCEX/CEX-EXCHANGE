/**
 * The unlocked wallet, in memory, for as long as it should be there.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * WHY A MODULE SINGLETON AND NOT REACT STATE.
 *
 * Because the consumers are not all React. The EIP-6963 provider announces
 * itself on `window` during page load and answers `eth_accounts` from whatever
 * called it — a wagmi connector, the AppKit modal, a script — none of which can
 * read a component's state. The Wallet Standard registration has the same
 * shape. React subscribes to this through `useSyncExternalStore`; it is one
 * consumer of the session, not its owner.
 *
 * WHAT IS IN HERE THAT MUST NOT LEAK: `seed`. It is the 64 bytes every private
 * key comes from. It is held in a closure, never put on the snapshot object,
 * never returned by anything a component can await, and zeroed on lock. The
 * snapshot React reads carries public addresses and a lock state and nothing
 * else — so a devtools inspection, an error-boundary serialisation or a logging
 * middleware sees exactly what the server sees.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { deriveWallets } from "./derive";
import { mnemonicToSeed } from "./mnemonic";
import { unlockVault } from "./vault";
import {
  WalletError,
  type DerivedAccount,
  type VaultV1,
  type WalletLockState,
  type WalletVm,
} from "./types";

/** 15 minutes of no interaction. Configurable per user; this is the default. */
export const DEFAULT_AUTO_LOCK_MS = 15 * 60 * 1000;

/**
 * How long a hidden tab may stay unlocked.
 *
 * SHORTER THAN THE IDLE TIMER, AND NOT ZERO. Zero would lock the wallet every
 * time the user tabs away to copy an address — which is a thing this product
 * actively asks them to do — and they would come back to a password prompt
 * mid-transaction. A minute covers the round trip and nothing longer.
 */
const HIDDEN_GRACE_MS = 60 * 1000;

/** What React (and anything else) may see. No secrets on this type. */
export interface WalletSnapshot {
  state: WalletLockState;
  accounts: DerivedAccount[];
  accountCount: number;
  vault: VaultV1 | null;
  /** Epoch ms at which the idle timer will fire, or null when locked. */
  locksAt: number | null;
}

const EMPTY: WalletSnapshot = {
  state: "absent",
  accounts: [],
  accountCount: 0,
  vault: null,
  locksAt: null,
};

/* ── the closed-over secret ───────────────────────────────────────────────── */

let seed: Uint8Array | null = null;
let mnemonic: string | null = null;

/* ── observable state ─────────────────────────────────────────────────────── */

let snapshot: WalletSnapshot = EMPTY;
let autoLockMs = DEFAULT_AUTO_LOCK_MS;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit(next: Partial<WalletSnapshot>): void {
  // A NEW OBJECT EVERY TIME. `useSyncExternalStore` compares by identity and
  // will happily render a stale tree forever if this is mutated in place.
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): WalletSnapshot {
  return snapshot;
}

/**
 * The server-rendered snapshot.
 *
 * A SEPARATE, CONSTANT OBJECT, because `useSyncExternalStore` calls this during
 * SSR and hydration and throws "The result of getServerSnapshot should be
 * cached" if it ever gets two different identities. Returning `snapshot` here
 * would do exactly that the moment anything unlocked before hydration finished.
 */
export function getServerSnapshot(): WalletSnapshot {
  return EMPTY;
}

/* ── lifecycle ────────────────────────────────────────────────────────────── */

/**
 * Attach a vault (or `null` for "this user has none").
 *
 * LOCKS IF THE VAULT CHANGED IDENTITY. Switching accounts on a shared browser
 * must not leave the previous user's seed in memory behind the new user's
 * address list — which is precisely what a naive `snapshot.vault = next` would
 * do, silently, with the UI showing the right addresses the whole time.
 */
export function setVault(vault: VaultV1 | null): void {
  const changed = vault?.ct !== snapshot.vault?.ct;
  if (changed && snapshot.state === "unlocked") lock();

  emit({
    vault,
    state: vault ? (seed ? "unlocked" : "locked") : "absent",
    accounts: vault?.accounts ?? [],
    accountCount: vault?.accountCount ?? 0,
  });
}

/**
 * Decrypt, derive, and start the clock.
 *
 * The accounts are RE-DERIVED rather than taken from `vault.accounts`, and the
 * two are compared by the caller in `assertVaultMatchesSeed`. The stored list
 * is a convenience for rendering a locked wallet; once we hold the seed, the
 * seed is the truth. A vault whose stored addresses disagree with its own
 * ciphertext has been tampered with or written by a different derivation, and
 * either way the user must not be shown a receive address that their key cannot
 * spend from.
 */
export async function unlock(password: string): Promise<void> {
  const vault = snapshot.vault;
  if (!vault) {
    throw new WalletError("NO_VAULT", "There is no wallet to unlock.");
  }

  const secret = await unlockVault(vault, password);
  const derivedSeed = mnemonicToSeed(secret.mnemonic, secret.passphrase);
  const accounts = deriveWallets(derivedSeed, vault.accountCount || 1);

  assertVaultMatchesSeed(vault, accounts);

  seed = derivedSeed;
  mnemonic = secret.mnemonic;

  emit({ state: "unlocked", accounts, accountCount: vault.accountCount || 1 });
  startIdleTimer();
  attachVisibilityWatch();
}

/**
 * Adopt a seed the caller already holds — the create and import flows, where
 * the phrase was just generated or typed and re-decrypting it would be theatre.
 */
export function adoptUnlocked(
  vault: VaultV1,
  derivedSeed: Uint8Array,
  phrase: string
): void {
  seed = derivedSeed;
  mnemonic = phrase;
  emit({
    vault,
    state: "unlocked",
    accounts: vault.accounts,
    accountCount: vault.accountCount,
  });
  startIdleTimer();
  attachVisibilityWatch();
}

/**
 * Forget the secret.
 *
 * THE ZEROING IS NOT SECURITY THEATRE, BUT IT IS NOT A GUARANTEE EITHER, and
 * saying which is which matters. JavaScript strings are immutable and garbage
 * collected, so `mnemonic` can only be dropped, not erased — copies may persist
 * in the heap until GC runs. The `seed` is a `Uint8Array` and CAN be
 * overwritten, so it is: that removes the single highest-value 64 bytes from a
 * heap snapshot taken after lock. Both are done; only one is complete.
 */
export function lock(): void {
  if (seed) seed.fill(0);
  seed = null;
  mnemonic = null;

  clearTimer();
  emit({
    state: snapshot.vault ? "locked" : "absent",
    locksAt: null,
    // The public address list SURVIVES a lock on purpose: a locked wallet still
    // shows its portfolio and its receive addresses. Nothing there is a secret.
    accounts: snapshot.vault?.accounts ?? [],
  });
}

/** Wipe everything, including the vault. Sign-out, or "remove from this device". */
export function reset(): void {
  lock();
  snapshot = EMPTY;
  for (const listener of listeners) listener();
}

/* ── signing material ─────────────────────────────────────────────────────── */

/**
 * The seed, for a signer.
 *
 * @throws {WalletError} `LOCKED`
 *
 * DELIBERATELY AWKWARD TO REACH AND DELIBERATELY NOT ON THE SNAPSHOT. Every
 * call is a place where key material enters a call stack, so every call should
 * be greppable. `frontend/lib/web3-wallet/signers/**` is the only tree that
 * should appear in the results.
 */
export function requireSeed(): Uint8Array {
  if (!seed) {
    throw new WalletError("LOCKED", "Unlock your wallet to sign.");
  }
  touch();
  return seed;
}

/**
 * The phrase, for the "reveal recovery phrase" screen only.
 *
 * That screen re-prompts for the password even when the wallet is already
 * unlocked, which is not redundant: unlocked is a state that persists for
 * fifteen minutes across a whole session, and showing twelve words that drain
 * an account to anyone who walks past an unattended laptop is a different risk
 * from letting them press Swap.
 */
export function requireMnemonic(): string {
  if (!mnemonic) {
    throw new WalletError("LOCKED", "Unlock your wallet first.");
  }
  return mnemonic;
}

export function isUnlocked(): boolean {
  return seed !== null;
}

/** The active address for a VM, or null. Safe to call while locked. */
export function addressFor(vm: WalletVm, index = 0): string | null {
  return (
    snapshot.accounts.find((a) => a.vm === vm && a.index === index)?.address ??
    null
  );
}

/* ── auto-lock ────────────────────────────────────────────────────────────── */

export function setAutoLockMs(ms: number): void {
  // 0 means "never", which some users will want and which is theirs to choose.
  autoLockMs = Number.isFinite(ms) && ms >= 0 ? ms : DEFAULT_AUTO_LOCK_MS;
  if (snapshot.state === "unlocked") startIdleTimer();
}

/** Reset the idle countdown. Called on every signature and by the UI on activity. */
export function touch(): void {
  if (snapshot.state === "unlocked") startIdleTimer();
}

function startIdleTimer(): void {
  clearTimer();
  if (autoLockMs <= 0) {
    emit({ locksAt: null });
    return;
  }
  idleTimer = setTimeout(lock, autoLockMs);
  emit({ locksAt: Date.now() + autoLockMs });
}

function clearTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  if (hiddenTimer) clearTimeout(hiddenTimer);
  hiddenTimer = null;
}

/**
 * Lock a backgrounded tab after {@link HIDDEN_GRACE_MS}.
 *
 * ATTACHED ONCE, LAZILY, AND NEVER AT MODULE SCOPE. This module is imported by
 * the server bundle during SSR, where `document` does not exist; a top-level
 * `addEventListener` would be a build-time crash rather than a runtime one.
 */
let visibilityAttached = false;
function attachVisibilityWatch(): void {
  if (visibilityAttached || typeof document === "undefined") return;
  visibilityAttached = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (snapshot.state !== "unlocked") return;
      hiddenTimer = setTimeout(lock, HIDDEN_GRACE_MS);
    } else if (hiddenTimer) {
      clearTimeout(hiddenTimer);
      hiddenTimer = null;
      touch();
    }
  });
}

/* ── integrity ────────────────────────────────────────────────────────────── */

/**
 * Do the addresses in the envelope match the ones the seed actually produces?
 *
 * THIS CATCHES THE FAILURE NOBODY ELSE CAN. Every other check in this directory
 * verifies the ciphertext against the password. This one verifies the PUBLIC
 * half against the private half — and the public half is the part that travelled
 * over the network, sat in a database, and is displayed as "send your money
 * here". A server that swapped `accounts` for its own addresses would pass every
 * cryptographic check in this file and would be caught only here.
 *
 * It compares the EVM address at index 0, which is present in every vault this
 * product has ever written, rather than the whole list — a vault created before
 * a VM was added would otherwise fail integrity for a reason that is not a
 * tamper.
 */
function assertVaultMatchesSeed(
  vault: VaultV1,
  derived: DerivedAccount[]
): void {
  const stored = vault.accounts.find((a) => a.vm === "EVM" && a.index === 0);
  const actual = derived.find((a) => a.vm === "EVM" && a.index === 0);
  if (!stored || !actual) return;

  if (stored.address.toLowerCase() !== actual.address.toLowerCase()) {
    throw new WalletError(
      "CORRUPT",
      "This wallet's stored addresses do not match its recovery phrase. " +
        "Do not send funds to them. Restore from your recovery phrase instead."
    );
  }
}
