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

/** A user-submitted question waiting on somebody, counted across the table. */
export interface QuestionQueue {
  pending: number;
  answered: number;
  rejected: number;
  total: number;
  /** ISO time the oldest still-unanswered question arrived, or null. */
  oldestPendingAt: string | null;
}

/**
 * The thresholds the failing-answer list is built from, and the TRUE count of
 * FAQs under them.
 *
 * `underperformingFaqs` is a server-side count over every rated FAQ, not the
 * length of `strugglingFaqs` — that array is capped at the worst handful.
 */
export interface HelpfulnessSummary {
  floorPct: number;
  minResponses: number;
  ratedFaqs: number;
  underperformingFaqs: number;
}

export interface StrugglingFaq {
  id: string;
  question: string;
  category: string;
  status: boolean;
  views: number;
  responses: number;
  helpful: number;
  helpfulPct: number;
}

/**
 * This calendar month against last, for one counter.
 *
 * `percentageChange` IS NULLABLE, and that is the whole point of the type.
 * There is no percentage change from a previous month of zero, and the server
 * used to report a flat `100` there — which the dashboard drew as a green
 * "+100.0%". Null means "no baseline to compare against"; a consumer must render
 * it as the absence of a trend, never as a gain. `current`, `previous` and
 * `delta` are always real counts and stay usable when the ratio is not.
 */
export interface MonthComparison {
  current: number;
  previous: number;
  delta: number;
  percentageChange: number | null;
}

export interface AnalyticsData {
  /** When the server read these figures. Null until the first payload lands. */
  generatedAt: string | null;
  totalFaqs: number;
  activeFaqs: number;
  totalViews: number;
  totalFeedback: number;
  averageRating: number;
  positiveRatingPercentage: number;
  negativeRatingPercentage: number;
  questionQueue: QuestionQueue;
  helpfulness: HelpfulnessSummary;
  strugglingFaqs: StrugglingFaq[];
  mostViewedFaqs: {
    id: string;
    title: string;
    views: number;
    category: string;
    /** How many people rated it — 100% off one vote is not a signal. */
    responses: number;
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
  /**
   * NOT a view time-series, whatever the name says.
   *
   * `faq.views` is a lifetime counter on the article; there is no per-view
   * event table anywhere in this addon. The server produces this by SUMming
   * that counter grouped by the month each FAQ was CREATED, so a five-year-old
   * article contributes every view it has ever had to the month it was written.
   * Plotting it as a trend is a chart that answers no question, which is why
   * the dashboard no longer draws it. Kept on the type because the endpoint
   * still returns it.
   */
  viewsOverTime: {
    month: string;
    views: number;
  }[];
  /** Derived from `viewsOverTime`, and wrong for the same reason. Not shown. */
  viewsComparison: MonthComparison;
  feedbackComparison: {
    positive: MonthComparison;
    negative: MonthComparison;
  };
  /** First load only. A background refresh sets `isRefreshing` instead. */
  isLoading: boolean;
  /** A refresh over figures that are already on screen. */
  isRefreshing: boolean;
  error: string | null;
}

interface AnalyticsStore {
  analytics: AnalyticsData;
  /**
   * `background: true` keeps the figures on screen while the request is in
   * flight. Without it a manual refresh blanks a dashboard that is still
   * perfectly true as of its own `generatedAt`.
   */
  fetchAnalytics: (options?: { background?: boolean }) => Promise<void>;
  resetAnalytics: () => void;
}

const initialState: AnalyticsData = {
  generatedAt: null,
  totalFaqs: 0,
  activeFaqs: 0,
  totalViews: 0,
  totalFeedback: 0,
  averageRating: 0,
  positiveRatingPercentage: 0,
  negativeRatingPercentage: 0,
  questionQueue: {
    pending: 0,
    answered: 0,
    rejected: 0,
    total: 0,
    oldestPendingAt: null,
  },
  helpfulness: {
    floorPct: 50,
    minResponses: 3,
    ratedFaqs: 0,
    underperformingFaqs: 0,
  },
  strugglingFaqs: [],
  mostViewedFaqs: [],
  categoryDistribution: [],
  topSearchQueries: [],
  feedbackOverTime: [],
  viewsOverTime: [],
  /* `percentageChange: null`, not 0. Before any payload lands there is no
     comparison at all, and 0 is a reading — "exactly level with last month" —
     that the page would otherwise draw as a real chip. */
  viewsComparison: {
    current: 0,
    previous: 0,
    delta: 0,
    percentageChange: null,
  },
  feedbackComparison: {
    positive: {
      current: 0,
      previous: 0,
      delta: 0,
      percentageChange: null,
    },
    negative: {
      current: 0,
      previous: 0,
      delta: 0,
      percentageChange: null,
    },
  },
  isLoading: false,
  isRefreshing: false,
  error: null,
};

export const useAnalyticsStore = create<AnalyticsStore>()(
  devtools(
    (set) => ({
      analytics: initialState,
      fetchAnalytics: async ({ background = false } = {}) => {
        set((state) => ({
          analytics: {
            ...state.analytics,
            isLoading: background ? state.analytics.isLoading : true,
            isRefreshing: background,
            error: null,
          },
        }));
        try {
          const { data, error } = await $fetch({
            url: "/api/admin/faq/analytics",
            silent: true,
          });
          if (data && !error) {
            /* Layered over `initialState`, not assigned raw. A payload from an
               older backend — an install mid-update, a cached response — omits
               the newer keys entirely, and `{...data}` would then leave
               `questionQueue` undefined on a page that reads through it. Every
               field keeps a shape whatever arrives. */
            set({
              analytics: {
                ...initialState,
                ...(data as Partial<AnalyticsData>),
                isLoading: false,
                isRefreshing: false,
                error: null,
              },
            });
          } else {
            throw new Error(error || "Failed to fetch analytics data");
          }
        } catch (error) {
          set((state) => ({
            analytics: {
              ...state.analytics,
              isLoading: false,
              isRefreshing: false,
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
