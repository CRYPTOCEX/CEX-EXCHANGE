"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

/** Result of a withdrawal decision, so callers can surface the real reason. */
type WithdrawalActionResult = { success: boolean; error?: string };

interface PositionsState {
  positions: StakingPosition[];
  isLoading: boolean;
  error: string | null;
  fetchPositions: (filters?: {
    poolId?: string;
    status?: string;
  }) => Promise<void>;
  updatePosition: (
    id: string,
    updates: Partial<stakingPositionAttributes>
  ) => Promise<StakingPosition | null>;
  approveWithdrawal: (id: string) => Promise<WithdrawalActionResult>;
  rejectWithdrawal: (id: string) => Promise<WithdrawalActionResult>;
  /** On-chain only: start the protocol exit, with a reason the holder sees. */
  forceUnstake: (id: string, reason: string) => Promise<WithdrawalActionResult>;
  /** On-chain only: give up on a stake that was gathered but never delegated. */
  abandonDelegation: (id: string, reason: string) => Promise<WithdrawalActionResult>;
}

// `$fetch` resolves `{ data, error }` and never rejects, so every action checks
// `error` explicitly and clears `isLoading` in a `finally`.
export const useStakingAdminPositionsStore = create<PositionsState>((set) => ({
  positions: [],
  isLoading: false,
  error: null,

  fetchPositions: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, string> = {};
      if (filters?.poolId) params.poolId = filters.poolId;
      if (filters?.status) params.status = filters.status;
      const { data, error } = await $fetch({
        url: "/api/admin/staking/position/all",
        params,
        silentSuccess: true,
      });
      if (error) {
        set({ error });
        return;
      }
      // Handle both array and paginated responses
      const positions = Array.isArray(data) ? data : (data?.items || []);
      set({ positions });
    } finally {
      set({ isLoading: false });
    }
  },

  updatePosition: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/staking/position/${id}`,
        method: "PUT",
        body: updates,
      });
      if (error) {
        set({ error });
        return null;
      }
      if (data) {
        set((state) => ({
          positions: state.positions.map((p) => (p.id === id ? data : p)),
        }));
        return data;
      }
      set({ error: `Failed to update position ${id}` });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  // Approving a withdrawal settles the position: the bulk status endpoint is
  // the only door that returns the principal, charges the early-withdrawal fee
  // and preserves earned rewards. It reports per-position failures in the body
  // (HTTP status is pinned to 200 platform-wide), so `failed` must be read too.
  approveWithdrawal: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/staking/position/status",
        method: "PUT",
        body: { ids: [id], status: "COMPLETED" },
      });
      if (error) {
        set({ error });
        return { success: false, error };
      }
      if (data?.failed) {
        const reason =
          data.errors?.[0]?.error || "Failed to approve withdrawal";
        set({ error: reason });
        return { success: false, error: reason };
      }
      return { success: true };
    } finally {
      set({ isLoading: false });
    }
  },

  // Rejecting returns the position to ACTIVE and clears the request; it never
  // moves money, so it goes through the per-position update endpoint.
  rejectWithdrawal: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await $fetch({
        url: `/api/admin/staking/position/${id}`,
        method: "PUT",
        body: {
          status: "ACTIVE",
          withdrawalRequested: false,
          withdrawalRequestDate: null,
        },
      });
      if (error) {
        set({ error });
        return { success: false, error };
      }
      return { success: true };
    } finally {
      set({ isLoading: false });
    }
  },

  /*
    THE ONLY TWO ADMIN VERBS AN ON-CHAIN POSITION HAS.

    There is no approve, decline, complete or cancel here: a protocol exit
    needs no human to allow it, and a cancel that forfeits rewards is a
    locked-term rule rather than a staking one. What an operator can do is
    start the exit for someone (with a reason the holder is shown, and their
    rewards still paid), and — for a stake whose coins reached the staking
    wallet but could not be delegated — give up and send the coins back.

    Both doors are refused by the backend for a fixed-rate row, so the UI
    hiding them for one is a courtesy, not the enforcement.
  */
  forceUnstake: async (id: string, reason: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await $fetch({
        url: `/api/admin/staking/position/${id}/force-unstake`,
        method: "POST",
        body: { reason },
      });
      if (error) {
        set({ error });
        return { success: false, error };
      }
      return { success: true };
    } finally {
      set({ isLoading: false });
    }
  },

  abandonDelegation: async (id: string, reason: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await $fetch({
        url: `/api/admin/staking/position/${id}/abandon`,
        method: "POST",
        body: { reason },
      });
      if (error) {
        set({ error });
        return { success: false, error };
      }
      return { success: true };
    } finally {
      set({ isLoading: false });
    }
  },
}));