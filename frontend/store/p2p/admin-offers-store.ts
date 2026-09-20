"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface AdminOffersState {
  // Single offer data
  offer: P2POffer | null;
  isLoadingOffer: boolean;
  offerError: string | null;

  // Action loading states
  isApprovingOffer: boolean;
  approvingOfferError: string | null;
  isRejectingOffer: boolean;
  rejectingOfferError: string | null;
  isFlaggingOffer: boolean;
  flaggingOfferError: string | null;
  isDisablingOffer: boolean;
  disablingOfferError: string | null;
  isPausingOffer: boolean;
  pausingOfferError: string | null;
  isActivatingOffer: boolean;
  activatingOfferError: string | null;
  isAddingNote: boolean;
  addingNoteError: string | null;
  isUpdatingOffer: boolean;
  updatingOfferError: string | null;

  // Actions. Every moderation action REJECTS on failure — callers show a
  // success toast straight after awaiting them, so a silent resolve would
  // announce a change that never happened.
  getOfferById: (id: string) => Promise<void>;
  approveOffer: (id: string, notes?: string) => Promise<void>;
  rejectOffer: (id: string, reason: string) => Promise<void>;
  flagOffer: (id: string, reason: string) => Promise<void>;
  disableOffer: (id: string, reason: string) => Promise<void>;
  pauseOffer: (id: string) => Promise<void>;
  activateOffer: (id: string) => Promise<void>;
  addNote: (id: string, note: string) => Promise<void>;
  updateOffer: (id: string, offerData: Partial<P2POffer>) => Promise<void>;
}

export const adminOffersStore = create<AdminOffersState>((set, get) => ({
  offer: null,
  isLoadingOffer: false,
  offerError: null,

  isApprovingOffer: false,
  approvingOfferError: null,
  isRejectingOffer: false,
  rejectingOfferError: null,
  isFlaggingOffer: false,
  flaggingOfferError: null,
  isDisablingOffer: false,
  disablingOfferError: null,
  isPausingOffer: false,
  pausingOfferError: null,
  isActivatingOffer: false,
  activatingOfferError: null,
  isAddingNote: false,
  addingNoteError: null,
  isUpdatingOffer: false,
  updatingOfferError: null,

  getOfferById: async (id) => {
    set({ isLoadingOffer: true, offerError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/offer/${id}`,
      silent: true,  // Prevent automatic refetch triggers
    });

    if (error) {
      /*
        A FAILED REFRESH MUST NOT ERASE AN OFFER THAT IS ALREADY ON SCREEN.

        Every moderation action ends with a re-read, so `offer: null` here meant
        a blipped reload after a successful approval replaced the offer with a
        full-page error — at the moment the operator most needed to see what had
        happened. A record we can still draw stays drawn.
      */
      const hadOffer = get().offer?.id === id;
      set({
        offerError: hadOffer ? null : error,
        isLoadingOffer: false,
      });
      return;
    }

    /*
      NO CLIENT-SIDE JSON PARSING.

      This used to hand-parse `activityLog` here — and only `activityLog`, which
      is why the activity tab was the one part of the offer page that worked
      while `amountConfig`, `priceConfig` and `tradeSettings` arrived as strings
      and rendered as `undefined`. All six blobs are parsed at the boundary now,
      in `admin/p2p/offer/[id]/index.get.ts`, through the same `safeParse` the
      rest of the addon uses.
    */
    set({ offer: data || null, isLoadingOffer: false });
  },

  approveOffer: async (id, notes) => {
    set({ isApprovingOffer: true, approvingOfferError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/offer/${id}/approve`,
      method: "POST",
      body: { notes },
    });

    if (error) {
      // Rejecting is what lets the caller distinguish "approved" from
      // "the API refused" — returning quietly made the page toast success.
      set({ approvingOfferError: error, isApprovingOffer: false });
      throw new Error(error);
    }

    set({ isApprovingOffer: false });

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
      throw new Error(error);
    }

    set({ isRejectingOffer: false });

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
      throw new Error(error);
    }

    set({ isFlaggingOffer: false });

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
      throw new Error(error);
    }

    set({ isDisablingOffer: false });

    // If we were viewing a specific offer, refresh it
    if (get().offer?.id === id) {
      await get().getOfferById(id);
    }
  },

  pauseOffer: async (id) => {
    set({ isPausingOffer: true, pausingOfferError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/offer/${id}/pause`,
      method: "POST",
    });

    if (error) {
      set({ pausingOfferError: error, isPausingOffer: false });
      throw new Error(error);
    }

    set({ isPausingOffer: false });

    // If we were viewing a specific offer, refresh it
    if (get().offer?.id === id) {
      await get().getOfferById(id);
    }
  },

  activateOffer: async (id) => {
    set({ isActivatingOffer: true, activatingOfferError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/offer/${id}/activate`,
      method: "POST",
    });

    if (error) {
      set({ activatingOfferError: error, isActivatingOffer: false });
      throw new Error(error);
    }

    set({ isActivatingOffer: false });

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
      throw new Error(error);
    }

    // If we were viewing a specific offer, refresh it
    if (get().offer?.id === id) {
      await get().getOfferById(id);
    }

    set({ isAddingNote: false });
  },

  updateOffer: async (id, offerData) => {
    set({ isUpdatingOffer: true, updatingOfferError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/offer/${id}`,
      method: "PUT",
      body: offerData,
    });

    if (error) {
      set({ updatingOfferError: error, isUpdatingOffer: false });
      throw new Error(error);
    }

    set({ isUpdatingOffer: false, updatingOfferError: null });

    // If we were viewing a specific offer, refresh it
    if (get().offer?.id === id) {
      await get().getOfferById(id);
    }

    return data;
  },
}));
