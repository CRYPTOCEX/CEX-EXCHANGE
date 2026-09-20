"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface PortfolioInvestment {
  offeringId: string;
  offeringName: string;
  offeringSymbol: string;
  offeringIcon: string;
  tokensHeld: number;
  tokensVesting: number;
  purchasePrice: number;
  currentPrice?: number;
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  vestingProgress: number;
}

export interface Investment {
  id: string;
  offerId: string;
  offerName: string;
  offerIcon?: string;
  tokenSymbol: string;
  amount: number;
  price: number;
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  status: string;
  createdAt: string;
}

export interface PortfolioOverview {
  pendingInvested: number;
  pendingVerificationInvested: number;
  receivedInvested: number;
  rejectedInvested: number;

  totalInvested: number;
  totalTokens: number;
  /**
   * The symbol `totalTokens` is a quantity OF, or null when the holdings span
   * more than one offering. A token count is not additive across offerings —
   * 1,000 AAA plus 5,000 BBB is not "6,000" of anything.
   */
  totalTokensSymbol: string | null;
  /**
   * Offering currencies excluded from the USD figures because the platform has
   * no price for them. Non-empty means every total above is a LOWER BOUND, and
   * a screen that does not say so is publishing a short number as a complete
   * one.
   */
  unpricedCurrencies: string[];
  /** How many distinct token symbols the released holdings span. */
  distinctTokens: number;
  currentValue: number;
  totalProfitLoss: number;
  profitLossPercentage: number;
  investments: PortfolioInvestment[];
}

interface PortfolioStoreState {
  portfolio: PortfolioOverview;
  investments: Investment[];
  isLoading: boolean;
  isLoadingInvestments: boolean;
  error: string | null;
  fetchPortfolio: () => Promise<void>;
  fetchInvestments: (opts?: {
    limit?: number;
    status?: string;
  }) => Promise<void>;
}

const toNum = (v: string | number | undefined | null) =>
  typeof v === "number" ? v : parseFloat(v as string) || 0;

