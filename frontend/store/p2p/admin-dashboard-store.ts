"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface TradeUser {
  id: string;
  name: string;
  avatar?: string;
}

/**
 * A money figure that may span currencies.
 *
 * There is no FX oracle on this platform, so `/dashboard/stats` never sums
 * across denominations: every money figure arrives as a per-currency breakdown
 * plus a flat scalar that is populated ONLY when exactly one currency is in
 * play. A `null` scalar means "several currencies", not "zero" — rendering it
 * as `0` (or gluing a `$` to it, which this page used to do) is the difference
 * between an unknown and a wrong number.
 */
export interface CurrencyAmount {
  currency: string;
  amount: number;
}

interface RecentTrade {
  id: string;
  type: "BUY" | "SELL";
  currency: string;
  amount: number;
  total: number;
  status: string;
  createdAt: string;
  buyer: TradeUser | null;
  seller: TradeUser | null;
}

/**
 * A row from the head of the OPEN dispute queue, oldest first.
 *
 * Was `RecentDispute` — the five newest disputes of any status, including
 * RESOLVED ones, rendered under a heading that read "Open Disputes". The
 * endpoint now filters and sorts like the queue page itself does.
 */
interface QueuedDispute {
  id: string;
  reason: string;
  status: "PENDING" | "IN_PROGRESS";
  priority: "HIGH" | "MEDIUM" | "LOW";
  /** The queue's own clock — see the `filedOn` note in `stats.get.ts`. */
  filedOn: string;
  createdAt: string;
  reportedBy: TradeUser | null;
  trade: {
    id: string;
    currency: string;
    total: number;
    status: string;
  } | null;
}

interface TopTrader {
  id: string;
  name: string;
  avatar?: string;
  tradeCount: number;
  volumeByCurrency: CurrencyAmount[];
  /** Null unless this trader dealt in exactly one currency. */
  totalVolume: number | null;
  totalVolumeCurrency: string | null;
}

interface TradeTimelineItem {
  date: string;
  trades: number;
  volume: number | null;
  volumeByCurrency: CurrencyAmount[];
  revenue: number | null;
  revenueByCurrency: CurrencyAmount[];
}

interface CurrencyDistItem {
  currency: string;
  count: number;
}

/**
 * The offer book by currency — a CAPPED ranking that declares its cap.
 *
 * Was a bare `CurrencyDistItem[]`, silently cut to the ten largest. A list with
 * no total cannot be drawn as a share of anything: the panel's bars were scaled
 * to the largest row that happened to arrive, so every currency shown reported
 * a bigger slice of the book than it holds, and the tail did not exist. `total`
 * is every active offer, `currencies` is how many distinct codes there are, and
 * `other` is the count sitting below the cut.
 */
interface CurrencyDist {
  rows: CurrencyDistItem[];
  limit: number;
  currencies: number;
  total: number;
  other: number;
}

/**
 * Disputes RAISED over trades OPENED, both across the same rolling window.
 *
 * `percent` is null — not 0 — when no trade opened in the window, because 0%
 * asserts the desk ran clean and "nothing traded" is not that assertion.
 *
 * The endpoint used to compute this as the CURRENT count of unresolved disputes
 * over the ALL-TIME count of completed trades, which is a stock over a flow: a
 * desk that ruled on every dispute the day it arrived read 0.0% forever. It was
 * never sent to the browser at all — it existed only as an input to the health
 * grade whose removal is recorded at the bottom of this interface.
 */
interface DisputeRate {
  windowDays: number;
  disputesRaised: number;
  tradesOpened: number;
  percent: number | null;
}

interface OfferStatusDistItem {
  status: string;
  count: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon?: string;
  popularityRank: number;
}

interface AdminDashboardStats {
  /** Server clock at the moment the figures were read. */
  generatedAt: string;

  // Offers
  totalOffers: number;
  offerGrowth: string | null;
  activeOffers: number;
  pendingOffers: number;
  flaggedOffers: number;

  // Trades
  activeTrades: number;
  tradeGrowth: string | null;
  /** The two jobs `activeTrades` runs together, plus the disputed rows it omits. */
  tradeStates: {
    pendingPayment: number;
    awaitingRelease: number;
    disputed: number;
  };

  // Disputes
  openDisputes: number;
  disputeChange: string | null;

