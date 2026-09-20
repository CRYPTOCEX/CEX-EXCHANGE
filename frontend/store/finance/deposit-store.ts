import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { useWalletStore } from "./wallet-store";

interface DepositState {
  step: number;
  setStep: (step: number) => void;

  selectedWalletType: { value: string; label: string } | null;
  setSelectedWalletType: (type: { value: string; label: string }) => void;

  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;

  selectedDepositMethod: any;
  setSelectedDepositMethod: (method: any) => void;

  depositAmount: number;
  setDepositAmount: (amount: number) => void;

  depositAddress: any;
  deposit: any;

  currencies: any[];
  depositMethods: any;

  transactionHash: string;
  setTransactionHash: (hash: string) => void;
  transactionSent: boolean;

  loading: boolean;
  setLoading: (loading: boolean) => void;

  error: string | null;
  setError: (error: string | null) => void;

  contractType: string;
  setContractType: (type: string) => void;

  // Countdown functionality
  countdownActive: boolean;
  setCountdownActive: (active: boolean) => void;
  depositStartTime: number | null;
  setDepositStartTime: (time: number | null) => void;
  shouldShowCountdown: () => boolean;
  handleCountdownExpire: () => void;

  /**
   * ── SPOT DEPOSIT INTENTS ────────────────────────────────────────────────
   *
   * A spot deposit is only credited against an intent the customer created
   * BEFORE they sent the coins (plans/done/SPOT-DEPOSIT-MODES.md): that is what
   * stops a stranger claiming a hash off the platform's public exchange
   * address. The row also carries the mode it runs in — hash_claim,
   * amount_match, ecosystem_custody — which the SCREEN must read from the
   * intent rather than from the `spotDepositMode` setting, because ecosystem
   * custody falls back to amount_match per ineligible network, server-side.
   *
   * Every field here is about ONE intent: the one for the (currency, network)
   * the customer is currently looking at. Switching network resolves a
   * different one or none at all.
   */
  spotIntent: any | null;
  /** The sweep fee quote, answered only when the POST actually CREATES the intent. */
  spotIntentFee: any | null;
  spotIntentLoading: boolean;
  spotIntentError: string | null;
  /** The server asked for an amount after all — ecosystem custody fell back (D2). */
  spotIntentNeedsAmount: boolean;
  /** The live stage from the intent stream; falls back to the row's own. */
  spotIntentStage: string | null;
  spotIntentMessage: string | null;

  createSpotIntent: (amount?: string | number | null) => Promise<{
    success: boolean;
    error?: string;
    needsAmount?: boolean;
  }>;
  resumeSpotIntent: () => Promise<void>;
  cancelSpotIntent: () => Promise<boolean>;
  applySpotIntentFrame: (frame: any) => void;
  clearSpotIntent: () => void;

  fetchCurrencies: () => Promise<void>;
  fetchDepositMethods: () => Promise<void>;
  fetchDepositAddress: () => Promise<{
    success: boolean;
    error?: string;
    data?: any;
  }>;
  handleFiatDeposit: (values: any) => Promise<void>;
  sendTransactionHash: () => Promise<void>;
  setDeposit: (deposit: any) => void;
  reset: () => void;
  cancelDeposit: (reason: string) => void;

  retryFetchDepositAddress: () => Promise<void>;
}

const initialState = {
  step: 1,
  selectedWalletType: null,
  selectedCurrency: "",
  selectedDepositMethod: null,
  depositAmount: 0,
  depositAddress: null,
  deposit: null,
  currencies: [],
  depositMethods: [],
  transactionHash: "",
  transactionSent: false,
  loading: false,
  error: null,
  contractType: "",
  countdownActive: false,
  depositStartTime: null,
  spotIntent: null,
  spotIntentFee: null,
  spotIntentLoading: false,
  spotIntentError: null,
  spotIntentNeedsAmount: false,
  spotIntentStage: null,
  spotIntentMessage: null,
};

const endpoint = "/api/finance";

/** Networks are compared the way the intent route stores them: trimmed, upper-cased. */
const normaliseNetwork = (network: unknown): string =>
  String(network ?? "").trim().toUpperCase();

