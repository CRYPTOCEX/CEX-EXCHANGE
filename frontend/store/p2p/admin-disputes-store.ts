"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { imageUploader } from "@/utils/upload";

export interface AdminDisputesState {
  // Disputes list data
  disputes: P2PDispute[];
  isLoadingDisputes: boolean;
  disputesError: string | null;

  // Single dispute data
  dispute: P2PDispute | null;
  isLoadingDispute: boolean;
  disputeError: string | null;

  // Stats data including new fields
  stats: P2PDisputeStats;
  isLoadingStats: boolean;
  statsError: string | null;

  // Action loading states
  isResolvingDispute: boolean;
  resolvingDisputeError: string | null;
  isMarkingInProgress: boolean;
  markingInProgressError: string | null;
  isAddingNote: boolean;
  addingNoteError: string | null;
  isSendingMessage: boolean;
  sendingMessageError: string | null;
  isUploadingEvidence: boolean;
  uploadingEvidenceError: string | null;

  // Filters and pagination
  filters: P2PDisputeFilters;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };

  // Actions
  fetchDisputes: (
    filters?: P2PDisputeFilters,
    page?: number,
    pageSize?: number
  ) => Promise<void>;
  fetchDispute: (id: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  resolveDispute: (
    id: string,
    resolution: { outcome: string; notes: string }
  ) => Promise<void>;
  markAsInProgress: (id: string) => Promise<void>;
  addNote: (id: string, note: string) => Promise<void>;
  sendMessage: (id: string, message: string) => Promise<void>;
  uploadEvidence: (id: string, evidence: File) => Promise<void>;
  setFilters: (filters: P2PDisputeFilters) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  clearError: () => void;
}

const defaultStats: P2PDisputeStats = {
  total: 0,
  pending: 0,
  inProgress: 0,
  resolved: 0,
  avgResolutionTime: "0.0 days",
  disputeChange: "0",
  avgResolutionTimeChange: "0.0 days",
};

const defaultPagination = {
  page: 1,
  pageSize: 10,
  totalPages: 1,
  totalItems: 0,
};

