"use client";

/**
 * The React binding for the in-house wallet.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * THE SESSION IS NOT REACT STATE, AND THIS HOOK DOES NOT OWN IT.
 *
 * `lib/web3-wallet/session.ts` holds the lock state in a module closure because
 * its other consumer — the EIP-1193 provider — runs outside React entirely,
 * answering `eth_accounts` before any component has mounted. This hook
 * SUBSCRIBES to that, through `useSyncExternalStore`, which is the API that
 * exists for exactly this shape and which handles the tearing that a
 * `useState` + `useEffect` mirror would not.
 *
 * ── EVERY ACTION RESOLVES; NONE THROW ───────────────────────────────────────
 * Same contract as the swap terminal's actions and the wallet facade's:
 * `{ error?: string }`. A wrong password is a NORMAL outcome, not an exception,
 * and a hook that threw would make every caller wrap a try/catch around a thing
 * that happens fifty times a day.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { $fetch } from "@/lib/api";
import {
  WalletError,
  createVault,
  changeVaultPassword,
  deriveWallets,
  generateMnemonic,
  getServerSnapshot,
  getSnapshot,
  lock as lockSession,
  mnemonicToSeed,
  reset as resetSession,
  setAutoLockMs,
  setVault,
  subscribe,
  unlock as unlockSession,
  withAccounts,
  type DerivedAccount,
  type MnemonicStrength,
  type VaultV1,
  type WalletLockState,
  type WalletVm,
} from "@/lib/web3-wallet";

export interface WalletActionResult<T = void> {
  error?: string;
  data?: T;
}

export interface PlatformWallet {
  /** "absent" | "locked" | "unlocked". */
  state: WalletLockState;
  /** True until the server has been asked whether a vault exists. */
  isLoading: boolean;
  accounts: DerivedAccount[];
  /** Null until the phrase has been verified. Drives the backup banner. */
  backedUpAt: string | null;
  /** Epoch ms of the pending auto-lock, or null. */
  locksAt: number | null;

  addressFor(vm: WalletVm, index?: number): string | null;

  /** A fresh phrase. Shown once, never stored by this hook. */
  newMnemonic(strength?: MnemonicStrength): string;

  createWallet(input: {
    mnemonic: string;
    password: string;
    /** True when adopting a phrase the user already had. */
    imported?: boolean;
    /** Destroy an existing wallet on this account. Requires typed confirmation upstream. */
    replace?: boolean;
  }): Promise<WalletActionResult>;

  unlock(password: string): Promise<WalletActionResult>;
  lock(): void;

  changePassword(current: string, next: string): Promise<WalletActionResult>;
  addAccount(): Promise<WalletActionResult>;
  confirmBackedUp(): Promise<WalletActionResult>;
  removeWallet(acknowledgeLoss: boolean): Promise<WalletActionResult>;

  setAutoLockMinutes(minutes: number): void;
  /** Re-read the vault from the server. */
  refresh(): Promise<void>;
}

interface VaultResponse {
  vault: string | null;
  backedUpAt: string | null;
}

