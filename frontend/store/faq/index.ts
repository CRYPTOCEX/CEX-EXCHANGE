"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface FAQ extends faqAttributes {
  helpfulCount?: number;
}

interface FAQPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
}

/** Shapes returned by GET /api/faq/stats (public endpoint). */
export interface FAQCategoryStats {
  name: string;
  faqCount: number;
  totalViews: number;
  icon: string;
}

export interface FAQPopular {
  id: string;
  question: string;
  answer: string;
  category: string;
  views: number;
  helpfulCount: number;
  helpfulPercentage: number;
}

export interface FAQTrendingSearch {
  query: string;
  count: number;
  /** false when the query historically returned no matches (a knowledge gap) */
  hasResults: boolean;
}

export interface FAQStats {
  categoriesWithStats: FAQCategoryStats[];
  popularFaqs: FAQPopular[];
  popularSearches: FAQTrendingSearch[];
}

interface FAQStore {
  // Data
  faqs: FAQ[];
  categories: string[];
  loading: boolean;
  error: string | null;
  pagination: FAQPagination | null;
  stats: FAQStats | null;
  statsLoading: boolean;

  // Actions
  fetchFAQs: (page?: number, perPage?: number, category?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchStats: () => Promise<void>;
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
  stats: null,
  statsLoading: false,

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
      set({
        error: error instanceof Error ? error.message : "Failed to fetch FAQs",
        loading: false,
      });
    }
  },

  /**
   * Landing-page analytics: category cards, popular FAQs and trending searches.
   * `$fetch` always resolves `{data,error}` and never throws, so this reads the
   * envelope rather than wrapping the call in try/catch.
   */
  fetchStats: async () => {
    set({ statsLoading: true });

    const { data, error } = await $fetch<FAQStats>({
      url: "/api/faq/stats",
      silentSuccess: true,
      silent: true,
    });

    if (error || !data) {
      // Non-fatal: the sections render nothing without stats, and the rest of
      // the FAQ page works regardless.
      set({ statsLoading: false });
      return;
    }

    set({
      stats: {
        categoriesWithStats: data.categoriesWithStats || [],
        popularFaqs: data.popularFaqs || [],
        popularSearches: data.popularSearches || [],
      },
      statsLoading: false,
    });
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
      // silently ignore
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
      // silently ignore
      return null;
    }
  },

  searchFAQs: async (query: string, category?: string) => {
    try {
      // Single API call that both searches and logs
      const { data, error } = await $fetch<faqAttributes[]>({
        url: "/api/faq/search",
        method: "POST",
        body: {
          query,
          category,
        },
        silentSuccess: true,
      });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      // silently ignore
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
      // silently ignore
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
      // silently ignore
      return false;
    }
  },
}));
