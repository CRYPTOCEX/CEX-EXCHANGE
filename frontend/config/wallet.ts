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

async function initializeWallet() {
  if (typeof window === 'undefined') return null;
  
  try {
    if (!wagmiAdapter) {
      wagmiAdapter = new WagmiAdapter({
        networks,
        projectId,
      });
    }

    if (!walletModal) {
      // Dynamic import to avoid SSR issues with lit components
      const appkit = await import("@reown/appkit/react");
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
      } = appkit;

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

// Initialize wallet on client side
let walletPromise: Promise<any> | null = null;

function getWalletInitialization() {
  if (!walletPromise) {
    walletPromise = initializeWallet();
  }
  return walletPromise;
}

// Export safe hooks that only initialize when called
export function useAppKit() {
  if (typeof window === 'undefined') return {};
  return hooks.useAppKit?.() || {};
}

export function useAppKitAccount() {
  if (typeof window === 'undefined') return { isConnected: false, address: null };
  return hooks.useAppKitAccount?.() || { isConnected: false, address: null };
}

export function useAppKitNetwork() {
  if (typeof window === 'undefined') return {};
  return hooks.useAppKitNetwork?.() || {};
}

export function useAppKitState() {
  if (typeof window === 'undefined') return {};
  return hooks.useAppKitState?.() || {};
}

export function useAppKitTheme() {
  if (typeof window === 'undefined') return {};
  return hooks.useAppKitTheme?.() || {};
}

export function useAppKitEvents() {
  if (typeof window === 'undefined') return {};
  return hooks.useAppKitEvents?.() || {};
}

export function useWalletInfo() {
  if (typeof window === 'undefined') return {};
  return hooks.useWalletInfo?.() || {};
}

export function useDisconnect() {
  if (typeof window === 'undefined') return { disconnect: () => {} };
  return hooks.useDisconnect?.() || { disconnect: () => {} };
}

export const modal = () => {
  if (typeof window === 'undefined') return null;
  return walletModal;
};

// Initialize wallet when imported on client side
if (typeof window !== 'undefined') {
  getWalletInitialization();
}

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
