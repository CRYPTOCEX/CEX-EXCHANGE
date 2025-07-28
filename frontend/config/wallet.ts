import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  AppKitNetwork,
  arbitrum,
  mainnet,
  optimism,
  polygon,
} from "@reown/appkit/networks";

export const projectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ||
  "b56e18d47c72ab683b10814fe9495694";

export const networks = [mainnet, polygon, arbitrum, optimism] as [
  AppKitNetwork,
  ...AppKitNetwork[],
];

// Setup wagmi adapter lazily
let wagmiAdapter: WagmiAdapter | null = null;
let walletModal: any = null;
let hooks: any = {};

function initializeWallet() {
  if (typeof window === 'undefined') return null;
  
  try {
    if (!wagmiAdapter) {
      wagmiAdapter = new WagmiAdapter({
        networks,
        projectId,
      });
    }

    if (!walletModal) {
      const {
        createAppKit,
        useAppKit,
        useAppKitAccount,
        useAppKitEvents,
        useAppKitNetwork,
        useAppKitState,
        useAppKitTheme,
        useDisconnect,
        useWalletInfo,
      } = require("@reown/appkit/react");

      walletModal = createAppKit({
        adapters: [wagmiAdapter],
        networks,
        metadata: {
          name: process.env.NEXT_PUBLIC_SITE_NAME || "AppKit",
          description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "AppKit",
          url: process.env.NEXT_PUBLIC_SITE_URL || "https://appkit.reown.com",
          icons: ["https://avatars.githubusercontent.com/u/179229932?s=200&v=4"],
        },
        projectId,
        themeMode: "light",
        features: {
          analytics: true,
        },
      });

      hooks = {
        useAppKit,
        useAppKitState,
        useAppKitTheme,
        useAppKitEvents,
        useAppKitAccount,
        useWalletInfo,
        useAppKitNetwork,
        useDisconnect,
      };
    }

    return { modal: walletModal, ...hooks };
  } catch (error) {
    console.warn('Failed to initialize wallet:', error);
    return null;
  }
}

// Export safe hooks that only initialize when called
export function useAppKit() {
  const wallet = initializeWallet();
  return wallet?.useAppKit?.() || {};
}

export function useAppKitAccount() {
  const wallet = initializeWallet();
  return wallet?.useAppKitAccount?.() || { isConnected: false, address: null };
}

export function useAppKitNetwork() {
  const wallet = initializeWallet();
  return wallet?.useAppKitNetwork?.() || {};
}

export function useAppKitState() {
  const wallet = initializeWallet();
  return wallet?.useAppKitState?.() || {};
}

export function useAppKitTheme() {
  const wallet = initializeWallet();
  return wallet?.useAppKitTheme?.() || {};
}

export function useAppKitEvents() {
  const wallet = initializeWallet();
  return wallet?.useAppKitEvents?.() || {};
}

export function useWalletInfo() {
  const wallet = initializeWallet();
  return wallet?.useWalletInfo?.() || {};
}

export function useDisconnect() {
  const wallet = initializeWallet();
  return wallet?.useDisconnect?.() || { disconnect: () => {} };
}

export const modal = () => {
  const wallet = initializeWallet();
  return wallet?.modal;
};

// Export wagmiAdapter getter
export const getWagmiAdapter = () => {
  if (typeof window === 'undefined') {
    // Create a basic adapter for SSR
    return new WagmiAdapter({
      networks,
      projectId,
    });
  }
  
  if (!wagmiAdapter) {
    wagmiAdapter = new WagmiAdapter({
      networks,
      projectId,
    });
  }
  
  return wagmiAdapter;
};

// Export wagmiAdapter for direct import
export { getWagmiAdapter as wagmiAdapter };
