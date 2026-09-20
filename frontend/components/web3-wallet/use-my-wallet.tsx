"use client";

/**
 * "Use my wallet" — one click, no chooser.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * THE WALLET WAS ALREADY THERE. IT WAS TWO CLICKS AND A LIST AWAY.
 *
 * EIP-6963 puts the in-house wallet in AppKit's modal, listed as INSTALLED
 * above MetaMask, and that is the right thing for a chooser to do — a user with
 * a Ledger should still find their Ledger. But it means someone whose wallet
 * lives in this product has to press "Connect Wallet", read a list of other
 * people's wallets, and pick their own out of it. On a page whose whole premise
 * is that you do not need an external wallet, that is the wrong first
 * impression.
 *
 * So this connects DIRECTLY to our own announced provider and skips the modal.
 * The chooser stays exactly where it was for everyone else.
 *
 * ── IT LIVES OUTSIDE `(ext)/dex` BECAUSE OF THE WAGMI RULE ──────────────────
 * `use-dex-wallet.ts` is documented as the only module under the DEX route
 * allowed to import wagmi, so that the terminal has one source of truth for
 * connection state. Rather than weaken that, this component sits in the shared
 * tree and is rendered BY the terminal — the rule is about the DEX route's
 * internals, and a shared component that happens to be used there is not a
 * second source of truth for anything the terminal reads.
 *
 * ── IT RENDERS NOTHING UNLESS IT WOULD WORK ─────────────────────────────────
 * No wallet on the account, already connected, or the connector not discovered
 * — all render null. A button that appears and then explains it cannot help is
 * worse than no button.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { useSyncExternalStore } from "react";
import { Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAccount, useConnect } from "wagmi";

import { cn } from "@/lib/utils";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/web3-wallet/session";

/**
 * Find the connector wagmi built for OUR announced provider.
 *
 * Matched on the `isPlatformWallet` flag the provider sets, not on its name:
 * the name is `${NEXT_PUBLIC_SITE_NAME} Wallet` and therefore differs per
 * deployment, while the flag is ours and cannot collide with another wallet's.
 */
function usePlatformConnector() {
  const { connectors } = useConnect();
  return connectors.find((connector) => {
    const provider = (connector as { _wallet?: { provider?: unknown } })._wallet
      ?.provider as { isPlatformWallet?: boolean } | undefined;
    if (provider?.isPlatformWallet) return true;
    // wagmi's EIP-6963 connectors carry the announced rdns as their id.
    return typeof connector.id === "string" && connector.id.endsWith(".wallet");
  });
}

export function UseMyWalletButton({ className }: { className?: string }) {
  const t = useTranslations("ext_dex");
  const { isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const connector = usePlatformConnector();

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // See the header: render nothing rather than a button that cannot help.
  if (isConnected || snapshot.state === "absent" || !connector) return null;

  return (
    <button
      type="button"
      data-testid="dex-use-my-wallet"
      onClick={() => connect({ connector })}
      disabled={isPending}
      title={t("use_my_wallet")}
      /*
        `aria-label` as well as the visible text, because the text is HIDDEN on
        a narrow bar — see below. Without it the button becomes an unlabelled
        icon at exactly the widths where it is hardest to guess.
      */
      aria-label={t("use_my_wallet")}
      className={cn(
        "flex h-full items-center gap-1.5 px-3 text-xs font-medium text-primary transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50",
        className
      )}
    >
      <Wallet className="size-3.5" />
      {/*
        ══════════════════════════════════════════════════════════════════════
        THE LABEL IS THE FIRST THING TO GO WHEN THE BAR IS NARROW.

        The DEX terminal header mounts this as a cell, and it is the widest
        text cell on the bar. Measured at a 640px viewport — the narrowest
        width at which that header renders at all — the bar came to 652px and
        clipped the account avatar off its right edge, which is what
        `terminal-chrome.pw.mjs`'s "the bar never overflows the workspace at
        any width it renders at" reports.

        Nothing is lost by hiding it: the wallet glyph stays, and `title` plus
        `aria-label` both carry the full name. The bar's own ladder does the
        same thing to the guide, theme and fullscreen cells one breakpoint up.
        ══════════════════════════════════════════════════════════════════════
      */}
      <span className="hidden md:inline">{t("use_my_wallet")}</span>
    </button>
  );
}

export default UseMyWalletButton;
