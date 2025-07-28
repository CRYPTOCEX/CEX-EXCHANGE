import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useNotificationsStore } from "../../notification-store";

type TokenUpdateStore = {
  updates: icoTokenOfferingUpdateAttributes[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  // Cache: store the token ID for which updates were last fetched.
  lastTokenIdFetched: string | null;
  fetchUpdates: (tokenId: string) => Promise<void>;
  postUpdate: (updateData: {
    tokenId: string;
    title: string;
    content: string;
    attachments?: icoTokenOfferingUpdateAttributes["attachments"];
  }) => Promise<void>;
  editUpdate: (updateData: icoTokenOfferingUpdateAttributes) => Promise<void>;
  deleteUpdate: (updateId: string) => Promise<void>;
  getUpdatesThisMonth: (tokenId: string) => icoTokenOfferingUpdateAttributes[];
};

export const useTokenUpdateStore = create<TokenUpdateStore>((set, get) => ({
  updates: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  lastTokenIdFetched: null,

  // Fetch updates only if they haven't been fetched for this token.
  fetchUpdates: async (tokenId: string) => {
    // If we've already fetched updates for this token and the list is not empty, skip refetch.
    if (get().lastTokenIdFetched === tokenId && get().updates.length > 0) {
      return;
    }
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: `/api/ico/creator/update?tokenId=${tokenId}`,
      silent: true,
    });
    if (!error) {
      // Parse attachments if needed.
      const parsedData = (data as icoTokenOfferingUpdateAttributes[]).map(
        (update) => ({
          ...update,
          attachments: update.attachments
            ? typeof update.attachments === "string"
              ? JSON.parse(update.attachments)
              : update.attachments
            : [],
        })
      );
      set({
        updates: parsedData,
        isLoading: false,
        lastTokenIdFetched: tokenId,
      });
    } else {
      set({ isLoading: false, error });
    }
  },

  postUpdate: async (updateData) => {
    set({ isSubmitting: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/ico/creator/update",
      method: "POST",
      body: updateData,
      successMessage: "Update posted successfully",
    });
    if (!error) {
      // Optimistically prepend the new update.
      set((state) => ({
        updates: [data, ...state.updates],
        isSubmitting: false,
      }));
      // Trigger notifications fetch
      useNotificationsStore.getState().fetchNotifications();
    } else {
      set({ isSubmitting: false, error });
    }
  },

  editUpdate: async (updateData) => {
    set({ isSubmitting: true, error: null });
    const { data, error } = await $fetch({
      url: `/api/ico/creator/update/${updateData.id}`,
      method: "PUT",
      body: updateData,
      successMessage: "Update edited successfully",
    });
    if (!error) {
      set((state) => ({
        updates: state.updates.map((u) => (u.id === data.id ? data : u)),
        isSubmitting: false,
      }));
      // Trigger notifications fetch
      useNotificationsStore.getState().fetchNotifications();
    } else {
      set({ isSubmitting: false, error });
    }
  },

  deleteUpdate: async (updateId: string) => {
    set({ isSubmitting: true, error: null });
    const { data, error } = await $fetch<{ success: boolean }>({
      url: `/api/ico/creator/update/${updateId}`,
      method: "DELETE",
      successMessage: "Update deleted successfully",
    });
    if (!error) {
      set((state) => ({
        updates: state.updates.filter((u) => u.id !== updateId),
        isSubmitting: false,
      }));
      // Trigger notifications fetch
      useNotificationsStore.getState().fetchNotifications();
    } else {
      set({ isSubmitting: false, error });
    }
  },

  // Returns only the updates for the current month for the given token.
  getUpdatesThisMonth: (tokenId: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    return get().updates.filter(
      (u) =>
        u.offeringId === tokenId &&
        u.createdAt &&
        new Date(u.createdAt).getMonth() === currentMonth
    );
  },
}));