/**
 * The one string the intent, claim and address routes all call "the network".
 *
 * `chain` is what `api/finance/currency/[type]/[code]` publishes for a SPOT
 * rail (`network.network || network.name || network.id`) and what
 * `sendTransactionHash` has always posted; `id` is the fallback for a provider
 * that gave only that. Anything else would create the intent under one spelling
 * and claim against another, and the claim would find no intent at all.
 */
const spotNetworkOf = (method: any): string =>
  String(method?.chain || method?.id || "").trim();

/** The intent states that are still in flight — the list route returns only these. */
const ACTIVE_INTENT_STATUSES = ["OPEN", "MATCHED", "SWEEPING"];

export const useDepositStore = create<DepositState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setSelectedWalletType: (type) => set({ selectedWalletType: type }),
  setSelectedCurrency: (currency) => set({ selectedCurrency: currency }),
  setSelectedDepositMethod: (method) => set({ selectedDepositMethod: method }),
  setDepositAmount: (amount) => set({ depositAmount: amount }),
  setTransactionHash: (hash) => set({ transactionHash: hash }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setContractType: (type) => set({ contractType: type }),
  setDeposit: (deposit) => set({ deposit }),

  // Countdown functionality
  setCountdownActive: (active) => set({ countdownActive: active }),
  setDepositStartTime: (time) => set({ depositStartTime: time }),

  /*
   * NOT READ BY THE SPOT SCREEN ANY MORE (D4).
   *
   * `countdownActive` / `depositStartTime` / `handleCountdownExpire` drove a
   * 30-minute session that ERASED the screen when it ran out. A spot deposit is
   * now an intent row: OPEN for 60 minutes, matched for seven days. Tearing the
   * screen down at 30 would tell a customer their deposit is gone while the
   * server is still waiting for it, so `SpotDeposit.tsx` runs its countdown off
   * the intent's own `sendBy` and treats the end of it as a hint, not a
   * deadline. These three are left as they are because they are the store's
   * public shape and nothing else reads them either; they are dead, not wrong.
   */
  shouldShowCountdown: () => {
    const { selectedWalletType } = get();

    // For SPOT wallets, show countdown only when deposit expiration is enabled (checked in component)
    if (selectedWalletType?.value === "SPOT") {
      return true;
    }

    // ECO deposits go to the user's own permanent address on every chain —
    // PERMIT and NO_PERMIT alike. Nothing is locked per session, so nothing
    // expires and there is no countdown.
    return false;
  },

  handleCountdownExpire: async () => {
    const { selectedWalletType, reset, transactionSent } = get();

    // For SPOT deposits, close WebSocket connections and cancel monitoring
    if (selectedWalletType?.value === "SPOT") {
      console.log(
        "SPOT deposit monitoring expired - closing WebSocket connections"
      );
      // Close WebSocket connections (will be handled by the component)
      if (typeof window !== "undefined" && (window as any).wsManager) {
        (window as any).wsManager.close("spot-deposit");
      }
    }

    // Set expired state and reset after a delay
    set({
      error: `Deposit session expired (30 minutes). ${transactionSent ? "Your transaction may still be processing, but monitoring has stopped." : "Please start a new deposit."}`,
      countdownActive: false,
    });

    // Auto-reset after 5 seconds to allow user to start fresh (longer for SPOT to read the message)
    setTimeout(
      () => {
        reset();
      },
      selectedWalletType?.value === "SPOT" ? 5000 : 3000
    );
  },

  handleFiatDeposit: async (values) => {
    const { selectedWalletType, selectedCurrency, selectedDepositMethod } =
      get();

    if (!selectedWalletType || !selectedCurrency || !selectedDepositMethod) {
      set({ error: "Missing required deposit information" });
      return;
    }

    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `${endpoint}/deposit/fiat`,
        method: "POST",
        silent: true,
        body: {
          ...values,
          currency: selectedCurrency,
          methodId: selectedDepositMethod.id || selectedDepositMethod.name,
          walletType: selectedWalletType.value,
        },
      });

      if (error) {
        console.error("Error processing fiat deposit:", error);
        set({
          error: error || "Failed to process fiat deposit",
          loading: false,
        });
        return;
      }

      set({
        deposit: data || { status: "pending", id: Date.now() },
        loading: false,
        step: 6, // Go to success step after manual deposit
      });

      // A manual deposit credits nothing — it is PENDING until an admin
      // approves it — but it DOES change the "awaiting approval" figure the
      // wallet hero shows, and `fetchStats` is latched after its first success.
      // Without this the user returns to /finance/wallet and sees no trace of
      // the deposit they just submitted.
      void useWalletStore.getState().refreshBalances();
    } catch (error) {
      console.error("Exception in handleFiatDeposit:", error);
      set({
        error: "An unexpected error occurred while processing fiat deposit",
        loading: false,
      });
    }
  },

  reset: () => {
    // Use a more controlled approach to reset the state
    set((state) => ({
      ...initialState,
      // Preserve any functions
      fetchCurrencies: state.fetchCurrencies,
      fetchDepositMethods: state.fetchDepositMethods,
      fetchDepositAddress: state.fetchDepositAddress,
      handleFiatDeposit: state.handleFiatDeposit,
      sendTransactionHash: state.sendTransactionHash,
      setStep: state.setStep,
      setSelectedWalletType: state.setSelectedWalletType,
      setSelectedCurrency: state.setSelectedCurrency,
      setSelectedDepositMethod: state.setSelectedDepositMethod,
      setDepositAmount: state.setDepositAmount,
      setTransactionHash: state.setTransactionHash,
      setLoading: state.setLoading,
      setError: state.setError,
      setContractType: state.setContractType,
      setDeposit: state.setDeposit,
      reset: state.reset,
      retryFetchDepositAddress: state.retryFetchDepositAddress,
      cancelDeposit: state.cancelDeposit,
      createSpotIntent: state.createSpotIntent,
      resumeSpotIntent: state.resumeSpotIntent,
      cancelSpotIntent: state.cancelSpotIntent,
      applySpotIntentFrame: state.applySpotIntentFrame,
      clearSpotIntent: state.clearSpotIntent,
    }));
  },

  cancelDeposit: (reason) => {
    const { selectedWalletType, transactionHash, deposit } = get();

    // For SPOT deposits, notify backend to flip the pending tx to CANCELLED.
    if (selectedWalletType?.value === "SPOT" && transactionHash) {
      const transactionId = deposit?.transaction?.id || deposit?.id;

      $fetch({
        url: `${endpoint}/deposit/spot/cancel`,
        method: "POST",
        silent: true,
        body: {
          transactionId,
          trx: transactionHash,
          reason,
        },
      }).catch((err) => console.error("Error cancelling deposit:", err));
    }

    set({
      error: reason,
      loading: false,
    });
  },

  // ──────────────────────── SPOT DEPOSIT INTENTS ─────────────────────────
  //
  // POST  /api/finance/deposit/spot/intent          declare and get an address
  // GET   /api/finance/deposit/spot/intent          the caller's intents in flight
  // POST  /api/finance/deposit/spot/intent/:id/cancel
  //
  // The POST is IDEMPOTENT per (user, currency, network) while an intent is
  // OPEN: it hands the existing row back rather than issuing a second address.
  // That is what makes a reload, a retry and a double click all safe.

  createSpotIntent: async (amount) => {
    const { selectedCurrency, selectedDepositMethod } = get();
    const network = spotNetworkOf(selectedDepositMethod);

    if (!selectedCurrency || !network) {
      const message = "Select a currency and a network first";
      set({ spotIntentError: message, spotIntentLoading: false });
      return { success: false, error: message };
    }

    set({ spotIntentLoading: true, spotIntentError: null });

    const body: Record<string, any> = { currency: selectedCurrency, network };
    // Ecosystem custody declares no amount at all. Sending an empty one would
    // be refused as "amount must be a positive number when given".
    if (amount !== undefined && amount !== null && String(amount).trim() !== "") {
      body.amount = Number(amount);
    }

    const { data, error } = await $fetch({
      url: `${endpoint}/deposit/spot/intent`,
      method: "POST",
      silent: true,
      body,
    });

    if (error || !data?.intent) {
      const message = String(error || "Could not start this deposit");
      /*
       * THE ONE ERROR THAT IS NOT AN ERROR.
       *
       * Only the SERVER knows whether ecosystem custody applies to this
       * (currency, network): it needs the ecosystem chain mapping, the token's
       * status, and whether the exchange's address carries a tag. So the screen
       * asks with no amount, and a refusal for want of one means "this network
       * fell back to exact-amount matching" (D2) — the customer is asked for the
       * amount and told why, instead of being shown a failure they cannot act
       * on.
       */
      const needsAmount = /amount is required/i.test(message);
      set({
        spotIntentLoading: false,
        spotIntentError: needsAmount ? null : message,
        spotIntentNeedsAmount: needsAmount || get().spotIntentNeedsAmount,
      });
      return { success: false, error: message, needsAmount };
    }

    set({
      spotIntent: data.intent,
      spotIntentFee: data.fee ?? null,
      spotIntentStage: data.intent?.stage ?? "waiting",
      spotIntentMessage: null,
      spotIntentError: null,
      spotIntentNeedsAmount: false,
      spotIntentLoading: false,
    });
    return { success: true };
  },

  resumeSpotIntent: async () => {
    const { selectedCurrency, selectedDepositMethod } = get();
    const network = spotNetworkOf(selectedDepositMethod);
    if (!selectedCurrency || !network) return;

    const { data, error } = await $fetch({
      url: `${endpoint}/deposit/spot/intent`,
      silent: true,
    });

    if (error || !data) {
      // A failed lookup is not a failed deposit: the declare step still works,
      // and the POST would hand back the very row this call could not read.
      return;
    }

    const wanted = normaliseNetwork(network);
    const currency = String(selectedCurrency).trim().toUpperCase();
    const match = (Array.isArray(data.intents) ? data.intents : []).find(
      (intent: any) =>
        String(intent?.currency ?? "").trim().toUpperCase() === currency &&
        normaliseNetwork(intent?.network) === wanted &&
        ACTIVE_INTENT_STATUSES.includes(String(intent?.status ?? ""))
    );

    // No match CLEARS: the customer stepped to another network, or the intent
    // they were looking at expired while the tab was closed. Leaving the old
    // row on screen would show an address for a rail they are not on.
    set({
      spotIntent: match ?? null,
      spotIntentStage: match?.stage ?? null,
      spotIntentMessage: null,
      spotIntentError: null,
      spotIntentNeedsAmount: false,
      ...(match ? {} : { spotIntentFee: null }),
    });
  },

  cancelSpotIntent: async () => {
    const { spotIntent } = get();
    const id = spotIntent?.id ? String(spotIntent.id) : "";
    if (!id) return false;

    const { data, error } = await $fetch({
      url: `${endpoint}/deposit/spot/intent/${id}/cancel`,
      method: "POST",
      silent: true,
      body: { reason: "Cancelled by the customer" },
    });

    if (error) {
      toast.error(String(error));
      // The usual refusal is "your deposit was seen while you were
      // cancelling" — so re-read rather than leave a stale OPEN row on screen.
      await get().resumeSpotIntent();
      return false;
    }

    set({
      spotIntent: null,
      spotIntentFee: null,
      spotIntentStage: null,
      spotIntentMessage: null,
      spotIntentError: null,
      spotIntentNeedsAmount: false,
    });
    return Boolean(data);
  },

  applySpotIntentFrame: (frame) => {
    const id = frame?.intentId ? String(frame.intentId) : "";
    if (!id) return;
    set((state) => {
      const current = state.spotIntent;
      // Frames are keyed by intent id and only ever arrive for a subscription
      // this screen opened, but a stale frame from the intent BEFORE a network
      // switch must not repaint the new one's stage.
      if (!current || String(current.id) !== id) return {};
      return {
        spotIntent: {
          ...current,
          status: frame.status ?? current.status,
          stage: frame.stage ?? current.stage,
          claimedTxid: frame.txid ?? current.claimedTxid,
          ...(frame.sendBy ? { sendBy: frame.sendBy } : {}),
          ...(frame.expiresAt ? { expiresAt: frame.expiresAt } : {}),
        },
        spotIntentStage: frame.stage ?? state.spotIntentStage,
        spotIntentMessage: frame.message ?? state.spotIntentMessage,
      };
    });
  },

  clearSpotIntent: () =>
    set({
      spotIntent: null,
      spotIntentFee: null,
      spotIntentStage: null,
      spotIntentMessage: null,
      spotIntentError: null,
      spotIntentNeedsAmount: false,
      spotIntentLoading: false,
    }),

  fetchCurrencies: async () => {
    const { selectedWalletType } = get();

    if (!selectedWalletType) {
      set({ error: "No wallet type selected" });
      return;
    }

    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `${endpoint}/currency?action=deposit&walletType=${selectedWalletType.value}`,
        silent: true,
      });

      if (error) {
        console.error("Error fetching currencies:", error);
        set({
          error: error || "Failed to fetch currencies",
          loading: false,
        });
        return;
      }

      if (!data || !Array.isArray(data)) {
        set({
          error: "Invalid currency data received",
          loading: false,
          currencies: [],
        });
        return;
      }

      set({
        currencies: data,
        loading: false,
        step: 2,
      });
    } catch (error) {
      console.error("Exception in fetchCurrencies:", error);
      set({
        error: "An unexpected error occurred while fetching currencies",
        loading: false,
        currencies: [],
      });
    }
  },

  fetchDepositMethods: async () => {
    const { selectedWalletType, selectedCurrency } = get();

    if (!selectedWalletType || !selectedCurrency) {
      set({ error: "Wallet type or currency not selected" });
      return;
    }

    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `${endpoint}/currency/${selectedWalletType.value}/${selectedCurrency}?action=deposit`,
        silent: true,
      });

      if (error) {
        console.error("Error fetching deposit methods:", error);
        set({
          error: error || "Failed to fetch deposit methods",
          loading: false,
        });
        return;
      }

      // Handle different response formats based on wallet type
      if (selectedWalletType.value === "FIAT") {
        // FIAT response has gateways and methods
        if (!data || (!data.gateways && !data.methods)) {
          set({
            error: "No deposit methods available for this currency",
            loading: false,
            depositMethods: [],
          });
          return;
        }

        // Preserve the original structure with gateways and methods
        set({
          depositMethods: {
            gateways: Array.isArray(data.gateways) ? data.gateways : [],
            methods: Array.isArray(data.methods) ? data.methods : [],
          },
          loading: false,
          step: 3,
        });
      } else if (selectedWalletType.value === "FUTURES") {
        // FUTURES doesn't support direct deposits
        set({
          error:
            "Futures wallets can only be funded via transfer from ECO wallet",
          loading: false,
          depositMethods: [],
        });
        return;
      } else {
        // SPOT and ECO responses are arrays
        if (!data || !Array.isArray(data) || data.length === 0) {
          set({
            error: "No deposit methods available for this currency",
            loading: false,
            depositMethods: [],
          });
          return;
        }

        // Process ECO and SPOT data - parse JSON strings
        const processedData = data.map((method) => {
          // Parse limits if it's a string (ECO wallets)
          if (typeof method.limits === "string") {
            try {
              method.limits = JSON.parse(method.limits);
            } catch (e) {
              console.error("Failed to parse limits:", e);
              // Set to null if parsing fails to avoid rendering issues
              method.limits = null;
            }
          }

          // Parse fee if it's a string (ECO wallets)
          if (typeof method.fee === "string") {
            try {
              method.fee = JSON.parse(method.fee);
            } catch (e) {
              console.error("Failed to parse fee:", e);
              // Set to null if parsing fails to avoid rendering issues
              method.fee = null;
            }
          }

          // For ECO wallets, ensure we have the right structure for UI display
          if (selectedWalletType.value === "ECO") {
            // Add id field for consistent UI handling
            if (!method.id && method.chain) {
              method.id = method.name || method.chain;
            }

            // Add display fee for UI (convert from object to number)
            if (method.fee && typeof method.fee === "object") {
              // Use percentage fee if available, otherwise use min fee
              method.displayFee = method.fee.percentage || method.fee.min || 0;
            }
          }

          return method;
        });

        set({
          depositMethods: processedData,
          loading: false,
          step: 3,
        });
      }
    } catch (error) {
      console.error("Exception in fetchDepositMethods:", error);
      set({
        error: "An unexpected error occurred while fetching deposit methods",
        loading: false,
        depositMethods: [],
      });
    }
  },

  fetchDepositAddress: async () => {
    const {
      selectedWalletType,
      selectedCurrency,
      selectedDepositMethod,
      contractType,
    } = get();

    if (!selectedWalletType || !selectedCurrency || !selectedDepositMethod) {
      set({ error: "Missing required deposit information" });
      return { success: false, error: "Missing required deposit information" };
    }

    set({ loading: true, error: null });

    // Determine the correct URL based on wallet type and selected method
    let url;

    if (selectedWalletType.value === "ECO") {
      // For ECO wallets, use the ecosystem API with the appropriate chain
      const chainParam = selectedDepositMethod.chain || selectedDepositMethod;
      // The server ignores `contractType` now — every EVM token deposits to the
      // user's own address — but it is still sent, as the method's OWN value,
      // so an older backend keeps answering. Never defaulted to NO_PERMIT: that
      // used to request a locked shared custodial contract.
      const contractTypeParam =
        selectedDepositMethod.contractType || contractType || "";
      const params = new URLSearchParams({ chain: String(chainParam) });
      if (contractTypeParam) params.set("contractType", contractTypeParam);
      url = `/api/ecosystem/wallet/${selectedCurrency}?${params.toString()}`;
    } else {
      // For other wallet types, use the standard API
      const methodParam =
        selectedDepositMethod.chain ||
        selectedDepositMethod.id ||
        selectedDepositMethod;
      url = `${endpoint}/currency/${selectedWalletType.value}/${selectedCurrency}/${methodParam}`;
    }

    console.log("Making API call to:", url);
    console.log("With parameters:", { 
      walletType: selectedWalletType.value,
      currency: selectedCurrency,
      method: selectedDepositMethod
    });

    try {
      const { data, error } = await $fetch({
        url,
        silent: true,
      });
      
      console.log("API response:", { data, error });

      if (error) {
        console.error("Error fetching deposit address:", error);

        // Handle different error types
        let errorMessage = "Failed to fetch deposit address";

        // Handle XT API errors
        if (
          typeof error === "string" &&
          error.includes('{"rc":1,"mc":"AUTH_104"')
        ) {
          errorMessage =
            "Authentication failed. Please check your exchange credentials.";
        } else if (
          error &&
          typeof error === "object" &&
          (error as any).rc === 1 &&
          (error as any).mc === "AUTH_104"
        ) {
          errorMessage =
            "Authentication failed. Please check your exchange credentials.";
        }
        // Handle SPOT wallet specific errors
        else if (
          selectedWalletType.value === "SPOT" &&
          typeof error === "string" &&
          (error.includes("invalid or empty address data") ||
            error.includes("exchange returned invalid") ||
            error.includes("network mapping"))
        ) {
          errorMessage =
            "Failed to generate deposit address for this network. Please try a different network or contact support.";
        }
        // Handle other string errors
        else if (typeof error === "string") {
          errorMessage = error;
        }
        // Handle object errors
        else if (error && typeof error === "object" && (error as any).message) {
          errorMessage = (error as any).message;
        }

        set({
          error: errorMessage,
          loading: false,
        });
        return { success: false, error: errorMessage };
      }

      if (!data) {
        console.error("No deposit address data received");

        // For demo purposes, create a fallback address
        const fallbackAddress = {
          address: `demo_${selectedCurrency.toLowerCase()}_${selectedDepositMethod.chain || "default"}_${Math.random().toString(36).substring(2, 10)}`,
          network:
            selectedDepositMethod.chain ||
            selectedDepositMethod.type ||
            "Default",
        };

        // In development, use the fallback address
        if (process.env.NODE_ENV === "development") {
          console.log(
            "Using fallback address for development:",
            fallbackAddress
          );
          set({
            depositAddress: fallbackAddress,
            loading: false,
          });

          // Start countdown if needed
          const currentState = get();
          const { shouldShowCountdown } = currentState;
          if (shouldShowCountdown()) {
            const currentTime = Date.now();
            set({
              countdownActive: true,
              depositStartTime: currentTime,
            });
          }

          return { success: true, data: fallbackAddress };
        }

        const errorMessage =
          "No deposit address data received. Please try again.";
        set({
          error: errorMessage,
          loading: false,
        });
        return { success: false, error: errorMessage };
      }

      /**
       * Helper function to validate deposit address data
       * Checks for empty objects, missing address fields, and invalid structures
       */
      const isValidDepositAddressData = (data: any): boolean => {
        if (!data) return false;
        
        // Check if data is an empty object
        if (typeof data === 'object' && Object.keys(data).length === 0) {
          return false;
        }
        
        // For objects, check if they have essential address-related fields
        if (typeof data === 'object') {
          // Check for common address fields
          const hasAddress = data.address && data.address !== "";
          const hasTag = data.tag && data.tag !== "";
          const hasMemo = data.memo && data.memo !== "";
          const hasNetwork = data.network && data.network !== "";
          
          // Must have at least an address or tag/memo
          if (!hasAddress && !hasTag && !hasMemo) {
            return false;
          }
        }
        
        return true;
      };

      // Validate the API response data before processing
      if (!isValidDepositAddressData(data)) {
        console.error("Invalid deposit address data received:", data);
        
        // Check if it's an empty object specifically
        if (typeof data === 'object' && Object.keys(data).length === 0) {
          const errorMessage = "The exchange returned an empty response. This may indicate that deposit addresses are not available for this currency/network combination. Please try a different network or contact support.";
          set({
            error: errorMessage,
            loading: false,
          });
          return { success: false, error: errorMessage };
        } else {
          const errorMessage = "Invalid deposit address format received. Please try again or contact support.";
          set({
            error: errorMessage,
            loading: false,
          });
          return { success: false, error: errorMessage };
        }
      }

      // Process the address data based on wallet type
      let processedAddress;

      if (selectedWalletType.value === "ECO") {
        if (data.address) {
          try {
            // Handle different address formats
            if (typeof data.address === "string") {
              // Try to parse if it's a JSON string
              try {
                const parsedAddress = JSON.parse(data.address);
                
                // Try different key variations to find the correct address
                let addressData: any = null;
                
                // First try with the currency (BTC, ETH, etc.)
                if (parsedAddress[selectedCurrency]) {
                  addressData = parsedAddress[selectedCurrency];
                }
                // Then try with the chain key
                else if (parsedAddress[selectedDepositMethod.chain]) {
                  addressData = parsedAddress[selectedDepositMethod.chain];
                }
                // Then try with the full method name
                else if (parsedAddress[selectedDepositMethod.name]) {
                  addressData = parsedAddress[selectedDepositMethod.name];
                }
                // Finally try with the method ID
                else if (parsedAddress[selectedDepositMethod.id]) {
                  addressData = parsedAddress[selectedDepositMethod.id];
                }
                // If none found, take the first available key
                else {
                  const firstKey = Object.keys(parsedAddress)[0];
                  if (firstKey) {
                    addressData = parsedAddress[firstKey];
                  }
                }
                
                if (addressData) {
                  processedAddress = {
                    address: addressData.address,
                    network: addressData.network || selectedDepositMethod.chain || "mainnet",
                    // Show the wallet's ledger balance. address[chain].balance is
                    // internal per-network accounting that trades never decrement,
                    // so it drifts far above what the user actually holds.
                    balance: Number(data.balance) || 0
                  };
                } else {
                  // Fallback if no matching key found
                  processedAddress = {
                    address: parsedAddress.address || parsedAddress,
                    network: selectedDepositMethod.chain || selectedDepositMethod.type || "Default",
                  };
                }
              } catch (e) {
                // If not a JSON string, use as is
                processedAddress = {
                  address: data.address,
                  network:
                    selectedDepositMethod.chain ||
                    selectedDepositMethod.type ||
                    "Default",
                };
              }
            } else if (typeof data.address === "object") {
              // If it's already an object
              let addressData: any = null;
              
              // Try different key variations
              if (data.address[selectedCurrency]) {
                addressData = data.address[selectedCurrency];
              } else if (data.address[selectedDepositMethod.chain]) {
                addressData = data.address[selectedDepositMethod.chain];
              } else if (data.address[selectedDepositMethod.name]) {
                addressData = data.address[selectedDepositMethod.name];
              } else if (data.address[selectedDepositMethod.id]) {
                addressData = data.address[selectedDepositMethod.id];
              } else {
                const firstKey = Object.keys(data.address)[0];
                if (firstKey) {
                  addressData = data.address[firstKey];
                }
              }
              
              if (addressData) {
                processedAddress = {
                  address: addressData.address,
                  network: addressData.network || selectedDepositMethod.chain || "mainnet",
                  // Ledger balance, not address[chain].balance — see note above.
                  balance: Number(data.balance) || 0
                };
              } else {
                processedAddress = {
                  address: data.address.address || data.address,
                  network: selectedDepositMethod.chain || selectedDepositMethod.type || "Default",
                };
              }
            } else {
              const errorMessage = "Invalid address format received";
              set({
                error: errorMessage,
                loading: false,
              });
              return { success: false, error: errorMessage };
            }
          } catch (e) {
            console.error("Error processing address data:", e);
            const errorMessage = "Failed to process deposit address";
            set({
              error: errorMessage,
              loading: false,
            });
            return { success: false, error: errorMessage };
          }
        } else {
          const errorMessage = "No address data received";
          set({
            error: errorMessage,
            loading: false,
          });
          return { success: false, error: errorMessage };
        }
      } else if (selectedWalletType.value === "SPOT") {
        // For SPOT wallets, use the address data directly but validate it first
        if (!isValidDepositAddressData(data)) {
          const errorMessage = "Invalid SPOT deposit address data received. Please try again or contact support.";
          set({
            error: errorMessage,
            loading: false,
          });
          return { success: false, error: errorMessage };
        }
        
        processedAddress = data;
      } else {
        // Fallback for other wallet types
        processedAddress = {
          address:
            typeof data.address === "string"
              ? data.address
              : "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          network:
            selectedDepositMethod.chain ||
            selectedDepositMethod.name ||
            "Default",
        };
      }

      set({
        depositAddress: processedAddress,
        loading: false,
      });

      // Start countdown if needed
      const { shouldShowCountdown } = get();

      if (shouldShowCountdown()) {
        const currentTime = Date.now();
        set({
          countdownActive: true,
          depositStartTime: currentTime,
        });
      }

      return { success: true, data: processedAddress };
    } catch (error: any) {
      console.error("Exception in fetchDepositAddress:", error);

      let errorMessage =
        "An unexpected error occurred while fetching deposit address";

      // Handle different error types
      if (
        error?.status === 404 ||
        error?.status === 500 ||
        error?.statusCode === 404 ||
        error?.statusCode === 500
      ) {
        if (
          selectedWalletType.value === "SPOT" &&
          (error?.message?.includes("invalid or empty address data") ||
            error?.message?.includes("exchange returned invalid") ||
            error?.statusCode === 500)
        ) {
          errorMessage =
            "Failed to generate deposit address. Please try again or contact support.";
        }
      } else if (
        error?.message?.includes("fetch") ||
        error?.message?.includes("network")
      ) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      set({
        error: errorMessage,
        loading: false,
      });
      return { success: false, error: errorMessage };
    }
  },

  sendTransactionHash: async () => {
    const { transactionHash, selectedCurrency, selectedDepositMethod } = get();
    try {
      const { data, error } = await $fetch({
        url: `${endpoint}/deposit/spot`,
        method: "POST",
        silent: true,
        // Wire contract unchanged. The claim route now looks for the caller's
        // OPEN intent on (currency, chain) itself and marks the row
        // `review: "no_intent"` when there is none — so the same three fields
        // still say everything the server needs.
        body: {
          currency: selectedCurrency,
          chain: spotNetworkOf(selectedDepositMethod),
          trx: transactionHash,
        },
      });

      if (!error) {
        set({
          deposit: data,
          transactionSent: true,
          loading: false, // Set loading false after successful submission
          step: 5, // Move to SPOT monitoring step
        });
      } else {
        toast.error(error || "An unexpected error occurred");
        set({
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error in sending transaction hash:", error);
      toast.error("An error occurred while sending transaction hash");
      set({
        loading: false,
      });
    }
  },

  retryFetchDepositAddress: async () => {
    const {
      selectedWalletType,
      selectedCurrency,
      selectedDepositMethod,
      contractType,
    } = get();

    if (!selectedWalletType || !selectedCurrency || !selectedDepositMethod) {
      set({ error: "Missing required deposit information" });
      return;
    }

    set({ loading: true, error: null });

    // Add a small delay before retrying
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Call the original fetch function
    get().fetchDepositAddress();
  },

}));
