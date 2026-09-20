import { $fetch } from "@/lib/api";
import { useUserStore } from "@/store/user";

/**
 * Effective P2P two-factor policy, as reported by the backend. Computed
 * server-side on purpose: it is the intersection of several admin flags, and
 * re-deriving it here is how the two copies drift apart.
 */
export interface P2PTwoFactorPolicy {
  requireEnrollment: boolean;
  requireChallenge: boolean;
  acceptedTypes: string[];
  userType: string | null;
  userEnabled: boolean;
  /** Whether this user can answer the release challenge (true when it is off). */
  satisfied: boolean;
}

export interface TradeState {
  // Trade data
  tradeDashboardData: P2PTradeDashboardData | null;
  currentTrade: P2PTrade | null;
  tradeMessages: any[]; // Type this properly based on your message structure
  tradeOffers: any[]; // For storing trade offers

  // Loading states
  isLoadingTradeDashboardData: boolean;
  isLoadingTradeById: boolean;
  isLoadingTradeMessages: boolean;

  // Action loading states
  isConfirmingPayment: boolean;
  isReleasingFunds: boolean;
  isCancellingTrade: boolean;
  isDisputingTrade: boolean;
  isWithdrawingDispute: boolean;
  isAppealingDispute: boolean;
  isSubmittingEvidence: boolean;
  isSendingMessage: boolean;
  isSubmittingRating: boolean;

  // Error states
  tradeDashboardDataError: string | null;
  tradeByIdError: string | null;
  tradeMessagesError: string | null;
  tradeOffersError: string | null;

  // Action error states
  confirmPaymentError: string | null;
  releaseFundsError: string | null;
  cancelTradeError: string | null;
  disputeTradeError: string | null;
  withdrawDisputeError: string | null;
  appealDisputeError: string | null;
  submitEvidenceError: string | null;
  sendMessageError: string | null;
  submitRatingError: string | null;

  // ── Release 2FA (step-up verification)
  twoFactorPolicy: P2PTwoFactorPolicy | null;
  twoFactorPolicyLoading: boolean;
  /** True while the verification prompt is open, awaiting a code. */
  twoFactorPrompt: boolean;
  /** True once a code was actually delivered (EMAIL/SMS); APP has nothing to send. */
  twoFactorCodeSent: boolean;
  twoFactorSending: boolean;
  twoFactorVerifying: boolean;
  twoFactorError: string | null;
}

export interface ConfirmPaymentDetails {
  paymentReference?: string;
  notes?: string;
  receiptUrl?: string;
}

export interface TradeActions {
  fetchTradeDashboardData: () => Promise<void>;
  fetchTradeById: (id: string) => Promise<void>;
  fetchTradeMessages: (id: string) => Promise<void>;

  confirmPayment: (
    id: string,
    details?: ConfirmPaymentDetails
  ) => Promise<boolean>;
  releaseFunds: (id: string, twoFactorToken?: string) => Promise<boolean>;
  cancelTrade: (id: string, reason: string) => Promise<boolean>;
  disputeTrade: (
    id: string,
    reason: string,
    description: string
  ) => Promise<boolean>;
  withdrawDispute: (id: string, note?: string) => Promise<boolean>;
  /** The respondent contests a dispute filed against them. */
  appealDispute: (id: string, statement: string) => Promise<boolean>;
  /** A document, image or screen recording onto an open case. */
  submitDisputeEvidence: (
    id: string,
    file: { dataUrl: string; filename?: string; description?: string }
  ) => Promise<boolean>;
  sendMessage: (id: string, message: string) => Promise<boolean>;
  submitRating: (
    id: string,
    rating: number,
    feedback: string
  ) => Promise<boolean>;

  fetchTwoFactorPolicy: () => Promise<void>;
  /** Opens the verification prompt and delivers a code over the user's 2FA channel. */
  requestReleaseTwoFactorCode: () => Promise<void>;
  /** Verifies the entered code, then resumes the release with the resulting token. */
  confirmReleaseTwoFactor: (id: string, otp: string) => Promise<boolean>;
  cancelReleaseTwoFactor: () => void;

  clearTradeErrors: () => void;
}

// M18: Module-level request counters to discard stale responses
let fetchDashboardRequestCounter = 0;
let fetchTradeByIdRequestCounter = 0;

