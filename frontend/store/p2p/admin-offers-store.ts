"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface AdminOffersState {
  // Single offer data
  offer: P2POffer | null;
  isLoadingOffer: boolean;
  offerError: string | null;

  // Stats data
  stats: P2POfferStats | null;
  isLoadingStats: boolean;
  statsError: string | null;

  // Action loading states
  isApprovingOffer: boolean;
  approvingOfferError: string | null;
  isRejectingOffer: boolean;
  rejectingOfferError: string | null;
  isFlaggingOffer: boolean;
  flaggingOfferError: string | null;
  isDisablingOffer: boolean;
  disablingOfferError: string | null;
  isAddingNote: boolean;
  addingNoteError: string | null;
  isUpdatingOffer: boolean;
  updatingOfferError: string | null;

  // Filters and pagination
  getOfferById: (id: string) => Promise<void>;
  getOfferStats: () => Promise<void>;
  approveOffer: (id: string, notes?: string) => Promise<void>;
  rejectOffer: (id: string, reason: string) => Promise<void>;
  flagOffer: (id: string, reason: string) => Promise<void>;
  disableOffer: (id: string, reason: string) => Promise<void>;
  addNote: (id: string, note: string) => Promise<void>;
  updateOffer: (id: string, offerData: Partial<P2POffer>) => Promise<void>;
}

export const adminOffersStore = create<AdminOffersState>((set, get) => ({
  offer: null,
  isLoadingOffer: false,
  offerError: null,

  stats: null,
  isLoadingStats: false,
  statsError: null,

  isApprovingOffer: false,
  approvingOfferError: null,
  isRejectingOffer: false,
  rejectingOfferError: null,
  isFlaggingOffer: false,
  flaggingOfferError: null,
  isDisablingOffer: false,
  disablingOfferError: null,
  isAddingNote: false,
  addingNoteError: null,
  isUpdatingOffer: false,
  updatingOfferError: null,

  getOfferById: async (id) => {
    console.log("[Store] getOfferById called with ID:", id);
    set({ isLoadingOffer: true, offerError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/offer/${id}`,
      silent: true,  // Prevent automatic refetch triggers
    });

    console.log("[Store] getOfferById response:", { data, error });

    if (error) {
      set({ offerError: error, isLoadingOffer: false, offer: null });
      return;
    }

    set({ offer: data || null, isLoadingOffer: false });
    console.log("[Store] Offer set in store:", data);
  },

  getOfferStats: async () => {
    set({ isLoadingStats: true, statsError: null });

    const { data, error } = await $fetch({
      url: "/api/admin/p2p/offer/stats",
      silentSuccess: true,
    });

    if (error) {
      set({ statsError: error, isLoadingStats: false });
      return;
    }

    set({ stats: data || null, isLoadingStats: false });
  },

  approveOffer: async (id, notes) => {
    set({ isApprovingOffer: true, approvingOfferError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/offer/${id}/approve`,
      method: "POST",
      body: { notes },
    });

    if (error) {
      set({ approvingOfferError: error, isApprovingOffer: false });
      return;
    }

    set({ isApprovingOffer: false });

    // Refresh offers after successful action
    await get().getOfferStats();

    // If we were viewing a specific offer, refresh it
    if (get().offer?.id === id) {
      await get().getOfferById(id);
    }
  },

  rejectOffer: async (id, reason) => {
    set({ isRejectingOffer: true, rejectingOfferError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/offer/${id}/reject`,
      method: "POST",
      body: { reason },
    });

    if (error) {
      set({ rejectingOfferError: error, isRejectingOffer: false });
      return;
    }

    set({ isRejectingOffer: false });

    // Refresh offers after successful action
    await get().getOfferStats();

    // If we were viewing a specific offer, refresh it
    if (get().offer?.id === id) {
      await get().getOfferById(id);
    }
  },

  flagOffer: async (id, reason) => {
    set({ isFlaggingOffer: true, flaggingOfferError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/offer/${id}/flag`,
      method: "POST",
      body: { reason },
    });

    if (error) {
      set({ flaggingOfferError: error, isFlaggingOffer: false });
      return;
    }

    set({ isFlaggingOffer: false });

    // Refresh offers after successful action
    await get().getOfferStats();

    // If we were viewing a specific offer, refresh it
    if (get().offer?.id === id) {
      await get().getOfferById(id);
    }
  },

  disableOffer: async (id, reason) => {
    set({ isDisablingOffer: true, disablingOfferError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/offer/${id}/disable`,
      method: "POST",
      body: { reason },
    });

    if (error) {
      set({ disablingOfferError: error, isDisablingOffer: false });
      return;
    }

    set({ isDisablingOffer: false });

    // Refresh offers after successful action
    await get().getOfferStats();

    // If we were viewing a specific offer, refresh it
    if (get().offer?.id === id) {
      await get().getOfferById(id);
    }
  },

  addNote: async (id, note) => {
    set({ isAddingNote: true, addingNoteError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/offer/${id}/note`,
      method: "POST",
      body: { note },
    });

    if (error) {
      set({ addingNoteError: error, isAddingNote: false });
      return;
    }

    // If we were viewing a specific offer, refresh it
    if (get().offer?.id === id) {
      await get().getOfferById(id);
    }

    set({ isAddingNote: false });
  },

  updateOffer: async (id, offerData) => {
    console.log("[Store] updateOffer called with:", { id, offerData });
    set({ isUpdatingOffer: true, updatingOfferError: null });

    console.log("[Store] Making PUT request to:", `/api/admin/p2p/offer/${id}`);
    const { data, error } = await $fetch({
      url: `/api/admin/p2p/offer/${id}`,
      method: "PUT",
      body: offerData,
    });
    
    console.log("[Store] API Response:", { data, error });

    if (error) {
      console.error("[Store] Update failed with error:", error);
      set({ updatingOfferError: error, isUpdatingOffer: false });
      throw new Error(error);
    }

    set({ isUpdatingOffer: false, updatingOfferError: null });

    // If we were viewing a specific offer, refresh it
    if (get().offer?.id === id) {
      console.log("[Store] Refreshing offer data after update");
      await get().getOfferById(id);
    }
    
    console.log("[Store] Update successful, returning data:", data);
    return data;
  },
}));
