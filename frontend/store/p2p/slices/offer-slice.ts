import { $fetch } from "@/lib/api";

// Define the P2POfferFormData interface
export interface P2POfferFormData {
  tradeType: string;
  currency: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  amountConfig: {
    total: number;
    min?: number;
    max?: number;
    availableBalance?: number;
  };
  priceConfig: {
    model: string;
    value: number;
    marketPrice?: number;
    finalPrice: number;
    marginType?: string;
  };
  paymentMethods: Array<{
    id: string;
    name: string;
    icon: string;
    description?: string;
    processingTime?: string;
    instructions?: string;
    details?: any;
  }>;
  tradeSettings: {
    autoCancel: number;
    kycRequired: boolean;
    termsOfTrade: string;
    visibility: "public" | "private" | "PUBLIC" | "PRIVATE";
    additionalNotes?: string;
  };
  locationSettings?: {
    country: string;
    region: string;
    city: string;
    restrictions: string[];
  };
  userRequirements?: {
    minCompletedTrades: number;
    minSuccessRate: number;
    minAccountAge: number;
    trustedOnly: boolean;
  };
  price?: number;
  priceModel?: string;
  minLimit?: string;
  maxLimit?: string;
  amount?: number;
  totalValue?: string;
  paymentMethodsCount?: number;
}

export interface P2POffer {
  id: string;
  tradeType: string;
  currency: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  amountConfig: {
    total: number;
    min?: number;
    max?: number;
    availableBalance?: number;
  };
  priceConfig: {
    model: string;
    value: number;
    marketPrice?: number;
    finalPrice: number;
    marginType?: string;
  };
  paymentMethods: Array<{
    id: string;
    name: string;
    icon: string;
    description?: string;
    processingTime?: string;
    instructions?: string;
    details?: any;
  }>;
  tradeSettings: {
    autoCancel: number;
    kycRequired: boolean;
    termsOfTrade: string;
    visibility: "public" | "private" | "PUBLIC" | "PRIVATE";
    additionalNotes?: string;
  };
  locationSettings?: {
    country: string;
    region: string;
    city: string;
    restrictions: string[];
  };
  userRequirements?: {
    minCompletedTrades: number;
    minSuccessRate: number;
    minAccountAge: number;
    trustedOnly: boolean;
  };
  createdAt: Date;
}

// Define the API expected payload interface
export interface P2POfferApiPayload {
  type: "BUY" | "SELL";
  currency: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  amountConfig: {
    total: number;
    min?: number;
    max?: number;
    availableBalance?: number;
  };
  priceConfig: {
    model: "FIXED" | "MARGIN";
    value: number;
    marketPrice?: number;
    finalPrice: number;
  };
  tradeSettings: {
    autoCancel: number;
    kycRequired: boolean;
    visibility: "PUBLIC" | "PRIVATE";
    termsOfTrade?: string;
    additionalNotes?: string;
  };
  locationSettings?: {
    country?: string;
    region?: string;
    city?: string;
    restrictions?: string[];
  };
  userRequirements?: {
    minCompletedTrades?: number;
    minSuccessRate?: number;
    minAccountAge?: number;
    trustedOnly?: boolean;
  };
  paymentMethods?: Array<{
    id: string;
    name: string;
    description?: string;
    processingTime?: string;
    fees?: any;
    icon?: string;
    instructions?: string;
    details?: any;
  }>;
}

export interface P2PMarketStats {
  totalBuyOffers: number;
  totalSellOffers: number;
  totalVolume: number;
}

export interface OfferState {
  // Offers data
  offers: Array<P2POffer>;
  marketStats: P2PMarketStats | null;
  offerFormData: P2POfferFormData | null;
  availablePaymentMethods: Array<{ id: string; name: string; icon: string }>;

  // Loading states
  isLoadingOffers: boolean;
  isLoadingMarketStats: boolean;
  isLoadingAvailablePaymentMethods: boolean;
  isLoadingOfferById: boolean;
  isSubmittingOffer: boolean;

