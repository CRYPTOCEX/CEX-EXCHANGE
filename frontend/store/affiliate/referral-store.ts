import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  status: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  status: string;
  createdAt: string;
  referred?: Partial<User>;
}

interface Pagination {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

interface ReferralStore {
  referrals: Referral[];
  pagination: Pagination;
  loading: boolean;
  error: string | null;
  fetchReferrals: (page: number, perPage: number) => Promise<void>;
  fetchReferralDetails: (id: string) => Promise<any>;
}

export const useReferralStore = create<ReferralStore>((set, get) => ({
  referrals: [],
  pagination: {
    page: 1,
    perPage: 10,
    totalItems: 0,
    totalPages: 0,
  },
  loading: false,
  error: null,
  fetchReferrals: async (page: number, perPage: number) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/affiliate/referral",
        params: { page, perPage },
        silentSuccess: true,
      });

      if (error) {
        throw new Error(error);
      }

      set({
        referrals: data.referrals || [],
        pagination: {
          page: data.pagination?.page || 1,
          perPage: data.pagination?.perPage || 10,
          totalItems: data.pagination?.totalItems || 0,
          totalPages: data.pagination?.totalPages || 0,
        },
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load referrals",
        loading: false,
      });
    }
  },
  fetchReferralDetails: async (id: string) => {
    try {
      const { data, error } = await $fetch({
        url: `/api/affiliate/referral/${id}`,
        silentSuccess: true,
      });

      if (error) {
        throw new Error(error);
      }

      return data;
    } catch (err) {
      console.error("Error fetching referral details:", err);
      throw err;
    }
  },
}));
