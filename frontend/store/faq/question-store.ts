"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface AdminQuestionsStore {
  questions: faqQuestionAttributes[];
  isLoading: boolean;
  error: string | null;
  fetchQuestions: () => Promise<void>;
  updateQuestionStatus: (
    id: string,
    status: "PENDING" | "ANSWERED" | "REJECTED"
  ) => Promise<void>;
  answerQuestion: (id: string, answer: string) => Promise<void>;
}

export const useAdminQuestionsStore = create<AdminQuestionsStore>((set) => ({
  questions: [],
  isLoading: false,
  error: null,

  fetchQuestions: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await $fetch<faqQuestionAttributes[]>({
        url: "/api/admin/faq/question",
        silentSuccess: true,
      });
      if (error) {
        set({ error, isLoading: false });
        return;
      }
      // Ensure questions is always an array
      const questionsData = Array.isArray(data) ? data : [];
      set({ questions: questionsData, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch questions",
        isLoading: false,
      });
    }
  },

  updateQuestionStatus: async (id, status) => {
    try {
      const { error } = await $fetch({
        url: `/api/admin/faq/question/${id}/status`,
        method: "PUT",
        body: { status },
      });
      if (!error) {
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id ? { ...q, status } : q
          ),
        }));
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to update question status",
      });
    }
  },

  answerQuestion: async (id, answer) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await $fetch({
        url: `/api/admin/faq/question/${id}/answer`,
        method: "POST",
        body: { answer },
      });
      if (error) {
        set({ isLoading: false, error });
        throw new Error(error);
      }
      set((state) => ({
        questions: state.questions.map((q) =>
          q.id === id ? { ...q, answer, status: "ANSWERED" } : q
        ),
        isLoading: false,
      }));
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
}));