export const useAdminDisputesStore = create<AdminDisputesState>((set, get) => ({
  disputes: [],
  isLoadingDisputes: false,
  disputesError: null,

  dispute: null,
  isLoadingDispute: false,
  disputeError: null,

  stats: defaultStats,
  isLoadingStats: false,
  statsError: null,

  isResolvingDispute: false,
  resolvingDisputeError: null,
  isMarkingInProgress: false,
  markingInProgressError: null,
  isAddingNote: false,
  addingNoteError: null,
  isSendingMessage: false,
  sendingMessageError: null,
  isUploadingEvidence: false,
  uploadingEvidenceError: null,

  filters: {},
  pagination: defaultPagination,

  fetchDisputes: async (filters = {}, page = 1, pageSize = 10) => {
    set({ isLoadingDisputes: true, disputesError: null });
    const { filters: currentFilters } = get();
    const mergedFilters = { ...currentFilters, ...filters };
    const params: Record<string, string> = {};
    if (mergedFilters.status) params.status = mergedFilters.status;
    if (mergedFilters.priority) params.priority = mergedFilters.priority;
    if (mergedFilters.search) params.search = mergedFilters.search;
    if (mergedFilters.dateRange?.from)
      params.from = mergedFilters.dateRange.from.toISOString();
    if (mergedFilters.dateRange?.to)
      params.to = mergedFilters.dateRange.to.toISOString();
    params.page = page.toString();
    params.pageSize = pageSize.toString();

    const { data, error } = await $fetch({
      url: "/api/admin/p2p/dispute",
      params,
      silentSuccess: true,
    });
    if (error) {
      set({ disputesError: error, isLoadingDisputes: false });
      return;
    }
    set({
      disputes: data?.disputes || [],
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(data?.totalItems / pageSize) || 1,
        totalItems: data?.totalItems || 0,
      },
      filters: mergedFilters,
      isLoadingDisputes: false,
    });
  },

  fetchDispute: async (id: string) => {
    set({ isLoadingDispute: true, disputeError: null, dispute: null });
    const { data, error } = await $fetch({
      url: `/api/admin/p2p/dispute/${id}`,
      silentSuccess: true,
    });
    if (error) {
      set({ disputeError: error, isLoadingDispute: false });
      return;
    }
    set({ dispute: data || null, isLoadingDispute: false });
  },

  fetchStats: async () => {
    set({ isLoadingStats: true, statsError: null });
    const { data, error } = await $fetch({
      url: "/api/admin/p2p/dispute/stats",
      silentSuccess: true,
    });
    if (error) {
      set({ statsError: error, isLoadingStats: false });
      return;
    }
    set({ stats: data || defaultStats, isLoadingStats: false });
  },

  resolveDispute: async (
    id: string,
    resolution: { outcome: string; notes: string }
  ) => {
    set({ isResolvingDispute: true, resolvingDisputeError: null });
    const { data, error } = await $fetch({
      url: `/api/admin/p2p/dispute/${id}`,
      method: "PUT",
      body: { status: "resolved", resolution },
    });
    if (error) {
      set({ resolvingDisputeError: error, isResolvingDispute: false });
      return;
    }
    const { disputes } = get();
    const updatedDisputes = disputes.map((d) => (d.id === id ? data : d));
    set({
      disputes: updatedDisputes,
      dispute: data,
      isResolvingDispute: false,
    });
    get().fetchStats();
  },

  markAsInProgress: async (id: string) => {
    set({ isMarkingInProgress: true, markingInProgressError: null });
    const { data, error } = await $fetch({
      url: `/api/admin/p2p/dispute/${id}`,
      method: "PUT",
      body: { status: "in-progress" },
    });
    if (error) {
      set({ markingInProgressError: error, isMarkingInProgress: false });
      return;
    }
    const { disputes } = get();
    const updatedDisputes = disputes.map((d) => (d.id === id ? data : d));
    set({
      disputes: updatedDisputes,
      dispute: get().dispute?.id === id ? data : get().dispute,
      isMarkingInProgress: false,
    });
    get().fetchStats();
  },

  addNote: async (id: string, note: string) => {
    set({ isAddingNote: true, addingNoteError: null });
    const { data, error } = await $fetch({
      url: `/api/admin/p2p/dispute/${id}/note`,
      method: "POST",
      body: { note },
    });
    if (error) {
      set({ addingNoteError: error, isAddingNote: false });
      return;
    }
    set({
      dispute: data,
      isAddingNote: false,
    });
  },

  sendMessage: async (id: string, message: string) => {
    set({ isSendingMessage: true, sendingMessageError: null });
    const { data, error } = await $fetch({
      url: `/api/admin/p2p/dispute/${id}`,
      method: "PUT",
      body: { message },
    });
    if (error) {
      set({ sendingMessageError: error, isSendingMessage: false });
      return;
    }
    set({
      dispute: data,
      isSendingMessage: false,
    });
  },

  uploadEvidence: async (id: string, evidence: File) => {
    set({ isUploadingEvidence: true, uploadingEvidenceError: null });
    try {
      const uploadResult = await imageUploader({
        file: evidence,
        dir: `disputes/${id}/evidence`,
        size: { maxWidth: 1920, maxHeight: 1080 },
      });
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || "Failed to upload evidence");
      }
      const { data, error } = await $fetch({
        url: `/api/admin/p2p/dispute/${id}/evidence`,
        method: "POST",
        body: {
          fileUrl: uploadResult.url,
          fileName: evidence.name,
          fileType: evidence.type,
        },
      });
      if (error) {
        throw new Error(error);
      }
      set({
        dispute: data,
        isUploadingEvidence: false,
      });
    } catch (error) {
      set({
        uploadingEvidenceError:
          error instanceof Error ? error.message : "An unknown error occurred",
        isUploadingEvidence: false,
      });
    }
  },

  setFilters: (filters: P2PDisputeFilters) => {
    set({ filters });
    get().fetchDisputes(filters);
  },

  resetFilters: () => {
    set({ filters: {} });
    get().fetchDisputes({});
  },

  setPage: (page: number) => {
    get().fetchDisputes(get().filters, page);
  },

  clearError: () =>
    set({
      disputesError: null,
      disputeError: null,
      statsError: null,
      resolvingDisputeError: null,
      markingInProgressError: null,
      addingNoteError: null,
      sendingMessageError: null,
      uploadingEvidenceError: null,
    }),
}));
