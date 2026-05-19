"use client";
import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface FundingDataPoint {
  date: string;
  amount: number;
  cumulative: number;
}

export interface IcoOfferingMetrics {
  avgInvestment: number;
  fundingRate: number;
  largestInvestment: number;
  smallestInvestment: number;
  transactionsPerInvestor: number;
  completionTime: number;
  rejectedInvestment: number;
  currentRaised: number;
}

export interface TimelineComment {
  id: string;
  adminName: string;
  adminId: string;
  adminAvatar?: string;
  timestamp: string;
  content: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  adminName: string;
  adminId: string;
  adminAvatar?: string;
  details?: string;
  comments?: TimelineComment[];
  offeringId: string;
  offeringName: string;
  important?: boolean;
}

interface AdminOfferStoreState {
  offering: any | null;
  offerMetrics: IcoOfferingMetrics | null;
  platformMetrics: IcoOfferingMetrics | null;
  fundingData: FundingDataPoint[] | null;
  timeline: TimelineEvent[] | [];

  isLoadingOffer: boolean;
  isLoadingFunding: boolean;
  errorOffer: string | null;
  errorFunding: string | null;

  fetchCurrentOffer: (id: string) => Promise<void>;
  fetchFundingChart: (
    id: string,
    range: "7d" | "30d" | "90d" | "all"
  ) => Promise<void>;
  approveOffering: (id: string) => Promise<void>;
  rejectOffering: (id: string, notes: string) => Promise<void>;
  pauseOffering: (id: string) => Promise<void>;
  resumeOffering: (id: string) => Promise<void>;
  flagOffering: (id: string, notes: string) => Promise<void>;
  unflagOffering: (id: string) => Promise<void>;
  deleteOffering: (id: string) => Promise<void>;
  emergencyCancelOffering: (id: string, reason: string) => Promise<any>;
  addPhase: (
    id: string,
    phase: { name: string; tokenPrice: number; allocation: number; duration: number }
  ) => Promise<any>;
  deletePhase: (id: string, phaseId: string) => Promise<any>;
  updateOffering: (
    id: string,
    updates: {
      name?: string;
      symbol?: string;
      icon?: string;
      website?: string;
      targetAmount?: number;
      tokenPrice?: number;
      startDate?: string;
      endDate?: string;
      description?: string;
      blockchain?: string;
      totalSupply?: number;
      featured?: boolean;
    }
  ) => Promise<any>;
}

export interface IcoOfferResponse {
  offering: any;
  metrics: IcoOfferingMetrics;
  platformMetrics: IcoOfferingMetrics;
  fundingData?: FundingDataPoint[];
  timeline: TimelineEvent[];
}

