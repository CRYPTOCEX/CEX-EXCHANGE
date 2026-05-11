import { create } from "zustand";
import { $fetch } from "@/lib/api";
import type { User } from "./referral-store";

// Extended User type with network-specific properties
export interface NetworkUser extends Partial<User> {
  joinDate?: string;
  earnings?: number;
  teamSize?: number;
  performance?: number;
  role?: string;
  downlines?: NetworkUser[];
}

export interface TreeNode {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  level: number;
  status: string;
  earnings?: number;
  teamSize?: number;
  performance?: number;
  joinDate?: string;
  role?: string;
  downlines?: TreeNode[];
}

export interface BinaryStructure {
  left: NetworkUser | null;
  right: NetworkUser | null;
}

export interface NetworkData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    status?: string;
    joinDate?: string;
    earnings?: number;
    teamSize?: number;
    performance?: number;
    role?: string;
  };
  totalRewards: number;
  upline: NetworkUser | null;
  // For DIRECT system
  referrals?: Array<{
    id?: string;
    referred: NetworkUser;
    referrerId?: string;
    status?: string;
    createdAt?: string;
    earnings?: number;
    teamSize?: number;
    performance?: number;
    downlines?: NetworkUser[];
  }>;
  // For BINARY system
  binaryStructure?: BinaryStructure;
  // For UNILEVEL system
  levels?: Array<Array<NetworkUser>>;
  // Pre-processed tree data ready for visualization
  treeData?: TreeNode;
  settings?: any;
}

interface NetworkStore {
  networkData: NetworkData | null;
  loading: boolean;
  error: string | null;
  mlmSystem: "DIRECT" | "BINARY" | "UNILEVEL" | null;
  fetchNetworkData: () => Promise<void>;
}

// Default network data to use when API fails
const defaultNetworkData: NetworkData = {
  user: {
    id: "",
    firstName: "Current",
    lastName: "User",
    avatar: "",
    status: "ACTIVE",
    joinDate: "",
    earnings: 0,
    teamSize: 0,
    performance: 0,
    role: "You",
  },
  totalRewards: 0,
  upline: null,
  referrals: [],
  treeData: {
    id: "",
    firstName: "Current",
    lastName: "User",
    avatar: "",
    level: 0,
    status: "ACTIVE",
    earnings: 0,
    teamSize: 0,
    performance: 0,
    joinDate: "",
    role: "You",
    downlines: [],
  },
  settings: {
    mlmSystem: "DIRECT",
  },
};

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  networkData: null,
  loading: false,
  error: null,
  mlmSystem: null,
  fetchNetworkData: async () => {
    const currentState = get();
    
    // Prevent concurrent API calls
    if (currentState.loading) {
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await $fetch({
        url: "/api/affiliate/network",
        silentSuccess: true,
      });

      if (!error && data) {
        // Validate data structure before processing
        if (typeof data !== 'object' || data === null) {
          throw new Error("Invalid data format received from API");
        }

        // Use mlmSystem from API response if available, otherwise infer from data structure
        let mlmSystem: "DIRECT" | "BINARY" | "UNILEVEL" | null = data.mlmSystem || null;
        if (!mlmSystem) {
          // Fallback: infer from data structure for backwards compatibility
          if (data.binaryStructure && typeof data.binaryStructure === 'object') {
            mlmSystem = "BINARY";
          } else if (Array.isArray(data.levels)) {
            mlmSystem = "UNILEVEL";
          } else if (Array.isArray(data.referrals)) {
            mlmSystem = "DIRECT";
          }
        }

        // Only update state if component is still mounted and no newer request is in progress
        const latestState = get();
        if (latestState.loading) {
          set({ networkData: data, mlmSystem, loading: false });
        }
      } else {
        console.error("Network data fetch error:", error);
        // Use default data when API fails, but only if no data exists
        const currentData = get().networkData;
        set({
          networkData: currentData || defaultNetworkData,
          mlmSystem: currentData ? get().mlmSystem : "DIRECT",
          error: error || "Failed to fetch network data",
          loading: false,
        });
      }
    } catch (err) {
      console.error("Network data fetch exception:", err);
      
      // Use default data when API fails, but preserve existing data if available
      const currentData = get().networkData;
      set({
        networkData: currentData || defaultNetworkData,
        mlmSystem: currentData ? get().mlmSystem : "DIRECT",
        error: err instanceof Error ? err.message : "An unknown error occurred",
        loading: false,
      });
    }
  },
}));
