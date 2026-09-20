"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { imageUploader } from "@/utils/upload";

/**
 * What the dispute PUT reports back about the escrow it was asked to settle.
 * A ruling that moved no money is NOT a successful payout, and the UI must be
 * able to tell the two apart.
 */
export interface DisputeSettlement {
  attempted: boolean;
  settled?: boolean;
  alreadySettled?: boolean;
  escrowConsumed?: number;
  buyerCredited?: number;
  sellerRefunded?: number;
  platformFee?: number;
  fundsMoved: boolean;
}

export interface ResolveDisputeResult {
  ok: boolean;
  error?: string;
  settlement?: DisputeSettlement;
  /** Server-supplied explanation when the ruling was recorded but no funds moved. */
  warning?: string;
}

export interface ResolveDisputeInput {
  outcome: string;
  notes: string;
  /** SPLIT only: percentage of the escrow the buyer receives (0-100). */
  buyerPercentage?: number;
}

export interface AdminDisputesState {
  // Disputes list data
  disputes: P2PDispute[];
  isLoadingDisputes: boolean;
  disputesError: string | null;

  // Single dispute data
  dispute: P2PDispute | null;
  isLoadingDispute: boolean;
  disputeError: string | null;

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
  resolveDispute: (
    id: string,
    resolution: ResolveDisputeInput
  ) => Promise<ResolveDisputeResult>;
  markAsInProgress: (id: string) => Promise<boolean>;
  addNote: (id: string, note: string) => Promise<boolean>;
  sendMessage: (id: string, message: string) => Promise<boolean>;
  uploadEvidence: (id: string, evidence: File) => Promise<boolean>;
  setFilters: (filters: P2PDisputeFilters) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  clearError: () => void;
}