  // Money
  platformRevenue: string;
  platformRevenueByCurrency: CurrencyAmount[];
  revenueGrowth: string | null;

  completedTrades: number;
  totalVolume: number | null;
  totalVolumeCurrency: string | null;
  totalVolumeByCurrency: CurrencyAmount[];
  weekVolume: number | null;
  weekVolumeCurrency: string | null;
  weekVolumeByCurrency: CurrencyAmount[];
  avgTradeValue: number | null;
  avgTradeValueCurrency: string | null;
  avgTradeValueByCurrency: CurrencyAmount[];
  /** True when the flat scalars above are null on purpose. */
  multiCurrency: boolean;

  /** Funds frozen in live trades right now. */
  escrow: {
    trades: number;
    total: number | null;
    totalCurrency: string | null;
    byCurrency: CurrencyAmount[];
    disputedByCurrency: CurrencyAmount[];
  };

  // Distributions
  offerTypeDist: { buy: number; sell: number };
  offerStatusDist: OfferStatusDistItem[];
  /** `rows` is the top 10 by active-offer count; the rest of the object is
   *  what that cap left out. Never present `rows` as the whole book. */
  currencyDist: CurrencyDist;

  paymentMethods: PaymentMethod[];

  /** The open queue, aged against the shared 24h `dispute` SLA. */
  disputeStats: {
    open: number;
    resolved: number;
    highPriority: number;
    budgetHours: number;
    due: number;
    breached: number;
    oldestOpenAt: string | null;
  };

  /** The offer review queue, aged against the shared 72h `approval` SLA. */
  offerReview: {
    pending: number;
    flagged: number;
    budgetHours: number;
    breached: number;
    oldestPendingAt: string | null;
  };

  /** How often a trade goes wrong, over one window, both populations sent. */
  disputeRate: DisputeRate;

  topTraders: TopTrader[];
  tradeTimeline: TradeTimelineItem[];
  recentTrades: RecentTrade[];
  disputeQueue: QueuedDispute[];

  /*
   * `systemHealth` / `healthScore` USED TO BE DECLARED HERE, optional and
   * deliberately never rendered: a composite of four heuristics with hardcoded
   * thresholds that no operator acts on. The endpoint has now stopped computing
   * them, so the fields are gone rather than optional — an optional field that
   * the server will never send again is a claim that it might. Its four INPUTS
   * are on the page instead — open disputes, breached disputes, offers awaiting
   * approval and flagged offers — where each one links to the rows it counts.
   */
}

interface PlatformActivity {
  date: string;
  trades: number;
  volume: number;
  revenue: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  status: string;
  priority?: "high" | "medium" | "low";
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string;
    initials?: string;
  };
}

/** The query the activity log issues. Every field is a real server filter. */
export interface AdminActivityQuery {
  page?: number;
  limit?: number;
  /** Derived category: trade | dispute | payment | user | system. */
  category?: string;
  /** Derived priority: high | medium | low. */
  severity?: string;
  /** Substring over action type, recorded details and related entity id. */
  search?: string;
}

interface AdminDashboardStore {
  stats: AdminDashboardStats | null;
  isLoadingStats: boolean;
  isRefreshingStats: boolean;
  statsError: string | null;
  fetchStats: (background?: boolean) => Promise<void>;
  platformActivity: PlatformActivity[];
  isLoadingActivity: boolean;
  activityError: string | null;
  fetchPlatformActivity: () => Promise<void>;
  recentActivity: RecentActivity[];
  isLoadingRecentActivity: boolean;
  recentActivityError: string | null;
  fetchRecentActivity: () => Promise<void>;
  allActivity: RecentActivity[];
  isLoadingAllActivity: boolean;
  allActivityError: string | null;
  /**
   * What the SERVER matched, not what arrived.
   *
   * The activity page used to fetch page one and then filter and search those
   * twenty rows in the browser, so "3 results" meant "3 of the most recent 20"
   * and a search for anything older returned nothing, silently. The filters are
   * query parameters now and this is the count they matched.
   */
  allActivityPage: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  fetchAllActivity: (query?: AdminActivityQuery) => Promise<void>;
}

