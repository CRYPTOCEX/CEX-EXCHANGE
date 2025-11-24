"use client";
import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface AIState {
  isGenerating: boolean;
  isImproving: boolean;
  isAnswering: boolean;
  isSuggestingTags: boolean;
  isSummarizing: boolean;
  error: string | null;

  generateFAQ: (topic: string, context?: string) => Promise<any>;
  improveFAQ: (question: string, answer: string) => Promise<string>;
  answerQuestion: (question: string) => Promise<string>;
  suggestTags: (question: string, answer: string) => Promise<string[]>;
  summarizeContent: (content: string) => Promise<string>;
  clearError: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  isGenerating: false,
  isImproving: false,
  isAnswering: false,
  isSuggestingTags: false,
  isSummarizing: false,
  error: null,

  generateFAQ: async (topic, context) => {
    set({ isGenerating: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/faq/ai/generate",
        method: "POST",
        body: { topic, context },
      });
      if (data && !error) {
        set({ isGenerating: false });
        return data;
      } else {
        const errMsg = error || "Failed to generate FAQ";
        set({ isGenerating: false, error: errMsg });
        throw new Error(errMsg);
      }
    } catch (err) {
      set({
        isGenerating: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      throw err;
    }
  },

  improveFAQ: async (question, answer) => {
    set({ isImproving: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/faq/ai/improve",
        method: "POST",
        body: { question, answer },
      });
      if (data && !error) {
        set({ isImproving: false });
        return data;
      } else {
        const errMsg = error || "Failed to improve FAQ";
        set({ isImproving: false, error: errMsg });
        throw new Error(errMsg);
      }
    } catch (err) {
      set({
        isImproving: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      throw err;
    }
  },

  answerQuestion: async (question) => {
    set({ isAnswering: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/faq/ai/answer",
        method: "POST",
        body: { question },
      });
      if (data && !error) {
        set({ isAnswering: false });
        return data;
      } else {
        const errMsg = error || "Failed to answer question";
        set({ isAnswering: false, error: errMsg });
        throw new Error(errMsg);
      }
    } catch (err) {
      set({
        isAnswering: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      throw err;
    }
  },

  suggestTags: async (question, answer) => {
    set({ isSuggestingTags: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/faq/ai/tag",
        method: "POST",
        body: { question, answer },
      });
      if (data && !error) {
        set({ isSuggestingTags: false });
        return data;
      } else {
        const errMsg = error || "Failed to suggest tags";
        set({ isSuggestingTags: false, error: errMsg });
        throw new Error(errMsg);
      }
    } catch (err) {
      set({
        isSuggestingTags: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      throw err;
    }
  },

  summarizeContent: async (content) => {
    set({ isSummarizing: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/faq/ai/summarize",
        method: "POST",
        body: { content },
      });
      if (data && !error) {
        set({ isSummarizing: false });
        return data;
      } else {
        const errMsg = error || "Failed to summarize content";
        set({ isSummarizing: false, error: errMsg });
        throw new Error(errMsg);
      }
    } catch (err) {
      set({
        isSummarizing: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
