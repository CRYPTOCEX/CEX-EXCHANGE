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
  /**
   * The idempotency nonce for the deposit currently being made.
   *
   * It lives here, not inside `handleDeposit`, because it has to survive a
   * failed attempt. Minted per call, a retry after a lost response (gateway
   * timeout, dropped connection — the request having already committed) sent a
   * fresh nonce, the backend saw a brand-new deposit, and the user was debited
   * twice for one deposit. It is cleared only once a deposit succeeds.
   */
  requestNonce: string | null;
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
  requestNonce: null,

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

    // Reuse the nonce across retries of the SAME deposit.
    //
    // It used to be minted fresh on every call, with a comment reasoning that
    // a re-click is "a separate intent". It is not: the common reason a user
    // clicks Submit twice is that the first attempt appeared to fail. If that
    // first request had in fact committed — a lost response, a gateway
    // timeout — the new nonce made the backend treat the retry as a second
    // deposit and the user was debited twice for one.
    //
    // The nonce is cleared on success (and by clearAll), so a genuinely new
    // deposit still gets a new one.
    let requestNonce = get().requestNonce;
    if (!requestNonce) {
      requestNonce =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      set({ requestNonce });
    }

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
          requestNonce,
        },
      });

      if (!error) {
        toast.success("Deposit successful!");
        // Store the deposit result & stay on final step. The nonce has done its
        // job; the next deposit is a genuinely new intent.
        set({ deposit: data, step: finalStep, requestNonce: null });
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
      requestNonce: null,
    })),
}));
