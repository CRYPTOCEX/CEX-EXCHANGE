import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface FeedbackState {
  feedbacks: faqFeedbackAttributes[];
  isLoading: boolean;
  error: string | null;
  submitFeedback: (
    feedback: Omit<faqFeedbackAttributes, "id" | "createdAt">
  ) => Promise<void>;
  fetchFeedback: () => Promise<void>;
  fetchFeedbackByFaqId: (faqId: string) => Promise<void>;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  feedbacks: [],
  isLoading: false,
  error: null,

  fetchFeedback: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await $fetch<faqFeedbackAttributes[]>({
        url: "/api/admin/faq/feedback",
        silentSuccess: true,
      });
      if (data && !error) {
        set({ feedbacks: data, isLoading: false });
      } else {
        throw new Error(error || "Failed to fetch feedback");
      }
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "An unknown error occurred",
      });
    }
  },

  fetchFeedbackByFaqId: async (faqId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await $fetch<faqFeedbackAttributes[]>({
        url: `/api/admin/faq/${faqId}/feedback`,
        silentSuccess: true,
      });
      if (data && !error) {
        set({ feedbacks: data, isLoading: false });
      } else {
        throw new Error(error || "Failed to fetch feedback");
      }
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "An unknown error occurred",
      });
    }
  },

  submitFeedback: async (feedback) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await $fetch<faqFeedbackAttributes>({
        url: `/api/admin/faq/${feedback.faqId}/feedback`,
        method: "POST",
        body: {
          isHelpful: feedback.isHelpful,
          comment: feedback.comment,
        },
        silent: true,
      });
      if (data && !error) {
        set((state) => ({
          feedbacks: [...state.feedbacks, data],
          isLoading: false,
        }));
      } else {
        throw new Error(error || "Failed to submit feedback");
      }
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "An unknown error occurred",
      });
    }
  },
}));
