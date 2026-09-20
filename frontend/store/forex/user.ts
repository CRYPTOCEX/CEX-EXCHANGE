import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useUserStore } from "@/store/user";

/**
 * Coerce whatever an endpoint returned into a list.
 *
 * The paginated endpoints answer `{items, pagination}` — see `getFiltered` in
 * the backend's query utils — and the flat ones answer a bare array. The
 * investment list read `data.data`, a key nothing returns, so a user with five
 * investments got an empty array and every dashboard figure derived from it
 * showed zero.
 */
function asList<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.items)) return data.items as T[];
  if (Array.isArray(data.data)) return data.data as T[];
  return Object.values(data) as T[];
}

interface ForexState {
  // Data arrays
  plans: (forexPlanAttributes & {
    totalInvestors: number;
    invested: number;
    durations: forexDurationAttributes[];
  })[];
  durations: forexDurationAttributes[];
  investments: forexInvestmentAttributes[];
  accounts: forexAccountAttributes[];
  signals: forexSignalAttributes[];

  // Flags to track if data has been fetched
  hasFetchedPlans: boolean;
  hasFetchedInvestments: boolean;
  hasFetchedAccounts: boolean;

  // Dashboard Data (fetched via new endpoint)
  //
  // This mirrors /api/forex/overview exactly. It had drifted: the endpoint
  // prices every plan's own currency into USD and declares what it could NOT
  // price, and none of that reached this type — so a consumer had no way to
  // learn that a total was a lower bound, and TypeScript would not have told it.
  dashboardData: {
    overview: {
      // USD. The backend converts each plan currency at its own rate before it
      // adds anything, so these are the only figures on the page that may be
      // rendered with a "$".
      totalInvested: number;
      totalProfit: number;
      // Null, not 0, when nothing is invested: a return with no denominator has
      // no percentage, and 0 is the different claim "flat".
      profitPercentage: number | null;
      activeInvestments: number;
      completedInvestments: number;
      // Non-empty means every USD figure above is a LOWER BOUND — these
      // currencies had no usable rate and their amounts were left out rather
      // than folded in as zero. The UI has to be able to say so.
      unpricedCurrencies: string[];
    };
    // `value` is USD per bucket of the requested timeframe.
    chartData: { name: string; value: number }[];
    // Only plans this user actually holds a non-rejected investment in.
    // `amount` is in `currency`, the plan's own unit; `value` is the same
    // figure in USD and is 0 when `unpriced`. `percentage` is null when there
    // is no denominator to take a share against.
    planDistribution: {
      name: string;
      currency: string;
      amount: number;
      value: number;
      unpriced: boolean;
      percentage: number | null;
    }[];
    // At most 5 rows, and a sample rather than a population — nothing here may
    // be totalled or ranked. `amount` is in `currency`, which is null when the
    // plan row is gone; do not print a currency symbol on it then.
    recentInvestments: {
      id: string;
      plan: string;
      amount: number;
      currency: string | null;
      createdAt: string;
      status: string;
    }[];
  } | null;

  // UI State
  selectedPlan: forexPlanAttributes | null;
  selectedDuration: forexDurationAttributes | null;
  investmentAmount: number;

  // Global loading state
  isLoading: boolean;

  /**
   * The last fetch failure, or null.
   *
   * `$fetch` never throws — it always resolves `{data, error}` — so a fetcher
   * that only looks at `data` treats an outage as "no records". Every list here
   * used to do exactly that: a failing /api/forex/account left `accounts` at []
   * and the pages that gate on `accounts.length > 0` never cleared their
   * loading state, so a backend error rendered as a spinner that span forever.
   */
  error: string | null;

  // Actions
  selectPlan: (planId: string) => void;
  selectDuration: (durationId: string) => void;
  setInvestmentAmount: (amount: number) => void;
  createInvestment: () => Promise<forexInvestmentAttributes>;
  fetchPlans: () => Promise<void>;
  fetchDurations: () => Promise<void>;
  fetchInvestments: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchSignals: () => Promise<void>;
  fetchDashboardData: (timeframe?: string) => Promise<void>;

  // Getters
  getPlanDurations: (planId: string) => Promise<forexDurationAttributes[]>;
  getAccountSignals: (accountId: string) => Promise<forexSignalAttributes[]>;
}

