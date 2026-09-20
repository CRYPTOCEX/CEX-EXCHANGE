import { create } from "zustand";
import { $fetch } from "@/lib/api";

/**
 * The investment store.
 *
 * WHAT WAS WRONG WITH THE ONE THIS REPLACES
 * -----------------------------------------
 * Five defects, four of which were visible to users:
 *
 *   1. AN INFINITE REFETCH LOOP. Both plan surfaces ran
 *      `useEffect(() => { if (!hasFetchedPlans && !plansLoading) fetchPlans() },
 *      [hasFetchedPlans, plansLoading])`. `hasFetchedPlans` was only ever set on
 *      SUCCESS, so a failing request flipped `plansLoading` false → true → false,
 *      re-ran the effect, and issued the next request immediately — forever, at
 *      whatever rate the server could reject them, with a toast per attempt.
 *      `plansAttempted` below is set in `finally`, so a failure settles.
 *
 *   2. NO ERROR STATE ON ANY READ. All three read actions discarded `error`
 *      entirely, so a failed load was indistinguishable from an empty result and
 *      every screen said "you have no investments" to people who had some. The
 *      collections start as `null` and only become an array on a SUCCESSFUL
 *      response; `[]` therefore means the server said "none", never "we could
 *      not ask".
 *
 *   3. A CROSS-USER LEAK. This is a module singleton with no reset, so signing
 *      out and back in as somebody else showed the previous account's
 *      investments until the first fetch resolved. `reset()` exists now and the
 *      portfolio calls it when the signed-in id changes.
 *
 *   4. A "Loading..." TOAST ON EVERY READ. `$fetch` fires `toast.loading` unless
 *      `silent` is passed; the store passed only `silentSuccess`, which governs
 *      the SUCCESS toast. The landing page raised two of them on arrival and an
 *      error toast on every failure of a background read. Reads are `silent`
 *      now and report through state; only the two WRITE actions toast, because
 *      a write is something the user just asked for.
 *
 *   5. DEAD CODE. Every action wrapped `$fetch` in try/catch, and `$fetch`
 *      resolves `{data, error}` and never throws — so no catch block here was
 *      ever reachable. `activeInvestment` was declared, typed and initialised
 *      and never written by anything.
 */

/** Platform-wide figures from `/api/finance/investment/stats`. */
interface InvestmentStats {
  activeInvestors: number;
  totalInvested: number;
  averageReturn: number;
  totalPlans: number;
  maxProfitPercentage: number;
}

interface InvestmentState {
  /* --- plans (public) --- */
  plans: investmentPlanAttributes[] | null;
  plansLoading: boolean;
  plansError: string | null;
  /** A request has completed, successfully or not. Guards the fetch effects. */
  plansAttempted: boolean;
  plansFetchedAt: number;

  /* --- one plan, by id --- */
  plan: investmentPlanAttributes | null;
  planLoading: boolean;
  planError: string | null;
  /** Which id `plan` holds, so a second plan page does not read the first's. */
  planId: string | null;

  /* --- the viewer's own investments --- */
  investments: investmentAttributes[] | null;
  investmentsLoading: boolean;
  investmentsError: string | null;
  investmentsAttempted: boolean;
  /** The account these rows belong to. See `reset`. */
  ownerId: string | null;

  /* --- writes --- */
  isInvesting: boolean;
  investmentError: string | null;
  cancellingId: string | null;
  cancelError: string | null;

  /* --- platform stats (public) --- */
  stats: InvestmentStats | null;
  statsLoading: boolean;
  statsFetchedAt: number;

