// src/stores/launchPlanStore.ts
import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useCreatorStore } from "./creator/creator-store";

export type LaunchPlanStore = {
  plans: icoLaunchPlanAttributes[];
  hasFetched: boolean;
  isLoading: boolean;
  error: string | null;
  fetchPlans: () => Promise<void>;
  getPlanById: (id: string) => icoLaunchPlanAttributes | undefined;
  checkPlanById: (id: string) => Promise<icoLaunchPlanAttributes | undefined>;
  canAddUpdate: (
    planId: string,
    currentUpdatesCount: number
  ) => Promise<boolean>;
  canAddTeamMember: (
    planId: string,
    currentTeamCount: number
  ) => Promise<boolean>;
  canAddRoadmapItem: (
    planId: string,
    currentRoadmapCount: number
  ) => Promise<boolean>;
  upgradePlan: (tokenId: string, planId: string) => Promise<void>;
};

export const useLaunchPlanStore = create<LaunchPlanStore>((set, get) => ({
  plans: [],
  hasFetched: false,
  isLoading: false,
  error: null,

  fetchPlans: async () => {
    // Add caching: if already fetched, do not fetch again.
    if (get().hasFetched) return;
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/ico/creator/launch/plan",
      silent: true,
    });
    if (!error) {
      // Parse the features for each plan if they come as a string.
      const parsedData = (data as icoLaunchPlanAttributes[]).map((plan) => ({
        ...plan,
        features:
          typeof plan.features === "string"
            ? JSON.parse(plan.features)
            : plan.features,
      }));
      set({ plans: parsedData, isLoading: false, hasFetched: true });
    } else {
      set({ error: error, isLoading: false, hasFetched: true });
    }
  },

  getPlanById: (id: string) => {
    const { plans } = get();
    return plans.find((plan) => plan.id === id);
  },

  checkPlanById: async (id: string) => {
    let plan = get().getPlanById(id);
    if (!plan && !get().hasFetched && !get().isLoading) {
      await get().fetchPlans();
      plan = get().getPlanById(id);
    }
    return plan;
  },

  canAddUpdate: async (planId: string, currentUpdatesCount: number) => {
    const plan = await get().checkPlanById(planId);
    if (!plan) return false;
    return currentUpdatesCount < plan.features.maxUpdatePosts;
  },

  canAddTeamMember: async (planId: string, currentTeamCount: number) => {
    const plan = await get().checkPlanById(planId);
    if (!plan) return false;
    return currentTeamCount < plan.features.maxTeamMembers;
  },

  canAddRoadmapItem: async (planId: string, currentRoadmapCount: number) => {
    const plan = await get().checkPlanById(planId);
    if (!plan) return false;
    return currentRoadmapCount < plan.features.maxRoadmapItems;
  },

  upgradePlan: async (tokenId, planId) => {
    try {
      const { data, error } = await $fetch({
        url: `/api/ico/creator/token/${tokenId}/plan`,
        method: "PUT",
        body: { planId },
        successMessage: "Plan upgraded successfully",
      });
      if (error) throw new Error(error);
      // Refresh the token data after upgrade.
      useCreatorStore.getState().fetchToken(tokenId);
    } catch (error) {
      console.error("Error upgrading plan:", error);
      throw error;
    }
  },
}));
