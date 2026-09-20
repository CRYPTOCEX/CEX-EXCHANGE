"use client";

import React, { type ReactNode, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type Config, WagmiProvider, cookieToInitialState } from "wagmi";
import { createAppKit } from '@reown/appkit/react';
import { useAppKitAccount } from "@reown/appkit/react";
import {
  config,
  networks,
  projectId,
  solanaAdapter,
  wagmiAdapter,
  walletConfigured,
} from "@/config/wallet";
import { mainnet, type AppKitNetwork } from '@reown/appkit/networks';
import type { CreateAppKit } from '@reown/appkit';
import { useWalletStore } from "@/store/nft/wallet-store";
import { PlatformWalletHost } from "@/components/web3-wallet/platform-wallet-host";
import { WalletUnavailable } from "@/components/error/wallet-unavailable";

// Set up queryClient
const queryClient = new QueryClient();

const metadata = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Bicrypto',
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Cryptocurrency Exchange Platform',
  url: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/img/logo/logo.png` : 'https://avatars.githubusercontent.com/u/179229932?s=200&v=4'],
};

/**
 * P7.1 — the embedded wallet, stated rather than defaulted.
 *
 * `features.email` and `features.socials` used to be ABSENT from this block,
 * which is not the same as off. AppKit 1.8.23 resolves an absent value from
 * `DEFAULT_REMOTE_FEATURES`, where `email: true` and all seven socials are ON —
 * so the embedded wallet was enabled by omission, and so was `swaps: ['1inch']`
 * whenever the Reown cloud could not be reached. Writing the intent down is the
 * only way the local config expresses a decision at all.
 *
 * IT IS A REQUEST, NOT A GUARANTEE, AND THAT IS NOT FIXABLE HERE.
 * `ConfigUtil.fetchRemoteFeatures` lets dashboard.reown.com override every one
 * of `email`, `socials`, `swaps`, `onramp` and `activity`; when the cloud
 * answers, the values below are discarded and AppKit logs a warning saying so.
 * The durable switch for all five is the Reown project dashboard. That is
 * deployment configuration, not code, and it is on the pre-release checklist
 * for exactly that reason.
 *
 * OPT-IN AT BUILD TIME, because it has to be. `createAppKit` is a module-scope
 * singleton evaluated on import and idempotent afterwards, so there is no point
 * at which a value fetched from the server could reach it — the same constraint
 * that already makes NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID a build-time value.
 * Set NEXT_PUBLIC_DEX_EMBEDDED_WALLET=true and REBUILD; a restart is not enough.
 *
 * NOTHING MAY GATE ON THE RESULT. If the connector does not appear — because
 * this is off, because the dashboard says so, or because Reown is down — the
 * terminal degrades to "connect an external wallet" and every code path behaves
 * identically. `embedded-wallet-optional.test.ts` asserts no file under
 * (ext)/dex branches on a connector's existence.
 */
const embeddedWalletEnabled =
  String(process.env.NEXT_PUBLIC_DEX_EMBEDDED_WALLET ?? '').toLowerCase() === 'true';

if (!walletConfigured || !projectId || !wagmiAdapter || !solanaAdapter) {
  /*
    NOT A THROW. `config/wallet.tsx` records why: this file is only ever loaded
    through next/dynamic({ ssr: false }), so an exception here never reaches
    `next build` — it reaches the visitor, as a whole-page 500. The user-facing
    answer is the notice `WalletProvider` renders below; this line is for the
    operator reading the console, and it says what to do.
  */
  console.error(
    "[wallet] NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is not set in this build. " +
      "Wallet sign-in, Profile → Wallet linking, the NFT wallet actions and the Swap " +
      "terminal show \"Wallet connection is not set up yet\" until it is set in .env and " +
      "the frontend is REBUILT — a restart is not enough, the value is compiled into the " +
      "bundle. Free project id: https://cloud.reown.com"
  );
} else {
  const appKitConfig: CreateAppKit = {
    /*
      TWO ADAPTERS, ONE MODAL. AppKit routes each network to whichever adapter
      claims its CAIP namespace — wagmi answers for `eip155:*`, the Solana
      adapter for `solana:*`. `networks` lists Solana, and a listed network with
      no adapter is one the modal offers and cannot connect to.

      Order is not significant; namespace ownership is.
    */
    adapters: [wagmiAdapter, solanaAdapter],
    projectId: projectId,
    networks: networks as [AppKitNetwork, ...AppKitNetwork[]],
    defaultNetwork: mainnet as AppKitNetwork,
    metadata,
    features: {
      analytics: true,
      onramp: false,
      swaps: false,
      email: embeddedWalletEnabled,
      // `false`, not `[]`: AppKit treats an EMPTY ARRAY as "socials configured,
      // none chosen" in some paths and reads `false` as off everywhere.
      socials: embeddedWalletEnabled
        ? ['google', 'x', 'apple', 'discord']
        : false,
      // Show external wallets alongside the email box rather than behind it.
      // A self-custody product whose first screen is an email field reads as a
      // custodial one.
      emailShowWallets: true,
    }
  };

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
  fallbackVariant,
}: {
  children: ReactNode;
  cookies: string | null;
  fallbackVariant?: import("@/components/error/wallet-unavailable").WalletUnavailableVariant;
}) {
  /*
    THE UNCONFIGURED BRANCH RENDERS THE NOTICE *INSTEAD OF* THE CHILDREN.

    Not alongside them: every child of this provider calls wagmi or AppKit
    hooks on its first render (useAccount, useAppKitAccount, useSignMessage…),
    and each of those throws when its provider is absent — AppKit's literally
    says 'Please call "createAppKit" before using "useAppKit" hook'. Rendering
    the children here would reproduce the whole-page 500 this branch exists to
    replace, one hook later. So the profile wallet tab, the Swap terminal, the
    NFT flows and the wallet sign-in form all become this one card until the
    operator sets the id and rebuilds.

    Before any hook, so the configured path's hook order is unchanged.
  */
  if (!walletConfigured || !wagmiAdapter) {
    return <WalletUnavailable reason="unconfigured" variant={fallbackVariant} />;
  }

  // Calculate initial state for Wagmi SSR hydration
  const initialState = cookieToInitialState(config as Config, cookies);

  return (
    <WagmiProvider config={config as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <WalletStateSync />
        {/*
          THE IN-HOUSE WALLET, MOUNTED HERE AND NOWHERE ELSE.

          It announces itself over EIP-6963, which is how wagmi discovers any
          wallet — so from this point on the swap terminal, wallet login, the
          profile wallet tab and the four NFT flows all offer it without a line
          changing in any of them. That is the entire reason it hangs off this
          provider rather than off a route: every surface that can talk to a
          wallet already mounts this, and an eighth one will too.

          It renders NOTHING for a user who has not created a wallet. See
          `components/web3-wallet/platform-wallet-host.tsx`.
        */}
        <PlatformWalletHost />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default WalletProvider;