export const usePortfolioStore = create<PortfolioStoreState>((set, get) => ({
  portfolio: {
    pendingInvested: 0,
    pendingVerificationInvested: 0,
    receivedInvested: 0,
    rejectedInvested: 0,
    totalInvested: 0,
    totalTokens: 0,
    totalTokensSymbol: null,
    unpricedCurrencies: [],
    distinctTokens: 0,
    currentValue: 0,
    totalProfitLoss: 0,
    profitLossPercentage: 0,
    investments: [],
  },
  investments: [],
  isLoading: false,
  isLoadingInvestments: false,
  error: null,
  fetchPortfolio: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<{
      totalInvested: string | number;
      pendingInvested?: string | number;
      pendingVerificationInvested?: string | number;
      receivedInvested?: string | number;
      rejectedInvested?: string | number;
      currentValue: string | number;
      /**
       * Offering currencies the platform could not price into USD. The route
       * documents every figure it returns as "a lower bound whenever this is
       * non-empty" (`ico/portfolio/index.get.ts:30-35,158-167`) — and this
       * store neither declared the field nor read it, so a portfolio holding an
       * unpriced offering showed a SHORT total as though it were complete.
       */
      unpricedCurrencies?: string[];
    }>({
      url: "/api/ico/portfolio",
      silent: true,
    });
    if (data && !error) {
      const totalInvested = toNum(data.totalInvested);
      const currentValue = toNum(data.currentValue);
      /*
        ───────────────────────────────────────────────────────────────────────
        P&L IS MEASURED AGAINST THE RELEASED CAPITAL, NOT AGAINST EVERYTHING
        CONTRIBUTED.

        `ico/portfolio/index.get.ts:104-131` puts PENDING, VERIFICATION and
        RELEASED contributions into `totalInvested`, and only RELEASED ones into
        `currentValue` — the pending branches have no `currentValue` leg at all,
        because tokens that have not been released have no market value yet.

        Subtracting one from the other therefore counted every un-released
        contribution as a total loss. A holder with $1,000 released at par plus
        a $500 contribution awaiting release read **"Total Profit/Loss $500.00"**
        with a red down-arrow and **-33.33%**, on a portfolio that had lost
        nothing.

        `receivedInvested` is the RELEASED cost basis and the endpoint already
        returns it — this store even DECLARES it in the response type above and
        never read it. Falling back to `totalInvested` keeps an older backend
        working, where the two are equal whenever nothing is pending.
        ───────────────────────────────────────────────────────────────────────
      */
      const releasedInvested =
        data.receivedInvested !== undefined
          ? toNum(data.receivedInvested)
          : totalInvested;
      const totalProfitLoss = currentValue - releasedInvested;
      const profitLossPercentage =
        releasedInvested > 0 ? (totalProfitLoss / releasedInvested) * 100 : 0;

      // Derive totalTokens from already-loaded investments list (sum of
      // amount across RELEASED rows). If investments haven't been fetched
      // yet, this will be 0 and the subsequent fetchInvestments() call
      // will backfill it.
      const released = get().investments.filter((i) => i.status === "RELEASED");
      const totalTokens = released.reduce((sum, i) => sum + (i.amount || 0), 0);
      const releasedSymbols = new Set(
        released.map((i) => String(i.tokenSymbol ?? "").toUpperCase()).filter(Boolean)
      );

      const portfolio: PortfolioOverview = {
        pendingInvested: toNum(data.pendingInvested),
        pendingVerificationInvested: toNum(data.pendingVerificationInvested),
        receivedInvested: toNum(data.receivedInvested),
        rejectedInvested: toNum(data.rejectedInvested),

        totalInvested,
        totalTokens,
        totalTokensSymbol: releasedSymbols.size === 1 ? [...releasedSymbols][0] : null,
        unpricedCurrencies: Array.isArray(data.unpricedCurrencies)
          ? data.unpricedCurrencies
          : [],
        distinctTokens: releasedSymbols.size,
        currentValue,
        totalProfitLoss,
        profitLossPercentage,
        investments: [],
      };
      set({ portfolio, isLoading: false, error: null });
    } else {
      set({
        isLoading: false,
        error: error || "An error occurred while fetching portfolio data",
      });
    }

    // Kick off investments fetch alongside the summary so the dashboard
    // can render per-investment rows without a separate mount effect.
    get().fetchInvestments({ limit: 50 });
  },
  fetchInvestments: async (opts) => {
    set({ isLoadingInvestments: true });
    const params: Record<string, string | number> = {
      limit: opts?.limit ?? 50,
    };
    if (opts?.status) params.status = opts.status;

    const { data, error } = await $fetch<{
      items: Array<{
        id: string;
        offerId: string;
        offerName: string;
        offerIcon?: string;
        tokenSymbol: string;
        amount: string | number;
        price: string | number;
        totalInvested: string | number;
        currentValue: string | number;
        profitLoss: string | number;
        profitLossPercentage: string | number;
        status: string;
        createdAt: string;
      }>;
      total: number;
    }>({
      url: "/api/ico/portfolio/investments",
      params,
      silent: true,
    });

    if (data && !error) {
      const investments: Investment[] = (data.items || []).map((r) => ({
        id: r.id,
        offerId: r.offerId,
        offerName: r.offerName,
        offerIcon: r.offerIcon,
        tokenSymbol: r.tokenSymbol,
        amount: toNum(r.amount),
        price: toNum(r.price),
        totalInvested: toNum(r.totalInvested),
        currentValue: toNum(r.currentValue),
        profitLoss: toNum(r.profitLoss),
        profitLossPercentage: toNum(r.profitLossPercentage),
        status: r.status,
        createdAt: r.createdAt,
      }));

      /*
        A TOKEN COUNT IS NOT ADDITIVE ACROSS OFFERINGS. `i.amount` is a quantity
        of one offering's token (`ico/portfolio/investments.get.ts:163`), so
        1,000 AAA plus 5,000 BBB rendered "6,000" — of nothing.

        The list is also fetched with `limit: 50`, so an investor with more than
        fifty transactions had a PARTIAL figure presented as a total. Carrying
        the symbol set means the card can say how many offerings it spans
        instead of adding them up.
      */
      const releasedRows = investments.filter((i) => i.status === "RELEASED");
      const totalTokens = releasedRows.reduce((sum, i) => sum + (i.amount || 0), 0);
      const symbols = new Set(
        releasedRows.map((i) => String(i.tokenSymbol ?? "").toUpperCase()).filter(Boolean)
      );

      set((state) => ({
        investments,
        portfolio: {
          ...state.portfolio,
          totalTokens,
          totalTokensSymbol: symbols.size === 1 ? [...symbols][0] : null,
          distinctTokens: symbols.size,
        },
        isLoadingInvestments: false,
      }));
    } else {
      set({ isLoadingInvestments: false });
    }
  },
}));
