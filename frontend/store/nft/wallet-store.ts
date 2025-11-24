import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WalletState {
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  // Actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchWallet: () => Promise<void>;
  checkConnection: () => Promise<void>;
  setChainId: (chainId: string) => void;
  getBalance: () => Promise<string | null>;
  getProvider: () => Promise<any>;
  // Manual setters for syncing with AppKit hooks
  setWalletState: (state: Partial<Pick<WalletState, 'address' | 'chainId' | 'isConnected'>>) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,

      connectWallet: async () => {
        set({ isConnecting: true, error: null });

        try {
          // Dynamic import to avoid SSR issues
          if (typeof window === 'undefined') {
            throw new Error('Cannot connect wallet on server side');
          }

          // Import AppKit hooks
          const { useAppKit } = await import('@reown/appkit/react');

          // Since we can't use hooks here, we need to trigger the modal differently
          // The actual connection should be handled by the WalletButton component
          // This is just a placeholder - the real connection happens via AppKit modal

          set({ isConnecting: false });

        } catch (error: any) {
          console.error("Error connecting wallet:", error);
          set({
            error: error.message || "Failed to connect wallet",
            isConnecting: false,
            isConnected: false,
          });
          throw error;
        }
      },

      disconnectWallet: () => {
        set({
          address: null,
          chainId: null,
          isConnected: false,
          error: null,
        });
      },

      switchWallet: async () => {
        get().disconnectWallet();
        await get().connectWallet();
      },

      setChainId: (chainId: string) => {
        set({ chainId });
      },

      checkConnection: async () => {
        // Connection state is managed by AppKit and synced via setWalletState
        // This is a no-op but kept for compatibility
      },

      getBalance: async () => {
        try {
          const { address } = get();
          if (!address) {
            return null;
          }

          const provider = await get().getProvider();
          if (!provider) {
            return null;
          }

          // Get balance in Wei
          const balanceWei = await provider.request({
            method: "eth_getBalance",
            params: [address, "latest"],
          });

          // Convert from Wei to Ether
          const balanceEth = parseInt(balanceWei, 16) / Math.pow(10, 18);
          return balanceEth.toString();
        } catch (error) {
          console.error("Error fetching balance:", error);
          return null;
        }
      },

      getProvider: async () => {
        try {
          if (typeof window === 'undefined') {
            return null;
          }

          // Get provider from wagmi config
          const { config } = await import("@/config/wallet");
          const { getConnectorClient } = await import("wagmi/actions");

          try {
            const connectorClient = await getConnectorClient(config);
            return connectorClient.transport;
          } catch (error) {
            console.error("Error getting connector client:", error);
            return null;
          }
        } catch (error) {
          console.error("Error getting provider:", error);
          return null;
        }
      },

      setWalletState: (state) => {
        set(state);
      },
    }),
    {
      name: "nft-wallet-storage",
      partialize: (state) => ({}), // Don't persist anything to prevent auto-connect
    }
  )
);
