"use client";

/**
 * Lazy Wallet Provider
 *
 * Dynamically imports the heavy web3 libraries (wagmi, viem, @reown/appkit)
 * only when the wallet functionality is actually needed.
 *
 * This reduces the initial bundle size significantly since these libraries
 * are only loaded on NFT/wallet-related pages.
 */

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { WalletChunkBoundary } from "./wallet-chunk-boundary";

/**
 * `loading` NEVER SEES `children`, WHICH IS WHY THIS SUBTREE GOES BLANK.
 *
 * next/dynamic's `loading` prop is called with `{ error, isLoading, pastDelay,
 * retry, timedOut }` — never the wrapped children — so a fallback cannot render
 * the page underneath. A `WalletProviderLoading({ children })` helper used to
 * sit here looking like the intended fallback; it was unreferenced, because it
 * cannot be wired up. Removed rather than left as a decoy.
 *
 * The consequence is real and worth knowing before changing this file: while
 * the wagmi/viem/@reown-appkit chunk downloads, everything inside this provider
 * renders as nothing. On a slow connection that is a visibly blank page. Fixing
 * THAT means rendering children outside the provider during load, which would
 * throw for any descendant calling a wagmi hook — so it is a design change, not
 * a tweak, and is deliberately not made here.
 *
 * `loading` NEVER SEES `error` EITHER — not in the App Router. A previous
 * version of this file read `({ error })` and rendered a "could not be loaded"
 * notice from it. That branch was dead code: `next/dist/shared/lib/lazy-dynamic/
 * loadable.js` renders the loading component with `error: null` unconditionally
 * and hands the import to `React.lazy`, so a chunk that failed — or a module that
 * THREW while evaluating, which `config/wallet.tsx` did on a build with no
 * WalletConnect project id — was re-thrown to the nearest error boundary. There
 * was none between here and the segment's `error.tsx`, so one optional feature
 * took the whole page down as "500 — Something went wrong". That is what a
 * customer saw on /user/profile?tab=wallet and /dex/swap.
 *
 * The boundary is `WalletChunkBoundary`, wrapped around the dynamic component
 * below. The failure now costs the wallet card and nothing else.
 */
const WalletProviderInner = dynamic(
  () => import("./wallet").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => null,
  }
);

interface LazyWalletProviderProps {
  children: ReactNode;
  cookies: string | null;
  /**
   * Where the failure cards render when the wallet stack cannot start —
   * "modal" inside the sign-in dialog, "page" on the chromeless Swap
   * terminal, "inline" (default) everywhere a fixed header sits above.
   */
  fallbackVariant?: import("@/components/error/wallet-unavailable").WalletUnavailableVariant;
}

/**
 * Use this instead of WalletProvider directly to get lazy loading benefits.
 *
 * The heavy web3 libraries will only be downloaded when this component mounts.
 */
export function LazyWalletProvider({
  children,
  cookies,
  fallbackVariant,
}: LazyWalletProviderProps) {
  return (
    <WalletChunkBoundary variant={fallbackVariant}>
      <WalletProviderInner cookies={cookies} fallbackVariant={fallbackVariant}>
        {children}
      </WalletProviderInner>
    </WalletChunkBoundary>
  );
}

export default LazyWalletProvider;
