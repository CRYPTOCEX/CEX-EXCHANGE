import { $fetch } from "@/lib/api";

export interface P2PMatchingCriteria {
  tradeType: "buy" | "sell";
  cryptocurrency: string;
  amount: string;
  paymentMethods: string[];
  pricePreference: "best_price" | "fixed";
  traderPreference: "all" | "verified";
  location: "any" | string;
}

export interface P2PMatchingResults {
  matches: any[]; // Replace 'any' with a more specific type if possible
}

export interface P2PCryptocurrency {
  id: string;
  name: string;
  symbol: string;
}

export interface P2PPaymentMethod {
  id: string;
  name: string;
}

export interface P2PLocation {
  id: string;
  name: string;
}

export interface GuidedMatchingState {
  // Guided Matching data
  matchingCriteria: P2PMatchingCriteria;
  matchingResults: P2PMatchingResults | null;
  cryptocurrencies: P2PCryptocurrency[];
  paymentMethods: P2PPaymentMethod[];
  locations: P2PLocation[];
  wizardStep: number;
  wizardComplete: boolean;

  // Loading states
  isLoadingCryptocurrencies: boolean;
  isLoadingPaymentMethods: boolean;
  isLoadingLocations: boolean;
  isSubmittingMatching: boolean;

  // Error states
  cryptocurrenciesError: string | null;
  paymentMethodsError: string | null;
  locationsError: string | null;
  submitMatchingError: string | null;
}

export interface GuidedMatchingActions {
  fetchGuidedMatchingData: () => Promise<void>;
  updateMatchingCriteria: (data: Partial<P2PMatchingCriteria>) => void;
  submitMatchingCriteria: () => Promise<boolean>;
  setWizardStep: (step: number) => void;
  nextWizardStep: () => void;
  prevWizardStep: () => void;
  setWizardComplete: (complete: boolean) => void;
  resetGuidedMatching: () => void;
  togglePaymentMethod: (methodId: string) => void;
  clearGuidedMatchingErrors: () => void;
}

