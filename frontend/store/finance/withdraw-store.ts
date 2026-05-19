import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useWalletStore } from "./wallet-store";

interface WithdrawState {
  walletType: string;
  currency: string;
  amount: string;
  address: string;
  network: string;
  withdrawMethod: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    swiftCode: string;
    routingNumber: string;
  };
  customFields: Record<string, any>;
  withdrawalMethods: any[];
  isLoading: boolean;
  isSubmitting: boolean;
  currentStep: number;
  error: string | null;
  success: any | null;

  setWalletType: (type: string) => void;
  setCurrency: (currency: string) => void;
  setAmount: (amount: string) => void;
  setAddress: (address: string) => void;
  setNetwork: (network: string) => void;
  setWithdrawMethod: (method: string) => void;
  setBankDetails: (details: any) => void;
  setCustomFields: (fields: Record<string, any>) => void;
  fetchWithdrawalMethods: () => Promise<void>;
  submitWithdrawal: () => Promise<void>;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  reset: () => void;
}

export const useWithdrawStore = create<WithdrawState>((set, get) => ({
  walletType: "",
  currency: "",
  amount: "",
  address: "",
  network: "",
  withdrawMethod: "",
  bankDetails: {
    accountName: "",
    accountNumber: "",
    bankName: "",
    swiftCode: "",
    routingNumber: "",
  },
  customFields: {},
  withdrawalMethods: [],
  isLoading: false,
  isSubmitting: false,
  currentStep: 1,
  error: null,
  success: null,

  setWalletType: (type) => {
    set({ walletType: type, currency: "", withdrawalMethods: [], error: null });
  },

  setCurrency: (currency) => {
    set({ currency, error: null });
    // Add delay to ensure currency is set before fetching methods
    setTimeout(() => {
      get().fetchWithdrawalMethods();
    }, 100);
  },

  setAmount: (amount) => {
    // Only allow numbers and a single decimal point
    if (amount === "" || /^\d*\.?\d*$/.test(amount)) {
      set({ amount, error: null });
    }
  },

  setAddress: (address) => {
    set({ address, error: null });
  },

  setNetwork: (network) => {
    set({ network, error: null });
  },

  setWithdrawMethod: (method) => {
    set({ withdrawMethod: method, error: null });
  },

  setBankDetails: (details) => {
    set({ bankDetails: { ...get().bankDetails, ...details }, error: null });
  },

  setCustomFields: (fields) => {
    set({ customFields: { ...get().customFields, ...fields }, error: null });
  },

  fetchWithdrawalMethods: async () => {
    const { walletType, currency } = get();
    if (!walletType || !currency) {
      console.warn("[Withdraw Store] Cannot fetch methods: missing walletType or currency");
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `/api/finance/currency/${walletType}/${currency}?action=withdraw`,
        silent: true,
      });

      if (!error && data) {
        let methods: any[] = [];

        if (walletType === "FIAT") {
          // For FIAT, data contains { methods: [...] }
          methods = data.methods || [];
        } else {
          // For SPOT/ECO, data is an array of network methods
          methods = Array.isArray(data) ? data : [];
        }

        // Validate that methods have required fields
        const validMethods = methods.filter(method => {
          if (!method.id) {
            console.warn("[Withdraw Store] Method missing ID:", method);
            return false;
          }
          return true;
        });

        console.log(`[Withdraw Store] Fetched ${validMethods.length} valid withdrawal methods for ${walletType}/${currency}`);
        set({ 
          withdrawalMethods: validMethods, 
          isLoading: false,
          // Clear previous selection when new methods are loaded
          withdrawMethod: "",
          network: "",
          customFields: {}
        });
      } else {
        console.error("[Withdraw Store] API error:", error);
        set({
          withdrawalMethods: [],
          isLoading: false,
          error: error || "Failed to fetch withdrawal methods",
        });
      }
    } catch (err) {
      console.error("Exception in fetchWithdrawalMethods:", err);
      set({
        withdrawalMethods: [],
        isLoading: false,
        error: "An error occurred while fetching withdrawal methods",
      });
    }
  },

  submitWithdrawal: async () => {
    const {
      walletType,
      currency,
      amount,
      address,
      network,
      withdrawMethod,
      bankDetails,
      customFields,
      withdrawalMethods,
    } = get();

    // Validate required fields
    if (!walletType || !currency || !amount) {
      set({ error: "Please fill in all required fields" });
      return;
    }

    const parsedAmount = Number.parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      set({ error: "Amount must be a valid positive number" });
      return;
    }

    // Check wallet balance before submitting
    const walletStore = useWalletStore.getState();
    const currentWallet = walletStore.wallet;
    
    if (!currentWallet || currentWallet.balance === undefined) {
      set({ error: "Unable to verify wallet balance. Please refresh and try again." });
      return;
    }

    if (parsedAmount > currentWallet.balance) {
      set({ error: `Insufficient balance. Available: ${currentWallet.balance} ${currency}` });
      return;
    }

    // Validate withdrawal method selection
    if (!withdrawMethod) {
      set({ error: "Please select a withdrawal method" });
      return;
    }

    // Validate custom fields
    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
    if (!method) {
      set({ error: "Selected withdrawal method is not available" });
      return;
    }

    if (method?.customFields) {
      try {
        const fields = JSON.parse(method.customFields);
        for (const field of fields) {
          if (field.required) {
            const fieldValue = customFields[field.name];
            if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
              set({ error: `${field.title || field.name} is required` });
              return;
            }
            
            // Validate field types
            if (field.type === 'email' && fieldValue) {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(fieldValue)) {
                set({ error: `${field.title || field.name} must be a valid email address` });
                return;
              }
            }
            
            // Validate minimum length if specified
            if (field.minLength && fieldValue.length < field.minLength) {
              set({ error: `${field.title || field.name} must be at least ${field.minLength} characters` });
              return;
            }
          }
        }
      } catch (err) {
        console.error("Error parsing custom fields for validation:", err);
        set({ error: "Invalid method configuration. Please contact support." });
        return;
      }
    }

    set({ isSubmitting: true, error: null });

    try {
      let endpoint = "";
      let requestBody: any = {};

      if (walletType === "FIAT") {
        endpoint = "/api/finance/withdraw/fiat";
        requestBody = {
          methodId: withdrawMethod,
          amount: Number.parseFloat(amount),
          currency,
          customFields,
        };
      } else if (walletType === "SPOT") {
        // For SPOT, we need to extract address and chain from custom fields
        const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
        let toAddress = "";
        let chain = withdrawMethod; // Default to method ID as chain

        // Look for address in custom fields
        if (customFields) {
          const addressField = Object.keys(customFields).find((key) =>
            key.toLowerCase().includes("address")
          );
          if (addressField) {
            toAddress = customFields[addressField];
          }
        }

        if (method?.network) {
          chain = method.network;
        }

        endpoint = "/api/finance/withdraw/spot";
        requestBody = {
          currency,
          chain,
          amount: Number.parseFloat(amount),
          toAddress,
          ...customFields, // Include any additional custom fields
        };
      } else if (walletType === "ECO") {
        // For ECO, use the ecosystem withdrawal endpoint
        const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
        let toAddress = "";
        let chain = withdrawMethod; // Default to method ID as chain

        // Look for address in custom fields
        if (customFields) {
          const addressField = Object.keys(customFields).find((key) =>
            key.toLowerCase().includes("address")
          );
          if (addressField) {
            toAddress = customFields[addressField];
          }
        }

        if (method?.network) {
          chain = method.network;
        }

        endpoint = "/api/ecosystem/withdraw";
        requestBody = {
          currency,
          chain,
          amount: Number.parseFloat(amount),
          toAddress,
          ...customFields, // Include any additional custom fields
        };
      } else {
        throw new Error(`Unsupported wallet type: ${walletType}`);
      }

      const { data, error } = await $fetch({
        url: endpoint,
        method: "POST",
        body: requestBody,
      });

      if (!error && data) {
        set({ success: data, isSubmitting: false, currentStep: 3 });

        // Refresh wallet data after successful withdrawal
        const walletStore = useWalletStore.getState();
        await walletStore.fetchWallet(walletType, currency);
      } else {
        set({
          error: error || "Failed to process withdrawal request",
          isSubmitting: false,
        });
      }
    } catch (err) {
      console.error("Exception in submitWithdrawal:", err);
      set({
        error: "An error occurred while processing your withdrawal request",
        isSubmitting: false,
      });
    }
  },

  nextStep: () => {
    const currentStep = get().currentStep;
    set({ currentStep: currentStep + 1, error: null });
  },

  prevStep: () => {
    const currentStep = get().currentStep;
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1, error: null });
    }
  },

  setStep: (step) => {
    set({ currentStep: step, error: null });
  },

  reset: () => {
    set({
      walletType: "",
      currency: "",
      amount: "",
      address: "",
      network: "",
      withdrawMethod: "",
      bankDetails: {
        accountName: "",
        accountNumber: "",
        bankName: "",
        swiftCode: "",
        routingNumber: "",
      },
      customFields: {},
      withdrawalMethods: [],
      isLoading: false,
      isSubmitting: false,
      currentStep: 1,
      error: null,
      success: null,
    });
  },
}));
