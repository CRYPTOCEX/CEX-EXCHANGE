"use client";

/**
 * The one component that makes the in-house wallet exist on a page.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * IT IS MOUNTED INSIDE `context/wallet.tsx`'s `WalletProvider`, AND THAT IS THE
 * WHOLE OF THE INTEGRATION.
 *
 * `LazyWalletProvider` is already mounted at every surface that can talk to a
 * wallet — the swap terminal, wallet login, the profile wallet tab and four NFT
 * flows. Hanging this off it means the in-house wallet appears at all seven
 * without any of them being edited, and cannot be accidentally omitted from an
 * eighth, because whoever adds one has to mount the wallet provider anyway.
 *
 * It does four things and nothing else:
 *   1. announces the EIP-6963 provider, so wagmi and AppKit can see it;
 *   2. registers the Wallet Standard entry, so AppKit's Solana adapter can;
 *   3. loads the encrypted vault into the session, so `eth_accounts` can answer
 *      before React has drawn anything;
 *   4. renders whatever the approval queue is asking.
 *
 * ── IT RENDERS NOTHING FOR A USER WITHOUT A WALLET ──────────────────────────
 * No banner, no prompt, no nudge. A visitor who has never created one sees a
 * page identical to the one they saw before this feature existed, and the
 * announced provider simply reports no accounts. Discovery happens on the
 * wallet page, not by interrupting somebody who is trying to trade with
 * MetaMask.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useSyncExternalStore } from "react";

import { usePlatformWallet } from "@/hooks/use-platform-wallet";
import {
  approve,
  getApprovals,
  getServerApprovals,
  reject,
  rejectAll,
  subscribeApprovals,
} from "@/lib/web3-wallet/approval";
import { announcePlatformWallet } from "@/lib/web3-wallet/providers/announce";
import { registerSolanaWallet } from "@/lib/web3-wallet/providers/solana-standard";
import { getSnapshot, subscribe } from "@/lib/web3-wallet/session";

import { ApprovalDialog } from "./approval-dialog";
import { UnlockDialog } from "./unlock-dialog";

export function PlatformWalletHost() {
  /* Loads the vault into the session. The hook's own effect does the fetch;
     nothing here needs its return value. */
  usePlatformWallet();

  const approvals = useSyncExternalStore(
    subscribeApprovals,
    getApprovals,
    getServerApprovals
  );

  useEffect(() => {
    /*
      ANNOUNCED IN AN EFFECT, NOT AT MODULE SCOPE. Module scope runs during SSR
      where `window` does not exist, and it would also fire before the provider
      singleton's own subscription is wired. `announcePlatformWallet` is
      idempotent, so StrictMode's double-mount in development is harmless.
    */
    announcePlatformWallet();
    /*
      Solana's equivalent, and safe for the same reason: the Wallet Standard
      is a REGISTRY, so registering adds an entry and cannot overwrite Phantom
      the way writing to `window.solana` would. `config/wallet.tsx` builds the
      Solana adapter with `wallets: []` precisely so it discovers through it.
    */
    registerSolanaWallet();
  }, []);

  useEffect(() => {
    /*
      A PENDING SHEET CANNOT SURVIVE A LOCK. Auto-lock zeroes the seed, so a
      confirm button left on screen could not do anything if pressed — the
      caller would sit there until the five-minute timeout with a dialog that
      silently does nothing. Rejecting immediately turns that into the error the
      caller already knows how to handle.
    */
    return subscribe(() => {
      if (getSnapshot().state !== "unlocked" && getApprovals().length) {
        const pending = getApprovals();
        // An `unlock` request is the one thing that is SUPPOSED to be open
        // while locked. Rejecting it here would make unlocking impossible.
        const needsSecret = pending.some((p) => p.request.kind !== "unlock");
        if (needsSecret) rejectAll();
      }
    });
  }, []);

  const current = approvals[0];
  if (!current) return null;

  if (current.request.kind === "unlock") {
    return (
      <UnlockDialog
        open
        reason={current.request.reason}
        onUnlocked={() => approve(current.id, true)}
        onCancel={() => reject(current.id)}
      />
    );
  }

  return (
    <ApprovalDialog
      approval={current}
      onApprove={() => approve(current.id, true)}
      onReject={() => reject(current.id)}
    />
  );
}

export default PlatformWalletHost;
