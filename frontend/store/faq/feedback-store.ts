import { create } from "zustand";
import { $fetch } from "@/lib/api";

export type FeedbackFilter = "all" | "helpful" | "unhelpful" | "withComments";

export interface FeedbackQuery {
  filter?: FeedbackFilter;
  search?: string;
}

interface FeedbackPagination {
  currentPage: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

interface FeedbackCounts {
  helpful: number;
  unhelpful: number;
  withComments: number;
  total: number;
}

interface FeedbackState {
  feedbacks: faqFeedbackAttributes[];
  currentFaqFeedbacks: faqFeedbackAttributes[];
  /**
   * Totals across the whole table, so the header does not contradict the page
   * being shown. Counting the loaded array reported the size of one slice.
   */
  counts: FeedbackCounts;
  pagination: FeedbackPagination;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  submitFeedback: (
    feedback: Omit<faqFeedbackAttributes, "id" | "createdAt">
  ) => Promise<void>;
  fetchFeedback: (page?: number, opts?: FeedbackQuery) => Promise<void>;
  fetchFeedbackByFaqId: (faqId: string) => Promise<void>;
}

const EMPTY_COUNTS: FeedbackCounts = {
  helpful: 0,
  unhelpful: 0,
  withComments: 0,
  total: 0,
};

export const useFeedbackStore = create<FeedbackState>((set) => ({
  feedbacks: [],
  currentFaqFeedbacks: [],
  counts: EMPTY_COUNTS,
  pagination: { currentPage: 1, perPage: 25, totalItems: 0, totalPages: 1 },
  isLoading: false,
  isSubmitting: false,
  error: null,

  fetchFeedback: async (page = 1, opts) => {
    set({ isLoading: true, error: null });
    try {
      // Paginated, and filtered/searched in the QUERY.
      //
      // The endpoint used to return a bare capped array with no offset, so
      // feedback past the cap was unreachable by any means, and the screen
      // split its four tabs and ran its search over that one array in memory.
      let url = `/api/admin/faq/feedback?page=${page}&limit=25`;
      if (opts?.filter && opts.filter !== "all") url += `&filter=${opts.filter}`;
      if (opts?.search) url += `&search=${encodeURIComponent(opts.search)}`;

      const { data, error } = await $fetch<any>({
        url,
        silentSuccess: true,
      });

      if (error) {
        set({ error, isLoading: false });
        return;
      }

      // The endpoint is paginated now; the bare-array form is still accepted so
      // an un-upgraded backend does not blank the screen.
      const items = Array.isArray(data) ? data : (data?.items ?? []);
      const counts = data?.counts ?? {
        helpful: items.filter((f: any) => f.isHelpful).length,
        unhelpful: items.filter((f: any) => !f.isHelpful).length,
        withComments: items.filter((f: any) => !!f.comment).length,
        total: items.length,
      };

      set({
        feedbacks: items,
        counts,
        pagination: data?.pagination ?? {
          currentPage: page,
          perPage: 25,
          totalItems: items.length,
          totalPages: 1,
        },
        isLoading: false,
      });
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
