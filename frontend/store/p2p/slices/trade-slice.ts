import { $fetch } from "@/lib/api";

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
    try {
      set({ isLoadingTradeDashboardData: true, tradeDashboardDataError: null });
      const { data, error } = await $fetch({
        url: "/api/p2p/trade",
        silentSuccess: true,
      });

      if (error) {
        set({
          tradeDashboardDataError: "Failed to fetch trade dashboard data",
          isLoadingTradeDashboardData: false,
        });
        return;
      }

      // Convert string times to Date objects
      const processedData = {
        ...data,
        recentActivity: data.recentActivity.map((activity: any) => ({
          ...activity,
          createdAt: new Date(activity.time || activity.createdAt),
        })),
        activeTrades: data.activeTrades.map((trade: any) => ({
          ...trade,
          timeline: trade.timeline?.map((event: any) => ({
            ...event,
            createdAt: new Date(event.time || event.createdAt),
          })),
        })),
        completedTrades: data.completedTrades.map((trade: any) => ({
          ...trade,
          timeline: trade.timeline?.map((event: any) => ({
            ...event,
            createdAt: new Date(event.time || event.createdAt),
          })),
        })),
        disputedTrades: data.disputedTrades.map((trade: any) => ({
          ...trade,
          timeline: trade.timeline?.map((event: any) => ({
            ...event,
            createdAt: new Date(event.time || event.createdAt),
          })),
        })),
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
    try {
      set({ isLoadingTradeById: true, tradeByIdError: null });
      const { data, error } = await $fetch({
        url: `/api/p2p/trade/${id}`,
        silentSuccess: true,
      });

      if (error) {
        set({
          tradeByIdError: "Failed to fetch trade details",
          isLoadingTradeById: false,
        });
        return;
      }

      // Convert string times to Date objects in timeline
      const processedData = {
        ...data,
        timeline: data.timeline?.map((event: any) => ({
          ...event,
          createdAt: new Date(event.time || event.createdAt),
        })),
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
