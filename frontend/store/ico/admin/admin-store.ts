"use client";
import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface IcoAdminStats {
  totalOfferings: number;
  pendingOfferings: number;
  activeOfferings: number;
  completedOfferings: number;
  rejectedOfferings: number;
  totalRaised: number;
  averageRaisePercentage: number;
  totalRevenue?: number;
  revenueGrowth?: number;
  offeringGrowth: number;
  raiseGrowth: number;
  successRate: number;
  successRateGrowth: number;
  recentActivity: (icoAdminActivityAttributes & {
    admin: {
      firstName: string;
      lastName: string;
    };
  })[];
}

interface AdminStoreState {
  stats: IcoAdminStats | null;
  pendingOfferings: icoTokenOfferingAttributes[];
  activeOfferings: icoTokenOfferingAttributes[];
  completedOfferings: icoTokenOfferingAttributes[];
  rejectedOfferings: icoTokenOfferingAttributes[];
  allOfferings: icoTokenOfferingAttributes[];
  isLoading: boolean;
  error: string | null;

  // Fetch functions for global data
  fetchStats: () => Promise<void>;
  fetchPendingOfferings: () => Promise<void>;
  fetchActiveOfferings: () => Promise<void>;
  fetchCompletedOfferings: () => Promise<void>;
  fetchRejectedOfferings: () => Promise<void>;
  fetchAllOfferings: (params?: Record<string, any>) => Promise<void>;
  deleteOffering: (id: string) => Promise<boolean>;
}

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  stats: null,
  pendingOfferings: [],
  activeOfferings: [],
  completedOfferings: [],
  rejectedOfferings: [],
  allOfferings: [],
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<IcoAdminStats>({
      url: "/api/admin/ico/stat",
      silent: true,
    });
    if (data && !error) {
      set({ stats: data, isLoading: false });
    } else {
      set({ error: error || "Failed to fetch stats", isLoading: false });
    }
  },

  fetchPendingOfferings: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/admin/ico/offer",
      params: { status: "PENDING" },
      silent: true,
    });
    if (data && !error) {
      set({ pendingOfferings: data, isLoading: false });
    } else {
      set({
        error: error || "Failed to fetch pending offerings",
        isLoading: false,
      });
    }
  },

  fetchActiveOfferings: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/admin/ico/offer",
      params: { status: "ACTIVE" },
      silent: true,
    });
    if (data && !error) {
      set({ activeOfferings: data, isLoading: false });
    } else {
      set({
        error: error || "Failed to fetch active offerings",
        isLoading: false,
      });
    }
  },

  fetchCompletedOfferings: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/admin/ico/offer",
      params: { status: "COMPLETED" },
      silent: true,
    });
    if (data && !error) {
      set({ completedOfferings: data, isLoading: false });
    } else {
      set({
        error: error || "Failed to fetch completed offerings",
        isLoading: false,
      });
    }
  },

  fetchRejectedOfferings: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/admin/ico/offer",
      params: { status: "REJECTED" },
      silent: true,
    });
    if (data && !error) {
      set({ rejectedOfferings: data, isLoading: false });
    } else {
      set({
        error: error || "Failed to fetch rejected offerings",
        isLoading: false,
      });
    }
  },

  fetchAllOfferings: async (params = {}) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/admin/ico/offer",
      params,
      silent: true,
    });
    if (data && !error) {
      set({ allOfferings: data, isLoading: false });
      return data;
    } else {
      set({ error: error || "Failed to fetch offerings", isLoading: false });
      return [];
    }
  },

  deleteOffering: async (id: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: `/api/admin/ico/offer/${id}`,
      method: "DELETE",
      silent: false,
    });

    if (!error) {
      // Remove the offering from all local arrays
      const state = get();
      set({
        pendingOfferings: state.pendingOfferings.filter((o) => o.id !== id),
        activeOfferings: state.activeOfferings.filter((o) => o.id !== id),
        completedOfferings: state.completedOfferings.filter((o) => o.id !== id),
        rejectedOfferings: state.rejectedOfferings.filter((o) => o.id !== id),
        allOfferings: state.allOfferings.filter((o) => o.id !== id),
        isLoading: false,
      });
      return true;
    } else {
      set({ error: error || "Failed to delete offering", isLoading: false });
      return false;
    }
  },
}));
