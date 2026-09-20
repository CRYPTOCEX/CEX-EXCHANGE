import { StateCreator } from "zustand";
import { TableStore } from "../types/table";
import { $fetch } from "@/lib/api";
import { AnalyticsConfig } from "../types/analytics";

export interface AnalyticsState {
  analyticsTab: "overview" | "analytics";
  analyticsConfig: AnalyticsConfig | null;
  analyticsData: Record<string, any> | null;
  analyticsLoading: boolean;
  analyticsError: string | null;
  // Cache fields
  lastFetchTime: number | null;
  cacheExpiration: number | null;
  cacheTimeframe: string | null;
  db: "mysql" | "scylla";
  keyspace: string | null;
  userAnalytics: boolean;
}

export interface AnalyticsActions {
  setAnalyticsTab: (tab: "overview" | "analytics") => void;
  setAnalyticsConfig: (config: AnalyticsConfig) => void;
  setAnalyticsError: (error: string | null) => void;
  setDb: (db: "mysql" | "scylla") => void;
  setKeyspace: (keyspace: string | null | undefined) => void;
  initializeAnalyticsConfig: () => Promise<void>;
  resetAnalyticsData: () => void;
  fetchAnalyticsData: (timeframe: string) => Promise<void>;
  resetAnalyticsTab: () => void;
  setUserAnalytics: (userAnalytics: boolean) => void;
}

export type AnalyticsSlice = AnalyticsState & AnalyticsActions;

export const createAnalyticsSlice: StateCreator<
  TableStore,
  [],
  [],
  AnalyticsSlice
> = (set, get) => ({
  // Initial state
  analyticsTab: "overview",
  analyticsConfig: null,
  analyticsData: null,
  analyticsLoading: false,
  analyticsError: null,
  lastFetchTime: null,
  cacheExpiration: null,
  cacheTimeframe: null,
  db: "mysql",
  keyspace: null,
  userAnalytics: false,

  // Actions
  setAnalyticsTab: (tab) => set({ analyticsTab: tab }),
  setAnalyticsConfig: (config) => set({ analyticsConfig: config }),
  setAnalyticsError: (error) => set({ analyticsError: error }),
  setDb: (db) => set({ db }),
  setKeyspace: (keyspace) => set({ keyspace }),
  setUserAnalytics: (userAnalytics) => set({ userAnalytics }),

  resetAnalyticsTab: () => set({ analyticsTab: "overview" }),

  initializeAnalyticsConfig: async () => {
    set({ analyticsLoading: true, analyticsError: null });
    try {
      set({ analyticsLoading: false });
    } catch (err) {
      console.error("Error initializing analytics config:", err);
      set({
        analyticsError: "Failed to initialize analytics configuration",
        analyticsLoading: false,
      });
    }
  },

  resetAnalyticsData: () => {
    set({
      analyticsData: null,
      lastFetchTime: null,
      cacheExpiration: null,
      cacheTimeframe: null,
    });
  },

  fetchAnalyticsData: async (timeframe) => {
    set({ analyticsLoading: true, analyticsError: null });

    const currentTime = Date.now();
    const {
      lastFetchTime,
      cacheExpiration,
      cacheTimeframe,
      analyticsConfig,
      model,
      db,
      keyspace,
      modelConfig,
      userAnalytics,
    } = get();

    // Use cached data if available.
    if (
      lastFetchTime &&
      cacheExpiration &&
      cacheTimeframe === timeframe &&
      currentTime < cacheExpiration
    ) {
      set({ analyticsLoading: false });
      return;
    }

    try {
      if (!analyticsConfig) {
        throw new Error("No analytics configuration available");
      }

      // Flatten KPI and chart configs.
      const items = analyticsConfig.flatMap((item) =>
        Array.isArray(item) ? item.flatMap((sub) => sub.items) : item.items
      );
      const kpis = items.filter((it) => "metric" in it);
      const charts = items.filter((it) => "metrics" in it);
      const url =
        userAnalytics === true ? "/api/user/analysis" : "/api/admin/analysis";

      /**
       * A page may bucket on a column other than `createdAt`.
       *
       * The engine has accepted `dateField` since the rewrite, but nothing ever
       * sent it, so every chart on every page was keyed to when the row was
       * CREATED. On a withdrawals queue that plots "approvals per day" against
       * the day each request arrived, which is a different — and, when a
       * backlog is being cleared, a very misleading — curve.
       *
       * It is declared once per page rather than per card: a second axis means
       * a second query, and no page has yet needed one badly enough to pay for
       * it. `analyticsConfig` is an array, so the marker rides on the array
       * object itself.
       */
      const dateField = (analyticsConfig as any).dateField as string | undefined;

      const { data, error } = await $fetch({
        method: "POST",
        url,
        body: {
          model,
          modelConfig,
          timeframe,
          charts,
          kpis,
          db,
          keyspace,
          ...(dateField ? { dateField } : {}),
        },
        silent: true,
      });

      if (error) {
        throw new Error(error);
      }
      if (!data) {
        throw new Error("No data returned from analytics API");
      }

      // Cache new data for 5 minutes.
      const newCacheExpiration = currentTime + 5 * 60 * 1000;
      set({
        analyticsData: data,
        analyticsLoading: false,
        analyticsError: null,
        lastFetchTime: currentTime,
        cacheExpiration: newCacheExpiration,
        cacheTimeframe: timeframe,
      });
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      set({
        analyticsError:
          err instanceof Error ? err.message : "Failed to fetch analytics data",
        analyticsLoading: false,
        analyticsData: null,
        lastFetchTime: null,
        cacheExpiration: null,
        cacheTimeframe: null,
      });
    }
  },
});
