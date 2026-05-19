import { $fetch } from "@/lib/api";
import { useUserStore } from "@/store/user";

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
  sendMessageError: string | null;
  submitRatingError: string | null;
}

export interface TradeActions {
  fetchTradeDashboardData: () => Promise<void>;
  fetchTradeById: (id: string) => Promise<void>;
  fetchTradeMessages: (id: string) => Promise<void>;

  confirmPayment: (id: string) => Promise<boolean>;
  releaseFunds: (id: string) => Promise<boolean>;
  cancelTrade: (id: string, reason: string) => Promise<boolean>;
  disputeTrade: (
    id: string,
    reason: string,
    description: string
  ) => Promise<boolean>;
  sendMessage: (id: string, message: string) => Promise<boolean>;
  submitRating: (
    id: string,
    rating: number,
    feedback: string
  ) => Promise<boolean>;

  clearTradeErrors: () => void;
}

// M18: Module-level request counters to discard stale responses
let fetchDashboardRequestCounter = 0;
let fetchTradeByIdRequestCounter = 0;

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
  sendMessageError: null,
  submitRatingError: null,

  // Actions
  fetchTradeDashboardData: async () => {
    const currentRequest = ++fetchDashboardRequestCounter;
    try {
      set({ isLoadingTradeDashboardData: true, tradeDashboardDataError: null });

      // Fetch both trades and dashboard stats
      const [tradesResponse, dashboardResponse] = await Promise.all([
        $fetch({ url: "/api/p2p/trade", silentSuccess: true }),
        $fetch({ url: "/api/p2p/dashboard", silentSuccess: true }),
      ]);

      // M18: discard stale responses
      if (currentRequest !== fetchDashboardRequestCounter) return;

      if (tradesResponse.error && dashboardResponse.error) {
        set({
          tradeDashboardDataError: "Failed to fetch trade data",
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

      // Get dashboard stats from /api/p2p/dashboard response
      const dashboardData = dashboardResponse.data || {};

      // Map API response to frontend expected structure
      const processedData = {
        // Use tradeStats from the trades endpoint, fall back to dashboard stats
        tradeStats: tradesData.tradeStats || dashboardData.stats || {
          totalTrades: 0,
          completedTrades: completedTrades.length,
          activeTrades: activeTrades.length,
          totalVolume: 0,
          completionRate: 0,
          averageTradeValue: 0,
          totalOffers: 0,
          activeOffers: 0,
        },
        // Use recentActivity from trades endpoint, fall back to dashboard
        recentActivity: Array.isArray(tradesData.recentActivity)
          ? tradesData.recentActivity.map((activity: any) => ({
              ...activity,
              createdAt: new Date(activity.time || activity.createdAt),
            }))
          : Array.isArray(dashboardData.recentActivity)
            ? dashboardData.recentActivity.map((activity: any) => ({
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
        availableCurrencies: tradesData.availableCurrencies || dashboardData.availableCurrencies || [],
      };

      set({
        tradeDashboardData: processedData,
        isLoadingTradeDashboardData: false,
      });
    } catch (err) {
      set({
        tradeDashboardDataError: "An unexpected error occurred",
        isLoadingTradeDashboardData: false,
      });
    }
  },

  fetchTradeById: async (id: string) => {
    const currentRequest = ++fetchTradeByIdRequestCounter;
    try {
      set({ isLoadingTradeById: true, tradeByIdError: null });
      const { data, error } = await $fetch({
        url: `/api/p2p/trade/${id}`,
        silentSuccess: true,
        silent: true, // Don't show toast on error
      });

      // M18: discard stale responses
      if (currentRequest !== fetchTradeByIdRequestCounter) return;

      if (error) {
        set({
          tradeByIdError: error || "Failed to fetch trade details",
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
          name: counterpartyData.name || `${counterpartyData.firstName || ''} ${counterpartyData.lastName || ''}`.trim(),
          avatar: counterpartyData.avatar,
          completedTrades: counterpartyData.completedTrades || 0,
          completionRate: counterpartyData.completionRate || 100,
        } : undefined,
        timeline: Array.isArray(timeline) ? timeline.map((event: any) => ({
          title: event.event || event.title || 'Event',
          description: event.message || event.description || '',
          time: event.createdAt || event.time || new Date().toISOString(),
          createdAt: new Date(event.time || event.createdAt),
        })) : [],
      };

      set({ currentTrade: processedData, isLoadingTradeById: false });
    } catch (err) {
      set({
        tradeByIdError: "An unexpected error occurred",
        isLoadingTradeById: false,
      });
    }
  },

  fetchTradeMessages: async (id: string) => {
    try {
      set({ isLoadingTradeMessages: true, tradeMessagesError: null });
      const { data, error } = await $fetch({
        url: `/api/p2p/trade/${id}/message`,
        silentSuccess: true,
      });

      if (error) {
        set({
          tradeMessagesError: "Failed to fetch trade messages",
          isLoadingTradeMessages: false,
        });
        return;
      }

      set({ tradeMessages: data, isLoadingTradeMessages: false });
    } catch (err) {
      set({
        tradeMessagesError: "An unexpected error occurred",
        isLoadingTradeMessages: false,
      });
    }
  },

  confirmPayment: async (id: string) => {
    try {
      set({ isConfirmingPayment: true, confirmPaymentError: null });
      const { data, error } = await $fetch({
        url: `/api/p2p/trade/${id}/confirm`,
        method: "POST",
      });

      set({ isConfirmingPayment: false });

      if (error) {
        set({ confirmPaymentError: "Failed to confirm payment" });
        return false;
      }

      // Refresh trade data
      await get().fetchTradeById(id);
      return true;
    } catch (err) {
      set({
        confirmPaymentError: "An unexpected error occurred",
        isConfirmingPayment: false,
      });
      return false;
    }
  },

  releaseFunds: async (id: string) => {
    try {
      set({ isReleasingFunds: true, releaseFundsError: null });
      const { data, error } = await $fetch({
        url: `/api/p2p/trade/${id}/release`,
        method: "POST",
      });

      set({ isReleasingFunds: false });

      if (error) {
        set({ releaseFundsError: "Failed to release funds" });
        return false;
      }

      // Refresh trade data
      await get().fetchTradeById(id);
      return true;
    } catch (err) {
      set({
        releaseFundsError: "An unexpected error occurred",
        isReleasingFunds: false,
      });
      return false;
    }
  },

  cancelTrade: async (id: string, reason: string) => {
    try {
      set({ isCancellingTrade: true, cancelTradeError: null });
      const { data, error } = await $fetch({
        url: `/api/p2p/trade/${id}/cancel`,
        method: "POST",
        body: { reason },
      });

      set({ isCancellingTrade: false });

      if (error) {
        set({ cancelTradeError: "Failed to cancel trade" });
        return false;
      }

      // Refresh trade data
      await get().fetchTradeById(id);
      return true;
    } catch (err) {
      set({
        cancelTradeError: "An unexpected error occurred",
        isCancellingTrade: false,
      });
      return false;
    }
  },

  disputeTrade: async (id: string, reason: string, description: string) => {
    try {
      set({ isDisputingTrade: true, disputeTradeError: null });
      const { data, error } = await $fetch({
        url: `/api/p2p/trade/${id}/dispute`,
        method: "POST",
        body: { reason, description },
      });

      set({ isDisputingTrade: false });

      if (error) {
        set({ disputeTradeError: "Failed to dispute trade" });
        return false;
      }

      // Refresh trade data
      await get().fetchTradeById(id);
      return true;
    } catch (err) {
      set({
        disputeTradeError: "An unexpected error occurred",
        isDisputingTrade: false,
      });
      return false;
    }
  },

  sendMessage: async (id: string, message: string) => {
    try {
      set({ isSendingMessage: true, sendMessageError: null });
      const { data, error } = await $fetch({
        url: `/api/p2p/trade/${id}/message`,
        method: "POST",
        body: { message },
      });

      set({ isSendingMessage: false });

      if (error) {
        set({ sendMessageError: "Failed to send message" });
        return false;
      }

      // Refresh messages
      await get().fetchTradeMessages(id);
      return true;
    } catch (err) {
      set({
        sendMessageError: "An unexpected error occurred",
        isSendingMessage: false,
      });
      return false;
    }
  },

  submitRating: async (id: string, rating: number, feedback: string) => {
    try {
      set({ isSubmittingRating: true, submitRatingError: null });
      const { data, error } = await $fetch({
        url: `/api/p2p/trade/${id}/review`,
        method: "POST",
        body: { rating, feedback },
      });

      set({ isSubmittingRating: false });

      if (error) {
        set({ submitRatingError: "Failed to submit rating" });
        return false;
      }

      // Refresh trade data
      await get().fetchTradeById(id);
      return true;
    } catch (err) {
      set({
        submitRatingError: "An unexpected error occurred",
        isSubmittingRating: false,
      });
      return false;
    }
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
      sendMessageError: null,
      submitRatingError: null,
    });
  },
});