export const createGuidedMatchingSlice = (
  set: any,
  get: any
): GuidedMatchingState & GuidedMatchingActions => ({
  // Initial state
  matchingCriteria: {
    tradeType: "buy",
    cryptocurrency: "",
    amount: "0.1",
    paymentMethods: [],
    pricePreference: "best_price",
    traderPreference: "all",
    location: "any",
  },
  matchingResults: null,
  cryptocurrencies: [],
  paymentMethods: [],
  locations: [],
  wizardStep: 1,
  wizardComplete: false,

  // Loading states
  isLoadingCryptocurrencies: false,
  isLoadingPaymentMethods: false,
  isLoadingLocations: false,
  isSubmittingMatching: false,

  // Error states
  cryptocurrenciesError: null,
  paymentMethodsError: null,
  locationsError: null,
  submitMatchingError: null,

  // Actions
  fetchGuidedMatchingData: async () => {
    try {
      set({
        isLoadingCryptocurrencies: true,
        isLoadingPaymentMethods: true,
        isLoadingLocations: true,
        cryptocurrenciesError: null,
        paymentMethodsError: null,
        locationsError: null,
      });

      // Fetch cryptocurrencies
      const cryptoResponse = await $fetch({
        url: "/api/p2p/cryptocurrencies",
        silentSuccess: true,
      });

      if (cryptoResponse.error) {
        set({
          cryptocurrenciesError: "Failed to fetch cryptocurrencies",
          isLoadingCryptocurrencies: false,
        });
      } else {
        set({
          cryptocurrencies: cryptoResponse.data.cryptocurrencies || [],
          isLoadingCryptocurrencies: false,
        });

        // Set default cryptocurrency if available
        if (cryptoResponse.data.cryptocurrencies?.length > 0) {
          set((state: any) => ({
            matchingCriteria: {
              ...state.matchingCriteria,
              cryptocurrency: cryptoResponse.data.cryptocurrencies[0].id,
            },
          }));
        }
      }

      // Fetch payment methods
      const paymentResponse = await $fetch({
        url: "/api/p2p/payment-method",
        silentSuccess: true,
      });

      if (paymentResponse.error) {
        set({
          paymentMethodsError: "Failed to fetch payment methods",
          isLoadingPaymentMethods: false,
        });
      } else {
        set({
          paymentMethods: paymentResponse.data.paymentMethods || [],
          isLoadingPaymentMethods: false,
        });

        // Set default payment method if available
        if (paymentResponse.data.paymentMethods?.length > 0) {
          set((state: any) => ({
            matchingCriteria: {
              ...state.matchingCriteria,
              paymentMethods: [paymentResponse.data.paymentMethods[0].id],
            },
          }));
        }
      }

      // Fetch locations
      const locationResponse = await $fetch({
        url: "/api/p2p/location",
        silentSuccess: true,
      });

      if (locationResponse.error) {
        set({
          locationsError: "Failed to fetch locations",
          isLoadingLocations: false,
        });
      } else {
        set({
          locations: locationResponse.data.locations || [],
          isLoadingLocations: false,
        });
      }
    } catch (err) {
      set({
        cryptocurrenciesError: "An unexpected error occurred",
        paymentMethodsError: "An unexpected error occurred",
        locationsError: "An unexpected error occurred",
        isLoadingCryptocurrencies: false,
        isLoadingPaymentMethods: false,
        isLoadingLocations: false,
      });
    }
  },

  updateMatchingCriteria: (data: Partial<P2PMatchingCriteria>) => {
    set((state: any) => ({
      matchingCriteria: {
        ...state.matchingCriteria,
        ...data,
      },
    }));
  },

  submitMatchingCriteria: async () => {
    try {
      const criteria = get().matchingCriteria;
      set({ isSubmittingMatching: true, submitMatchingError: null });

      const { data, error } = await $fetch({
        url: "/api/p2p/guided-matching",
        method: "POST",
        body: criteria,
      });

      if (error) {
        set({
          submitMatchingError: "Failed to find matches",
          isSubmittingMatching: false,
        });
        return false;
      }

      // Process dates in the matching results
      const processedData = {
        ...data,
        matches: data.matches.map((match: any) => ({
          ...match,
          offer: {
            ...match.offer,
            createdAt: new Date(match.offer.createdAt),
          },
        })),
      };

      set({
        matchingResults: processedData,
        isSubmittingMatching: false,
        wizardComplete: true,
      });
      return true;
    } catch (err) {
      set({
        submitMatchingError: "An unexpected error occurred",
        isSubmittingMatching: false,
      });
      return false;
    }
  },

  setWizardStep: (step: number) => {
    set({ wizardStep: step });
  },

  nextWizardStep: () => {
    set((state: any) => ({ wizardStep: state.wizardStep + 1 }));
  },

  prevWizardStep: () => {
    set((state: any) => ({ wizardStep: Math.max(1, state.wizardStep - 1) }));
  },

  setWizardComplete: (complete: boolean) => {
    set({ wizardComplete: complete });
  },

  resetGuidedMatching: () => {
    set({
      matchingCriteria: {
        tradeType: "buy",
        cryptocurrency: "",
        amount: "0.1",
        paymentMethods: [],
        pricePreference: "best_price",
        traderPreference: "all",
        location: "any",
      },
      matchingResults: null,
      wizardStep: 1,
      wizardComplete: false,
    });
  },

  togglePaymentMethod: (methodId: string) => {
    set((state: any) => {
      const currentMethods = [...state.matchingCriteria.paymentMethods];
      const newMethods = currentMethods.includes(methodId)
        ? currentMethods.filter((id) => id !== methodId)
        : [...currentMethods, methodId];

      return {
        matchingCriteria: {
          ...state.matchingCriteria,
          paymentMethods: newMethods,
        },
      };
    });
  },

  clearGuidedMatchingErrors: () => {
    set({
      cryptocurrenciesError: null,
      paymentMethodsError: null,
      locationsError: null,
      submitMatchingError: null,
    });
  },
});
