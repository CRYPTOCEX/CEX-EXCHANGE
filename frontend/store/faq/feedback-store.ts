import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface FeedbackState {
  feedbacks: faqFeedbackAttributes[];
  currentFaqFeedbacks: faqFeedbackAttributes[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  submitFeedback: (
    feedback: Omit<faqFeedbackAttributes, "id" | "createdAt">
  ) => Promise<void>;
  fetchFeedback: () => Promise<void>;
  fetchFeedbackByFaqId: (faqId: string) => Promise<void>;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  feedbacks: [],
  currentFaqFeedbacks: [],
  isLoading: false,
  isSubmitting: false,
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
        set({ currentFaqFeedbacks: data, isLoading: false });
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
    set({ isSubmitting: true, error: null });
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
          isSubmitting: false,
        }));
      } else {
        throw new Error(error || "Failed to submit feedback");
      }
    } catch (err) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : "An unknown error occurred",
      });
    }
  },
}));
