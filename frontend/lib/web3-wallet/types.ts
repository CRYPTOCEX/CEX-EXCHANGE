/**
 * The in-house Web3 wallet — shared types.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS DIRECTORY IS FRAMEWORK-FREE, AND THAT IS LOAD-BEARING RATHER THAN TIDY.
 *
 * It is imported by three consumers that have nothing else in common: the dex
 * route's React tree, the provider shims that run at module scope before React
 * exists (EIP-6963 announces on `window` during page load), and the unit suite,
 * which runs in Node with no DOM at all. A single `import { useState }` here
 * would break the second and third.
 *
 * It also sits OUTSIDE `frontend/app/[locale]/(ext)/dex/**`, so the DEX tree's
 * `no-restricted-imports` block in eslint.config.mjs does not apply and did not
 * have to be loosened to let a wallet exist. That block forbids the platform's
 * CUSTODIAL money primitives, and this wallet is not custodial — but the rule
 * matches by path, not by intent, and weakening it to admit this code would
 * have weakened it for the swap terminal too.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The four virtual machines the addon can trade on.
 *
 * Spelled to match `DEX_VM_VALUES` in `@b/utils/dex/units`, which is what
 * `dexWalletLink.vm` validates against — an address derived here is linked
 * through that model, and a mismatch would fail validation at the last step of
 * a flow the user has already completed.
 */
export type WalletVm = "EVM" | "SOLANA" | "TON" | "TRON";

export const WALLET_VMS: readonly WalletVm[] = ["EVM", "SOLANA", "TON", "TRON"];

/**
 * One address, derived. PUBLIC DATA ONLY — there is no private key on this type
 * and there must never be one.
 *
 * The distinction matters because `DerivedAccount[]` is what gets written into
 * the vault envelope's `accounts` field and sent to the server, so that a user
 * opening the wallet on a new device sees their portfolio and their receive
 * addresses BEFORE typing a password. If a private key could ride on this type,
 * that convenience would become the leak.
 */
export interface DerivedAccount {
  vm: WalletVm;
  /** Account index within the VM. 0 is the wallet the UI shows by default. */
  index: number;
  /** The full BIP-32 / SLIP-0010 path this address came from. */
  path: string;
  /** Canonical, display-ready: EIP-55 for EVM, base58 for Solana/TRON, UQ… for TON. */
  address: string;
  /** Hex, no `0x`. Needed by TON (the wallet contract is derived from it) and useful everywhere. */
  publicKey: string;
  /**
   * TON only: which wallet contract version `address` belongs to.
   *
   * TON is the one VM where a public key does not determine an address — the
   * address is the hash of a state-init built from a specific contract's code,
   * so the SAME key yields a different address under v4r2 than under w5. A
   * vault that did not record this could not tell a user which of two addresses
   * their funds are behind after a version migration.
   */
  contractVersion?: "v4r2";
}

/** A full set: every VM, one account index. */
export interface DerivedWallet {
  index: number;
  accounts: DerivedAccount[];
}

/* ── the vault envelope ───────────────────────────────────────────────────── */

/**
 * The encrypted keystore, exactly as it is stored server-side and exactly as it
 * travels on the wire.
 *
 * EVERY PARAMETER IS READ FROM THE BLOB, NEVER ASSUMED. `iterations`, `salt`
 * and `iv` all live here rather than as constants in `vault.ts`, so the KDF cost
 * can be raised for new vaults without orphaning every existing one — a
 * hardcoded iteration count would make the first raise a mass lockout.
 */
export interface VaultV1 {
  v: 1;
  kdf: {
    name: "PBKDF2-SHA512";
    iterations: number;
    /** base64 */
    salt: string;
  };
  cipher: {
    name: "AES-GCM";
    /** base64, 12 bytes */
    iv: string;
  };
  /** base64 of AES-GCM(plaintext = JSON of {@link VaultSecret}). */
  ct: string;
  /** Public addresses, so a locked wallet still renders. See {@link DerivedAccount}. */
  accounts: DerivedAccount[];
  /** Highest account index ever derived, so "add account" never reuses one. */
  accountCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * What is actually inside `ct`. This shape exists only in memory, only after a
 * successful unlock, and is never logged, never serialised anywhere but into
 * the ciphertext, and never returned from a function that a UI can await
 * without holding the unlock.
 */
export interface VaultSecret {
  mnemonic: string;
  /**
   * The BIP-39 "25th word". Optional, off by default, and deliberately NOT
   * offered in v1's UI — it is here because omitting the field from the
   * ciphertext format would make adding it later a vault migration rather than
   * a feature flag.
   */
  passphrase?: string;
}

/** How many words the user asked for. 12 is the default; 24 is offered to people who want it. */
export type MnemonicStrength = 12 | 24;

/* ── session ──────────────────────────────────────────────────────────────── */

export type WalletLockState =
  /** No vault exists for this user, on this device or on the server. */
  | "absent"
  /** A vault exists and the secret is not in memory. */
  | "locked"
  /** The secret is in memory and signing is possible. */
  | "unlocked";

export interface UnlockedWallet {
  accounts: DerivedAccount[];
  accountCount: number;
  /** Address for one VM at the active index, or null when that VM has no account. */
  addressFor(vm: WalletVm, index?: number): string | null;
}

/* ── errors ───────────────────────────────────────────────────────────────── */

/**
 * Every failure in this directory is one of these codes, and the reason is the
 * UI's: "wrong password" and "this blob is corrupt" need different copy, and
 * distinguishing them by matching on an exception message is how a browser
 * upgrade silently turns one into the other.
 *
 * `BAD_PASSWORD` and `CORRUPT` are genuinely indistinguishable from AES-GCM
 * itself — an authentication-tag failure is what both look like. They are told
 * apart one level up: if the envelope parsed and the tag failed, it is almost
 * certainly the password, and that is what the copy says. A vault that fails to
 * even parse is `CORRUPT`.
 */
export type WalletErrorCode =
  | "BAD_PASSWORD"
  | "CORRUPT"
  | "LOCKED"
  | "NO_VAULT"
  | "WEAK_PASSWORD"
  | "BAD_MNEMONIC"
  | "UNSUPPORTED";

export class WalletError extends Error {
  readonly code: WalletErrorCode;
  constructor(code: WalletErrorCode, message: string) {
    super(message);
    this.name = "WalletError";
    this.code = code;
  }
}
