"use client";

import React, { type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type Config, WagmiProvider, cookieToInitialState } from "wagmi";

import { projectId, wagmiAdapter } from "@/config/wallet";

// Set up queryClient
const queryClient = new QueryClient();

if (!projectId) {
  throw new Error("Project ID is not defined");
}

function WalletProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  // Get wagmi adapter safely
  const adapter = wagmiAdapter();
  const wagmiConfig = adapter?.wagmiConfig;
  
  // Fallback if wallet config is not available
  if (!wagmiConfig) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  const initialState = cookieToInitialState(
    wagmiConfig as Config,
    cookies
  );

  return (
    <WagmiProvider
      config={wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default WalletProvider;