const defaultPagination = {
  page: 1,
  pageSize: 12,
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
    // `getFiltered` reads `perPage`; `pageSize` was ignored.
    params.perPage = pageSize.toString();

    const { data, error } = await $fetch({
      url: "/api/admin/p2p/dispute",
      params,
      silentSuccess: true,
    });
    if (error) {
      set({ disputesError: error, isLoadingDisputes: false });
      return;
    }
    // The route answers { items, pagination } — `data.disputes`/`data.totalItems`
    // never existed, so the list rendered empty on every successful response.
    set({
      disputes: Array.isArray(data?.items) ? data.items : [],
      pagination: {
        page: data?.pagination?.currentPage ?? page,
        pageSize: data?.pagination?.perPage ?? pageSize,
        totalPages: data?.pagination?.totalPages ?? 1,
        totalItems: data?.pagination?.totalItems ?? 0,
      },
      filters: mergedFilters,
      isLoadingDisputes: false,
    });
  },

  fetchDispute: async (id: string) => {
    /*
      NO `dispute: null` HERE.

      Blanking the record at the START of every fetch meant that any refresh —
      and every action on the page ends with one — replaced a case an operator
      was reading with the loading skeleton, and then, if the refresh happened to
      fail, with a full-page error over a dispute that was perfectly fine a
      second earlier. A record we can still draw stays drawn; a failed refresh is
      reported as what it is. `dispute: null` on a FIRST load is already the
      state, because nothing has been written yet.
    */
    set({ isLoadingDispute: true, disputeError: null });
    const { data, error } = await $fetch({
      url: `/api/admin/p2p/dispute/${id}`,
      silentSuccess: true,
      /* The page renders `disputeError` itself, as a full-page failure with a
         retry on it. The toast repeated the same string on top of that page. */
      silent: true,
    });
    if (error) {
      const hadDispute = get().dispute?.id === id;
      set({
        disputeError: hadDispute ? null : error,
        isLoadingDispute: false,
      });
      return;
    }
    set({ dispute: data || null, isLoadingDispute: false });
  },

  resolveDispute: async (id: string, resolution: ResolveDisputeInput) => {
    set({ isResolvingDispute: true, resolvingDisputeError: null });
    const { data, error } = await $fetch({
      url: `/api/admin/p2p/dispute/${id}`,
      method: "PUT",
      body: { status: "RESOLVED", resolution },
      /* Returned to the caller as `{ ok: false, error }`, which the resolution
         form renders as its own `submitError` — beside the fields the admin
         would have to change. The toast said it again and then took it away. */
      silent: true,
    });
    if (error) {
      set({ resolvingDisputeError: error, isResolvingDispute: false });
      return { ok: false, error };
    }

    const { disputes } = get();
    const updatedDisputes = disputes.map((d) => (d.id === id ? data : d));
    set({
      disputes: updatedDisputes,
      dispute: data,
      isResolvingDispute: false,
    });

    // The route now reports what the escrow authority actually did. Callers
    // decide what to tell the admin from `settlement.fundsMoved`, not from the
    // mere absence of an HTTP error.
    return {
      ok: true,
      settlement: data?.settlement as DisputeSettlement | undefined,
      warning: data?.warning as string | undefined,
    };
  },

  markAsInProgress: async (id: string) => {
    set({ isMarkingInProgress: true, markingInProgressError: null });
    const { data, error } = await $fetch({
      url: `/api/admin/p2p/dispute/${id}`,
      method: "PUT",
      body: { status: "IN_PROGRESS" },
    });
    if (error) {
      set({ markingInProgressError: error, isMarkingInProgress: false });
      return false;
    }
    const { disputes } = get();
    const updatedDisputes = disputes.map((d) => (d.id === id ? data : d));
    set({
      disputes: updatedDisputes,
      dispute: get().dispute?.id === id ? data : get().dispute,
      isMarkingInProgress: false,
    });
    return true;
  },

  addNote: async (id: string, note: string) => {
    set({ isAddingNote: true, addingNoteError: null });
    const { data, error } = await $fetch({
      url: `/api/admin/p2p/dispute/${id}/note`,
      method: "POST",
      body: { note },
      /* The caller reads `addingNoteError` back off the store and renders it
         through `ActionMessage` on the dispute page. */
      silent: true,
    });
    if (error) {
      set({ addingNoteError: error, isAddingNote: false });
      return false;
    }
    set({
      dispute: data,
      isAddingNote: false,
    });
    return true;
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
      return false;
    }
    set({
      dispute: data,
      isSendingMessage: false,
    });
    return true;
  },

  uploadEvidence: async (id: string, evidence: File) => {
    set({ isUploadingEvidence: true, uploadingEvidenceError: null });
    // imageUploader (unlike $fetch) genuinely can reject, so this try/catch is
    // load-bearing.
    try {
      const uploadResult = await imageUploader({
        file: evidence,
        dir: `disputes/${id}/evidence`,
        size: { maxWidth: 1920, maxHeight: 1080 },
      });
      if (!uploadResult.success || !uploadResult.url) {
        set({
          uploadingEvidenceError:
            uploadResult.error || "Failed to upload evidence",
          isUploadingEvidence: false,
        });
        return false;
      }
      const { data, error } = await $fetch({
        url: `/api/admin/p2p/dispute/${id}/evidence`,
        method: "POST",
        body: {
          fileUrl: uploadResult.url,
          fileName: evidence.name,
          fileType: evidence.type,
        },
        /* `evidence-tab.tsx` renders `uploadingEvidenceError` in an Alert
           inside the upload panel; the toast was the same string again. Note
           this is the RECORD step — the upload above it fails through
           `uploadResult.error`, which never toasted, so the two halves of one
           action reported themselves differently. */
        silent: true,
      });
      if (error) {
        set({ uploadingEvidenceError: error, isUploadingEvidence: false });
        return false;
      }
      set({
        dispute: data,
        isUploadingEvidence: false,
      });
      return true;
    } catch (error) {
      set({
        uploadingEvidenceError:
          error instanceof Error ? error.message : "An unknown error occurred",
        isUploadingEvidence: false,
      });
      return false;
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
      resolvingDisputeError: null,
      markingInProgressError: null,
      addingNoteError: null,
      sendingMessageError: null,
      uploadingEvidenceError: null,
    }),
}));
