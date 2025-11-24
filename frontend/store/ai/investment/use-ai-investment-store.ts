import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { $fetch } from "@/lib/api";

// Types
export interface AiInvestment {
  id: string;
  userId: string;
  planId: string;
  durationId?: string;
  symbol: string;
  type: "SPOT" | "ECO";
  amount: number;
  profit?: number;
  result?: "WIN" | "LOSS" | "DRAW";
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

export interface AiInvestmentPlan {
  id: string;
  title: string;
  description?: string;
  image?: string;
  status?: boolean;
  invested: number;
  profitPercentage: number;
  minAmount: number;
  maxAmount: number;
  trending?: boolean;
  durations?: Array<{
    id: string;
    duration: number;
    timeframe: string;
  }>;
}

interface AiInvestmentState {
  // Data
  investments: AiInvestment[];
  plans: AiInvestmentPlan[];

  // UI state
  isLoadingInvestments: boolean;
  isLoadingPlans: boolean;
  selectedPlanId: string | null;
  selectedDurationId: string | null;
  investmentAmount: number;
  apiError: string | null;

  // Actions
  fetchInvestments: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  createInvestment: (data: {
    planId: string;
    durationId?: string;
    amount: number;
    currency: string;
    pair: string;
    type: "SPOT" | "ECO";
  }) => Promise<{ success: boolean; data?: AiInvestment; error?: string }>;
  cancelInvestment: (
    id: string
  ) => Promise<{ success: boolean; error?: string }>;
  setSelectedPlan: (planId: string | null) => void;
  setSelectedDuration: (durationId: string | null) => void;
  setInvestmentAmount: (amount: number) => void;
  resetApiError: () => void;
}

export const useAiInvestmentStore = create<AiInvestmentState>()(
  devtools(
    persist(
      (set, get) => ({
        // Data
        investments: [],
        plans: [],

        // UI state
        isLoadingInvestments: false,
        isLoadingPlans: false,
        selectedPlanId: null,
        selectedDurationId: null,
        investmentAmount: 0,
        apiError: null,

        // Actions
        fetchInvestments: async () => {
          try {
            set({ isLoadingInvestments: true, apiError: null });

            const { data, error } = await $fetch({
              url: "/api/ai/investment/log",
              silentSuccess: true,
            });

            if (!error) {
              // Ensure data is an array
              const investments = Array.isArray(data) ? data : [];
              set({ investments });
            } else {
              console.error("Failed to fetch AI investments:", error);
              set({ apiError: `Failed to fetch investments: ${error}` });
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.error("Error fetching AI investments:", error);
            set({ apiError: `Error fetching investments: ${errorMessage}` });
          } finally {
            set({ isLoadingInvestments: false });
          }
        },

        fetchPlans: async () => {
          try {
            set({ isLoadingPlans: true, apiError: null });

            // Fetch from API
            const { data, error } = await $fetch({
              url: "/api/ai/investment/plan",
              silentSuccess: true,
            });


            if (!error && data) {
              // Validate the data structure
              if (Array.isArray(data)) {
                set({ plans: data });

                // Select first plan if none selected and plans exist
                if (data.length > 0 && !get().selectedPlanId) {
                  const firstPlan = data[0];
                  set({
                    selectedPlanId: firstPlan.id,
                    selectedDurationId:
                      firstPlan.durations && firstPlan.durations.length > 0
                        ? firstPlan.durations[0].id
                        : null,
                  });
                }
              } else if (typeof data === "object" && data !== null) {
                // Handle case where data might be an object with plans inside
                const extractedPlans = data.plans || data.data || [];
                const plansArray = Array.isArray(extractedPlans)
                  ? extractedPlans
                  : [];
                console.log("Extracted plans from object:", plansArray);
                set({ plans: plansArray });

                // Select first plan if none selected and plans exist
                if (plansArray.length > 0 && !get().selectedPlanId) {
                  const firstPlan = plansArray[0];
                  set({
                    selectedPlanId: firstPlan.id,
                    selectedDurationId:
                      firstPlan.durations && firstPlan.durations.length > 0
                        ? firstPlan.durations[0].id
                        : null,
                  });
                }
              } else {
                // Set empty array and show error if data format is invalid
                console.warn("Invalid data format from API");
                set({
                  plans: [],
                  apiError: "Invalid data format from API",
                });
              }
            } else {
              // Set empty array and show error if API fails
              console.warn("API error or no data:", error);
              set({
                plans: [],
                apiError: `API error: ${error || "No data returned"}`,
              });
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.error("Error fetching AI investment plans:", error);

            // Set empty array and show error
            set({
              plans: [],
              apiError: `Error fetching plans: ${errorMessage}`,
            });
          } finally {
            set({ isLoadingPlans: false });
          }
        },

        createInvestment: async (data) => {
          try {
            set({ apiError: null });

            const { data: responseData, error } = await $fetch({
              url: "/api/ai/investment/log",
              method: "POST",
              body: data,
            });

            if (!error) {
              // Add the new investment to the state
              set({
                investments: [responseData, ...get().investments],
                // Reset form values
                investmentAmount: 0,
              });

              return { success: true, data: responseData };
            } else {
              set({ apiError: `Failed to create investment: ${error}` });
              return { success: false, error };
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.error("Error creating AI investment:", error);
            set({ apiError: `Error creating investment: ${errorMessage}` });
            return { success: false, error: errorMessage };
          }
        },

        cancelInvestment: async (id) => {
          try {
            set({ apiError: null });

            const { data, error } = await $fetch({
              url: `/api/ai/investment/log/${id}`,
              method: "DELETE",
            });

            if (!error) {
              // Update the investment in the state
              set({
                investments: get().investments.map((inv) =>
                  inv.id === id ? { ...inv, status: "CANCELLED" } : inv
                ),
              });

              return { success: true };
            } else {
              set({ apiError: `Failed to cancel investment: ${error}` });
              return { success: false, error };
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.error("Error cancelling AI investment:", error);
            set({ apiError: `Error cancelling investment: ${errorMessage}` });
            return { success: false, error: errorMessage };
          }
        },

        setSelectedPlan: (planId) => {
          set({ selectedPlanId: planId });

          // If we have a new plan selected, also select its first duration
          if (planId) {
            const { plans } = get();
            const selectedPlan = plans.find((plan) => plan.id === planId);
            if (
              selectedPlan &&
              selectedPlan.durations &&
              selectedPlan.durations.length > 0
            ) {
              set({ selectedDurationId: selectedPlan.durations[0].id });
            } else {
              set({ selectedDurationId: null });
            }
          } else {
            set({ selectedDurationId: null });
          }
        },

        setSelectedDuration: (durationId) => {
          set({ selectedDurationId: durationId });
        },

        setInvestmentAmount: (amount) => {
          set({ investmentAmount: amount });
        },

        resetApiError: () => {
          set({ apiError: null });
        },
      }),
      {
        name: "ai-investment-store",
        partialize: (state) => ({
          selectedPlanId: state.selectedPlanId,
          selectedDurationId: state.selectedDurationId,
        }),
      }
    )
  )
);

// Initialize the store
export const initializeAiInvestmentStore = async () => {
  const store = useAiInvestmentStore.getState();

  try {
    // Fetch initial data
    await store.fetchPlans();
    await store.fetchInvestments();
  } catch (error) {
    console.error("Failed to initialize AI investment store:", error);
  }
};
