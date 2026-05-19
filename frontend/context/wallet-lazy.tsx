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

// Loading component while wallet provider initializes
function WalletProviderLoading({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// Dynamically import the full wallet provider
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
}

/**
 * Use this instead of WalletProvider directly to get lazy loading benefits.
 *
 * The heavy web3 libraries will only be downloaded when this component mounts.
 */
export function LazyWalletProvider({ children, cookies }: LazyWalletProviderProps) {
  return (
    <WalletProviderInner cookies={cookies}>
      {children}
    </WalletProviderInner>
  );
}

export default LazyWalletProvider;
