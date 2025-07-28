import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { $fetch } from "@/lib/api";

export interface FeedbackData {
  id: string;
  faqId: string;
  isHelpful: boolean;
  comment?: string;
  createdAt: string;
}

export interface SearchQueryData {
  id: string;
  query: string;
  resultCount: number;
  clickedResults: string[];
  timestamp: string;
}

export interface ViewData {
  id: string;
  faqId: string;
  timestamp: string;
  sessionId: string;
  timeSpent?: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface AnalyticsData {
  totalFaqs: number;
  activeFaqs: number;
  totalViews: number;
  averageRating: number;
  positiveRatingPercentage: number;
  negativeRatingPercentage: number;
  mostViewedFaqs: {
    id: string;
    title: string;
    views: number;
    category: string;
    positiveRating: number;
  }[];
  categoryDistribution: CategoryDistribution[];
  topSearchQueries: {
    query: string;
    count: number;
    averageResults: number;
  }[];
  feedbackOverTime: {
    date: string;
    positive: number;
    negative: number;
  }[];
  // Monthly view counts (one record per month)
  viewsOverTime: {
    month: string;
    views: number;
  }[];
  // New comparison metrics
  viewsComparison: {
    current: number;
    previous: number;
    delta: number;
    percentageChange: number;
  };
  feedbackComparison: {
    positive: {
      current: number;
      previous: number;
      delta: number;
      percentageChange: number;
    };
    negative: {
      current: number;
      previous: number;
      delta: number;
      percentageChange: number;
    };
  };
  isLoading: boolean;
  error: string | null;
}

interface AnalyticsStore {
  analytics: AnalyticsData;
  fetchAnalytics: () => Promise<void>;
  resetAnalytics: () => void;
}

const initialState: AnalyticsData = {
  totalFaqs: 0,
  activeFaqs: 0,
  totalViews: 0,
  averageRating: 0,
  positiveRatingPercentage: 0,
  negativeRatingPercentage: 0,
  mostViewedFaqs: [],
  categoryDistribution: [],
  topSearchQueries: [],
  feedbackOverTime: [],
  viewsOverTime: [],
  viewsComparison: {
    current: 0,
    previous: 0,
    delta: 0,
    percentageChange: 0,
  },
  feedbackComparison: {
    positive: {
      current: 0,
      previous: 0,
      delta: 0,
      percentageChange: 0,
    },
    negative: {
      current: 0,
      previous: 0,
      delta: 0,
      percentageChange: 0,
    },
  },
  isLoading: false,
  error: null,
};

export const useAnalyticsStore = create<AnalyticsStore>()(
  devtools(
    (set) => ({
      analytics: initialState,
      fetchAnalytics: async () => {
        set((state) => ({
          analytics: { ...state.analytics, isLoading: true, error: null },
        }));
        try {
          const { data, error } = await $fetch({
            url: "/api/admin/faq/analytics",
            silent: true,
          });
          if (data && !error) {
            set({
              analytics: { ...data, isLoading: false, error: null },
            });
          } else {
            throw new Error(error || "Failed to fetch analytics data");
          }
        } catch (error) {
          set((state) => ({
            analytics: {
              ...state.analytics,
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "An unknown error occurred",
            },
          }));
        }
      },
      resetAnalytics: () => set({ analytics: initialState }),
    }),
    { name: "analytics-store" }
  )
);