export const useAdminOfferStore = create<AdminOfferStoreState>((set) => ({
  offering: null,
  offerMetrics: null,
  platformMetrics: null,
  fundingData: null,
  timeline: [],

  isLoadingOffer: false,
  isLoadingFunding: false,
  errorOffer: null,
  errorFunding: null,

  fetchCurrentOffer: async (id: string) => {
    set({ isLoadingOffer: true, errorOffer: null });
    const { data, error } = await $fetch<IcoOfferResponse>({
      url: `/api/admin/ico/offer/${id}`,
      silent: true,
    });
    if (data && !error) {
      const { offering, metrics, platformMetrics, fundingData, timeline } =
        data;
      // Only update fundingData if it's included in the response
      // Otherwise keep existing data to avoid chart flickering/loading
      const updateData: any = {
        offering,
        offerMetrics: metrics,
        platformMetrics,
        timeline: timeline,
        isLoadingOffer: false,
      };
      if (fundingData !== undefined) {
        updateData.fundingData = fundingData;
      }
      set(updateData);
    } else {
      set({
        errorOffer: error || "Failed to fetch offering",
        offering: null,
        isLoadingOffer: false,
      });
    }
  },

  fetchFundingChart: async (
    id: string,
    range: "7d" | "30d" | "90d" | "all"
  ) => {
    set({ isLoadingFunding: true, errorFunding: null });
    const { data, error } = await $fetch({
      url: `/api/admin/ico/offer/${id}/funding`,
      params: { range },
      silent: true,
    });
    if (data && !error) {
      set({ fundingData: data, isLoadingFunding: false });
    } else {
      set({
        errorFunding: error || "Failed to fetch funding chart data",
        isLoadingFunding: false,
      });
    }
  },

  approveOffering: async (id: string) => {
    set({ isLoadingOffer: true, errorOffer: null });
    const { data, error } = await $fetch({
      url: `/api/admin/ico/offer/${id}?action=approve`,
      method: "POST",
    });
    if (data && !error) {
      set({ offering: data.offering || data, isLoadingOffer: false });
    } else {
      const errMsg = error || "Failed to approve offering";
      set({ errorOffer: errMsg, isLoadingOffer: false });
      throw new Error(errMsg);
    }
  },

  rejectOffering: async (id: string, notes: string) => {
    set({ isLoadingOffer: true, errorOffer: null });
    const { data, error } = await $fetch({
      url: `/api/admin/ico/offer/${id}?action=reject`,
      method: "POST",
      body: { notes },
    });
    if (data && !error) {
      set({ offering: data.offering || data, isLoadingOffer: false });
    } else {
      const errMsg = error || "Failed to reject offering";
      set({ errorOffer: errMsg, isLoadingOffer: false });
      throw new Error(errMsg);
    }
  },

  pauseOffering: async (id: string) => {
    set({ isLoadingOffer: true, errorOffer: null });
    const { data, error } = await $fetch({
      url: `/api/admin/ico/offer/${id}?action=pause`,
      method: "POST",
    });
    if (data && !error) {
      set({ offering: data.offering || data, isLoadingOffer: false });
    } else {
      const errMsg = error || "Failed to pause offering";
      set({ errorOffer: errMsg, isLoadingOffer: false });
      throw new Error(errMsg);
    }
  },

  resumeOffering: async (id: string) => {
    set({ isLoadingOffer: true, errorOffer: null });
    const { data, error } = await $fetch({
      url: `/api/admin/ico/offer/${id}?action=resume`,
      method: "POST",
    });
    if (data && !error) {
      set({ offering: data.offering || data, isLoadingOffer: false });
    } else {
      const errMsg = error || "Failed to resume offering";
      set({ errorOffer: errMsg, isLoadingOffer: false });
      throw new Error(errMsg);
    }
  },

  flagOffering: async (id: string, notes: string) => {
    set({ isLoadingOffer: true, errorOffer: null });
    const { data, error } = await $fetch({
      url: `/api/admin/ico/offer/${id}?action=flag`,
      method: "POST",
      body: { notes },
    });
    if (data && !error) {
      set({ offering: data.offering || data, isLoadingOffer: false });
    } else {
      const errMsg = error || "Failed to flag offering";
      set({ errorOffer: errMsg, isLoadingOffer: false });
      throw new Error(errMsg);
    }
  },

  unflagOffering: async (id: string) => {
    set({ isLoadingOffer: true, errorOffer: null });
    const { data, error } = await $fetch({
      url: `/api/admin/ico/offer/${id}?action=unflag`,
      method: "POST",
    });
    if (data && !error) {
      set({ offering: data.offering || data, isLoadingOffer: false });
    } else {
      const errMsg = error || "Failed to unflag offering";
      set({ errorOffer: errMsg, isLoadingOffer: false });
      throw new Error(errMsg);
    }
  },

  deleteOffering: async (id: string) => {
    set({ isLoadingOffer: true, errorOffer: null });
    const { data, error } = await $fetch({
      url: `/api/admin/ico/offer/${id}`,
      method: "DELETE",
    });
    if (error) {
      const errMsg = error || "Failed to delete offering";
      set({ errorOffer: errMsg, isLoadingOffer: false });
      throw new Error(errMsg);
    }
    set({ offering: null, isLoadingOffer: false });
  },

  emergencyCancelOffering: async (id: string, reason: string) => {
    set({ isLoadingOffer: true, errorOffer: null });
    const { data, error } = await $fetch({
      url: `/api/admin/ico/offer/${id}/cancel-refund`,
      method: "POST",
      body: { reason },
    });
    if (data && !error) {
      // Refetch the offering to get full updated offering data
      // The cancel-refund response only contains summary data, not the full offering
      const store = useAdminOfferStore.getState();
      await store.fetchCurrentOffer(id);
      return data;
    } else {
      const errMsg = error || "Failed to cancel offering and refund investors";
      set({ errorOffer: errMsg, isLoadingOffer: false });
      throw new Error(errMsg);
    }
  },

  addPhase: async (
    id: string,
    phase: { name: string; tokenPrice: number; allocation: number; duration: number }
  ) => {
    set({ isLoadingOffer: true, errorOffer: null });
    const { data, error } = await $fetch({
      url: `/api/admin/ico/offer/${id}/phase`,
      method: "POST",
      body: phase,
    });
    if (data && !error) {
      // Refetch the offering to get updated phases and end date
      const store = useAdminOfferStore.getState();
      await store.fetchCurrentOffer(id);
      return data;
    } else {
      const errMsg = error || "Failed to add phase";
      set({ errorOffer: errMsg, isLoadingOffer: false });
      throw new Error(errMsg);
    }
  },

  deletePhase: async (id: string, phaseId: string) => {
    set({ isLoadingOffer: true, errorOffer: null });
    const { data, error } = await $fetch({
      url: `/api/admin/ico/offer/${id}/phase/${phaseId}`,
      method: "DELETE",
    });
    if (data && !error) {
      // Refetch the offering to get updated phases and end date
      const store = useAdminOfferStore.getState();
      await store.fetchCurrentOffer(id);
      return data;
    } else {
      const errMsg = error || "Failed to delete phase";
      set({ errorOffer: errMsg, isLoadingOffer: false });
      throw new Error(errMsg);
    }
  },

  updateOffering: async (
    id: string,
    updates: {
      name?: string;
      symbol?: string;
      icon?: string;
      website?: string;
      targetAmount?: number;
      tokenPrice?: number;
      startDate?: string;
      endDate?: string;
      description?: string;
      blockchain?: string;
      totalSupply?: number;
      featured?: boolean;
    }
  ) => {
    set({ isLoadingOffer: true, errorOffer: null });
    const { data, error } = await $fetch({
      url: `/api/admin/ico/offer/${id}`,
      method: "PUT",
      body: updates,
    });
    if (data && !error) {
      set({ offering: data.offering || data, isLoadingOffer: false });
      return data;
    } else {
      const errMsg = error || "Failed to update offering";
      set({ errorOffer: errMsg, isLoadingOffer: false });
      throw new Error(errMsg);
    }
  },
}));
