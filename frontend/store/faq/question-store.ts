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
      const { data, error } = await $fetch<{ data: faqQuestionAttributes[] }>({
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
      console.error("Error fetching questions:", err);
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
      console.error("Error updating question status:", err);
    }
  },

  answerQuestion: async (id, answer) => {
    try {
      const { error } = await $fetch({
        url: `/api/admin/faq/question/${id}/answer`,
        method: "POST",
        body: { answer },
      });
      if (error) {
        throw new Error(error);
      }
      // Update the question in the store by setting the answer and marking it as answered.
      set((state) => ({
        questions: state.questions.map((q) =>
          q.id === id ? { ...q, answer, status: "ANSWERED" } : q
        ),
      }));
    } catch (err) {
      console.error("Error answering question:", err);
      throw err;
    }
  },
}));
