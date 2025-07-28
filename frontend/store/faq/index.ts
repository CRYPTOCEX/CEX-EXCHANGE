"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useUserStore } from "../user";

interface FAQ extends faqAttributes {
  helpfulCount?: number;
}

interface FAQStore {
  // Data
  faqs: FAQ[];
  categories: string[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchFAQs: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  getFAQById: (id: string) => Promise<FAQ | null>;
  searchFAQs: (query: string, category?: string) => Promise<faqAttributes[]>;
  submitFeedback: (
    faqId: string,
    isHelpful: boolean,
    comment?: string
  ) => Promise<boolean>;
  submitQuestion: (
    name: string,
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

  // Actions
  fetchFAQs: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/faq",
        silentSuccess: true,
      });

      if (error) {
        set({ error, loading: false });
        return;
      }

      if (data) {
        set({
          faqs: data || [],
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
      let url = `/api/faq?search=${encodeURIComponent(query)}`;
      if (category) {
        url += `&category=${encodeURIComponent(category)}`;
      }

      const { data, error } = await $fetch({
        url,
        silentSuccess: true,
      });

      if (error) {
        return [];
      }

      const user = useUserStore.getState().user;
      const requestBody = {
        query,
        resultCount: data?.length || 0,
        category,
        ...(user ? { userId: user.id } : {}),
      };
      await $fetch({
        url: "/api/faq/search",
        method: "POST",
        body: requestBody,
        silent: true,
      });

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
