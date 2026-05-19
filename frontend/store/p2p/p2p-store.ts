import { create } from "zustand";
import {
  createMarketSlice,
  type MarketState,
  type MarketActions,
} from "./slices/market-slice";
import {
  createDashboardSlice,
  type DashboardState,
  type DashboardActions,
} from "./slices/dashboard-slice";
import {
  createTradeSlice,
  type TradeState,
  type TradeActions,
} from "./slices/trade-slice";
import {
  createOfferSlice,
  type OfferState,
  type OfferActions,
} from "./slices/offer-slice";
import {
  createGuidedMatchingSlice,
  type GuidedMatchingState,
  type GuidedMatchingActions,
} from "./slices/guided-matching-slice";

interface P2PState {
  // Market data
  marketHighlights: P2PMarketHighlight[];
  stats: P2PStats | null;
  topCryptos: P2PCryptoPrice[];

  // Dashboard data
  dashboardData: P2PDashboardData | null;
  portfolio: P2PPortfolioData | null;
  dashboardStats: P2PStatData[];
  tradingActivity: P2PTradeActivity[];
  transactions: P2PTransaction[];

  // Trade data
  tradeDashboardData: P2PTradeDashboardData | null;
  currentTrade: P2PTrade | null;
  tradeMessages: any[]; // Type this properly based on your message structure

  // Offers data
  buyOffers: P2PTradeOffer[];
  sellOffers: P2PTradeOffer[];
  marketStats: P2PMarketStats | null;
  offerFormData: P2POfferFormData | null;
  availableCryptocurrencies: Array<{ symbol: string; name: string }>;
  availablePaymentMethods: Array<{ id: string; name: string; icon: string }>;

  // Guided Matching data
  matchingCriteria: P2PMatchingCriteria;
  matchingResults: P2PMatchingResults | null;
  cryptocurrencies: P2PCryptocurrency[];
  paymentMethods: P2PPaymentMethod[];
  locations: P2PLocation[];
  wizardStep: number;
  wizardComplete: boolean;

  // Loading states for market data
  isLoadingMarketHighlights: boolean;
  isLoadingP2PStats: boolean;
  isLoadingTopCryptos: boolean;

  // Loading states for dashboard data
  isLoadingDashboardData: boolean;
  isLoadingPortfolio: boolean;
  isLoadingDashboardStats: boolean;
  isLoadingTradingActivity: boolean;
  isLoadingTransactions: boolean;

  // Loading states for trade data
  isLoadingTradeDashboardData: boolean;
  isLoadingTradeById: boolean;
  isLoadingTradeMessages: boolean;

  // Loading states for trade actions
  isConfirmingPayment: boolean;
  isReleasingFunds: boolean;
  isCancellingTrade: boolean;
  isDisputingTrade: boolean;
  isSendingMessage: boolean;
  isSubmittingRating: boolean;

  // Loading states for offers data
  isLoadingBuyOffers: boolean;
  isLoadingSellOffers: boolean;
  isLoadingMarketStats: boolean;
  isLoadingAvailableCryptocurrencies: boolean;
  isLoadingAvailablePaymentMethods: boolean;

  // Loading states for offer form actions
  isSubmittingOffer: boolean;

  // Loading states for guided matching
  isLoadingCryptocurrencies: boolean;
  isLoadingPaymentMethods: boolean;
  isLoadingLocations: boolean;
  isSubmittingMatching: boolean;
  isLoadingOfferById: boolean;

  // Error states for market data
  marketHighlightsError: string | null;
  p2pStatsError: string | null;
  topCryptosError: string | null;

  // Error states for dashboard data
  dashboardDataError: string | null;
  portfolioError: string | null;
  dashboardStatsError: string | null;
  tradingActivityError: string | null;
  transactionsError: string | null;

  // Error states for trade data
  tradeDashboardDataError: string | null;
  tradeByIdError: string | null;
  tradeMessagesError: string | null;

  // Error states for trade actions
  confirmPaymentError: string | null;
  releaseFundsError: string | null;
  cancelTradeError: string | null;
  disputeTradeError: string | null;
  sendMessageError: string | null;
  submitRatingError: string | null;

  // Error states for offers data
  buyOffersError: string | null;
  sellOffersError: string | null;
  marketStatsError: string | null;
  availableCryptocurrenciesError: string | null;
  availablePaymentMethodsError: string | null;

  // Error states for offer form actions
  submitOfferError: string | null;

  // Error states for guided matching
  cryptocurrenciesError: string | null;
  paymentMethodsError: string | null;
  locationsError: string | null;
  submitMatchingError: string | null;
  offerByIdError: string | null;

  // Market data fetching functions
  fetchMarketHighlights: () => Promise<void>;
  fetchP2PStats: () => Promise<void>;
  fetchTopCryptos: () => Promise<void>;

  // Dashboard data fetching functions
  fetchDashboardData: () => Promise<void>;
  fetchPortfolio: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  fetchTradingActivity: () => Promise<void>;
  fetchTransactions: () => Promise<void>;

  // Trade data fetching functions
  fetchTradeDashboardData: () => Promise<void>;
  fetchTradeById: (id: string) => Promise<void>;
  fetchTradeMessages: (id: string) => Promise<void>;

  // Trade actions
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

  // Offers data fetching functions
  fetchBuyOffers: () => Promise<void>;
  fetchSellOffers: () => Promise<void>;
  fetchMarketStats: () => Promise<void>;
  fetchAvailableCryptocurrencies: () => Promise<void>;
  fetchAvailablePaymentMethods: () => Promise<void>;

  // Offer form actions
  updateOfferFormData: (data: Partial<P2POfferFormData>) => void;
  resetOfferForm: () => void;
  submitOffer: () => Promise<boolean>;

  // Guided Matching functions
  fetchGuidedMatchingData: () => Promise<void>;
  updateMatchingCriteria: (data: Partial<P2PMatchingCriteria>) => void;
  submitMatchingCriteria: () => Promise<boolean>;
  setWizardStep: (step: number) => void;
  nextWizardStep: () => void;
  prevWizardStep: () => void;
  setWizardComplete: (complete: boolean) => void;
  resetGuidedMatching: () => void;
  togglePaymentMethod: (methodId: string) => void;

  // Add a new method to fetch offer by ID
  fetchOfferById: (id: string) => Promise<any>;

  // Error clearing function
  clearErrors: () => void;
}

// Define the combined store type
export type P2PStore = MarketState &
  MarketActions &
  DashboardState &
  DashboardActions &
  TradeState &
  TradeActions &
  OfferState &
  OfferActions &
  GuidedMatchingState &
  GuidedMatchingActions & {
    clearErrors: () => void;
  };

// Create the combined store
export const useP2PStore = create<P2PStore>((set, get) => ({
  ...createMarketSlice(set, get),
  ...createDashboardSlice(set, get),
  ...createTradeSlice(set, get),
  ...createOfferSlice(set, get),
  ...createGuidedMatchingSlice(set, get),

  // Global error clearing function
  clearErrors: () => {
    // Call all the individual error clearing functions
    get().clearMarketErrors();
    get().clearDashboardErrors();
    get().clearTradeErrors();
    get().clearOfferErrors();
    get().clearGuidedMatchingErrors();
  },
}));