export function usePlatformWallet(): PlatformWallet {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [backedUpAt, setBackedUpAt] = useState<string | null>(null);

  /* ── load ─────────────────────────────────────────────────────────────── */

  const refresh = useCallback(async () => {
    const { data, error } = await $fetch<VaultResponse>({
      url: "/api/dex/wallet/vault",
      silent: true,
    });

    if (error || !data) {
      /*
        A FAILED LOAD IS NOT "NO WALLET". Signed out, offline, or the addon
        disabled — treating any of them as absence would show a brand-new user
        the "create a wallet" screen while their real one sat on the server,
        and the create flow's own 409 guard is the only thing that would then
        stop them overwriting it. Leave the session untouched.
      */
      setIsLoading(false);
      return;
    }

    setBackedUpAt(data.backedUpAt ?? null);
    setVault(data.vault ? (safeParse(data.vault) as VaultV1 | null) : null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* ── actions ──────────────────────────────────────────────────────────── */

  const createWallet = useCallback<PlatformWallet["createWallet"]>(
    async ({ mnemonic, password, replace }) => {
      try {
        // Derive BEFORE encrypting: an invalid phrase must fail here, with a
        // message about the phrase, rather than after a vault has been written.
        const seed = mnemonicToSeed(mnemonic);
        const accounts = deriveWallets(seed, 1);
        const vault = await createVault({ mnemonic, password, accounts });

        const { error } = await $fetch({
          url: "/api/dex/wallet/vault",
          method: "PUT",
          body: {
            vault: JSON.stringify(vault),
            intent: replace ? "replace" : "create",
          },
          silent: true,
        });
        if (error) return { error };

        setVault(vault);
        // Unlock through the normal path so the integrity check in
        // `session.unlock` runs on the vault we just wrote, rather than
        // trusting it because we made it.
        await unlockSession(password);
        setBackedUpAt(null);
        return {};
      } catch (e) {
        return { error: describe(e) };
      }
    },
    []
  );

  const unlock = useCallback(async (password: string): Promise<WalletActionResult> => {
    try {
      await unlockSession(password);
      return {};
    } catch (e) {
      return { error: describe(e) };
    }
  }, []);

  const changePassword = useCallback(
    async (current: string, next: string): Promise<WalletActionResult> => {
      const vault = getSnapshot().vault;
      if (!vault) return { error: "There is no wallet on this account." };
      try {
        const rotated = await changeVaultPassword(vault, current, next);
        const { error } = await $fetch({
          url: "/api/dex/wallet/vault",
          method: "PUT",
          // `update`, NOT `replace`: the same phrase, a new lock. `replace`
          // would clear backedUpAt and nag a user who has lost nothing.
          body: { vault: JSON.stringify(rotated), intent: "update" },
          silent: true,
        });
        if (error) return { error };
        setVault(rotated);
        await unlockSession(next);
        return {};
      } catch (e) {
        return { error: describe(e) };
      }
    },
    []
  );

  const addAccount = useCallback(async (): Promise<WalletActionResult> => {
    const vault = getSnapshot().vault;
    if (!vault) return { error: "There is no wallet on this account." };
    if (getSnapshot().state !== "unlocked") {
      return { error: "Unlock your wallet to add an account." };
    }
    try {
      const nextCount = vault.accountCount + 1;
      /*
        RE-DERIVED FROM THE SEED, not appended to the stored list. The stored
        list is a rendering convenience; the seed is the truth, and rebuilding
        from it means an account can never be added at an index the key does not
        actually cover.
      */
      const { requireSeed } = await import("@/lib/web3-wallet/session");
      const accounts = deriveWallets(requireSeed(), nextCount);
      const next = withAccounts(vault, accounts, nextCount);

      const { error } = await $fetch({
        url: "/api/dex/wallet/vault",
        method: "PUT",
        body: { vault: JSON.stringify(next), intent: "update" },
        silent: true,
      });
      if (error) return { error };
      setVault(next);
      return {};
    } catch (e) {
      return { error: describe(e) };
    }
  }, []);

  const confirmBackedUp = useCallback(async (): Promise<WalletActionResult> => {
    const { data, error } = await $fetch<{ backedUpAt: string | null }>({
      url: "/api/dex/wallet/backup",
      method: "POST",
      body: { backedUp: true },
      silent: true,
    });
    if (error) return { error };
    setBackedUpAt(data?.backedUpAt ?? new Date().toISOString());
    return {};
  }, []);

  const removeWallet = useCallback(
    async (acknowledgeLoss: boolean): Promise<WalletActionResult> => {
      const { error } = await $fetch({
        url: "/api/dex/wallet/vault",
        method: "DELETE",
        body: { acknowledgeLoss },
        silent: true,
      });
      if (error) return { error };
      resetSession();
      setBackedUpAt(null);
      return {};
    },
    []
  );

  const setAutoLockMinutes = useCallback((minutes: number) => {
    setAutoLockMs(Math.max(0, minutes) * 60_000);
  }, []);

  const addressForVm = useCallback(
    (vm: WalletVm, index = 0) =>
      snapshot.accounts.find((a) => a.vm === vm && a.index === index)?.address ?? null,
    [snapshot.accounts]
  );

  return useMemo<PlatformWallet>(
    () => ({
      state: snapshot.state,
      isLoading,
      accounts: snapshot.accounts,
      backedUpAt,
      locksAt: snapshot.locksAt,
      addressFor: addressForVm,
      newMnemonic: generateMnemonic,
      createWallet,
      unlock,
      lock: lockSession,
      changePassword,
      addAccount,
      confirmBackedUp,
      removeWallet,
      setAutoLockMinutes,
      refresh,
    }),
    [
      snapshot.state,
      snapshot.accounts,
      snapshot.locksAt,
      isLoading,
      backedUpAt,
      addressForVm,
      createWallet,
      unlock,
      changePassword,
      addAccount,
      confirmBackedUp,
      removeWallet,
      setAutoLockMinutes,
      refresh,
    ]
  );
}

/**
 * A `WalletError`'s message is written for the user — "That password did not
 * open this wallet." — so it is passed through verbatim. Anything else is not,
 * because an unexpected exception's message is written for a developer and
 * frequently names a library.
 */
function describe(error: unknown): string {
  if (error instanceof WalletError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong with your wallet.";
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
