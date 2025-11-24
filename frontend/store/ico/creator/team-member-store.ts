import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useCreatorStore } from "./creator-store";
import { useNotificationsStore } from "../../notification-store";

type TeamMemberStore = {
  teamMembers: icoTeamMemberAttributes[];
  isLoading: boolean; // Loading flag for fetching team members
  isSubmitting: boolean;
  error: string | null;
  lastTokenIdFetched: string | null;
  fetchTeamMembers: (tokenId: string) => Promise<void>;
  addTeamMember: (
    tokenId: string,
    member: Omit<icoTeamMemberAttributes, "id" | "offeringId">
  ) => Promise<void>;
  updateTeamMember: (
    tokenId: string,
    member: icoTeamMemberAttributes
  ) => Promise<void>;
  removeTeamMember: (tokenId: string, memberId: string) => Promise<void>;
};

export const useTeamMemberStore = create<TeamMemberStore>((set, get) => ({
  teamMembers: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  lastTokenIdFetched: null,

  fetchTeamMembers: async (tokenId: string) => {
    // If we've already fetched team members for this token and the list is not empty, skip refetch.
    if (get().lastTokenIdFetched === tokenId && get().teamMembers.length > 0) {
      return;
    }
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: `/api/ico/creator/token/${tokenId}/team`,
      silent: true,
    });
    if (!error) {
      set({
        teamMembers: data || [],
        isLoading: false,
        lastTokenIdFetched: tokenId,
      });
    } else {
      set({ isLoading: false, error });
    }
  },

  addTeamMember: async (tokenId, member) => {
    try {
      set({ isSubmitting: true, error: null });
      const { data, error } = await $fetch<icoTeamMemberAttributes>({
        url: `/api/ico/creator/token/${tokenId}/team`,
        method: "POST",
        body: member,
        successMessage: "Team member added successfully",
      });
      if (error) throw new Error(error);
      // Invalidate cache so that a new fetch will occur.
      set({ lastTokenIdFetched: null });
      useCreatorStore.getState().fetchToken(tokenId);
      // Trigger notifications fetch
      useNotificationsStore.getState().fetchNotifications();
      set({ isSubmitting: false });
    } catch (error: any) {
      console.error("Error adding team member:", error);
      set({
        isSubmitting: false,
        error: error.message || "Failed to add team member",
      });
    }
  },

  updateTeamMember: async (tokenId, member) => {
    try {
      set({ isSubmitting: true, error: null });
      const { data, error } = await $fetch<icoTeamMemberAttributes>({
        url: `/api/ico/creator/token/${tokenId}/team/${member.id}`,
        method: "PUT",
        body: member,
        successMessage: "Team member updated successfully",
      });
      if (error) throw new Error(error);
      set({ lastTokenIdFetched: null });
      useCreatorStore.getState().fetchToken(tokenId);
      // Trigger notifications fetch
      useNotificationsStore.getState().fetchNotifications();
      set({ isSubmitting: false });
    } catch (error: any) {
      console.error("Error updating team member:", error);
      set({
        isSubmitting: false,
        error: error.message || "Failed to update team member",
      });
    }
  },

  removeTeamMember: async (tokenId, memberId) => {
    try {
      set({ isSubmitting: true, error: null });
      const { data, error } = await $fetch<{ success: boolean }>({
        url: `/api/ico/creator/token/${tokenId}/team/${memberId}`,
        method: "DELETE",
        successMessage: "Team member removed successfully",
      });
      if (error) throw new Error(error);
      set({ lastTokenIdFetched: null });
      useCreatorStore.getState().fetchToken(tokenId);
      // Trigger notifications fetch
      useNotificationsStore.getState().fetchNotifications();
      set({ isSubmitting: false });
    } catch (error: any) {
      console.error("Error removing team member:", error);
      set({
        isSubmitting: false,
        error: error.message || "Failed to remove team member",
      });
    }
  },
}));
