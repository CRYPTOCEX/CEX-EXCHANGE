import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";

type WalletType = {
  value: string;
  label: string;
};

type Currency = any;

type DepositStore = {
  step: number;
  loading: boolean;
  walletTypes: WalletType[];
  selectedWalletType: WalletType;
  currencies: Currency[];
  selectedCurrency: string | null;
  depositMethods: any[];
  selectedDepositMethod: any | null;
  depositAmount: number;
  deposit: any;
  setStep: (step: number) => void;
  clearAll: () => void;
  setLoading: (loading: boolean) => void;
  setSelectedWalletType: (walletType: WalletType) => void;
  setSelectedCurrency: (currency: string) => void;
  setDepositMethods: (methods: any[]) => void;
  setSelectedDepositMethod: (method: any | null) => void;
  setDepositAmount: (amount: number) => void;
  handleDeposit: (id: string) => Promise<void>;
  setDeposit: (deposit: any) => void;
  fetchCurrencies: () => void;
  fetchDepositMethods: () => void;
};

const endpoint = "/api/finance";

export const useDepositStore = create<DepositStore>((set, get) => ({
  step: 1,
  walletTypes: [
    { value: "FIAT", label: "Fiat" },
    { value: "SPOT", label: "Spot" },
  ],
  selectedWalletType: { value: "", label: "Select a wallet type" },
  currencies: [],
  selectedCurrency: null,
  depositMethods: [],
  selectedDepositMethod: null,
  depositAmount: 0,
  loading: false,
  deposit: null,

  setStep: (step) => set({ step }),
  setSelectedWalletType: (walletType) =>
    set({ selectedWalletType: walletType }),
  setSelectedCurrency: (currency) => set({ selectedCurrency: currency }),
  setDepositMethods: (methods) => set({ depositMethods: methods }),
  setSelectedDepositMethod: (method) => set({ selectedDepositMethod: method }),
  setDepositAmount: (amount) => set({ depositAmount: amount }),
  setDeposit: (deposit) => set({ deposit }),
  setLoading: (loading) => set({ loading }),

  handleDeposit: async (id) => {
    const {
      selectedWalletType,
      depositAmount,
      selectedCurrency,
      selectedDepositMethod,
      setLoading,
    } = get();

    // Figure out the final step to avoid going beyond it
    const finalStep = selectedWalletType.value === "FIAT" ? 4 : 5;

    setLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/forex/account/${id}/deposit`,
        silent: true,
        method: "POST",
        body: {
          type: selectedWalletType.value,
          currency: selectedCurrency,
          chain:
            selectedWalletType.value !== "FIAT"
              ? selectedDepositMethod?.chain
              : undefined,
          amount: depositAmount,
        },
      });

      if (!error) {
        toast.success("Deposit successful!");
        // Store the deposit result & stay on final step
        set({ deposit: data, step: finalStep });
      } else {
        toast.error(error || "An unexpected error occurred");
      }
    } catch (err) {
      toast.error("A network error occurred while processing your deposit");
    } finally {
      setLoading(false);
    }
  },

  fetchCurrencies: async () => {
    const { selectedWalletType } = get();
    try {
      const { data, error } = await $fetch({
        url: `${endpoint}/currency?action=deposit&walletType=${selectedWalletType.value}`,
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

  fetchDepositMethods: async () => {
    const { selectedWalletType, selectedCurrency } = get();
    try {
      const { data, error } = await $fetch({
        url: `${endpoint}/currency/${selectedWalletType.value}/${selectedCurrency}?action=deposit`,
        silent: true,
      });
      if (!error) {
        set({ depositMethods: data, step: 3 });
      } else {
        toast.error(
          "An error occurred while fetching currency deposit methods"
        );
        set({ step: 2 });
      }
    } catch (error) {
      console.error("Error in fetching deposit methods:", error);
      toast.error("An error occurred while fetching deposit methods");
    }
  },

  clearAll: () =>
    set(() => ({
      step: 1,
      selectedWalletType: { value: "", label: "Select a wallet type" },
      currencies: [],
      selectedCurrency: null,
      depositMethods: [],
      selectedDepositMethod: null,
      depositAmount: 0,
      loading: false,
      deposit: null,
    })),
}));