// `$fetch` always resolves `{ data, error }` and never throws, so wrapping it in
// try/catch is dead code. The only way a caller learns about an outage is by
// reading `error` — and on a P2P surface that matters: rendering an empty list
// when the request failed tells a user with funds in escrow that they have no
// trades. Always surface the server's own explanation when it sent one.
const errorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const message = (error as any).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

export const createTradeSlice = (
  set: any,
  get: any
): TradeState & TradeActions => ({
  // Initial state
  tradeDashboardData: null,
  currentTrade: null,
  tradeMessages: [],
  tradeOffers: [],

  // Loading states
  isLoadingTradeDashboardData: false,
  isLoadingTradeById: false,
  isLoadingTradeMessages: false,

  // Action loading states
  isConfirmingPayment: false,
  isReleasingFunds: false,
  isCancellingTrade: false,
  isDisputingTrade: false,
  isWithdrawingDispute: false,
  isAppealingDispute: false,
  isSubmittingEvidence: false,
  isSendingMessage: false,
  isSubmittingRating: false,

  // Error states
  tradeDashboardDataError: null,
  tradeByIdError: null,
  tradeMessagesError: null,
  tradeOffersError: null,

  // Action error states
  confirmPaymentError: null,
  releaseFundsError: null,
  cancelTradeError: null,
  disputeTradeError: null,
  withdrawDisputeError: null,
  appealDisputeError: null,
  submitEvidenceError: null,
  sendMessageError: null,
  submitRatingError: null,

  twoFactorPolicy: null,
  twoFactorPolicyLoading: false,
  twoFactorPrompt: false,
  twoFactorCodeSent: false,
  twoFactorSending: false,
  twoFactorVerifying: false,
  twoFactorError: null,

  // Actions
  fetchTradeDashboardData: async () => {
    const currentRequest = ++fetchDashboardRequestCounter;
    set({ isLoadingTradeDashboardData: true, tradeDashboardDataError: null });

    /*
      ONE REQUEST, NOT TWO.

      This fired `/api/p2p/trade` AND `/api/p2p/dashboard` on every load of the
      trades page — and on every refresh triggered by a payment window closing.
      The second one was pure redundancy: it was read only as a FALLBACK for
      `tradeStats`, `recentActivity` and `availableCurrencies`, and the trades
      endpoint returns all three itself, so the fallback branch was dead on any
      response that was not already an error.

      It was not a cheap redundancy. `/api/p2p/dashboard` runs six queries
      strictly SEQUENTIALLY — wallets, then stats, then trades, then ratings,
      then transactions — each awaited in its own try/catch, so the round trips
      add up rather than overlap. Dropping it removes six serial queries and a
      whole HTTP round trip from the slowest screen in the section.

      `/api/p2p/dashboard` still exists and still answers; nothing else in P2P
      calls it, and it is left alone rather than deleted.
    */
    const tradesResponse = await $fetch({
      url: "/api/p2p/trade",
      silentSuccess: true,
      /*
        `silent`, not just `silentSuccess`. `silentSuccess` suppresses ONLY the
        success toast — the error toast still fires with the server's own
        string, which is how "Authentication Required: Session expired, please
        sign in again" kept reaching the screen after `trades/client.tsx`
        learned to render a sign-in panel for exactly that case. The panel and
        the toast were two accounts of one event, and the toast was the one
        written for a client rather than for a person.

        Everything this request can fail with is rendered by that page:
        `sessionEnded` -> the sign-in panel, `hardError` -> the failure panel
        with a retry, and a failed REFRESH over existing data -> the stale-data
        strip. Nothing is lost by silencing it.
      */
      silent: true,
    });

    // M18: discard stale responses
    if (currentRequest !== fetchDashboardRequestCounter) return;

    // The trades endpoint is the only source of the trade lists. If it failed
    // we must say so: the old code only errored when BOTH calls failed, so a
    // trades outage with a healthy dashboard rendered "No active trades" for
    // users whose funds are sitting in escrow.
    if (tradesResponse.error) {
      set({
        tradeDashboardDataError: errorMessage(
          tradesResponse.error,
          "Failed to fetch trade data"
        ),
        isLoadingTradeDashboardData: false,
      });
      return;
    }

    // Helper to safely process array with timeline
    const processTradesWithTimeline = (trades: any[] | undefined) => {
      if (!Array.isArray(trades)) return [];
      return trades.map((trade: any) => ({
        ...trade,
        timeline: Array.isArray(trade.timeline)
          ? trade.timeline.map((event: any) => ({
              ...event,
              createdAt: new Date(event.time || event.createdAt),
            }))
          : [],
      }));
    };

    // Get trades from /api/p2p/trade response
    // Backend returns pre-separated arrays: activeTrades, pendingTrades, completedTrades, etc.
    const tradesData = tradesResponse.data || {};

    // Use pre-separated arrays from the backend response
    const activeTrades = Array.isArray(tradesData.activeTrades) ? tradesData.activeTrades : [];
    const completedTrades = Array.isArray(tradesData.completedTrades) ? tradesData.completedTrades : [];
    const disputedTrades = Array.isArray(tradesData.disputedTrades) ? tradesData.disputedTrades : [];
    const cancelledTrades = Array.isArray(tradesData.cancelledTrades) ? tradesData.cancelledTrades : [];
    const pendingTrades = Array.isArray(tradesData.pendingTrades) ? tradesData.pendingTrades : [];

    // Map API response to frontend expected structure
    const processedData = {
      tradeStats: tradesData.tradeStats || {
        totalTrades: 0,
        completedTrades: completedTrades.length,
        activeTrades: activeTrades.length,
        totalVolume: 0,
        completionRate: 0,
        averageTradeValue: 0,
        totalOffers: 0,
        activeOffers: 0,
      },
      recentActivity: Array.isArray(tradesData.recentActivity)
        ? tradesData.recentActivity.map((activity: any) => ({
            ...activity,
            createdAt: new Date(activity.time || activity.createdAt),
          }))
        : [],
      // Map trades from pre-separated arrays
      activeTrades: processTradesWithTimeline(activeTrades),
      completedTrades: processTradesWithTimeline(completedTrades),
      disputedTrades: processTradesWithTimeline(disputedTrades),
      cancelledTrades: processTradesWithTimeline(cancelledTrades),
      pendingTrades: processTradesWithTimeline(pendingTrades),
      availableCurrencies: tradesData.availableCurrencies || [],
    };

    set({
      tradeDashboardData: processedData,
      isLoadingTradeDashboardData: false,
    });
  },

  fetchTradeById: async (id: string) => {
    const currentRequest = ++fetchTradeByIdRequestCounter;
    // Drop the previously-viewed trade before loading a different one.
    // Without this the old trade keeps rendering under the new trade's URL
    // while the request is in flight (and forever if it fails), so a user can
    // act on somebody else's amounts, status and payment details.
    const previous = get().currentTrade;
    set({
      isLoadingTradeById: true,
      tradeByIdError: null,
      ...(previous && previous.id !== id ? { currentTrade: null } : {}),
    });

    const { data, error } = await $fetch({
      url: `/api/p2p/trade/${id}`,
      silentSuccess: true,
      silent: true, // Don't show toast on error
    });

    // M18: discard stale responses
    if (currentRequest !== fetchTradeByIdRequestCounter) return;

    if (error || !data) {
      set({
        tradeByIdError: errorMessage(error, "Failed to fetch trade details"),
        isLoadingTradeById: false,
      });
      return;
    }

    // Parse timeline if it's a JSON string
    let timeline = data.timeline;
    if (typeof timeline === 'string') {
      try {
        timeline = JSON.parse(timeline);
      } catch (e) {
        console.error('Failed to parse timeline JSON:', e);
        timeline = [];
      }
    }

    // Parse paymentDetails if it's a JSON string
    let paymentDetails = data.paymentDetails;
    if (typeof paymentDetails === 'string') {
      try {
        paymentDetails = JSON.parse(paymentDetails);
      } catch (e) {
        console.error('Failed to parse paymentDetails JSON:', e);
        paymentDetails = null;
      }
    }

    // Determine counterparty based on current user
    // Get user from the user store (separate Zustand store)
    const currentUserId = useUserStore.getState().user?.id;

    // Determine if current user is buyer or seller
    const isBuyer = data.buyerId === currentUserId;
    const counterpartyData = isBuyer ? data.seller : data.buyer;

    // Convert string times to Date objects in timeline
    const processedData = {
      ...data,
      type: isBuyer ? 'buy' : 'sell',
      coin: data.currency,
      paymentDetails, // Use the parsed paymentDetails
      counterparty: counterpartyData ? {
        id: counterpartyData.id,
        /* THE SERVER'S NAME, and no local reconstruction of one.

           This fell back to `firstName + lastName`, which is the legal name on
           a KYC document. Both endpoints that feed this room now resolve the
           public name — the counterparty's handle, or "First L." — and strip
           the real one from the payload, so the fallback could only ever fire
           on a response that predates that. "Counterparty" is the honest thing
           to say when we were given no name at all; rebuilding one from fields
           that should not be here is not. */
        name: counterpartyData.name || "Counterparty",
        avatar: counterpartyData.avatar,
        completedTrades: counterpartyData.completedTrades || 0,
        // `completionRate` is DELIBERATELY nullable. index.get.ts computes it as
        // `null` when the account has no finished trades, with a comment saying
        // why: the old default of 100 handed every brand-new account — and every
        // throwaway one — a flawless reputation and five filled stars.
        //
        // `|| 100` here undid that one layer up, so the backend's null never
        // reached a component. Pass both fields through untouched and let the
        // trust primitives decide what to print; they say "New trader" rather
        // than inventing a percentage.
        completionRate:
          counterpartyData.completionRate === undefined
            ? null
            : counterpartyData.completionRate,
        isNewTrader: counterpartyData.isNewTrader ?? (counterpartyData.finishedTrades ?? 0) === 0,
        finishedTrades: counterpartyData.finishedTrades ?? 0,
        avgReleaseSeconds: counterpartyData.avgReleaseSeconds ?? null,
        avgResponseSeconds: counterpartyData.avgResponseSeconds ?? null,
        lastSeenAt: counterpartyData.lastSeenAt ?? null,
        verified: counterpartyData.verified ?? false,
        merchant: counterpartyData.merchant ?? false,
      } : undefined,
      timeline: Array.isArray(timeline) ? timeline.map((event: any) => ({
        title: event.event || event.title || 'Event',
        description: event.message || event.description || '',
        time: event.createdAt || event.time || new Date().toISOString(),
        createdAt: new Date(event.time || event.createdAt),
      })) : [],
    };

    set({ currentTrade: processedData, isLoadingTradeById: false });
  },

  fetchTradeMessages: async (id: string) => {
    set({ isLoadingTradeMessages: true, tradeMessagesError: null });
    const { data, error } = await $fetch({
      url: `/api/p2p/trade/${id}/message`,
      silentSuccess: true,
      // NOT `silent`. Nothing reads `tradeMessagesError`, so the toast is the
      // only report this failure has. (The room's transcript is loaded by
      // `chat-panel.tsx`, which fetches silently and renders its own message.)
    });

    if (error || !data) {
      set({
        tradeMessagesError: errorMessage(
          error,
          "Failed to fetch trade messages"
        ),
        isLoadingTradeMessages: false,
      });
      return;
    }

    set({
      tradeMessages: Array.isArray(data) ? data : [],
      isLoadingTradeMessages: false,
    });
  },

  /*
    THE FIVE TRADE-ROOM ACTIONS ARE ALL `silent: true`. WHY, ONCE, HERE.

    `trade-room.tsx` folds `confirmPaymentError`, `releaseFundsError`,
    `cancelTradeError`, `submitRatingError` and `disputeTradeError` into a
    single `actionError` and hands it to `ActionPanel`, which renders it in a
    box above the button that was pressed — classifying auth onto a sign-in
    link and swapping machine text for a sentence (`kit/backend-error.ts`).

    Without `silent` the same failure ALSO arrived as a toast carrying the raw
    server string, so the two disagreed on the screen where it matters most: on
    a 500 the panel said "That did not go through. Nothing has moved and the
    escrow is untouched" while the toast said "Internal Server Error". Two
    accounts of one event, with money in escrow.

    THE SUCCESS TOAST GOES TOO, and that is fine here specifically. Each of
    these five awaits `fetchTradeById` on success, and the refreshed status
    rewrites the room: confirm flips the panel to "waiting on them", release
    flips the ribbon to complete and offers the rating form, cancel and dispute
    land on their terminal panels, and a submitted rating replaces the form
    with "You've rated this trade." That change is persistent and on-screen,
    which is a stronger confirmation than a toast that vanishes.

    `sendMessage` and `fetchTradeMessages` below are deliberately NOT silenced:
    nothing renders `sendMessageError` or `tradeMessagesError`, so there the
    toast is the only report there is.
  */
  confirmPayment: async (id: string, details?: ConfirmPaymentDetails) => {
    set({ isConfirmingPayment: true, confirmPaymentError: null });
    // The confirm endpoint records `paymentReference` on the trade timeline and
    // the activity log; anything else the user typed is kept out of this call
    // and posted to the trade chat by the caller so it is not thrown away.
    const { error } = await $fetch({
      url: `/api/p2p/trade/${id}/confirm`,
      method: "POST",
      body: { paymentReference: details?.paymentReference },
      silent: true,
    });

    set({ isConfirmingPayment: false });

    if (error) {
      set({
        confirmPaymentError: errorMessage(error, "Failed to confirm payment"),
      });
      return false;
    }

    // Refresh trade data
    await get().fetchTradeById(id);
    return true;
  },

  /*
    RELEASE, WITH THE STEP-UP DETOUR IN THE MIDDLE.

    When the admin has switched on the release challenge, pressing Release does
    NOT post: it opens the verification prompt and returns false. The seller
    enters their code, `confirmReleaseTwoFactor` re-enters this function with the
    single-use token, and THAT call posts. So the seller presses Release once and
    the flow finishes itself — the same shape the withdrawal form uses.

    Returning false for "we opened the prompt" is correct rather than a lie: the
    escrow has not moved, and the trade room must not close anything or claim
    success. The prompt being on screen is the report.

    The token is never stored. It authorises exactly one release and is burned
    server-side the moment that release is attempted.
  */
  releaseFunds: async (id: string, twoFactorToken?: string) => {
    if (!twoFactorToken) {
      // The backend enforces this regardless — the check here exists so the
      // seller meets the requirement in a dialog instead of in a 403 fired
      // straight after they attested that the money arrived.
      let policy = get().twoFactorPolicy;
      if (!policy) {
        await get().fetchTwoFactorPolicy();
        policy = get().twoFactorPolicy;
      }

      if (policy?.requireChallenge && !policy.satisfied) {
        set({
          releaseFundsError:
            "Releasing crypto requires two-factor authentication. Enable it in your profile security settings, then release — your escrow is untouched and the trade stays open.",
        });
        return false;
      }

      if (policy?.requireChallenge) {
        await get().requestReleaseTwoFactorCode();
        return false;
      }
    }

    set({ isReleasingFunds: true, releaseFundsError: null });
    const { error } = await $fetch({
      url: `/api/p2p/trade/${id}/release`,
      method: "POST",
      body: twoFactorToken ? { twoFactorToken } : undefined,
      // Rendered by `ActionPanel`, beside the Release button.
      silent: true,
    });

    set({ isReleasingFunds: false });

    if (error) {
      set({ releaseFundsError: errorMessage(error, "Failed to release funds") });
      return false;
    }

    // Refresh trade data
    await get().fetchTradeById(id);
    return true;
  },

  fetchTwoFactorPolicy: async () => {
    set({ twoFactorPolicyLoading: true });
    const { data, error } = await $fetch({
      url: "/api/p2p/verification",
      silent: true,
    });
    if (!error && data) {
      set({ twoFactorPolicy: data as P2PTwoFactorPolicy });
    }
    // A failed policy fetch must not block the room: the backend enforces the
    // policy regardless, so the worst case is the seller learns about the
    // requirement from the release response instead of up front.
    set({ twoFactorPolicyLoading: false });
  },

  requestReleaseTwoFactorCode: async () => {
    // Authenticator apps have nothing to deliver — the code is already on the
    // user's device. Calling the send endpoint would be a no-op that still
    // consumes a slot in its (deliberately tight, SMS-cost-driven) rate limit,
    // so open the prompt directly instead.
    if (get().twoFactorPolicy?.userType === "APP") {
      set({
        twoFactorPrompt: true,
        twoFactorSending: false,
        twoFactorCodeSent: false,
        twoFactorError: null,
        releaseFundsError: null,
      });
      return;
    }

    set({
      twoFactorPrompt: true,
      twoFactorSending: true,
      twoFactorError: null,
      releaseFundsError: null,
    });

    const { data, error } = await $fetch({
      url: "/api/p2p/verification",
      method: "POST",
      silent: true,
    });

    if (error) {
      set({ twoFactorSending: false, twoFactorError: error });
      return;
    }

    set({
      twoFactorSending: false,
      twoFactorCodeSent: Boolean(data?.delivered),
    });
  },

  confirmReleaseTwoFactor: async (id: string, otp: string) => {
    if (!otp || otp.length < 6) {
      set({ twoFactorError: "Enter the complete 6-digit code" });
      return false;
    }

    set({ twoFactorVerifying: true, twoFactorError: null });

    const { data, error } = await $fetch({
      url: "/api/p2p/verification/verify",
      method: "POST",
      body: { otp },
      silent: true,
    });

    if (error || !data?.twoFactorToken) {
      set({
        twoFactorVerifying: false,
        twoFactorError: error || "Verification failed. Please try again.",
      });
      return false;
    }

    // Verification passed — close the prompt and release, threading the
    // single-use token straight through.
    set({
      twoFactorVerifying: false,
      twoFactorPrompt: false,
      twoFactorCodeSent: false,
    });
    return get().releaseFunds(id, data.twoFactorToken);
  },

  cancelReleaseTwoFactor: () => {
    set({
      twoFactorPrompt: false,
      twoFactorCodeSent: false,
      twoFactorSending: false,
      twoFactorVerifying: false,
      twoFactorError: null,
      isReleasingFunds: false,
    });
  },

  cancelTrade: async (id: string, reason: string) => {
    set({ isCancellingTrade: true, cancelTradeError: null });
    const { error } = await $fetch({
      url: `/api/p2p/trade/${id}/cancel`,
      method: "POST",
      body: { reason },
      // Rendered in the room FOOTER, beside the Cancel button that raised it —
      // not in `ActionPanel`, which is a screenful above it.
      silent: true,
    });

    set({ isCancellingTrade: false });

    if (error) {
      // The backend refuses several cancellations outright (a seller cannot
      // cancel a PENDING trade, nobody can cancel after PAYMENT_SENT) and its
      // message explains what to do instead. Replacing it with a generic
      // "Failed to cancel trade" hid the only useful part of the response.
      set({ cancelTradeError: errorMessage(error, "Failed to cancel trade") });
      return false;
    }

    // Refresh trade data
    await get().fetchTradeById(id);
    return true;
  },

  disputeTrade: async (id: string, reason: string, description: string) => {
    set({ isDisputingTrade: true, disputeTradeError: null });
    const { error } = await $fetch({
      url: `/api/p2p/trade/${id}/dispute`,
      method: "POST",
      body: { reason, description },
      // Returned to `DisputeDialog`, which stays open on a refusal so the reason
      // lands on the form the person is still looking at.
      silent: true,
    });

    set({ isDisputingTrade: false });

    if (error) {
      set({ disputeTradeError: errorMessage(error, "Failed to dispute trade") });
      return false;
    }

    // Refresh trade data
    await get().fetchTradeById(id);
    return true;
  },

  /*
    WITHDRAWING a dispute the viewer opened.

    Not silent, unlike `disputeTrade` above: that one hands its refusal back to
    a dialog that stays open on the form the person is looking at, whereas this
    is a button in the action panel with no form to keep. The panel renders
    `withdrawDisputeError` beside it, and the store's own toast is suppressed
    the same way the other three panel actions suppress theirs.
  */
  withdrawDispute: async (id: string, note?: string) => {
    set({ isWithdrawingDispute: true, withdrawDisputeError: null });
    const { error } = await $fetch({
      url: `/api/p2p/trade/${id}/dispute`,
      method: "DELETE",
      body: note ? { note } : undefined,
      silent: true,
    });

    set({ isWithdrawingDispute: false });

    if (error) {
      set({ withdrawDisputeError: errorMessage(error, "Failed to withdraw the dispute") });
      return false;
    }

    // The trade goes back to the status it held before, and the dispute row
    // moves to RESOLVED — both of which this screen renders, so it has to
    // re-read rather than patch its own copy.
    await get().fetchTradeById(id);
    return true;
  },

  /*
    APPEAL — the respondent's door, and the mirror of `withdrawDispute`.

    The raiser could withdraw; the trader a dispute was filed AGAINST had no
    control at all, which is the wrong shape for the case a dispute system
    exists to handle: a false claim. See `dispute/appeal.post.ts`.

    Re-reads the trade rather than patching, for the same reason withdrawal
    does: `viewerCanAppeal`, the case's priority and the appeal itself are all
    server-computed, and a locally-patched copy of any of them is a button that
    disagrees with the endpoint behind it.
  */
  appealDispute: async (id: string, statement: string) => {
    set({ isAppealingDispute: true, appealDisputeError: null });
    const { error } = await $fetch({
      url: `/api/p2p/trade/${id}/dispute/appeal`,
      method: "POST",
      body: { statement },
      silent: true,
    });

    set({ isAppealingDispute: false });

    if (error) {
      set({ appealDisputeError: errorMessage(error, "Failed to file the appeal") });
      return false;
    }

    await get().fetchTradeById(id);
    return true;
  },

  /*
    EVIDENCE — a PDF, an image, or a screen recording, onto the case.

    NOT `silent`. The dispute panel asks for a bank statement and a screen
    recording by name, and both are large files a person waited on: an upload
    that fails quietly is one the trader believes succeeded, and they find out
    when the case is decided without it.
  */
  submitDisputeEvidence: async (
    id: string,
    file: { dataUrl: string; filename?: string; description?: string }
  ) => {
    set({ isSubmittingEvidence: true, submitEvidenceError: null });
    const { error } = await $fetch({
      url: `/api/p2p/trade/${id}/dispute/evidence`,
      method: "POST",
      body: {
        file: file.dataUrl,
        filename: file.filename,
        description: file.description,
      },
      silentSuccess: true,
    });

    set({ isSubmittingEvidence: false });

    if (error) {
      set({ submitEvidenceError: errorMessage(error, "That file could not be added to the case") });
      return false;
    }

    await get().fetchTradeById(id);
    return true;
  },

  sendMessage: async (id: string, message: string) => {
    set({ isSendingMessage: true, sendMessageError: null });
    const { error } = await $fetch({
      url: `/api/p2p/trade/${id}/message`,
      method: "POST",
      body: { message },
      // NOT `silent`. `sendMessageError` is rendered by nothing, and the one
      // caller is `trade-room.tsx` posting the buyer's note and receipt to the
      // chat after a confirmed payment — evidence for a dispute. If that post
      // fails, the toast is the only thing that tells them it did not land.
    });

    set({ isSendingMessage: false });

    if (error) {
      set({ sendMessageError: errorMessage(error, "Failed to send message") });
      return false;
    }

    // Refresh messages
    await get().fetchTradeMessages(id);
    return true;
  },

  submitRating: async (id: string, rating: number, feedback: string) => {
    set({ isSubmittingRating: true, submitRatingError: null });
    const { error } = await $fetch({
      url: `/api/p2p/trade/${id}/review`,
      method: "POST",
      body: { rating, feedback },
      // Rendered by `ActionPanel`, where the rating form is.
      silent: true,
    });

    set({ isSubmittingRating: false });

    if (error) {
      set({ submitRatingError: errorMessage(error, "Failed to submit rating") });
      return false;
    }

    // Refresh trade data
    await get().fetchTradeById(id);
    return true;
  },

  clearTradeErrors: () => {
    set({
      tradeDashboardDataError: null,
      tradeByIdError: null,
      tradeMessagesError: null,
      tradeOffersError: null,
      confirmPaymentError: null,
      releaseFundsError: null,
      cancelTradeError: null,
      disputeTradeError: null,
      // `withdrawDisputeError` was already missing from this list before the
      // other two joined it, so a refused withdrawal stayed on screen through
      // a navigation. All three dispute doors clear together now.
      withdrawDisputeError: null,
      appealDisputeError: null,
      submitEvidenceError: null,
      sendMessageError: null,
      submitRatingError: null,
      twoFactorError: null,
    });
  },
});