  // Error states
  offersError: string | null;
  marketStatsError: string | null;
  availablePaymentMethodsError: string | null;
  offerByIdError: string | null;
  submitOfferError: string | null;
}

export interface OfferActions {
  fetchOffers: (params?: { limit?: number; sort?: string }) => Promise<void>;
  fetchMarketStats: () => Promise<void>;
  fetchAvailablePaymentMethods: () => Promise<void>;
  fetchOfferById: (id: string) => Promise<any>;

  updateOfferFormData: (data: Partial<P2POfferFormData>) => void;
  resetOfferForm: () => void;
  submitOffer: () => Promise<boolean>;

  clearOfferErrors: () => void;
}

// Function to transform form data to API expected payload
function transformFormDataToApiPayload(formData: P2POfferFormData): any {
  return {
    // Rename tradeType to type and ensure it's uppercase
    type: formData.tradeType.toUpperCase() as "BUY" | "SELL",

    // Use the currency field directly
    currency: formData.currency,

    // Keep walletType as is
    walletType: formData.walletType,

    // Keep amountConfig as is
    amountConfig: formData.amountConfig,

    // Ensure priceConfig model is uppercase
    priceConfig: {
      ...formData.priceConfig,
      model: formData.priceConfig.model.toUpperCase() as "FIXED" | "MARGIN",
    },

    // Transform tradeSettings and ensure visibility is uppercase
    tradeSettings: {
      ...formData.tradeSettings,
      kycRequired: formData.tradeSettings.kycRequired || true, // Default to true if missing
      visibility: formData.tradeSettings.visibility.toUpperCase() as
        | "PUBLIC"
        | "PRIVATE",
    },

    // Keep locationSettings as is
    locationSettings: formData.locationSettings,

    // Keep userRequirements as is
    userRequirements: formData.userRequirements,

    // Transform paymentMethods to paymentMethodIds (API expects array of IDs)
    paymentMethodIds: formData.paymentMethods?.map((method) => method.id) || [],
  };
}

