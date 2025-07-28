"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

export type StakingAdminActivity = {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    email: string;
  };
  action: "create" | "update" | "delete" | "approve" | "reject" | "distribute";
  type: "pool" | "position" | "earnings" | "settings" | "withdrawal";
  relatedId: string;
  createdAt: Date;
};

interface AdminActivityState {
  adminActivities: StakingAdminActivity[];
  isLoading: boolean;
  error: string | null;
  fetchAdminActivities: () => Promise<void>;
}

export const useStakingAdminActivityStore = create<AdminActivityState>(
  (set) => ({
    adminActivities: [],
    isLoading: false,
    error: null,

    fetchAdminActivities: async () => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await $fetch({
          url: "/api/admin/staking/activity",
          silentSuccess: true,
        });
        if (error) throw new Error(error);
        set({ adminActivities: data || [], isLoading: false });
      } catch (err) {
        console.error("Error fetching admin activities:", err);
        set({
          error:
            err instanceof Error
              ? err.message
              : "Failed to fetch admin activities",
          isLoading: false,
        });
      }
    },
  })
);
