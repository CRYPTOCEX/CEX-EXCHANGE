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
      set({
        offering,
        offerMetrics: metrics,
        platformMetrics,
        fundingData: fundingData || null,
        timeline: timeline,
        isLoadingOffer: false,
      });
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
      set({ offering: data, isLoadingOffer: false });
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
      set({ offering: data, isLoadingOffer: false });
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
      set({ offering: data, isLoadingOffer: false });
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
      set({ offering: data, isLoadingOffer: false });
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
      set({ offering: data, isLoadingOffer: false });
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
      set({ offering: data, isLoadingOffer: false });
    } else {
      const errMsg = error || "Failed to unflag offering";
      set({ errorOffer: errMsg, isLoadingOffer: false });
      throw new Error(errMsg);
    }
  },
}));