export const useForexStore = create<ForexState>((set, get) => ({
  // Initial state
  plans: [],
  durations: [],
  investments: [],
  accounts: [],
  signals: [],

  hasFetchedPlans: false,
  hasFetchedInvestments: false,
  hasFetchedAccounts: false,

  dashboardData: null,

  selectedPlan: null,
  selectedDuration: null,
  investmentAmount: 0,

  isLoading: false,
  error: null,

  // Actions
  selectPlan: (planId) => {
    const plan = get().plans.find((p) => p.id === planId) || null;
    set({
      selectedPlan: plan,
      selectedDuration: null, // Reset duration when plan changes
      investmentAmount: plan?.minAmount || 0,
    });
  },

  selectDuration: (durationId) => {
    let duration = get().durations.find((d) => d.id === durationId) || null;
    if (!duration) {
      const selectedPlan = get().selectedPlan as any;
      if (selectedPlan?.durations) {
        duration = selectedPlan.durations.find((d: any) => d.id === durationId) || null;
      }
    }
    if (!duration) {
      for (const plan of get().plans) {
        const found = plan.durations?.find((d) => d.id === durationId);
        if (found) {
          duration = found;
          break;
        }
      }
    }
    set({ selectedDuration: duration });
  },

  setInvestmentAmount: (amount) => {
    set({ investmentAmount: amount });
  },

  fetchPlans: async () => {
    const { hasFetchedPlans } = get();
    if (hasFetchedPlans) return;

    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/forex/plan",
      silentSuccess: true,
    });
    if (error) {
      set({ isLoading: false, error });
      return;
    }
    set({ plans: asList(data), hasFetchedPlans: true, isLoading: false });
  },

  fetchDurations: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/forex/duration",
      silentSuccess: true,
    });
    if (error) {
      set({ isLoading: false, error });
      return;
    }
    set({ durations: asList(data), isLoading: false });
  },

  fetchInvestments: async () => {
    const { hasFetchedInvestments } = get();
    if (hasFetchedInvestments) return;

    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/forex/investment",
      silentSuccess: true,
    });
    if (error) {
      set({ isLoading: false, error });
      return;
    }
    set({
      investments: asList(data),
      hasFetchedInvestments: true,
      isLoading: false,
    });
  },

  fetchAccounts: async () => {
    const { hasFetchedAccounts } = get();
    if (hasFetchedAccounts) return;

    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/forex/account",
      silentSuccess: true,
    });
    if (error) {
      // Surfacing this matters more here than anywhere else: the deposit,
      // withdraw and trade pages only leave their loading state once
      // `accounts` is non-empty, so swallowing the failure left them
      // spinning with no error and no retry.
      set({ isLoading: false, error });
      return;
    }
    set({
      accounts: asList(data),
      hasFetchedAccounts: true,
      isLoading: false,
    });
  },

  fetchSignals: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/forex/signal",
      silentSuccess: true,
    });
    if (error) {
      set({ isLoading: false, error });
      return;
    }
    set({ signals: asList(data), isLoading: false });
  },

  fetchDashboardData: async (timeframe = "1y") => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/forex/overview",
      params: { timeframe },
      silentSuccess: true,
    });
    if (error) {
      set({ isLoading: false, error });
      return;
    }
    set({ dashboardData: data, isLoading: false });
  },

  createInvestment: async () => {
    const currentUser = useUserStore.getState().user;
    const { selectedPlan, selectedDuration, investmentAmount } = get();
    if (!currentUser || !selectedPlan || !selectedDuration) {
      throw new Error("Missing required information for investment");
    }
    set({ isLoading: true });
    const { data, error } = await $fetch({
      url: "/api/forex/investment",
      method: "POST",
      body: {
        planId: selectedPlan.id,
        durationId: selectedDuration.id,
        amount: investmentAmount,
        acceptTerms: true,
      },
      successMessage: "Investment created successfully!",
    });
    set({
      isLoading: false,
      selectedPlan: null,
      selectedDuration: null,
      investmentAmount: 0,
      hasFetchedInvestments: false, // Reset flag to refetch
    });
    if (error || !data) {
      throw new Error(error || "Failed to create investment");
    }
    await get().fetchInvestments();
    return data;
  },

  getPlanDurations: async (planId) => {
    const { data, error } = await $fetch({
      url: `/api/forex/plan/${planId}/duration`,
      silentSuccess: true,
    });
    if (error) return [];
    return asList(data);
  },

  getAccountSignals: async (accountId) => {
    const { data, error } = await $fetch({
      url: `/api/forex/account/${accountId}/signal`,
      silentSuccess: true,
    });
    if (error) return [];
    return asList(data);
  },
}));
