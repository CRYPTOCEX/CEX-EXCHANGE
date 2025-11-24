"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface AdminTradesState {
  // Trades list data
  trades: P2PAdminTrade[];
  isLoadingTrades: boolean;
  tradesError: string | null;

  // Trade details data
  tradeDetails: Record<string, P2PAdminTradeDetails>;
  isLoadingTradeDetails: boolean;
  tradeDetailsError: string | null;

  // Stats data
  stats: P2PAdminTradeStats | null;
  isLoadingStats: boolean;
  statsError: string | null;

  // Admin actions loading states
  isResolvingTrade: boolean;
  resolvingTradeError: string | null;
  isCancellingTrade: boolean;
  cancellingTradeError: string | null;
  isAddingNote: boolean;
  addingNoteError: string | null;

  // Pagination
  totalTrades: number;
  currentPage: number;
  pageSize: number;

  // Actions
  getTrades: (
    filters?: P2PTradeFilters,
    page?: number,
    pageSize?: number
  ) => Promise<void>;
  getTradeById: (id: string) => Promise<P2PAdminTradeDetails | null>;
  getTradeStats: () => Promise<void>;

  // Admin actions
  resolveTrade: (
    id: string,
    resolution: string,
    notes?: string
  ) => Promise<void>;
  cancelTrade: (id: string, reason: string) => Promise<void>;
  addAdminNote: (id: string, note: string) => Promise<void>;
}

export const useAdminTradesStore = create<AdminTradesState>((set, get) => ({
  // Initial state
  trades: [],
  isLoadingTrades: false,
  tradesError: null,

  tradeDetails: {},
  isLoadingTradeDetails: false,
  tradeDetailsError: null,

  stats: null,
  isLoadingStats: false,
  statsError: null,

  isResolvingTrade: false,
  resolvingTradeError: null,
  isCancellingTrade: false,
  cancellingTradeError: null,
  isAddingNote: false,
  addingNoteError: null,

  totalTrades: 0,
  currentPage: 1,
  pageSize: 10,

  // Get all trades with optional filtering
  getTrades: async (filters = {}, page = 1, pageSize = 10) => {
    set({
      isLoadingTrades: true,
      tradesError: null,
      currentPage: page,
      pageSize,
    });

    const params: Record<string, string> = {
      page: page.toString(),
      limit: pageSize.toString(),
    };

    // Add filters to params
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    if (filters.crypto) params.crypto = filters.crypto;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.minAmount !== undefined)
      params.minAmount = filters.minAmount.toString();
    if (filters.maxAmount !== undefined)
      params.maxAmount = filters.maxAmount.toString();
    if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
    if (filters.search) params.search = filters.search;

    const { data, error } = await $fetch({
      url: "/api/admin/p2p/trade",
      silentSuccess: true,
      params,
    });

    if (error) {
      set({ tradesError: error, isLoadingTrades: false });
      return;
    }

    if (data) {
      set({
        trades: data.trades || [],
        totalTrades: data.total || 0,
        isLoadingTrades: false,
      });
    } else {
      set({ isLoadingTrades: false });
    }
  },

  // Get a specific trade by ID
  getTradeById: async (id: string) => {
    set({ isLoadingTradeDetails: true, tradeDetailsError: null });

    // Check if we already have this trade's details
    if (get().tradeDetails[id]) {
      set({ isLoadingTradeDetails: false });
      return get().tradeDetails[id];
    }

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/trade/${id}`,
      silentSuccess: true,
    });

    if (error) {
      set({ tradeDetailsError: error, isLoadingTradeDetails: false });
      return null;
    }

    if (data) {
      set((state) => ({
        tradeDetails: {
          ...state.tradeDetails,
          [id]: data,
        },
        isLoadingTradeDetails: false,
      }));
      return data;
    } else {
      set({ isLoadingTradeDetails: false });
      return null;
    }
  },

  // Get trade statistics
  getTradeStats: async () => {
    set({ isLoadingStats: true, statsError: null });

    const { data, error } = await $fetch({
      url: "/api/admin/p2p/trade/stats",
      silentSuccess: true,
    });

    if (error) {
      set({ statsError: error, isLoadingStats: false });
      return;
    }

    set({ stats: data || null, isLoadingStats: false });
  },

  // Resolve a disputed trade
  resolveTrade: async (id: string, resolution: string, notes?: string) => {
    set({ isResolvingTrade: true, resolvingTradeError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/trade/${id}/resolve`,
      method: "POST",
      body: { resolution, notes },
    });

    if (error) {
      set({ resolvingTradeError: error, isResolvingTrade: false });
      return;
    }

    if (data) {
      // Update the trade details in state
      set((state) => ({
        tradeDetails: {
          ...state.tradeDetails,
          [id]: data,
        },
        isResolvingTrade: false,
      }));

      // Refresh the trades list
      get().getTrades({}, get().currentPage, get().pageSize);
    } else {
      set({ isResolvingTrade: false });
    }
  },

  // Cancel a trade
  cancelTrade: async (id: string, reason: string) => {
    set({ isCancellingTrade: true, cancellingTradeError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/trade/${id}/cancel`,
      method: "POST",
      body: { reason },
    });

    if (error) {
      set({ cancellingTradeError: error, isCancellingTrade: false });
      return;
    }

    if (data) {
      // Update the trade details in state
      set((state) => ({
        tradeDetails: {
          ...state.tradeDetails,
          [id]: data,
        },
        isCancellingTrade: false,
      }));

      // Refresh the trades list
      get().getTrades({}, get().currentPage, get().pageSize);
    } else {
      set({ isCancellingTrade: false });
    }
  },

  // Add an admin note to a trade
  addAdminNote: async (id: string, note: string) => {
    set({ isAddingNote: true, addingNoteError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/trade/${id}/note`,
      method: "POST",
      body: { note },
    });

    if (error) {
      set({ addingNoteError: error, isAddingNote: false });
      return;
    }

    if (data) {
      // Update the trade details in state
      set((state) => ({
        tradeDetails: {
          ...state.tradeDetails,
          [id]: data,
        },
        isAddingNote: false,
      }));
    } else {
      set({ isAddingNote: false });
    }
  },
}));