  fetchPlans: (options?: { force?: boolean }) => Promise<void>;
  fetchPlan: (id: string) => Promise<void>;
  fetchUserInvestments: (userId?: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  createInvestment: (
    planId: string,
    durationId: string,
    amount: number
  ) => Promise<boolean>;
  cancelInvestment: (id: string) => Promise<boolean>;

  clearError: () => void;
  reset: () => void;
}

/**
 * How long a successful plan/stats read stays fresh.
 *
 * Plans are operator-managed catalogue data that changes a few times a year;
 * 30 seconds was short enough that walking landing → plans → a plan page issued
 * three requests for the same unchanged list.
 */
const CACHE_MS = 5 * 60 * 1000;

const EMPTY = {
  plans: null,
  plansLoading: false,
  plansError: null,
  plansAttempted: false,
  plansFetchedAt: 0,

  plan: null,
  planLoading: false,
  planError: null,
  planId: null,

  investments: null,
  investmentsLoading: false,
  investmentsError: null,
  investmentsAttempted: false,
  ownerId: null,

  isInvesting: false,
  investmentError: null,
  cancellingId: null,
  cancelError: null,

  stats: null,
  statsLoading: false,
  statsFetchedAt: 0,
} as const;

export const useInvestmentStore = create<InvestmentState>((set, get) => ({
  ...EMPTY,

  fetchPlans: async ({ force = false } = {}) => {
    const state = get();
    if (state.plansLoading) return;
    if (
      !force &&
      state.plans !== null &&
      Date.now() - state.plansFetchedAt < CACHE_MS
    ) {
      return;
    }

    set({ plansLoading: true, plansError: null });

    const { data, error } = await $fetch<investmentPlanAttributes[]>({
      url: "/api/finance/investment/plan",
      silent: true,
    });

    if (error) {
      // The previous list, if there is one, stays on screen — a failed REFRESH
      // is not a reason to blank a catalogue that was correct a moment ago. The
      // screens render this alongside it as a staleness warning.
      set({
        plansError: error,
        plansLoading: false,
        plansAttempted: true,
      });
      return;
    }

    set({
      plans: Array.isArray(data) ? data : [],
      plansFetchedAt: Date.now(),
      plansLoading: false,
      plansAttempted: true,
    });
  },

  /**
   * One plan, from the endpoint that serves one plan.
   *
   * The plan page used to find its plan by scanning the cached LIST, which the
   * list endpoint filters to `status: true`. A plan an operator had just
   * deactivated — or any plan reached by a direct link before the list had
   * loaded — was therefore "not found", and the page said so. `/plan/:id` has
   * no status filter and answers about the plan that was actually asked for.
   */
  fetchPlan: async (id: string) => {
    if (!id) return;
    const state = get();
    if (state.planLoading && state.planId === id) return;

    // A cached list entry is a real answer and avoids a round trip on the
    // browse → detail path, which is how most people arrive.
    const cached = state.plans?.find((plan) => plan.id === id) ?? null;
    if (cached) {
      set({ plan: cached, planId: id, planError: null, planLoading: false });
      return;
    }

    set({ planLoading: true, planError: null, planId: id, plan: null });

    const { data, error } = await $fetch<investmentPlanAttributes>({
      url: `/api/finance/investment/plan/${id}`,
      silent: true,
    });

    // A second navigation may have started while this was in flight; that
    // request owns the slot now and this response is stale.
    if (get().planId !== id) return;

    if (error) {
      set({ planError: error, planLoading: false });
      return;
    }

    set({ plan: data ?? null, planLoading: false });
  },

  fetchUserInvestments: async (userId?: string) => {
    if (get().investmentsLoading) return;

    set({ investmentsLoading: true, investmentsError: null });

    /*
      `type` is REQUIRED — without it this endpoint answers 400 "Invalid
      investment type" — and `page` is what selects the paginated all-status
      branch. Omitting `page` takes a different branch that returns ACTIVE rows
      only AND throws 404 when there are none, which a portfolio must not treat
      as an error.
    */
    const { data, error } = await $fetch<any>({
      url: "/api/finance/investment?type=general&page=1&perPage=100",
      silent: true,
    });

    if (error) {
      set({
        investmentsError: error,
        investmentsLoading: false,
        investmentsAttempted: true,
      });
      return;
    }

    // `getFiltered` answers `{items, pagination}`; the older shapes are kept
    // because this endpoint has served all three and an install mid-upgrade
    // should not blank somebody's portfolio.
    const rows = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
          ? data.data
          : [];

    set({
      investments: rows,
      ownerId: userId ?? get().ownerId,
      investmentsLoading: false,
      investmentsAttempted: true,
    });
  },

  fetchStats: async () => {
    const state = get();
    if (state.statsLoading) return;
    if (state.stats && Date.now() - state.statsFetchedAt < CACHE_MS) return;

    set({ statsLoading: true });

    const { data, error } = await $fetch<InvestmentStats>({
      url: "/api/finance/investment/stats",
      silent: true,
    });

    // Stats are decoration on a marketing page: every consumer already omits a
    // figure it does not have, so a failure needs no error state — it needs the
    // figures to stay absent, which they do.
    set({
      stats: error ? state.stats : (data ?? null),
      statsFetchedAt: error ? state.statsFetchedAt : Date.now(),
      statsLoading: false,
    });
  },

  /**
   * @returns whether the investment was created, so the caller can navigate.
   *
   * The old action returned void and the form did nothing on success: it did
   * not reset, navigate, or acknowledge — the button simply re-enabled with the
   * same amount still typed in, which reads as "that did not work" on the one
   * action in the product that moves money.
   */
  createInvestment: async (planId, durationId, amount) => {
    set({ isInvesting: true, investmentError: null });

    const { error } = await $fetch({
      url: "/api/finance/investment",
      method: "POST",
      body: { type: "general", planId, durationId, amount },
      // This one DOES toast: the user pressed a button and is owed an answer
      // even if they have already navigated away from the panel showing it.
      successMessage: "Investment opened",
    });

    if (error) {
      set({ investmentError: error, isInvesting: false });
      return false;
    }

    set({ isInvesting: false });
    await get().fetchUserInvestments();
    return true;
  },

  /**
   * Cancel a running investment; the backend refunds the principal.
   *
   * `DELETE /api/finance/investment/:id` has been implemented, transactional and
   * audited since before this rewrite and had ZERO callers anywhere in the
   * frontend — there was no way for anyone to exit a position early.
   */
  cancelInvestment: async (id: string) => {
    if (!id) return false;
    set({ cancellingId: id, cancelError: null });

    const { error } = await $fetch({
      url: `/api/finance/investment/${id}`,
      method: "DELETE",
      params: { type: "general" },
    });

    if (error) {
      set({ cancelError: error, cancellingId: null });
      return false;
    }

    set({ cancellingId: null });
    await get().fetchUserInvestments();
    return true;
  },

  clearError: () =>
    set({ investmentError: null, cancelError: null }),

  /**
   * Drop everything account-scoped.
   *
   * A zustand store created at module scope outlives a sign-out: the previous
   * account's rows sat in `investments` until the next fetch resolved, so the
   * first paint after switching users showed somebody else's money. The plan
   * catalogue and the platform stats are public and identical for everyone, so
   * they are deliberately KEPT — clearing them would only re-fetch the same
   * bytes.
   */
  reset: () =>
    set({
      investments: null,
      investmentsLoading: false,
      investmentsError: null,
      investmentsAttempted: false,
      ownerId: null,
      isInvesting: false,
      investmentError: null,
      cancellingId: null,
      cancelError: null,
    }),
}));
