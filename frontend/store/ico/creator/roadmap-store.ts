import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useCreatorStore } from "./creator-store";

export type icoRoadmapItemAttributes = {
  id: string;
  offeringId: string;
  title: string;
  description: string;
  date: string;
  completed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
};

export type icoRoadmapItemCreationAttributes =
  Partial<icoRoadmapItemAttributes>;

type RoadmapStore = {
  roadmapItems: icoRoadmapItemAttributes[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  lastTokenIdFetched: string | null;
  fetchRoadmap: (tokenId: string) => Promise<void>;
  addRoadmapItem: (
    tokenId: string,
    item: Omit<icoRoadmapItemAttributes, "id" | "offeringId">
  ) => Promise<void>;
  updateRoadmapItem: (tokenId: string, item: any) => Promise<void>;
  removeRoadmapItem: (tokenId: string, itemId: string) => Promise<void>;
};

export const useRoadmapStore = create<RoadmapStore>((set, get) => ({
  roadmapItems: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  lastTokenIdFetched: null,

  fetchRoadmap: async (tokenId: string) => {
    if (get().lastTokenIdFetched === tokenId && get().roadmapItems.length > 0) {
      return;
    }
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: `/api/ico/creator/token/${tokenId}/roadmap`,
      silent: true,
    });
    if (!error) {
      set({
        roadmapItems: data || [],
        isLoading: false,
        lastTokenIdFetched: tokenId,
      });
    } else {
      set({ isLoading: false, error });
    }
  },

  addRoadmapItem: async (tokenId, item) => {
    try {
      set({ isSubmitting: true, error: null });
      const { data, error } = await $fetch({
        url: `/api/ico/creator/token/${tokenId}/roadmap`,
        method: "POST",
        body: item,
        successMessage: "Roadmap item added successfully",
      });
      if (error) throw new Error(error);
      // Invalidate cache
      set({ lastTokenIdFetched: null });
      useCreatorStore.getState().fetchToken(tokenId);
      set({ isSubmitting: false });
    } catch (error: any) {
      console.error("Error adding roadmap item:", error);
      set({
        isSubmitting: false,
        error: error.message || "Failed to add roadmap item",
      });
    }
  },

  updateRoadmapItem: async (tokenId, item) => {
    try {
      set({ isSubmitting: true, error: null });
      const { data, error } = await $fetch({
        url: `/api/ico/creator/token/${tokenId}/roadmap/${item.id}`,
        method: "PUT",
        body: item,
        successMessage: "Roadmap item updated successfully",
      });
      if (error) throw new Error(error);
      set({ lastTokenIdFetched: null });
      useCreatorStore.getState().fetchToken(tokenId);
      set({ isSubmitting: false });
    } catch (error: any) {
      console.error("Error updating roadmap item:", error);
      set({
        isSubmitting: false,
        error: error.message || "Failed to update roadmap item",
      });
    }
  },

  removeRoadmapItem: async (tokenId, itemId) => {
    try {
      set({ isSubmitting: true, error: null });
      const { data, error } = await $fetch<{ success: boolean }>({
        url: `/api/ico/creator/token/${tokenId}/roadmap/${itemId}`,
        method: "DELETE",
        successMessage: "Roadmap item removed successfully",
      });
      if (error) throw new Error(error);
      set({ lastTokenIdFetched: null });
      useCreatorStore.getState().fetchToken(tokenId);
      set({ isSubmitting: false });
    } catch (error: any) {
      console.error("Error removing roadmap item:", error);
      set({
        isSubmitting: false,
        error: error.message || "Failed to remove roadmap item",
      });
    }
  },
}));