export const createOfferSlice = (
  set: any,
  get: any
): OfferState & OfferActions => ({
  // Initial state
  offers: [],
  marketStats: null,
  offerFormData: {
    tradeType: "buy",
    currency: "BTC",
    walletType: "SPOT",
    amountConfig: {
      total: 0,
      min: undefined,
      max: undefined,
      availableBalance: undefined,
    },
    priceConfig: {
      model: "fixed",
      value: 0,
      marketPrice: undefined,
      finalPrice: 0,
      marginType: undefined,
    },
    paymentMethods: [],
    tradeSettings: {
      autoCancel: 30,
      kycRequired: true,
      termsOfTrade: "",
      visibility: "public",
    },
  },
  availablePaymentMethods: [],

  // Loading states
  isLoadingOffers: false,
  isLoadingMarketStats: false,
  isLoadingAvailablePaymentMethods: false,
  isLoadingOfferById: false,
  isSubmittingOffer: false,

  // Error states
  offersError: null,
  marketStatsError: null,
  availablePaymentMethodsError: null,
  offerByIdError: null,
  submitOfferError: null,

  fetchOffers: async (params?: { limit?: number; sort?: string }) => {
    try {
      set({ isLoadingOffers: true, offersError: null });
      const { data, error } = await $fetch({
        url: `/api/p2p/offer${params?.sort ? `/${params.sort}` : ""}`,
        params: {
          limit: params?.limit || 10,
        },
        silentSuccess: true,
      });

      if (error) {
        set({
          offersError: "Failed to fetch  offers",
          isLoadingOffers: false,
        });
        return;
      }

      set({ offers: data, isLoadingOffers: false });
    } catch (err) {
      set({
        offersError: "An unexpected error occurred",
        isLoadingOffers: false,
      });
    }
  },

  fetchMarketStats: async () => {
    try {
      set({ isLoadingMarketStats: true, marketStatsError: null });
      const { data, error } = await $fetch({
        url: "/api/p2p/market/stats",
        silentSuccess: true,
      });

      if (error) {
        set({
          marketStatsError: "Failed to fetch market stats",
          isLoadingMarketStats: false,
        });
        return;
      }

      set({ marketStats: data, isLoadingMarketStats: false });
    } catch (err) {
      set({
        marketStatsError: "An unexpected error occurred",
        isLoadingMarketStats: false,
      });
    }
  },

  fetchAvailablePaymentMethods: async () => {
    try {
      set({
        isLoadingAvailablePaymentMethods: true,
        availablePaymentMethodsError: null,
      });
      const { data, error } = await $fetch({
        url: "/api/p2p/payment-method",
        silentSuccess: true,
      });

      if (error) {
        set({
          availablePaymentMethodsError:
            "Failed to fetch available payment methods",
          isLoadingAvailablePaymentMethods: false,
        });
        return;
      }

      set({
        availablePaymentMethods: data,
        isLoadingAvailablePaymentMethods: false,
      });
    } catch (err) {
      set({
        availablePaymentMethodsError: "An unexpected error occurred",
        isLoadingAvailablePaymentMethods: false,
      });
    }
  },

  fetchOfferById: async (id: string) => {
    try {
      set({ isLoadingOfferById: true, offerByIdError: null });
      const { data, error } = await $fetch({
        url: `/api/p2p/offer/${id}`,
        silentSuccess: true,
      });

      if (error) {
        set({
          offerByIdError: "Failed to fetch offer details",
          isLoadingOfferById: false,
        });
        return null;
      }

      // Convert string time to Date object
      const processedData = {
        ...data,
        createdAt: new Date(data.createdAt),
      };

      set({ isLoadingOfferById: false });
      return processedData;
    } catch (err) {
      set({
        offerByIdError: "An unexpected error occurred",
        isLoadingOfferById: false,
      });
      return null;
    }
  },

  updateOfferFormData: (data: Partial<P2POfferFormData>) => {
    set((state: any) => ({
      offerFormData: {
        ...state.offerFormData!,
        ...data,
      },
    }));
  },

  resetOfferForm: () => {
    set({
      offerFormData: {
        tradeType: "buy",
        currency: "BTC", // Simplified to just use currency
        walletType: "SPOT",
        amountConfig: {
          total: 0,
          min: undefined,
          max: undefined,
          availableBalance: undefined,
        },
        priceConfig: {
          model: "fixed",
          value: 0,
          marketPrice: undefined,
          finalPrice: 0,
          marginType: undefined,
        },
        paymentMethods: [],
        tradeSettings: {
          autoCancel: 30,
          kycRequired: true,
          termsOfTrade: "",
          visibility: "public",
        },
      },
    });
  },

  submitOffer: async () => {
    try {
      const formData = get().offerFormData;
      if (!formData) {
        set({ submitOfferError: "No offer data to submit" });
        return false;
      }

      set({ isSubmittingOffer: true, submitOfferError: null });

      // Transform the form data to match the API expected payload
      const apiPayload = transformFormDataToApiPayload(formData);

      const { data, error } = await $fetch({
        url: "/api/p2p/offer",
        method: "POST",
        body: apiPayload,
      });

      set({ isSubmittingOffer: false });

      if (error) {
        set({ submitOfferError: "Failed to create offer" });
        return false;
      }

      return true;
    } catch (err) {
      console.error("Error submitting offer:", err);
      set({
        submitOfferError: "An unexpected error occurred",
        isSubmittingOffer: false,
      });
      return false;
    }
  },

  clearOfferErrors: () => {
    set({
      offersError: null,
      marketStatsError: null,
      availableCryptocurrenciesError: null,
      availablePaymentMethodsError: null,
      offerByIdError: null,
      submitOfferError: null,
    });
  },
});
