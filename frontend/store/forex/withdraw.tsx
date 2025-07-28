import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";

type WalletType = {
  value: string;
  label: string;
};

type Currency = any;

type WithdrawStore = {
  step: number;
  loading: boolean;
  account: any | null;
  walletTypes: WalletType[];
  selectedWalletType: WalletType;
  currencies: Currency[];
  selectedCurrency: string | null;
  withdrawMethods: any[];
  selectedWithdrawMethod: any | null;
  withdrawAmount: number;
  withdraw: any;
  setStep: (step: number) => void;
  clearAll: () => void;
  setLoading: (loading: boolean) => void;
  setSelectedWalletType: (walletType: WalletType) => void;
  setSelectedCurrency: (currency: string | null) => void;
  setWithdrawMethods: (methods: any[]) => void;
  setSelectedWithdrawMethod: (method: any | null) => void;
  setWithdrawAmount: (amount: number) => void;
  handleWithdraw: (id: string) => Promise<void>;
  setWithdraw: (withdraw: any) => void;
  fetchCurrencies: () => Promise<void>;
  fetchWithdrawMethods: () => Promise<void>;
  fetchAccount: (id: string) => Promise<void>;
};

const endpoint = "/api/finance";

export const useWithdrawStore = create<WithdrawStore>((set, get) => ({
  step: 1,
  account: null,
  walletTypes: [
    { value: "FIAT", label: "Fiat" },
    { value: "SPOT", label: "Spot" },
  ],
  selectedWalletType: { value: "", label: "Select a wallet type" },
  currencies: [],
  selectedCurrency: null,
  withdrawMethods: [],
  selectedWithdrawMethod: null,
  withdrawAmount: 0,
  loading: false,
  withdraw: null,

  setStep: (step) => set({ step }),
  setSelectedWalletType: (walletType) =>
    set({ selectedWalletType: walletType }),
  setSelectedCurrency: (currency) => set({ selectedCurrency: currency }),
  setWithdrawMethods: (methods) => set({ withdrawMethods: methods }),
  setSelectedWithdrawMethod: (method) =>
    set({ selectedWithdrawMethod: method }),
  setWithdrawAmount: (amount) => set({ withdrawAmount: amount }),
  setWithdraw: (withdraw) => set({ withdraw }),
  setLoading: (loading) => set({ loading }),

  handleWithdraw: async (id: string) => {
    const {
      selectedWalletType,
      withdrawAmount,
      selectedCurrency,
      selectedWithdrawMethod,
      setLoading,
      account,
    } = get();

    // Validate required fields before submission
    if (!selectedWalletType?.value || selectedWalletType.value === "") {
      toast.error("Please select a wallet type");
      return;
    }

    if (!selectedCurrency) {
      toast.error("Please select a currency");
      return;
    }

    if (!withdrawAmount || withdrawAmount <= 0) {
      toast.error("Please enter a valid withdrawal amount");
      return;
    }

    // Validate against account balance
    if (account && account.balance !== undefined) {
      if (withdrawAmount > account.balance) {
        toast.error(`Insufficient balance. Available: ${account.balance}`);
        return;
      }
    }

    // For non-FIAT withdrawals, validate method selection
    if (selectedWalletType.value !== "FIAT" && !selectedWithdrawMethod) {
      toast.error("Please select a withdrawal method");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/forex/account/${id}/withdraw`,
        silent: true,
        method: "POST",
        body: {
          type: selectedWalletType.value,
          currency: selectedCurrency,
          chain:
            selectedWalletType.value !== "FIAT"
              ? selectedWithdrawMethod?.chain
              : undefined,
          amount: withdrawAmount,
        },
      });

      if (!error) {
        // Determine final step based on wallet type
        const finalStep = selectedWalletType.value === "FIAT" ? 4 : 5;
        set({ withdraw: data, step: finalStep });
        toast.success("Withdrawal initiated successfully!");
      } else {
        toast.error(error || "An unexpected error occurred");
      }
    } catch (err) {
      console.error("Error during withdrawal:", err);
      toast.error("A network error occurred while processing your withdrawal");
    } finally {
      setLoading(false);
    }
  },

  fetchCurrencies: async () => {
    const { selectedWalletType } = get();
    try {
      const { data, error } = await $fetch({
        url: `${endpoint}/currency?action=withdraw&walletType=${selectedWalletType.value}`,
        silent: true,
      });
      if (error) {
        toast.error("An error occurred while fetching currencies");
        set({ step: 1 });
      } else {
        set({ currencies: data, step: 2 });
      }
    } catch (error) {
      console.error("Error in fetching currencies:", error);
      toast.error("An error occurred while fetching currencies");
    }
  },

  fetchWithdrawMethods: async () => {
    const { selectedWalletType, selectedCurrency } = get();
    try {
      const { data, error } = await $fetch({
        url: `${endpoint}/currency/${selectedWalletType.value}/${selectedCurrency}?action=withdraw`,
        silent: true,
      });
      if (!error) {
        set({ withdrawMethods: data, step: 3 });
      } else {
        toast.error("An error occurred while fetching withdrawal methods");
        set({ step: 2 });
      }
    } catch (error) {
      console.error("Error in fetching withdraw methods:", error);
      toast.error("An error occurred while fetching withdrawal methods");
    }
  },

  fetchAccount: async (id: string) => {
    try {
      const { data, error } = await $fetch({
        url: `/api/forex/account/${id}`,
        silent: true,
      });
      if (!error) {
        set({ account: data });
      }
    } catch (error) {
      console.error("Error in fetching account:", error);
    }
  },

  clearAll: () =>
    set(() => ({
      step: 1,
      selectedWalletType: { value: "", label: "Select a wallet type" },
      currencies: [],
      selectedCurrency: null,
      withdrawMethods: [],
      selectedWithdrawMethod: null,
      withdrawAmount: 0,
      loading: false,
      withdraw: null,
    })),
}));
