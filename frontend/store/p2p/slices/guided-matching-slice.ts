import { $fetch } from "@/lib/api";

// `$fetch` always resolves `{ data, error }` and never throws, so the server's
// explanation only reaches the user if we read it off `error`. Mirrors the
// helper in offer-slice.ts / trade-slice.ts / dashboard-slice.ts.
const errorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const message = (error as any).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

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

      // M20: fetch all three endpoints in parallel instead of sequentially
      const [cryptoResponse, paymentResponse, locationResponse] = await Promise.all([
        $fetch({ url: "/api/p2p/cryptocurrencies", silentSuccess: true }),
        $fetch({ url: "/api/p2p/payment-method", silentSuccess: true }),
        $fetch({ url: "/api/p2p/location", silentSuccess: true }),
      ]);

      // Process cryptocurrencies.
      //
      // `data` is not necessarily an object: an unknown route answers with the
      // plain string "Not Found" at HTTP 200, which `$fetch` cannot distinguish
      // from success. Reading `.cryptocurrencies` off it yielded undefined and
      // an empty list was stored with no error shown anywhere. Treat a response
      // that carries no list as the failure it is.
      const cryptoList = Array.isArray((cryptoResponse.data as any)?.cryptocurrencies)
        ? (cryptoResponse.data as any).cryptocurrencies
        : null;

      if (cryptoResponse.error || !cryptoList) {
        set({
          cryptocurrenciesError: errorMessage(
            cryptoResponse.error,
            "Failed to fetch cryptocurrencies"
          ),
          cryptocurrencies: [],
          isLoadingCryptocurrencies: false,
        });
      } else {
        set({
          cryptocurrencies: cryptoList,
          isLoadingCryptocurrencies: false,
        });

        // Set default cryptocurrency if available
        if (cryptoList.length > 0) {
          set((state: any) => ({
            matchingCriteria: {
              ...state.matchingCriteria,
              cryptocurrency: cryptoList[0].id,
            },
          }));
        }
      }

      // Process payment methods
      if (paymentResponse.error) {
        set({
          paymentMethodsError: "Failed to fetch payment methods",
          isLoadingPaymentMethods: false,
        });
      } else {
        // Handle new API response format: { global: [...], custom: [...] }
        let allMethods: P2PPaymentMethod[] = [];
        const responseData = paymentResponse.data;

        if (responseData && typeof responseData === "object" && "global" in responseData) {
          // New format with separated global and custom methods
          allMethods = [
            ...(responseData.global || []),
            ...(responseData.custom || []),
          ];
        } else if (responseData?.paymentMethods) {
          // Legacy format with paymentMethods wrapper
          allMethods = responseData.paymentMethods;
        } else if (Array.isArray(responseData)) {
          // Legacy format: flat array
          allMethods = responseData;
        }

        set({
          paymentMethods: allMethods,
          isLoadingPaymentMethods: false,
        });

        // Set default payment method if available
        if (allMethods.length > 0) {
          set((state: any) => ({
            matchingCriteria: {
              ...state.matchingCriteria,
              paymentMethods: [allMethods[0].id],
            },
          }));
        }
      }

      // Process locations
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

      // M19: guard against undefined data.matches to prevent crash
      const matches = data?.matches || [];
      const processedData = {
        ...data,
        matches: matches.map((match: any) => ({
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
