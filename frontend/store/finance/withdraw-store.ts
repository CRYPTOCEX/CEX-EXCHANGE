import { create } from "zustand";
import { asJsonArray } from "@/lib/json-column";
import { $fetch } from "@/lib/api";
import { useWalletStore } from "./wallet-store";

/**
 * Effective withdrawal two-factor policy, as reported by the backend. Computed
 * server-side on purpose: it is the intersection of several admin flags, and
 * re-deriving it here is how the two copies drift apart.
 */
export interface WithdrawTwoFactorPolicy {
  requireEnrollment: boolean;
  requireChallenge: boolean;
  acceptedTypes: string[];
  userType: string | null;
  userEnabled: boolean;
  satisfied: boolean;
}

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
  memo: string;
  withdrawalMethods: any[];
  isLoading: boolean;
  isSubmitting: boolean;
  currentStep: number;
  error: string | null;
  success: any | null;

  // ── Withdrawal 2FA (step-up verification)
  twoFactorPolicy: WithdrawTwoFactorPolicy | null;
  twoFactorPolicyLoading: boolean;
  /** True while the verification prompt is open, awaiting a code. */
  twoFactorPrompt: boolean;
  /** True once a code has actually been delivered (EMAIL/SMS); APP has nothing to send. */
  twoFactorCodeSent: boolean;
  twoFactorSending: boolean;
  twoFactorVerifying: boolean;
  twoFactorError: string | null;

  setWalletType: (type: string) => void;
  setCurrency: (currency: string) => void;
  setAmount: (amount: string) => void;
  setAddress: (address: string) => void;
  setNetwork: (network: string) => void;
  setWithdrawMethod: (method: string) => void;
  setBankDetails: (details: any) => void;
  setCustomFields: (fields: Record<string, any>) => void;
  setMemo: (memo: string) => void;
  fetchWithdrawalMethods: () => Promise<void>;
  fetchTwoFactorPolicy: () => Promise<void>;
  submitWithdrawal: (twoFactorToken?: string) => Promise<void>;
  /** Opens the verification prompt and delivers a code over the user's 2FA channel. */
  requestTwoFactorCode: () => Promise<void>;
  /** Verifies the entered code, then submits the withdrawal with the resulting token. */
  confirmTwoFactor: (otp: string) => Promise<void>;
  cancelTwoFactor: () => void;
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
  memo: "",
  withdrawalMethods: [],
  isLoading: false,
  isSubmitting: false,
  currentStep: 1,
  error: null,
  success: null,

  twoFactorPolicy: null,
  twoFactorPolicyLoading: false,
  twoFactorPrompt: false,
  twoFactorCodeSent: false,
  twoFactorSending: false,
  twoFactorVerifying: false,
  twoFactorError: null,

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

  setMemo: (memo) => {
    set({ memo, error: null });
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

  fetchTwoFactorPolicy: async () => {
    set({ twoFactorPolicyLoading: true });
    const { data, error } = await $fetch({
      url: "/api/finance/withdraw/verification",
      silent: true,
    });
    if (!error && data) {
      set({ twoFactorPolicy: data as WithdrawTwoFactorPolicy });
    }
    // A failed policy fetch must not block the form: the backend enforces the
    // policy regardless, so the worst case is the user learns about the
    // requirement from the submit response instead of up front.
    set({ twoFactorPolicyLoading: false });
  },

  requestTwoFactorCode: async () => {
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
        error: null,
      });
      return;
    }

    set({
      twoFactorPrompt: true,
      twoFactorSending: true,
      twoFactorError: null,
      error: null,
    });

    const { data, error } = await $fetch({
      url: "/api/finance/withdraw/verification",
      method: "POST",
      silent: true,
    });

    if (error) {
      set({
        twoFactorSending: false,
        twoFactorError: error,
      });
      return;
    }

    set({
      twoFactorSending: false,
      twoFactorCodeSent: Boolean(data?.delivered),
    });
  },

  confirmTwoFactor: async (otp: string) => {
    if (!otp || otp.length < 6) {
      set({ twoFactorError: "Enter the complete 6-digit code" });
      return;
    }

    set({ twoFactorVerifying: true, twoFactorError: null });

    const { data, error } = await $fetch({
      url: "/api/finance/withdraw/verification/verify",
      method: "POST",
      body: { otp },
      silent: true,
    });

    if (error || !data?.twoFactorToken) {
      set({
        twoFactorVerifying: false,
        twoFactorError: error || "Verification failed. Please try again.",
      });
      return;
    }

    // Verification passed — close the prompt and submit, threading the
    // single-use token straight through. The token is never persisted in the
    // store: it authorises exactly one withdrawal and is burned server-side.
    set({
      twoFactorVerifying: false,
      twoFactorPrompt: false,
      twoFactorCodeSent: false,
    });
    await get().submitWithdrawal(data.twoFactorToken);
  },

  cancelTwoFactor: () => {
    set({
      twoFactorPrompt: false,
      twoFactorCodeSent: false,
      twoFactorSending: false,
      twoFactorVerifying: false,
      twoFactorError: null,
      isSubmitting: false,
    });
  },

  submitWithdrawal: async (twoFactorToken?: string) => {
    const {
      walletType,
      currency,
      amount,
      address,
      network,
      withdrawMethod,
      bankDetails,
      customFields,
      memo,
      withdrawalMethods,
    } = get();

    // Resolve the custom-field key that holds the destination address. Prefer
    // an exact (case-insensitive) match against well-known names to avoid
    // picking up an unrelated key that merely contains "address" in its name
    // (e.g. "returnAddress" vs. "destinationAddress"). Falls back to the old
    // substring scan to preserve behaviour for legacy admin configs.
    const resolveAddressKey = (
      fields: Record<string, any> | undefined
    ): string | undefined => {
      if (!fields) return undefined;
      const keys = Object.keys(fields);
      const preferred = [
        "destinationAddress",
        "recipientAddress",
        "walletAddress",
        "toAddress",
        "address",
      ];
      for (const want of preferred) {
        const hit = keys.find((k) => k.toLowerCase() === want.toLowerCase());
        if (hit) return hit;
      }
      return keys.find((k) => k.toLowerCase().includes("address"));
    };

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
      {
        // `asJsonArray` — the array shape threw and the catch set
        // "Invalid method configuration. Please contact support."
        const fields = asJsonArray<any>(method.customFields);
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
      }
    }

    // ── Withdrawal 2FA gate.
    // The backend enforces this regardless; intercepting here just turns a
    // guaranteed 403 into the verification prompt the user actually needs.
    let policy = get().twoFactorPolicy;
    if (!policy) {
      await get().fetchTwoFactorPolicy();
      policy = get().twoFactorPolicy;
    }
    if (policy && !policy.satisfied) {
      set({
        error:
          "Withdrawals require two-factor authentication. Enable it in your profile security settings to continue.",
      });
      return;
    }
    if (policy?.requireChallenge && !twoFactorToken) {
      // Opens the prompt and sends a code; confirmTwoFactor() re-enters this
      // function with a token once the user has verified.
      await get().requestTwoFactorCode();
      return;
    }

    set({ isSubmitting: true, error: null });

    // Mint a single per-submission nonce and thread it through the request so
    // a network-layer retry of the same button press collapses server-side
    // instead of debiting the wallet twice. A later re-click is a separate
    // intent and correctly gets a new nonce. Only SPOT + FIAT accept it today;
    // ECO manages its own idempotency nonce server-side.
    const withdrawNonce =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

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
          nonce: withdrawNonce,
          ...(twoFactorToken ? { twoFactorToken } : {}),
        };
      } else if (walletType === "SPOT") {
        // For SPOT, we need to extract address and chain from custom fields
        const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
        let toAddress = "";
        let chain = withdrawMethod; // Default to method ID as chain

        // Look for the destination-address custom field using known names
        // (exact, case-insensitive) before falling back to substring match.
        const addressField = resolveAddressKey(customFields);
        if (addressField) {
          toAddress = customFields[addressField];
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
          ...(memo ? { memo } : {}),
          nonce: withdrawNonce,
          ...(twoFactorToken ? { twoFactorToken } : {}),
        };
      } else if (walletType === "ECO") {
        // For ECO, use the ecosystem withdrawal endpoint
        const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
        let toAddress = "";
        let chain = withdrawMethod; // Default to method ID as chain

        // Look for the destination-address custom field using known names
        // (exact, case-insensitive) before falling back to substring match.
        const addressField = resolveAddressKey(customFields);
        if (addressField) {
          toAddress = customFields[addressField];
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
          ...(memo ? { memo } : {}),
          ...(twoFactorToken ? { twoFactorToken } : {}),
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

        // Refresh wallet data after successful withdrawal. `fetchWallet` alone
        // updated only the single wallet detail view — the hero total, the
        // allocation panel and the header balance chip all read the aggregate
        // stats, which stayed latched on their pre-withdrawal values.
        const walletStore = useWalletStore.getState();
        await Promise.all([
          walletStore.fetchWallet(walletType, currency),
          walletStore.refreshBalances(),
        ]);
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
      memo: "",
      withdrawalMethods: [],
      isLoading: false,
      isSubmitting: false,
      currentStep: 1,
      error: null,
      success: null,
      // The policy itself is platform config, not per-attempt state, so it
      // survives a reset; only the in-flight challenge is cleared.
      twoFactorPrompt: false,
      twoFactorCodeSent: false,
      twoFactorSending: false,
      twoFactorVerifying: false,
      twoFactorError: null,
    });
  },
}));
