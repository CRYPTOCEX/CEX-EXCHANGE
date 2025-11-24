"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useUserStore } from "../user";

interface FAQ extends faqAttributes {
  helpfulCount?: number;
}

interface FAQPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
}

interface FAQStore {
  // Data
  faqs: FAQ[];
  categories: string[];
  loading: boolean;
  error: string | null;
  pagination: FAQPagination | null;

  // Actions
  fetchFAQs: (page?: number, perPage?: number, category?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  getFAQById: (id: string) => Promise<FAQ | null>;
  searchFAQs: (query: string, category?: string) => Promise<faqAttributes[]>;
  submitFeedback: (
    faqId: string,
    isHelpful: boolean,
    comment?: string
  ) => Promise<boolean>;
  submitQuestion: (
    email: string,
    question: string
  ) => Promise<boolean>;
}

export const useFAQStore = create<FAQStore>((set, get) => ({
  // Data
  faqs: [],
  categories: [],
  loading: false,
  error: null,
  pagination: null,

  // Actions
  fetchFAQs: async (page = 1, perPage = 10, category?: string) => {
    set({ loading: true, error: null });
    try {
      let url = `/api/faq?page=${page}&limit=${perPage}`;
      if (category) {
        url += `&category=${encodeURIComponent(category)}`;
      }

      const { data, error } = await $fetch<FAQListResponse>({
        url,
        silentSuccess: true,
      });

      if (error) {
        set({ error, loading: false });
        return;
      }

      if (data) {
        set({
          faqs: data.items || [],
          pagination: data.pagination || null,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to fetch FAQs",
        loading: false,
      });
    }
  },

  fetchCategories: async () => {
    try {
      const { data, error } = await $fetch<string[]>({
        url: "/api/faq/category",
        silentSuccess: true,
        silent: true,
      });

      if (error) {
        return;
      }

      if (data) {
        set({ categories: data });
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  },

  getFAQById: async (id: string) => {
    try {
      const { data, error } = await $fetch<faqAttributes>({
        url: `/api/faq/${id}`,
        silentSuccess: true,
      });

      if (error) {
        return null;
      }

      return data || null;
    } catch (error) {
      console.error(`Error fetching FAQ ${id}:`, error);
      return null;
    }
  },

  searchFAQs: async (query: string, category?: string) => {
    try {
      const user = useUserStore.getState().user;
      
      // Single API call that both searches and logs
      const { data, error } = await $fetch<faqAttributes[]>({
        url: "/api/faq/search",
        method: "POST",
        body: {
          query,
          category,
          ...(user ? { userId: user.id } : {}),
        },
        silentSuccess: true,
      });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error searching FAQs:", error);
      return [];
    }
  },

  submitFeedback: async (
    faqId: string,
    isHelpful: boolean,
    comment?: string
  ) => {
    try {
      const { data, error } = await $fetch({
        url: `/api/faq/${faqId}/feedback`,
        method: "POST",
        body: { isHelpful, comment },
        silent: true,
      });
      if (error) {
        throw new Error(error);
      }
      return true;
    } catch (error) {
      console.error("Error submitting feedback:", error);
      return false;
    }
  },

  submitQuestion: async (email: string, question: string) => {
    try {
      const { error } = await $fetch({
        url: "/api/faq/question",
        method: "POST",
        body: {
          email,
          question,
        },
      });

      return !error;
    } catch (error) {
      console.error("Error submitting question:", error);
      return false;
    }
  },
}));
