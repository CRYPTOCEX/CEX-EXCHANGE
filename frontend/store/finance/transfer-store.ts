import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface WalletType {
  id: string;
  name: string;
}

interface Currency {
  value: string;
  label: string;
}

interface TransferState {
  // Transfer type selection
  transferType: "wallet" | "client" | null;
  setTransferType: (type: "wallet" | "client" | null) => Promise<void>;

  // From wallet selection
  availableWalletTypes: WalletType[];
  fromWalletType: string | null;
  setFromWalletType: (type: string | null) => void;

  // From currency selection
  fromCurrencies: Currency[];
  fromCurrency: string | null;
  setFromCurrency: (currency: string | null) => void;

  // To wallet selection (for wallet transfers)
  availableToWalletTypes: WalletType[];
  toWalletType: string | null;
  setToWalletType: (type: string | null) => void;

  // To currency selection
  toCurrencies: Currency[];
  toCurrency: string | null;
  setToCurrency: (currency: string | null) => void;

  // Client transfer fields
  recipientUuid: string;
  setRecipientUuid: (uuid: string) => void;
  recipientExists: boolean | null;
  recipientValidating: boolean;

  // Amount and balance
  amount: number;
  setAmount: (amount: number) => void;
  availableBalance: number;

  // Transfer details
  estimatedReceiveAmount: number;
  transferFee: number;
  exchangeRate: number | null;

  // UI state
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  transferSuccess: any | null;
  setTransferSuccess: (success: any | null) => void;

  // Actions
  fetchWalletTypes: () => Promise<void>;
  fetchFromCurrencies: (walletType: string) => Promise<void>;
  fetchToWalletTypes: (fromWalletType: string) => Promise<void>;
  fetchToCurrencies: (
    fromWalletType: string,
    toWalletType: string
  ) => Promise<void>;
  fetchBalance: (walletType: string, currency: string) => Promise<void>;
  checkRecipient: (uuid: string) => Promise<void>;
  fetchExchangeRateAndCalculate: () => Promise<void>;
  calculateTransferDetails: () => void;
  submitTransfer: () => Promise<void>;
  reset: () => void;
}