export const useAdminDashboardStore = create<AdminDashboardStore>((set) => ({
  // Stats
  stats: null,
  isLoadingStats: false,
  isRefreshingStats: false,
  statsError: null,
  /**
   * `background` separates a POLL from a first load.
   *
   * Without it every 60-second refresh set `isLoadingStats`, so the whole
   * console dissolved into skeletons on a page the operator was reading. A
   * background poll only raises `isRefreshingStats`, which drives the liveness
   * dot in the masthead and nothing else.
   */
  fetchStats: async (background = false) => {
    set(
      background
        ? { isRefreshingStats: true }
        : { isLoadingStats: true, statsError: null }
    );

    const { data, error } = await $fetch({
      url: "/api/admin/p2p/dashboard/stats",
      silent: true,
    });

    if (error) {
      /* A failed poll must not throw away a dashboard that is still on screen
         and still true as of its own `generatedAt`. Only the error is set;
         `stats` is left exactly where it was. */
      set({
        statsError:
          typeof error === "string"
            ? error
            : "Failed to load dashboard stats. Please try again.",
        isLoadingStats: false,
        isRefreshingStats: false,
      });
      return;
    }

    set({
      stats: (data as AdminDashboardStats) || null,
      statsError: null,
      isLoadingStats: false,
      isRefreshingStats: false,
    });
  },

  // Platform Activity
  platformActivity: [],
  isLoadingActivity: false,
  activityError: null,
  fetchPlatformActivity: async () => {
    set({ isLoadingActivity: true, activityError: null });

    const { data, error } = await $fetch({
      url: "/api/admin/p2p/dashboard/activity",
      silentSuccess: true,
    });

    if (error) {
      console.error("Error fetching platform activity:", error);
      set({ activityError: error, isLoadingActivity: false });
      return;
    }

    set({
      platformActivity: Array.isArray(data) ? data : [],
      isLoadingActivity: false,
    });
  },

  // Recent Activity
  recentActivity: [],
  isLoadingRecentActivity: false,
  recentActivityError: null,
  fetchRecentActivity: async () => {
    set({ isLoadingRecentActivity: true, recentActivityError: null });

    const { data, error } = await $fetch({
      url: "/api/admin/p2p/dashboard/activity/recent",
      silentSuccess: true,
    });

    if (error) {
      console.error("Error fetching recent activity:", error);
      set({ recentActivityError: error, isLoadingRecentActivity: false });
      return;
    }

    set({
      recentActivity: Array.isArray(data) ? data : [],
      isLoadingRecentActivity: false,
    });
  },

  // All Activity
  allActivity: [],
  isLoadingAllActivity: false,
  allActivityError: null,
  allActivityPage: { page: 1, limit: 20, totalCount: 0, totalPages: 1 },
  fetchAllActivity: async (query = {}) => {
    set({ isLoadingAllActivity: true, allActivityError: null });

    const params: Record<string, string> = {
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 20),
    };
    /* Only send a filter that is actually set: `category=all` and an empty
       search are the absence of a filter, and passing them makes every request
       look filtered to anything reading the wire. */
    if (query.category && query.category !== "all") params.category = query.category;
    if (query.severity && query.severity !== "all") params.severity = query.severity;
    if (query.search?.trim()) params.search = query.search.trim();

    const { data, error } = await $fetch({
      url: "/api/admin/p2p/dashboard/activity/all",
      params,
      silentSuccess: true,
      /* `admin/p2p/activity/client.tsx` renders `allActivityError` in a
         destructive Alert with a retry, in place of the list. The two
         siblings above are left non-silent on purpose: nothing renders
         `platformActivityError` or `recentActivityError`, so for those the
         toast is the only report there is. */
      silent: true,
    });

    if (error) {
      console.error("Error fetching all activity:", error);
      set({ allActivityError: error, isLoadingAllActivity: false });
      return;
    }

    // The route answers { activities, pagination } — the pagination half was
    // being dropped, which is what made the page unable to reach anything past
    // the first twenty rows.
    set({
      allActivity: Array.isArray(data?.activities) ? data.activities : [],
      allActivityPage: {
        page: Number(data?.pagination?.page) || 1,
        limit: Number(data?.pagination?.limit) || 20,
        totalCount: Number(data?.pagination?.totalCount) || 0,
        totalPages: Number(data?.pagination?.totalPages) || 1,
      },
      isLoadingAllActivity: false,
    });
  },
}));
