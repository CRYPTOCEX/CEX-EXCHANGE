import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";

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
  unlockDepositAddress: (address: string) => Promise<void>;

  // Payment Gateway States
  stripeListener: boolean;
  paypalSDK: any;
  paypalLoaded: boolean;
  setPaypalSDK: (sdk: any) => void;
  setPaypalLoaded: (loaded: boolean) => void;

  // Payment Gateway Methods
  verifySession: (sessionId: string) => Promise<void>;
  stripeDeposit: () => Promise<void>;
  paypalDeposit: () => Promise<void>;
  createPaypalOrder: () => Promise<string>;
  approvePaypalOrder: (orderId: string) => Promise<void>;
  stopStripeListener: () => void;
  retryFetchDepositAddress: () => Promise<void>;

  // New Payment Gateway Methods
  payuDeposit: () => Promise<void>;
  paytmDeposit: () => Promise<void>;
  authorizeNetDeposit: () => Promise<void>;
  adyenDeposit: () => Promise<void>;
  twoCheckoutDeposit: () => Promise<void>;
  dLocalDeposit: () => Promise<void>;
  ewayDeposit: () => Promise<void>;
  ipay88Deposit: () => Promise<void>;
  payfastDeposit: () => Promise<void>;
  mollieDeposit: () => Promise<void>;
  paysafeDeposit: () => Promise<void>;
  paystackDeposit: () => Promise<void>;
  klarnaDeposit: () => Promise<void>;

  // Generic payment gateway processor
  processPaymentGateway: (gateway: string, additionalData?: any) => Promise<void>;

  // Verify payment status for redirect-based gateways
  verifyPaymentStatus: (paymentId: string) => Promise<void>;
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
  stripeListener: false,
  paypalSDK: null,
  paypalLoaded: false,
};

