"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { WalletUnavailable } from "@/components/error/wallet-unavailable";

/**
 * THE BOUNDARY AROUND THE WALLET CHUNK, and why it is a class.
 *
 * `LazyWalletProvider` is `next/dynamic(() => import("./wallet"), { ssr: false })`.
 * In the App Router that is `React.lazy` inside a `Suspense`
 * (next/dist/shared/lib/lazy-dynamic/loadable.js), and the `loading` prop is
 * rendered with `error: null` — always. There is no path by which a failed
 * import reaches `loading`; a rejected chunk or a module that throws while it
 * evaluates is re-thrown by `React.lazy` and climbs to the nearest error
 * boundary. Without one here, that boundary was the SEGMENT's `error.tsx`, and
 * the segment's whole content — on the swap terminal literally everything, on
 * the profile the entire dashboard shell, on the admin pool page the console —
 * became "500 — Something went wrong" because one optional feature could not
 * start.
 *
 * This is the nearest boundary now. A wallet failure costs the user the wallet
 * card, says what happened, and leaves the rest of the page standing.
 *
 * WHAT IT CATCHES, in order of how often it will happen on a real install:
 *   1. `config/wallet.tsx` used to THROW on a build with no
 *      NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID. That is fixed at the source (the
 *      provider renders a notice instead), so this boundary no longer sees it —
 *      but an older wallet chunk served from a stale CDN still can.
 *   2. The chunk did not arrive: offline, a blocked script, a deploy that
 *      rotated chunk hashes under an open tab. `React.lazy` caches the rejection
 *      for the life of the page, so the only real retry is a reload, which is
 *      what the fallback offers.
 *   3. A throw during the provider's first render — an AppKit hook called
 *      before `createAppKit`, wagmi without its provider, a connector's
 *      constructor rejecting the browser it is in.
 *
 * It does NOT try to reset in place. `React.lazy` will re-throw the same cached
 * rejection on the next render, so a "try again" button that only clears state
 * would flash the notice away and straight back. Reload is honest.
 *
 * AND IT CATCHES CHILD ERRORS TOO — deliberately, not as an oversight. A bug in
 * the wallet tab's own render lands here rather than in the segment boundary,
 * and is reported with the wallet card. That mislabels a rare case; the
 * alternative — re-throwing errors that do not pattern-match a "wallet" shape —
 * risks re-throwing a genuine wallet failure into the whole-page 500 this
 * boundary exists to end, because chunk errors, module throws and hook throws
 * share no reliable shape. The card's copy is therefore neutral ("could not be
 * loaded", reload), and the real error is on the console either way.
 */
import type { WalletUnavailableVariant } from "@/components/error/wallet-unavailable";

interface WalletChunkBoundaryProps {
  children: ReactNode;
  /** Where the card renders — see WalletUnavailable's variant note. */
  variant?: WalletUnavailableVariant;
}

interface WalletChunkBoundaryState {
  error: Error | null;
}

export class WalletChunkBoundary extends Component<
  WalletChunkBoundaryProps,
  WalletChunkBoundaryState
> {
  state: WalletChunkBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): WalletChunkBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The console is the only place an operator can read the cause: the card
    // below deliberately shows the message to admins only.
    console.error(
      "[wallet] the wallet provider failed to load or render:",
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.error) {
      return (
        <WalletUnavailable
          reason="load_failed"
          error={this.state.error}
          variant={this.props.variant}
        />
      );
    }
    return this.props.children;
  }
}

export default WalletChunkBoundary;