export const useTransferStore = create<TransferState>((set, get) => ({
  // Initial state
  transferType: null,
  availableWalletTypes: [],
  fromWalletType: null,
  fromCurrencies: [],
  fromCurrency: null,
  availableToWalletTypes: [],
  toWalletType: null,
  toCurrencies: [],
  toCurrency: null,
  recipientUuid: "",
  recipientExists: null,
  recipientValidating: false,
  amount: 0,
  availableBalance: 0,
  estimatedReceiveAmount: 0,
  transferFee: 0,
  exchangeRate: null,
  loading: false,
  error: null,
  transferSuccess: null,

  // Setters
  setTransferType: async (type) => {
    const currentState = get();
    // Reset form when changing transfer type (but not on initial load)
    if (
      currentState.transferType !== type &&
      currentState.transferType !== null
    ) {
      // Reset all form state except availableWalletTypes
      set({
        fromWalletType: null,
        fromCurrencies: [],
        fromCurrency: null,
        availableToWalletTypes: [],
        toWalletType: null,
        toCurrencies: [],
        toCurrency: null,
        recipientUuid: "",
        recipientExists: null,
        recipientValidating: false,
        amount: 0,
        availableBalance: 0,
        estimatedReceiveAmount: 0,
        transferFee: 0,
        exchangeRate: null,
        error: null,
        transferSuccess: null,
      });
    }
    set({ transferType: type, transferSuccess: null });

    // Fetch wallet types if they're not available
    if (currentState.availableWalletTypes.length === 0) {
      await currentState.fetchWalletTypes();
    }
  },
  setFromWalletType: (type) =>
    set({ fromWalletType: type, fromCurrency: null, fromCurrencies: [] }),
  setFromCurrency: async (currency) => {
    set({ fromCurrency: currency, availableBalance: 0 });
    // Automatically fetch balance when currency is selected
    const { fromWalletType } = get();
    if (fromWalletType && currency) {
      const state = get();
      await state.fetchBalance(fromWalletType, currency);
    }
  },
  setToWalletType: (type) => {
    set({ toWalletType: type, toCurrency: null, toCurrencies: [] });
  },
  setToCurrency: (currency) => {
    set({ toCurrency: currency });
    // Recalculate transfer details when target currency changes
    get().calculateTransferDetails();
  },
  setRecipientUuid: (uuid) =>
    set({ recipientUuid: uuid, recipientExists: null }),
  setAmount: (amount) => {
    set({ amount });
    get().calculateTransferDetails();
  },
  setError: (error) => set({ error }),
  setTransferSuccess: (success) => set({ transferSuccess: success }),

  // Actions
  fetchWalletTypes: async () => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: "/api/finance/wallet/transfer-options",
        silent: true,
      });

      if (error) {
        set({ error, loading: false });
        return;
      }

      set({ availableWalletTypes: data?.types || [], loading: false });
    } catch (err) {
      console.error("Error fetching wallet types:", err);
      set({ error: "Failed to fetch wallet types", loading: false });
    }
  },

  fetchFromCurrencies: async (walletType) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `/api/finance/currency?action=transfer&walletType=${walletType}`,
        silent: true,
      });

      if (error) {
        set({ error, loading: false });
        return;
      }

      const currencies = data?.from || [];
      set({ fromCurrencies: currencies, loading: false });
    } catch (err) {
      console.error("Error fetching from currencies:", err);
      set({ error: "Failed to fetch currencies", loading: false });
    }
  },

  fetchToWalletTypes: async (fromWalletType) => {
    const { availableWalletTypes } = get();

    // Apply transfer rules
    let availableToTypes: WalletType[] = [];

    if (fromWalletType === "FUTURES") {
      // FUTURES can only transfer to ECO
      availableToTypes = availableWalletTypes.filter(
        (type) => type.id === "ECO"
      );
    } else if (fromWalletType === "ECO") {
      // ECO can transfer to any type except itself
      availableToTypes = availableWalletTypes.filter(
        (type) => type.id !== "ECO"
      );
    } else {
      // FIAT and SPOT can transfer to any type except themselves
      availableToTypes = availableWalletTypes.filter(
        (type) => type.id !== fromWalletType
      );
    }

    set({ availableToWalletTypes: availableToTypes });
  },

  fetchToCurrencies: async (fromWalletType, toWalletType) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `/api/finance/currency?action=transfer&walletType=${fromWalletType}&targetWalletType=${toWalletType}`,
        silent: true,
      });

      if (error) {
        set({ error, loading: false });
        return;
      }

      const currencies = data?.to || [];
      set({ toCurrencies: currencies, loading: false });
    } catch (err) {
      console.error("Error fetching to currencies:", err);
      set({ error: "Failed to fetch target currencies", loading: false });
    }
  },

  fetchBalance: async (walletType, currency) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `/api/finance/wallet?walletType=${walletType}`,
        silent: true,
      });

      if (error) {
        set({ error, loading: false });
        return;
      }

      const wallet = data.items?.find(
        (w: any) => w.currency === currency && w.type === walletType
      );
      const balance = wallet?.balance || 0;

      set({ availableBalance: balance, loading: false });
    } catch (err) {
      console.error("Error fetching balance:", err);
      set({ error: "Failed to fetch wallet balance", loading: false });
    }
  },

  checkRecipient: async (uuid) => {
    if (!uuid.trim()) {
      set({ recipientExists: null, recipientValidating: false });
      return;
    }

    set({ recipientValidating: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `/api/finance/transfer/validate?uuid=${uuid}`,
        silent: true,
      });

      set({
        recipientExists: !error && data?.exists,
        recipientValidating: false,
      });
    } catch (err) {
      console.error("Error checking recipient:", err);
      set({ recipientExists: false, recipientValidating: false });
    }
  },

  fetchExchangeRateAndCalculate: async () => {
    const {
      amount,
      transferType,
      fromCurrency,
      toCurrency,
      fromWalletType,
      toWalletType
    } = get();

    // Validate required fields
    if (!amount || amount <= 0 || !transferType || !fromCurrency || !toCurrency || !fromWalletType || !toWalletType) {
      return;
    }

    // Skip for same currency or client transfers (they use 1:1)
    if (fromCurrency === toCurrency || transferType === "client") {
      return;
    }

    try {
      const { data, error } = await $fetch({
        url: `/api/finance/exchange-rate?fromCurrency=${fromCurrency}&fromType=${fromWalletType}&toCurrency=${toCurrency}&toType=${toWalletType}`,
        silent: true,
      });

      if (error || !data?.rate) {
        console.error("Error fetching exchange rate:", error);
        // Fallback to 1:1 on error (no fee for wallet transfers)
        set({
          estimatedReceiveAmount: Math.round(amount * 100) / 100,
          transferFee: 0,
          exchangeRate: null,
        });
        return;
      }

      // Calculate with real exchange rate (no fee for wallet transfers)
      const amountAfterFee = amount;
      const exchangeRate = data.rate;

      // Calculate estimated receive amount using exchange rate
      const estimatedReceive = amountAfterFee * exchangeRate;

      set({
        estimatedReceiveAmount: Math.round(estimatedReceive * 100000000) / 100000000, // 8 decimal places for crypto
        transferFee: 0,
        exchangeRate: exchangeRate,
      });
    } catch (err) {
      console.error("Error fetching exchange rate:", err);
      // Fallback to 1:1 on error (no fee for wallet transfers)
      set({
        estimatedReceiveAmount: Math.round(amount * 100) / 100,
        transferFee: 0,
        exchangeRate: null,
      });
    }
  },

  calculateTransferDetails: () => {
    const { amount, transferType, fromCurrency, toCurrency, fromWalletType, toWalletType } = get();

    if (!amount || amount <= 0) {
      set({ estimatedReceiveAmount: 0, transferFee: 0, exchangeRate: null });
      return;
    }

    // Validate required fields before calculation
    if (!transferType || !fromCurrency) {
      set({ estimatedReceiveAmount: 0, transferFee: 0, exchangeRate: null });
      return;
    }

    // Calculate transfer fee (1% for client transfers, 0% for wallet transfers)
    const feeRate = transferType === "client" ? 0.01 : 0;
    const fee = Math.round(amount * feeRate * 100) / 100; // Round to 2 decimal places
    const amountAfterFee = amount - fee;

    // Validate fee calculation
    if (fee < 0 || amountAfterFee < 0) {
      set({ estimatedReceiveAmount: 0, transferFee: 0, exchangeRate: null });
      return;
    }

    // For same currency transfers or client transfers (1:1 rate)
    if (fromCurrency === toCurrency || transferType === "client") {
      set({
        estimatedReceiveAmount: Math.round(amountAfterFee * 100) / 100,
        transferFee: fee,
        exchangeRate: 1,
      });
      return;
    }

    // For cross-currency transfers, fetch real exchange rates from backend
    if (fromWalletType && toWalletType) {
      // Fetch exchange rate asynchronously
      get().fetchExchangeRateAndCalculate();
    } else {
      // If wallet types not selected yet, use placeholder
      set({
        estimatedReceiveAmount: Math.round(amountAfterFee * 100) / 100,
        transferFee: fee,
        exchangeRate: null,
      });
    }
  },

  submitTransfer: async () => {
    const {
      transferType,
      fromWalletType,
      fromCurrency,
      toWalletType,
      toCurrency,
      amount,
      recipientUuid,
    } = get();

    set({ loading: true, error: null });

    try {
      const body: any = {
        fromType: fromWalletType,
        fromCurrency,
        amount,
      };

      if (transferType === "wallet") {
        body.toType = toWalletType;
        body.toCurrency = toCurrency;
        body.transferType = "wallet";
      } else {
        body.toType = fromWalletType; // Same wallet type for client transfers
        body.toCurrency = fromCurrency; // Same currency for client transfers
        body.transferType = "client";
        body.clientId = recipientUuid;
      }

      const { data, error } = await $fetch({
        url: "/api/finance/transfer",
        method: "POST",
        body,
        successMessage: "Transfer completed successfully",
      });

      if (error) {
        set({ error, loading: false });
        return Promise.reject(error);
      }

      set({ loading: false, transferSuccess: data });
      return Promise.resolve(data);
    } catch (err) {
      console.error("Error submitting transfer:", err);
      const errorMessage = "Failed to process transfer";
      set({ error: errorMessage, loading: false });
      return Promise.reject(errorMessage);
    }
  },

  reset: () => {
    const currentState = get();
    set({
      transferType: null,
      // Keep availableWalletTypes as they don't change
      availableWalletTypes: currentState.availableWalletTypes,
      fromWalletType: null,
      fromCurrencies: [],
      fromCurrency: null,
      availableToWalletTypes: [],
      toWalletType: null,
      toCurrencies: [],
      toCurrency: null,
      recipientUuid: "",
      recipientExists: null,
      recipientValidating: false,
      amount: 0,
      availableBalance: 0,
      estimatedReceiveAmount: 0,
      transferFee: 0,
      exchangeRate: null,
      loading: false,
      error: null,
      transferSuccess: null,
    });
  },
}));
