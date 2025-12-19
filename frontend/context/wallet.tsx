"use client";

import React, { type ReactNode, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type Config, WagmiProvider, cookieToInitialState } from "wagmi";
import { createAppKit } from '@reown/appkit/react';
import { useAppKitAccount } from "@reown/appkit/react";
import { config, networks, projectId, wagmiAdapter } from "@/config/wallet";
import { mainnet } from '@reown/appkit/networks';
import { useWalletStore } from "@/store/nft/wallet-store";

// Set up queryClient
const queryClient = new QueryClient();

const metadata = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Bicrypto',
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Cryptocurrency Exchange Platform',
  url: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/img/logo/logo.png` : 'https://avatars.githubusercontent.com/u/179229932?s=200&v=4'],
};

// Initialize AppKit outside the component render cycle
console.log('[wallet.tsx] Initializing AppKit with projectId:', projectId);
console.log('[wallet.tsx] projectId type:', typeof projectId);
console.log('[wallet.tsx] projectId length:', projectId?.length);

if (!projectId) {
  console.error("AppKit Initialization Error: Project ID is missing.");
} else {
  const appKitConfig = {
    adapters: [wagmiAdapter],
    projectId: projectId,
    networks: networks,
    defaultNetwork: mainnet,
    metadata,
    features: {
      analytics: true,
      onramp: false,
      swaps: false,
    },
    // Disable auto-reconnect on page load
    enableWalletConnect: true,
    enableInjected: true,
    enableCoinbase: false,
  };

  console.log('[wallet.tsx] Creating AppKit with config:', appKitConfig);
  createAppKit(appKitConfig);
}

// Component to sync AppKit state with wallet store
function WalletStateSync() {
  const { address, isConnected, caipAddress } = useAppKitAccount();
  const setWalletState = useWalletStore((state) => state.setWalletState);

  useEffect(() => {
    // Only sync if wallet is actually connected to prevent triggering connection on mount
    if (!isConnected && !address) {
      return;
    }

    // Extract chainId from CAIP address (format: eip155:1:0x...)
    let chainId: string | null = null;
    if (caipAddress) {
      const parts = caipAddress.split(':');
      if (parts.length >= 2) {
        chainId = `0x${parseInt(parts[1]).toString(16)}`;
      }
    }

    setWalletState({
      address: address || null,
      isConnected,
      chainId,
    });
  }, [address, isConnected, caipAddress, setWalletState]);

  return null;
}

function WalletProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  // Calculate initial state for Wagmi SSR hydration
  const initialState = cookieToInitialState(config as Config, cookies);

  return (
    <WagmiProvider config={config as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <WalletStateSync />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default WalletProvider;