const endpoint = "/api/finance";

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
  setPaypalSDK: (sdk) => set({ paypalSDK: sdk }),
  setPaypalLoaded: (loaded) => set({ paypalLoaded: loaded }),

  // Countdown functionality
  setCountdownActive: (active) => set({ countdownActive: active }),
  setDepositStartTime: (time) => set({ depositStartTime: time }),

  shouldShowCountdown: () => {
    const { selectedWalletType, selectedDepositMethod } = get();

    // For SPOT wallets, show countdown only when deposit expiration is enabled (checked in component)
    if (selectedWalletType?.value === "SPOT") {
      return true;
    }

    // For ECO wallets, ALWAYS show countdown if contractType is NO_PERMIT (regardless of settings)
    if (
      selectedWalletType?.value === "ECO" &&
      selectedDepositMethod?.contractType === "NO_PERMIT"
    ) {
      return true;
    }

    return false;
  },

  handleCountdownExpire: async () => {
    const {
      selectedWalletType,
      depositAddress,
      unlockDepositAddress,
      reset,
      transactionSent,
    } = get();

    // For ECO NO_PERMIT deposits, unlock the address
    if (selectedWalletType?.value === "ECO" && depositAddress?.address) {
      console.log("Countdown expired - unlocking ECO address");
      await unlockDepositAddress(depositAddress.address);
    }

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
    } catch (error) {
      console.error("Exception in handleFiatDeposit:", error);
      set({
        error: "An unexpected error occurred while processing fiat deposit",
        loading: false,
      });
    }
  },

  stopStripeListener: () => {
    set({ stripeListener: false });
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
      verifySession: state.verifySession,
      stripeDeposit: state.stripeDeposit,
      paypalDeposit: state.paypalDeposit,
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
      unlockDepositAddress: state.unlockDepositAddress,
    }));
  },

  unlockDepositAddress: async (address) => {
    const { selectedWalletType, selectedCurrency, selectedDepositMethod } =
      get();

    if (!selectedWalletType || !selectedCurrency || !address) {
      console.error("Missing required information to unlock address");
      return;
    }

    // Only proceed for ECO wallet type
    if (selectedWalletType.value !== "ECO") {
      return;
    }

    console.log("Unlocking deposit address:", address);

    try {
      // Call the API to unlock the address
      await $fetch({
        url: `/api/ecosystem/deposit/unlock?address=${encodeURIComponent(address)}`,
        method: "GET",
        silent: true,
      });

      console.log("Address unlocked successfully:", address);
    } catch (error) {
      console.error("Error unlocking address:", error);
    }
  },

  cancelDeposit: (reason) => {
    set({
      error: reason,
      loading: false,
    });

    // If we have a transaction hash for SPOT deposits, notify the server
    const { selectedWalletType, transactionHash, depositAddress } = get();

    // For ECO deposits, unlock the address
    if (selectedWalletType?.value === "ECO" && depositAddress?.address) {
      get().unlockDepositAddress(depositAddress.address);
    }

    if (selectedWalletType?.value === "SPOT" && transactionHash) {
      // In a real implementation, we would call an API to cancel the deposit
      console.log(
        `Cancelling deposit with transaction hash: ${transactionHash}, reason: ${reason}`
      );

      // Mock API call
      $fetch({
        url: `${endpoint}/deposit/spot/cancel`,
        method: "POST",
        silent: true,
        body: {
          trx: transactionHash,
          reason: reason,
        },
      }).catch((err) => console.error("Error cancelling deposit:", err));
    }
  },

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
      const contractTypeParam =
        selectedDepositMethod.contractType || contractType || "NO_PERMIT";
      url = `/api/ecosystem/wallet/${selectedCurrency}?contractType=${contractTypeParam}&chain=${chainParam}`;
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
        // Handle custodial wallet errors (ECO wallet specific)
        else if (
          selectedWalletType.value === "ECO" &&
          typeof error === "string" &&
          (error.includes("custodial wallets are currently in use") ||
            error.includes("All custodial wallets") ||
            error.includes("try again later"))
        ) {
          errorMessage =
            "All custodial wallets are currently in use. Please try again in a few minutes.";
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
                    balance: addressData.balance || 0
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
                  balance: addressData.balance || 0
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
      const currentState = get();
      const { shouldShowCountdown } = currentState;
      console.log("Checking countdown conditions:", {
        shouldShow: shouldShowCountdown(),
        walletType: selectedWalletType?.value,
        contractType: selectedDepositMethod?.contractType,
        depositAddress: !!processedAddress,
      });

      if (shouldShowCountdown()) {
        const currentTime = Date.now();
        set({
          countdownActive: true,
          depositStartTime: currentTime,
        });
        console.log(
          "Started deposit countdown for",
          selectedWalletType.value,
          "wallet with contractType:",
          selectedDepositMethod?.contractType
        );
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
          selectedWalletType.value === "ECO" &&
          (error?.message?.includes("custodial wallets") ||
            error?.message?.includes("try again later"))
        ) {
          errorMessage =
            "All custodial wallets are currently in use. Please try again in a few minutes.";
        } else if (
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
        body: {
          currency: selectedCurrency,
          chain: selectedDepositMethod?.chain || selectedDepositMethod?.id,
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

  verifySession: async (sessionId: string) => {
    const currentState = get();

    // Prevent duplicate verification calls
    if (currentState.loading || currentState.deposit) {
      console.log("Verification already in progress or completed, skipping");
      return;
    }

    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `/api/finance/deposit/fiat/stripe/verify`,
        method: "POST",
        silent: true,
        params: { sessionId },
      });

      if (error) {
        console.error("Error verifying Stripe session:", error);

        // Check if error is about duplicate transaction
        if (
          error.includes("Transaction already exists") ||
          error.includes("already exists")
        ) {
          // Transaction already processed, treat as success
          console.log(
            "Transaction already exists, treating as successful verification"
          );
          const duplicateDepositData = {
            confirmed: true,
            status: "COMPLETED",
            id: sessionId,
            referenceId: sessionId,
            transactionHash: sessionId,
            method: "Stripe",
          };

          set({
            deposit: duplicateDepositData,
            loading: false,
            stripeListener: false,
            step: 5,
          });
          return;
        }

        // Check if payment was not successful (cancelled, failed, etc.)
        if (
          error.includes("Payment intent not succeeded") ||
          error.includes("canceled") ||
          error.includes("failed")
        ) {
          set({
            error: "Payment was not completed successfully",
            loading: false,
            stripeListener: false,
          });
          return;
        }

        set({
          error: error || "Failed to verify Stripe payment",
          loading: false,
          stripeListener: false,
        });
        return;
      }

      // Successfully verified - format the deposit data properly
      const depositData = {
        confirmed: true,
        status: "COMPLETED",
        id: data?.transaction?.id || sessionId,
        amount: data?.transaction?.amount || 0,
        currency: data?.currency || "USD",
        method: data?.method || "Stripe",
        transactionHash: data?.transaction?.referenceId || sessionId,
        referenceId: data?.transaction?.referenceId || sessionId,
        balance: data?.balance,
        transaction: data?.transaction,
        fee: data?.transaction?.fee,
        description: data?.transaction?.description,
      };

      set({
        deposit: depositData,
        loading: false,
        stripeListener: false,
        step: 5,
      });

      console.log("Stripe payment verified successfully", depositData);
    } catch (error) {
      console.error("Exception in verifySession:", error);
      set({
        error:
          "An unexpected error occurred during Stripe payment verification",
        loading: false,
        stripeListener: false,
      });
    }
  },

  stripeDeposit: async () => {
    const { depositAmount, selectedCurrency } = get();

    if (!depositAmount || !selectedCurrency) {
      set({ error: "Missing required deposit information" });
      return;
    }

    set({ loading: true, stripeListener: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `${endpoint}/deposit/fiat/stripe`,
        method: "POST",
        silent: true,
        body: {
          amount: depositAmount,
          currency: selectedCurrency,
        },
      });

      set({ loading: false });

      if (error) {
        console.error("Error in stripe deposit:", error);
        set({
          error: error || "Failed to process Stripe payment",
          stripeListener: false,
        });
        return;
      }

      if (!data || !data.url) {
        set({
          error: "Invalid Stripe response - no checkout URL received",
          stripeListener: false,
        });
        return;
      }

      // Open Stripe Checkout in a popup window
      const stripePopup = window.open(
        data.url,
        "stripePopup",
        "width=500,height=700,scrollbars=yes,resizable=yes"
      );

      if (!stripePopup) {
        // Fallback to redirect if popup is blocked
        window.location.href = data.url;
        set({ stripeListener: false });
        return;
      }

      // Flags to track payment state
      let verificationInProgress = false;
      let paymentCanceled = false;
      let paymentCompleted = false;

      const performVerification = async (sessionId: string) => {
        if (verificationInProgress || paymentCanceled) {
          console.log("Verification skipped - already in progress or payment canceled");
          return;
        }
        verificationInProgress = true;

        try {
          await get().verifySession(sessionId);
          paymentCompleted = true;
        } catch (error) {
          console.error("Verification failed:", error);
          set({ 
            stripeListener: false,
            error: "Payment verification failed. Please try again."
          });
        }
      };

      // Check if the popup window is closed
      const checkPopup = setInterval(() => {
        if (!stripePopup || stripePopup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener("message", enhancedMessageHandler);
          clearTimeout(paymentTimeout);

          // Wait a moment to see if a message event was triggered
          setTimeout(() => {
            if (!verificationInProgress && !paymentCanceled && !paymentCompleted) {
              // Popup closed without clear success or cancel message
              // This likely means the user closed the popup manually or there was an error
              console.log("Stripe popup closed without completion");
              set({ 
                stripeListener: false,
                error: "Payment was not completed. Please try again."
              });
            }
          }, 500); // Increased delay to ensure message events are processed
        }
      }, 500);

      // Set a timeout to prevent infinite waiting
      const paymentTimeout = setTimeout(
        () => {
          if (!paymentCompleted && !paymentCanceled) {
            clearInterval(checkPopup);
            window.removeEventListener("message", enhancedMessageHandler);
            
            if (stripePopup && !stripePopup.closed) {
              stripePopup.close();
            }
            
            set({
              stripeListener: false,
              error: "Payment session timed out. Please try again."
            });
            console.log("Stripe payment session timed out");
          }
        },
        10 * 60 * 1000
      ); // 10 minutes timeout

      // Wrap performVerification to clean up timeout
      const wrappedPerformVerification = async (sessionId: string) => {
        clearTimeout(paymentTimeout);
        return performVerification(sessionId);
      };

      // Update message handler to use wrapped function
      const enhancedMessageHandler = (event: MessageEvent) => {
        if (
          event.origin === window.location.origin ||
          event.origin.includes("stripe.com")
        ) {
          console.log("Received message from popup:", event.data);
          
          if (event.data.sessionId && !paymentCanceled) {
            // Payment was successful
            console.log("Stripe payment completed successfully");
            wrappedPerformVerification(event.data.sessionId);
          } else if (event.data.status === "canceled") {
            // Payment was explicitly canceled
            paymentCanceled = true;
            clearTimeout(paymentTimeout);
            set({ 
              stripeListener: false,
              error: null
            });
            console.log("Stripe payment was canceled by the user:", event.data.message || "User cancelled payment");
          }
        }
      };

      window.addEventListener("message", enhancedMessageHandler);
    } catch (error) {
      console.error("Exception in stripeDeposit:", error);
      set({
        error: "An unexpected error occurred with Stripe payment",
        loading: false,
        stripeListener: false,
      });
    }
  },

  createPaypalOrder: async () => {
    const { depositAmount, selectedCurrency } = get();

    if (!depositAmount || !selectedCurrency) {
      throw new Error("Missing required deposit information");
    }

    try {
      const { data, error } = await $fetch({
        url: `${endpoint}/deposit/fiat/paypal`,
        method: "POST",
        silent: true,
        body: {
          amount: depositAmount,
          currency: selectedCurrency,
        },
      });

      if (error) {
        throw new Error(error || "Failed to create PayPal order");
      }

      if (!data || !data.id) {
        throw new Error("Invalid PayPal response - no order ID received");
      }

      return data.id;
    } catch (error) {
      console.error("Exception in createPaypalOrder:", error);
      throw error;
    }
  },

  approvePaypalOrder: async (orderId: string) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `${endpoint}/deposit/fiat/paypal/verify`,
        method: "POST",
        silent: true,
        params: { orderId },
      });

      if (error) {
        console.error("Error verifying PayPal order:", error);
        set({
          error: error || "Failed to verify PayPal payment",
          loading: false,
        });
        return;
      }

      // Format PayPal deposit data similar to Stripe
      const paypalDepositData = {
        confirmed: true,
        status: "COMPLETED",
        id: data?.transaction?.id || orderId,
        amount: data?.transaction?.amount || 0,
        currency: data?.currency || "USD",
        method: data?.method || "PayPal",
        transactionHash: data?.transaction?.referenceId || orderId,
        referenceId: data?.transaction?.referenceId || orderId,
        balance: data?.balance,
        transaction: data?.transaction,
        fee: data?.transaction?.fee,
        description: data?.transaction?.description,
      };

      set({
        deposit: paypalDepositData,
        loading: false,
        step: 5,
      });
    } catch (error) {
      console.error("Exception in approvePaypalOrder:", error);
      set({
        error: "An unexpected error occurred while verifying PayPal payment",
        loading: false,
      });
    }
  },

  paypalDeposit: async () => {
    // This function is kept for compatibility but actual PayPal flow
    // should use createPaypalOrder and approvePaypalOrder with PayPal SDK
    console.log("PayPal deposit should use SDK integration");
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

  // New Payment Gateway Methods
  payuDeposit: async () => {
    await get().processPaymentGateway("payu");
  },

  paytmDeposit: async () => {
    await get().processPaymentGateway("paytm");
  },

  authorizeNetDeposit: async () => {
    await get().processPaymentGateway("authorizenet");
  },

  adyenDeposit: async () => {
    await get().processPaymentGateway("adyen");
  },

  twoCheckoutDeposit: async () => {
    await get().processPaymentGateway("2checkout");
  },

  dLocalDeposit: async () => {
    await get().processPaymentGateway("dlocal");
  },

  ewayDeposit: async () => {
    await get().processPaymentGateway("eway");
  },

  ipay88Deposit: async () => {
    await get().processPaymentGateway("ipay88");
  },

  payfastDeposit: async () => {
    await get().processPaymentGateway("payfast");
  },

  mollieDeposit: async () => {
    await get().processPaymentGateway("mollie");
  },

  paysafeDeposit: async () => {
    await get().processPaymentGateway("paysafe");
  },

  paystackDeposit: async () => {
    await get().processPaymentGateway("paystack");
  },

  klarnaDeposit: async () => {
    await get().processPaymentGateway("klarna");
  },

  // Generic payment gateway processor
  processPaymentGateway: async (gateway: string, additionalData?: any) => {
    const { depositAmount, selectedCurrency, setLoading, setError, setDeposit } = get();

    if (!depositAmount || !selectedCurrency) {
      setError("Missing required deposit information");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await $fetch({
        url: `${endpoint}/deposit/fiat/${gateway.toLowerCase()}`,
        method: "POST",
        silent: true,
        body: {
          amount: depositAmount,
          currency: selectedCurrency,
          ...additionalData,
        },
      });

      if (error) {
        console.error(`Error processing ${gateway} deposit:`, error);
        setError(error || `Failed to process ${gateway} deposit`);
        setLoading(false);
        return;
      }

      // Handle redirect-based gateways
      if (data?.redirectUrl) {
        console.log(`Redirecting to ${gateway} payment page:`, data.redirectUrl);
        
        // Open payment page in popup or redirect
        const paymentWindow = window.open(
          data.redirectUrl,
          `${gateway}Payment`,
          "width=600,height=700,scrollbars=yes,resizable=yes"
        );

        if (!paymentWindow) {
          setError(`Please allow popups for ${gateway} payments`);
          setLoading(false);
          return;
        }

        // Monitor popup for completion
        const checkPayment = setInterval(() => {
          try {
            if (paymentWindow.closed) {
              clearInterval(checkPayment);
              // Check payment status
              get().verifyPaymentStatus(data.sessionId || data.orderId || data.transactionId);
            }
          } catch (e) {
            // Ignore cross-origin errors
          }
        }, 1000);

        // Set timeout for payment
        setTimeout(() => {
          if (!paymentWindow.closed) {
            paymentWindow.close();
            clearInterval(checkPayment);
            setError(`${gateway} payment timed out`);
            setLoading(false);
          }
        }, 10 * 60 * 1000); // 10 minutes timeout
      } else {
        // Handle direct response (e.g., for gateways that return immediate results)
        const depositData = {
          confirmed: true,
          status: "COMPLETED",
          id: data?.transaction?.id || data?.id,
          amount: data?.transaction?.amount || depositAmount,
          currency: selectedCurrency,
          method: gateway,
          transactionHash: data?.transaction?.referenceId || data?.transactionId,
          referenceId: data?.transaction?.referenceId || data?.referenceId,
          balance: data?.balance,
          transaction: data?.transaction,
          fee: data?.transaction?.fee || data?.fee,
          description: data?.transaction?.description || `${gateway} deposit`,
        };

        setDeposit(depositData);
        setLoading(false);
        console.log(`${gateway} payment completed successfully`, depositData);
      }
    } catch (error) {
      console.error(`Exception in ${gateway} deposit:`, error);
      setError(`An unexpected error occurred with ${gateway} payment`);
      setLoading(false);
    }
  },

  // Verify payment status for redirect-based gateways
  verifyPaymentStatus: async (paymentId: string) => {
    const { selectedDepositMethod, setLoading, setError, setDeposit } = get();
    
    if (!paymentId || !selectedDepositMethod) {
      setError("Missing payment information for verification");
      return;
    }

    try {
      const { data, error } = await $fetch({
        url: `${endpoint}/deposit/fiat/${selectedDepositMethod.alias}/verify`,
        method: "POST",
        silent: true,
        params: { paymentId },
      });

      if (error) {
        console.error("Error verifying payment:", error);
        setError(error || "Failed to verify payment");
        setLoading(false);
        return;
      }

      if (data?.status === "completed" || data?.confirmed) {
        const depositData = {
          confirmed: true,
          status: "COMPLETED",
          id: data?.transaction?.id || paymentId,
          amount: data?.transaction?.amount || 0,
          currency: data?.currency,
          method: selectedDepositMethod.title || selectedDepositMethod.alias,
          transactionHash: data?.transaction?.referenceId || paymentId,
          referenceId: data?.transaction?.referenceId || paymentId,
          balance: data?.balance,
          transaction: data?.transaction,
          fee: data?.transaction?.fee,
          description: data?.transaction?.description,
        };

        setDeposit(depositData);
        setLoading(false);
        toast.success(`Payment verified successfully!`);
      } else {
        setError("Payment was not completed successfully");
        setLoading(false);
      }
    } catch (error) {
      console.error("Exception in payment verification:", error);
      setError("An unexpected error occurred while verifying payment");
      setLoading(false);
    }
  },
}));
