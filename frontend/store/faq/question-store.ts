"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface QuestionCounts {
  pending: number;
  answered: number;
  rejected: number;
  total: number;
}

export type QuestionStatus = "PENDING" | "ANSWERED" | "REJECTED";

export interface QuestionQuery {
  status?: QuestionStatus;
  search?: string;
}

interface AdminQuestionsStore {
  questions: faqQuestionAttributes[];
  /**
   * Totals across the whole table.
   *
   * The tab badges used to be counted from the loaded array, which was one
   * capped page, so they under-reported as soon as there were more questions
   * than fitted in it.
   */
  counts: QuestionCounts;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  fetchQuestions: (page?: number, opts?: QuestionQuery) => Promise<void>;
  updateQuestionStatus: (
    id: string,
    status: "PENDING" | "ANSWERED" | "REJECTED"
  ) => Promise<void>;
  answerQuestion: (id: string, answer: string) => Promise<void>;
}

export const useAdminQuestionsStore = create<AdminQuestionsStore>((set) => ({
  questions: [],
  counts: { pending: 0, answered: 0, rejected: 0, total: 0 },
  page: 1,
  totalPages: 1,
  isLoading: false,
  error: null,

  fetchQuestions: async (page = 1, opts) => {
    set({ isLoading: true, error: null });
    try {
      // The tab and the search box are QUERY parameters. They used to be
      // applied in the browser over the loaded page, so switching to "Pending"
      // showed only the pending questions that happened to be on that page and
      // the search box could not find anything that was not already on screen.
      let url = `/api/admin/faq/question?page=${page}&limit=25`;
      if (opts?.status) url += `&status=${opts.status}`;
      if (opts?.search) url += `&search=${encodeURIComponent(opts.search)}`;

      const { data, error } = await $fetch<any>({
        url,
        silentSuccess: true,
      });
      if (error) {
        set({ error, isLoading: false });
        return;
      }
      // The endpoint is paginated now; the bare-array form is still accepted
      // so an older backend does not blank the screen.
      const questionsData = Array.isArray(data) ? data : (data?.items ?? []);
      const counts = data?.counts ?? {
        pending: questionsData.filter((q: any) => q.status === "PENDING").length,
        answered: questionsData.filter((q: any) => q.status === "ANSWERED").length,
        rejected: questionsData.filter((q: any) => q.status === "REJECTED").length,
        total: questionsData.length,
      };
      set({
        questions: questionsData,
        counts,
        page: data?.pagination?.currentPage ?? page,
        totalPages: data?.pagination?.totalPages ?? 1,
        isLoading: false,
      });
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
