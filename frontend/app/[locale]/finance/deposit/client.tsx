"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useDepositStore } from "@/store/finance/deposit-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader } from "@/components/ui/loader";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  DollarSign,
  Coins,
  TrendingUp,
  Banknote,
  CheckCircle,
  AlertCircle,
  Copy,
  QrCode,
  Clock,
  CreditCard,
  Landmark,
  ChevronRight,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Search,
  ChevronLeft,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { wsManager, ConnectionStatus } from "@/services/ws-manager";
import { Countdown } from "@/components/ui/countdown";
import { useTranslations } from "next-intl";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 },
};

interface DepositFormProps {
  initialType?: string;
  initialCurrency?: string;
}

// Manual Deposit Form Component
const ManualDepositForm = ({ method, currency, amount, onSubmit, loading, onBack, t, extractFeeValue }: {
  method: any;
  currency: string;
  amount: number;
  onSubmit: (values: any) => Promise<void>;
  loading: boolean;
  onBack: () => void;
  t: any;
  extractFeeValue: (feeData: any, currency: string) => number;
}) => {
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    // Validate required fields
    const newErrors: Record<string, string> = {};
    
    if (!amount || amount <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }

    // Validate custom fields if they exist
    if (method.customFields) {
      try {
        const fields = JSON.parse(method.customFields);
        fields.forEach((field: any) => {
          if (field.required && !customFields[field.name]) {
            const fieldLabel = field.title || field.label || field.name;
            newErrors[field.name] = `${fieldLabel} is required`;
          }
        });
      } catch (error) {
        console.error("Error parsing custom fields:", error);
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit the form
    try {
      await onSubmit({
        amount,
        customFields,
      });
    } catch (error) {
      console.error("Error submitting manual deposit:", error);
    }
  };

  const renderCustomField = (field: any) => {
    const value = customFields[field.name] || "";
    const error = errors[field.name];

    const handleChange = (newValue: string) => {
      setCustomFields(prev => ({
        ...prev,
        [field.name]: newValue
      }));
      
      // Clear error when user starts typing
      if (error) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field.name];
          return newErrors;
        });
      }
    };

    switch (field.type) {
      case "textarea":
        return (
          <div key={field.name} className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {field.title || field.label || field.name}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder || field.title || field.label || field.name}
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 ${
                error ? "border-red-500" : "border-zinc-300 dark:border-zinc-600"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              rows={3}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      default:
        return (
          <div key={field.name} className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {field.title || field.label || field.name}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Input
              type={field.type || "text"}
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder || field.title || field.label || field.name}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
    }
  };

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
            5
          </span>
          Complete Deposit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Method Information */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            {method.title}
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
            {method.description || "Manual transfer method"}
          </p>
          
          {/* Display method instructions if available */}
          {method.instructions && (
            <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
              {method.instructions}
            </div>
          )}
        </div>

        {/* Amount Summary */}
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Deposit Amount:
            </span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {amount} {currency}
            </span>
          </div>
          
          {/* Fee information */}
          {(method.fixedFee || method.percentageFee) && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Fee:
              </span>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {(() => {
                  try {
                    const fixedFee = extractFeeValue(method.fixedFee, currency);
                    const percentageFee = extractFeeValue(method.percentageFee, currency);
                    return `${fixedFee} + ${percentageFee}%`;
                  } catch (error) {
                    return "See method details";
                  }
                })()}
              </span>
            </div>
          )}
        </div>

        {/* Custom Fields */}
        {method.customFields && (
          <div className="space-y-4">
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
              Additional Information
            </h4>
            {(() => {
              try {
                const fields = JSON.parse(method.customFields);
                return fields.map((field: any) => renderCustomField(field));
              } catch (error) {
                return (
                  <p className="text-sm text-red-500">
                    Error loading form fields. Please contact support.
                  </p>
                );
              }
            })()}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={loading}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Submit Deposit"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export function DepositForm() {
  const t = useTranslations("finance/deposit");
  const searchParams = useSearchParams();
  const initialType = searchParams?.get("type");
  const initialCurrency = searchParams?.get("currency");
  const { user } = useUserStore();
  const { settings } = useConfigStore();
  const router = useRouter();
  
  // Check if spot wallets are enabled
  const isSpotEnabled = settings?.spotWallets === true || settings?.spotWallets === "true";

  // Local state
  const [depositExpired, setDepositExpired] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  
  // Currency search and pagination state
  const [currencySearch, setCurrencySearch] = useState("");
  const [currencyPage, setCurrencyPage] = useState(1);
  const [currenciesPerPage] = useState(12);

  const DEPOSIT_TIME_LIMIT = 30 * 60;

  const {
    // State
    step,
    selectedWalletType,
    selectedCurrency,
    selectedDepositMethod,
    depositAmount,
    depositAddress,
    currencies,
    depositMethods,
    transactionHash,
    loading,
    error,
    stripeListener,
    deposit,
    countdownActive,
    depositStartTime,
    transactionSent,
    paypalSDK,
    paypalLoaded,
    // Actions
    setStep,
    setSelectedWalletType,
    setSelectedCurrency,
    setSelectedDepositMethod,
    setDepositAmount,
    setDeposit,
    setError,
    fetchCurrencies,
    fetchDepositMethods,
    fetchDepositAddress,
    unlockDepositAddress,
    createPaypalOrder,
    approvePaypalOrder,
    stripeDeposit,
    stopStripeListener,
    reset,
    setTransactionHash,
    shouldShowCountdown,
    handleCountdownExpire,
    setCountdownActive,
    retryFetchDepositAddress,
    setPaypalSDK,
    setPaypalLoaded,
    // New Payment Gateway Methods
    payuDeposit,
    paytmDeposit,
    authorizeNetDeposit,
    adyenDeposit,
    twoCheckoutDeposit,
    dLocalDeposit,
    ewayDeposit,
    ipay88Deposit,
    payfastDeposit,
    mollieDeposit,
    paysafeDeposit,
    paystackDeposit,
    klarnaDeposit,
    processPaymentGateway,
    verifyPaymentStatus,
    sendTransactionHash,
    handleFiatDeposit,
  } = useDepositStore();

  // Add ref to track PayPal initialization
  const paypalInitialized = useRef(false);

  // Helper function to get required confirmations based on chain
  const getRequiredConfirmations = (chain: string): number => {
    const confirmationMap: { [key: string]: number } = {
      'XMR': 6,  // Updated to 6 confirmations for XMR
      'BTC': 3,
      'ETH': 12,
      'BSC': 15,
      'POLYGON': 30,
      'SOL': 31,
      'TON': 1,
      'TRON': 20,
      'LTC': 6,
      'DOGE': 6,
      'DASH': 6,
      'ARBITRUM': 12,
      'OPTIMISM': 12,
      'AVALANCHE': 12,
      'FANTOM': 12,
    };
    return confirmationMap[chain?.toUpperCase()] || 12; // Default to 12 confirmations
  };

  // Helper function to get blockchain explorer URL
  const getBlockchainExplorerUrl = (chain: string, txHash: string): string => {
    const explorerMap: { [key: string]: string } = {
      'XMR': `https://blockchair.com/monero/transaction/${txHash}`,  // Updated to use Blockchair for XMR
      'BTC': `https://blockchair.com/bitcoin/transaction/${txHash}`,
      'ETH': `https://etherscan.io/tx/${txHash}`,
      'BSC': `https://bscscan.com/tx/${txHash}`,
      'POLYGON': `https://polygonscan.com/tx/${txHash}`,
      'SOL': `https://solscan.io/tx/${txHash}`,
      'TON': `https://tonscan.org/tx/${txHash}`,
      'TRON': `https://tronscan.org/#/transaction/${txHash}`,
      'LTC': `https://blockchair.com/litecoin/transaction/${txHash}`,
      'DOGE': `https://blockchair.com/dogecoin/transaction/${txHash}`,
      'DASH': `https://blockchair.com/dash/transaction/${txHash}`,
      'ARBITRUM': `https://arbiscan.io/tx/${txHash}`,
      'OPTIMISM': `https://optimistic.etherscan.io/tx/${txHash}`,
      'AVALANCHE': `https://snowtrace.io/tx/${txHash}`,
      'FANTOM': `https://ftmscan.com/tx/${txHash}`,
    };
    return explorerMap[chain?.toUpperCase()] || `https://blockchair.com/search?q=${txHash}`;
  };

  // Helper function to estimate confirmation time
  const getEstimatedTime = (chain: string): string => {
    const timeMap: { [key: string]: string } = {
      'XMR': '20-30 minutes',
      'BTC': '30-60 minutes',
      'ETH': '2-5 minutes',
      'BSC': '1-3 minutes',
      'POLYGON': '2-5 minutes',
      'SOL': '1-2 minutes',
      'TON': '5-10 seconds',
      'TRON': '1-3 minutes',
      'LTC': '15-30 minutes',
      'DOGE': '15-30 minutes',
      'DASH': '15-30 minutes',
      'ARBITRUM': '2-5 minutes',
      'OPTIMISM': '2-5 minutes',
      'AVALANCHE': '1-3 minutes',
      'FANTOM': '1-3 minutes',
    };
    return timeMap[chain?.toUpperCase()] || '5-15 minutes';
  };

  // Initialize store
  useEffect(() => {
    reset();
    if (initialType) {
      const walletType = {
        value: initialType.toUpperCase(),
        label: initialType.charAt(0).toUpperCase() + initialType.slice(1).toLowerCase(),
      };
      setSelectedWalletType(walletType);
      if (initialCurrency) {
        setSelectedCurrency(initialCurrency);
      }
    }
  }, []);

  // Auto-fetch currencies when wallet type changes
  useEffect(() => {
    if (selectedWalletType) {
      // Reset currency search and pagination when wallet type changes
      setCurrencySearch("");
      setCurrencyPage(1);
      fetchCurrencies();
    }
  }, [selectedWalletType]);

  // Auto-fetch deposit methods when currency changes
  useEffect(() => {
    if (selectedWalletType && selectedCurrency) {
      fetchDepositMethods();
    }
  }, [selectedWalletType, selectedCurrency]);

  // WebSocket connection for ECO deposits
  useEffect(() => {
    if (
      selectedWalletType?.value === "ECO" &&
      depositAddress &&
      user?.id &&
      selectedCurrency &&
      selectedDepositMethod
    ) {
      const connectionId = "eco-deposit";
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/ecosystem/deposit?userId=${user.id}`;

      wsManager.connect(wsUrl, connectionId);

      const handleDepositUpdate = (data: any) => {
        const shouldUnlockAddress =
          selectedDepositMethod?.contractType === "NO_PERMIT" &&
          depositAddress?.address;

        // Handle pending XMR transactions with confirmations
        if (data?.type === "pending_confirmation" || data?.confirmations !== undefined) {
          const confirmations = data?.confirmations || 0;
          const requiredConfirmations = data?.requiredConfirmations || getRequiredConfirmations(selectedDepositMethod?.chain);
          const txHash = data?.transactionHash || data?.txHash || data?.hash;

          // Show pending transaction notification only for ECO wallets
          if (confirmations < requiredConfirmations && selectedWalletType?.value === "ECO") {
            toast.info(
              <div>
                <div>Transaction detected!</div>
                <div className="text-sm mt-1">
                  Confirmations: {confirmations}/{requiredConfirmations}
                </div>
                {txHash && (
                  <a
                    href={getBlockchainExplorerUrl(selectedDepositMethod?.chain, txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline mt-1 inline-block"
                  >
                    View on blockchain →
                  </a>
                )}
              </div>,
              {
                duration: 10000,
                id: `pending-tx-${txHash}`, // Prevent duplicate toasts
              }
            );

            // Store pending transaction info in deposit state only for ECO wallets
            if (selectedWalletType?.value === "ECO") {
              const pendingDepositData = {
                confirmed: false,
                status: "PENDING",
                id: data?.transaction?.id || txHash,
                amount: data?.transaction?.amount || data?.trx?.amount || data?.amount,
                currency: data?.currency || selectedCurrency,
                method: data?.method || selectedDepositMethod?.name || selectedDepositMethod?.chain,
                fee: data?.transaction?.fee || data?.trx?.fee || 0,
                balance: data?.balance || data?.wallet?.balance,
                transactionHash: txHash,
                confirmations: confirmations,
                requiredConfirmations: requiredConfirmations,
                blockNumber: data?.trx?.blockNumber || data?.blockNumber,
                from: data?.trx?.from || data?.from,
                to: data?.trx?.to || data?.to,
                chain: selectedDepositMethod?.chain,
              };
              setDeposit(pendingDepositData);
            }
          }
          return; // Don't process further for pending transactions
        }

        switch (data?.status) {
          case 200:
          case 201: {
            toast.success(data.message || "Deposit confirmed!");
            const depositData = {
              confirmed: true,
              status: data?.transaction?.status || "COMPLETED",
              id: data?.transaction?.id,
              amount: data?.transaction?.amount || data?.trx?.amount,
              currency: data?.currency || selectedCurrency,
              method: data?.method || selectedDepositMethod?.name || selectedDepositMethod?.chain,
              fee: data?.transaction?.fee || data?.trx?.fee || 0,
              balance: data?.balance || data?.wallet?.balance,
              transactionHash: data?.transaction?.trxId || data?.trx?.hash,
              blockNumber: data?.trx?.blockNumber,
              gasUsed: data?.trx?.gasUsed,
              from: data?.trx?.from,
              to: data?.trx?.to,
              chain: selectedDepositMethod?.chain,
            };
            setDeposit(depositData);

            if (shouldUnlockAddress) {
              unlockDepositAddress(depositAddress.address);
              setCountdownActive(false);
            }
            break;
          }
          case 400:
          case 401:
          case 403:
          case 404:
          case 500:
            toast.error(data.message || "Deposit failed");
            if (shouldUnlockAddress) {
              unlockDepositAddress(depositAddress.address);
              setCountdownActive(false);
            }
            break;
          default:
            // Handle any other message types that might contain transaction info
            if (data?.transactionHash || data?.txHash) {
              // This might be a transaction notification from the backend
              console.log("Received transaction update:", data);
            }
            break;
        }
      };

      wsManager.subscribe("verification", handleDepositUpdate, connectionId);

      const handleConnectionStatus = (status: ConnectionStatus) => {
        if (status === ConnectionStatus.CONNECTED) {
          const subscriptionMessage = {
            action: "SUBSCRIBE",
            payload: {
              currency: selectedCurrency,
              chain: selectedDepositMethod?.chain || selectedDepositMethod?.id,
              address: (typeof depositAddress === "string"
                ? depositAddress
                : depositAddress?.address
              )?.toLowerCase(),
            },
          };
          wsManager.sendMessage(subscriptionMessage, connectionId);
        }
      };
      wsManager.addStatusListener(handleConnectionStatus, connectionId);

      return () => {
        const unsubscribeMessage = {
          action: "UNSUBSCRIBE",
          payload: {
            currency: selectedCurrency,
            chain: selectedDepositMethod?.chain || selectedDepositMethod?.id,
            address: (typeof depositAddress === "string"
              ? depositAddress
              : depositAddress?.address
            )?.toLowerCase(),
          },
        };
        wsManager.sendMessage(unsubscribeMessage, connectionId);
        wsManager.unsubscribe("verification", handleDepositUpdate, connectionId);
        wsManager.removeStatusListener(handleConnectionStatus, connectionId);
      };
    }
  }, [selectedWalletType?.value, depositAddress, user?.id, selectedCurrency, selectedDepositMethod]);

  // WebSocket connection for SPOT deposits
  useEffect(() => {
    if (
      selectedWalletType?.value === "SPOT" &&
      transactionSent &&
      transactionHash &&
      user?.id &&
      selectedCurrency &&
      selectedDepositMethod
    ) {
      const connectionId = "spot-deposit";
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/finance/deposit/spot?userId=${user.id}`;

      wsManager.connect(wsUrl, connectionId);

      const handleSpotDepositUpdate = (data: any) => {
        switch (data?.status) {
          case 200:
          case 201: {
            toast.success(data.message || "Deposit confirmed!");
            const depositData = {
              confirmed: true,
              status: data?.transaction?.status || "COMPLETED",
              id: data?.transaction?.id,
              amount: data?.transaction?.amount,
              currency: data?.currency || selectedCurrency,
              method: data?.method || "Wallet Transfer",
              fee: data?.transaction?.fee || 0,
              balance: data?.balance,
              transactionHash: transactionHash,
              chain: data?.chain,
            };
            setDeposit(depositData);
            setCountdownActive(false);
            break;
          }
          case 400:
          case 401:
          case 403:
          case 404:
          case 500:
            toast.error(data.message || "Deposit failed");
            setCountdownActive(false);
            break;
        }
      };

      wsManager.subscribe("verification", handleSpotDepositUpdate, connectionId);

      const handleSpotConnectionStatus = (status: ConnectionStatus) => {
        if (status === ConnectionStatus.CONNECTED) {
          const subscriptionMessage = {
            action: "SUBSCRIBE",
            payload: { trx: transactionHash },
          };
          wsManager.sendMessage(subscriptionMessage, connectionId);
        }
      };
      wsManager.addStatusListener(handleSpotConnectionStatus, connectionId);

      return () => {
        wsManager.unsubscribe("verification", handleSpotDepositUpdate, connectionId);
        wsManager.removeStatusListener(handleSpotConnectionStatus, connectionId);
        wsManager.close(connectionId);
      };
    }
  }, [selectedWalletType?.value, transactionSent, transactionHash, user?.id, selectedCurrency, selectedDepositMethod]);

  // Prevent page closing/navigation when transaction hash is submitted but not confirmed
  useEffect(() => {
    if (transactionSent && !deposit?.confirmed && selectedWalletType?.value === "SPOT") {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "Your deposit is being processed. Are you sure you want to leave?";
        return "Your deposit is being processed. Are you sure you want to leave?";
      };
      const handlePopState = (e: PopStateEvent) => {
        if (!confirm("Your deposit is being processed. Are you sure you want to leave?")) {
          e.preventDefault();
          window.history.pushState(null, "", window.location.href);
        }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      window.addEventListener("popstate", handlePopState);
      window.history.pushState(null, "", window.location.href);
      
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [transactionSent, deposit?.confirmed, selectedWalletType?.value]);

  // Cleanup WebSocket connections and handle address unlocking on component unmount
  useEffect(() => {
    return () => {
      wsManager.close("eco-deposit");
      wsManager.close("spot-deposit");

      const currentState = useDepositStore.getState();
      if (
        currentState.selectedWalletType?.value === "ECO" &&
        currentState.selectedDepositMethod?.contractType === "NO_PERMIT" &&
        currentState.depositAddress?.address &&
        currentState.countdownActive
      ) {
        currentState.unlockDepositAddress(currentState.depositAddress.address);
      }
    };
  }, []);

  // Handle wallet type changes - unlock previous ECO address if switching
  const prevWalletRef = useRef({
    walletType: selectedWalletType?.value,
    currency: selectedCurrency,
    method: selectedDepositMethod?.id,
    address: depositAddress?.address,
    countdownActive: countdownActive,
  });

  useEffect(() => {
    const prev = prevWalletRef.current;
    const current = {
      walletType: selectedWalletType?.value,
      currency: selectedCurrency,
      method: selectedDepositMethod?.id,
      address: depositAddress?.address,
      countdownActive: countdownActive,
    };

    if (
      prev.walletType === "ECO" &&
      selectedDepositMethod?.contractType === "NO_PERMIT" &&
      prev.address &&
      prev.countdownActive &&
      (current.walletType !== prev.walletType ||
        current.currency !== prev.currency ||
        current.method !== prev.method)
    ) {
      unlockDepositAddress(prev.address);
      setCountdownActive(false);
    }
    prevWalletRef.current = current;
  }, [selectedWalletType, selectedCurrency, selectedDepositMethod, depositAddress, countdownActive]);

  // Load PayPal SDK when PayPal method is selected
  useEffect(() => {
    if (selectedDepositMethod?.alias === "paypal") {
      const APP_PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_APP_PAYPAL_CLIENT_ID;
      const scriptId = "paypal-js";
      
      if (typeof window !== "undefined" && (window as any).paypal) {
        setPaypalSDK((window as any).paypal);
      } else {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://www.paypal.com/sdk/js?client-id=${APP_PAYPAL_CLIENT_ID}&components=buttons&enable-funding=venmo,paylater`;
        script.onload = () => {
          setPaypalSDK((window as any).paypal);
        };
        document.body.appendChild(script);
      }
      
      return () => {
        const existingScript = document.getElementById(scriptId);
        if (existingScript) {
          setPaypalSDK(null);
          setPaypalLoaded(false);
          existingScript.remove();
        }
      };
    }
  }, [selectedDepositMethod?.alias]);

  // Initialize PayPal buttons when PayPal SDK is loaded
  useEffect(() => {
    if (
      paypalSDK &&
      !paypalLoaded &&
      selectedDepositMethod?.alias === "paypal"
    ) {
      const container = document.getElementById("paypal-button-container");
      if (!container) {
        console.warn("PayPal container not found, retrying...");
        const retryTimer = setTimeout(() => {
          const retryContainer = document.getElementById("paypal-button-container");
          if (retryContainer) {
            initializePayPalButtons(retryContainer);
          }
        }, 100);
        return () => clearTimeout(retryTimer);
      } else {
        initializePayPalButtons(container);
      }
    }

    function initializePayPalButtons(container: HTMLElement) {
      try {
        // Comprehensive cleanup of all PayPal elements
        const paypalSelectors = [
          '[data-paypal-button-id]',
          '.paypal-buttons',
          '.paypal-button',
          '[data-funding-source]',
          '.paypal-checkout-button',
          'div[id*="paypal"]'
        ];
        
        paypalSelectors.forEach(selector => {
          const elements = container.querySelectorAll(selector);
          elements.forEach(element => {
            try {
              element.remove();
            } catch (e) {
              console.warn(`Error removing PayPal element with selector ${selector}:`, e);
            }
          });
        });
        
        // Final cleanup - clear container if it still has children
        if (container.children.length > 0) {
          container.innerHTML = '';
        }
        
        setPaypalLoaded(true);
        let orderId: string;
        const FUNDING_SOURCES = [paypalSDK.FUNDING.PAYPAL];
        
        FUNDING_SOURCES.forEach((fundingSource) => {
          paypalSDK
            .Buttons({
              fundingSource,
              style: {
                layout: "vertical",
                shape: "pill",
                color: fundingSource === paypalSDK.FUNDING.PAYLATER ? "gold" : "",
              },
              createOrder: async () => {
                try {
                  orderId = await createPaypalOrder();
                  return orderId;
                } catch (error) {
                  console.error("Create order error:", error);
                  toast.error("Error creating PayPal order");
                  throw error;
                }
              },
              onApprove: async () => {
                try {
                  await approvePaypalOrder(orderId);
                  toast.success("PayPal payment completed successfully!");
                } catch (error) {
                  console.error("Approve order error:", error);
                  toast.error("Error approving PayPal transaction");
                }
              },
              onError: (error: any) => {
                console.error("PayPal error:", error);
                toast.error("PayPal payment failed");
              },
              onCancel: () => {
                toast.info("PayPal payment cancelled");
              },
            })
            .render("#paypal-button-container")
            .then(() => {
              // Inject dark mode CSS for PayPal buttons
              const isDarkMode = document.documentElement.classList.contains('dark');
              if (isDarkMode) {
                const style = document.createElement('style');
                style.id = 'paypal-dark-mode-fix';
                style.textContent = `
                  #paypal-button-container,
                  #paypal-button-container * {
                    background-color: transparent !important;
                    border: none !important;
                    outline: none !important;
                  }
                  #paypal-button-container iframe {
                    background-color: transparent !important;
                  }
                  #paypal-button-container .paypal-button-container,
                  #paypal-button-container [data-funding-source],
                  #paypal-button-container div[data-funding-source] {
                    background-color: transparent !important;
                    box-shadow: none !important;
                  }
                `;
                
                // Remove existing style if it exists
                const existingStyle = document.getElementById('paypal-dark-mode-fix');
                if (existingStyle) {
                  existingStyle.remove();
                }
                
                document.head.appendChild(style);
              }
            })
            .catch((error: any) => {
              console.error("PayPal render error:", error);
              setPaypalLoaded(false);
              // Fallback cleanup if render fails
              try {
                const container = document.getElementById("paypal-button-container");
                if (container) {
                  container.innerHTML = '';
                }
              } catch (cleanupError) {
                console.warn("PayPal fallback cleanup error:", cleanupError);
              }
            });
        });
      } catch (error) {
        console.error("PayPal initialization error:", error);
        setPaypalLoaded(false);
      }
    }

    return () => {
      const container = document.getElementById("paypal-button-container");
      if (container) {
        try {
          // Comprehensive cleanup of all PayPal elements
          const paypalSelectors = [
            '[data-paypal-button-id]',
            '.paypal-buttons',
            '.paypal-button',
            '[data-funding-source]',
            '.paypal-checkout-button',
            'div[id*="paypal"]'
          ];
          
          paypalSelectors.forEach(selector => {
            const elements = container.querySelectorAll(selector);
            elements.forEach(element => {
              try {
                element.remove();
              } catch (e) {
                console.warn(`PayPal cleanup error for selector ${selector}:`, e);
              }
            });
          });
          
          // Final cleanup - clear container if it still has children
          if (container.children.length > 0) {
            try {
              container.innerHTML = '';
            } catch (e) {
              console.warn('PayPal innerHTML cleanup error:', e);
            }
          }
        } catch (error) {
          console.warn("PayPal cleanup error:", error);
        }
      }
    };
  }, [
    paypalSDK,
    selectedDepositMethod?.alias,
    createPaypalOrder,
    approvePaypalOrder,
  ]);

  // Inject dark mode CSS for PayPal buttons
  useEffect(() => {
    if (paypalLoaded && selectedDepositMethod?.alias === "paypal") {
      const isDarkMode = document.documentElement.classList.contains('dark');
      if (isDarkMode) {
        const injectDarkModeCSS = () => {
          const style = document.createElement('style');
          style.id = 'paypal-dark-mode-fix';
          style.textContent = `
            #paypal-button-container,
            #paypal-button-container *,
            #paypal-button-container div,
            #paypal-button-container iframe {
              background-color: transparent !important;
              background: transparent !important;
              border: none !important;
              outline: none !important;
              box-shadow: none !important;
            }
            #paypal-button-container .paypal-button-container,
            #paypal-button-container [data-funding-source],
            #paypal-button-container div[data-funding-source] {
              background-color: transparent !important;
              background: transparent !important;
            }
            /* Force transparent background for all PayPal elements */
            [data-funding-source="paypal"] {
              background-color: transparent !important;
              background: transparent !important;
            }
          `;
          
          // Remove existing style if it exists
          const existingStyle = document.getElementById('paypal-dark-mode-fix');
          if (existingStyle) {
            existingStyle.remove();
          }
          
          document.head.appendChild(style);
        };

        // Initial injection
        injectDarkModeCSS();

        // Watch for PayPal DOM changes and re-inject CSS
        const container = document.getElementById('paypal-button-container');
        if (container) {
          const observer = new MutationObserver(() => {
            // Re-inject CSS when PayPal content changes
            setTimeout(injectDarkModeCSS, 100);
          });

          observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true
          });

          return () => {
            observer.disconnect();
            // Cleanup dark mode CSS
            const existingStyle = document.getElementById('paypal-dark-mode-fix');
            if (existingStyle) {
              existingStyle.remove();
            }
          };
        }
      }
    }
    
    return () => {
      // Cleanup dark mode CSS
      const existingStyle = document.getElementById('paypal-dark-mode-fix');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [paypalLoaded, selectedDepositMethod?.alias]);

  // Handle deposit expiry
  const handleDepositExpiry = useCallback(() => {
    setDepositExpired(true);
    toast.error("Deposit time limit expired. Please start a new deposit.");
  }, []);

  // Helper functions
  const getWalletIcon = (walletType: string) => {
    switch (walletType) {
      case "FIAT": return <DollarSign className="h-5 w-5" />;
      case "SPOT": return <Coins className="h-5 w-5" />;
      case "ECO": return <TrendingUp className="h-5 w-5" />;
      case "FUTURES": return <Banknote className="h-5 w-5" />;
      default: return <Wallet className="h-5 w-5" />;
    }
  };

  const getMethodIcon = (methodType: string) => {
    switch (methodType?.toLowerCase()) {
      case "bank": return <Landmark className="h-5 w-5" />;
      case "card": return <CreditCard className="h-5 w-5" />;
      case "crypto": return <Coins className="h-5 w-5" />;
      default: return <Wallet className="h-5 w-5" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // Event handlers
  const handleWalletSelect = (walletType: any) => {
    if (selectedWalletType && selectedWalletType.value !== walletType.value) {
      wsManager.close("eco-deposit");
      reset();
    }
    setSelectedWalletType(walletType);
  };

  const handleCurrencySelect = (currency: string) => {
    setSelectedCurrency(currency);
    setSelectedDepositMethod(null);
    setDepositAmount(0);
    setTransactionHash("");
    setDeposit(null);
    setError(null);
    setStep(3);
  };

  // Currency search and pagination helpers
  const filteredCurrencies = currencies.filter((currency: any) => {
    const searchTerm = currencySearch.toLowerCase();
    return (
      currency.value.toLowerCase().includes(searchTerm) ||
      currency.label.toLowerCase().includes(searchTerm)
    );
  });

  const totalCurrencyPages = Math.ceil(filteredCurrencies.length / currenciesPerPage);
  const startIndex = (currencyPage - 1) * currenciesPerPage;
  const endIndex = startIndex + currenciesPerPage;
  const paginatedCurrencies = filteredCurrencies.slice(startIndex, endIndex);

  const handleCurrencySearchChange = (value: string) => {
    setCurrencySearch(value);
    setCurrencyPage(1); // Reset to first page when searching
  };

  const handleCurrencyPageChange = (page: number) => {
    setCurrencyPage(page);
  };

  const handleMethodSelect = async (method: any) => {
    if (
      selectedWalletType?.value === "ECO" &&
      selectedDepositMethod &&
      depositAddress &&
      (selectedDepositMethod.chain !== method.chain || selectedDepositMethod.id !== method.id)
    ) {
      const connectionId = "eco-deposit";
      const unsubscribeMessage = {
        action: "UNSUBSCRIBE",
        payload: {
          currency: selectedCurrency,
          chain: selectedDepositMethod?.chain || selectedDepositMethod?.id,
          address: (typeof depositAddress === "string"
            ? depositAddress
            : depositAddress?.address
          )?.toLowerCase(),
        },
      };
      wsManager.sendMessage(unsubscribeMessage, connectionId);
    }
    setSelectedDepositMethod(method);

    if (method?.alias !== "paypal") {
      setPaypalSDK(null);
      setPaypalLoaded(false);
      paypalInitialized.current = false;
    } else {
      paypalInitialized.current = false;
    }

    if (selectedWalletType?.value === "SPOT" || selectedWalletType?.value === "ECO") {
      try {
        console.log("Fetching deposit address for:", { 
          walletType: selectedWalletType?.value,
          currency: selectedCurrency,
          method: method
        });
        const result = await fetchDepositAddress();
        console.log("Fetch deposit address result:", result);
        
        if (!result.success) {
          console.error("Failed to fetch deposit address:", result.error);
          toast.error(result.error || "Failed to generate deposit address");
        } else {
          console.log("Successfully fetched deposit address, advancing to step 4");
          console.log("Current step before setStep:", step);
          // After successfully fetching deposit address, advance to the next step
          // For ECO/SPOT deposits, the next step should show the deposit address
          setStep(4);
          console.log("setStep(4) called");
          
          // Check if step actually changed after a brief delay
          setTimeout(() => {
            console.log("Step after setStep(4):", step);
          }, 100);
        }
      } catch (error) {
        console.error("Exception in fetchDepositAddress:", error);
        toast.error("Failed to generate deposit address");
      }
    } else {
      setStep(4);
    }
  };

  const handleProceedToDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (selectedWalletType?.value === "FIAT" && selectedDepositMethod && !selectedDepositMethod.alias) {
      setStep(5);
      return;
    }

    try {
      const result = await fetchDepositAddress();
      if (!result.success) {
        toast.error(result.error || "Failed to generate deposit address");
      }
    } catch (error) {
      toast.error("Failed to generate deposit address");
    }
  };

  const handleReceiptUpload = (file: File) => {
    setReceiptImage(file);
  };

  // Payment gateway functions
  const getPaymentGatewayAction = (gateway: any) => {
    const alias = gateway.alias?.toLowerCase();
    
    // For manual methods without alias, use handleProceedToDeposit
    if (!alias) {
      return handleProceedToDeposit;
    }
    
    switch (alias) {
      case 'stripe': return stripeDeposit;
      case 'paypal': return () => {};
      case 'payu': return payuDeposit;
      case 'paytm': return paytmDeposit;
      case 'authorizenet': return authorizeNetDeposit;
      case 'adyen': return adyenDeposit;
      case '2checkout': return twoCheckoutDeposit;
      case 'dlocal': return dLocalDeposit;
      case 'eway': return ewayDeposit;
      case 'ipay88': return ipay88Deposit;
      case 'payfast': return payfastDeposit;
      case 'mollie': return mollieDeposit;
      case 'paysafe': return paysafeDeposit;
      case 'paystack': return paystackDeposit;
      case 'klarna': return klarnaDeposit;
      default: return () => processPaymentGateway(alias);
    }
  };

  const getPaymentGatewayIcon = (gateway: any) => {
    const alias = gateway.alias?.toLowerCase();
    
    const icons: { [key: string]: string } = {
      'stripe': '💳', 'paypal': '💛', 'payu': '🟢', 'paytm': '🔵',
      'authorizenet': '🔴', 'adyen': '💚', '2checkout': '💜', 'dlocal': '🟠',
      'eway': '🔵', 'ipay88': '🟣', 'payfast': '🟢', 'mollie': '🩷',
      'paysafe': '🔷', 'paystack': '🔵', 'klarna': '🩷'
    };
    
    return icons[alias] || '💳';
  };

  const getPaymentGatewayButtonText = (gateway: any) => {
    const alias = gateway.alias?.toLowerCase();
    
    const texts: { [key: string]: string } = {
      'stripe': t("pay_with_stripe"), 'paypal': t("pay_with_paypal"),
      'payu': t("pay_with_payu"), 'paytm': t("pay_with_paytm"),
      'authorizenet': t("pay_with_authorize_net"), 'adyen': t("pay_with_adyen"),
      '2checkout': t("pay_with_2checkout"), 'dlocal': t("pay_with_dlocal"),
      'eway': t("pay_with_eway"), 'ipay88': t("pay_with_ipay88"),
      'payfast': t("pay_with_payfast"), 'mollie': t("pay_with_mollie"),
      'paysafe': t("pay_with_paysafe"), 'paystack': t("pay_with_paystack"),
      'klarna': t("pay_with_klarna")
    };
    
    return texts[alias] || `${t("pay_with")} ${gateway.title || gateway.alias}`;
  };

  const renderPaymentGatewayButton = (gateway: any) => {
    const alias = gateway.alias?.toLowerCase();
    const action = getPaymentGatewayAction(gateway);
    const icon = getPaymentGatewayIcon(gateway);
    const buttonText = getPaymentGatewayButtonText(gateway);

    if (alias === 'paypal') {
      const minAmount = extractAmountValue(gateway.minAmount, selectedCurrency);
      const isAmountValid = depositAmount >= minAmount;
      
      return (
        <div key={gateway.id} className="w-full">
          <div
            id="paypal-button-container"
            className={`w-full min-h-[50px] bg-transparent dark:bg-transparent rounded-lg overflow-hidden ${isAmountValid ? 'block' : 'hidden'}`}
            style={{ 
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none'
            }}
          >
            <div className="flex items-center justify-center space-x-2 text-zinc-600 dark:text-zinc-400 bg-transparent">
              {!paypalLoaded && (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-sm">{t("loading_paypal_sdk")}</span>
                </>
              )}
            </div>
          </div>
          <div className={`w-full ${!isAmountValid ? 'block' : 'hidden'}`}>
            <Button
              disabled
              className="w-full h-12 text-lg font-semibold bg-gray-400 hover:bg-gray-500 dark:bg-zinc-600 dark:hover:bg-zinc-500"
              size="lg"
            >
              {t("pay_with_paypal")}
              <span className="ml-2 text-sm">
                (min {minAmount} {selectedCurrency})
              </span>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Button
        key={gateway.id}
        onClick={action}
        disabled={loading || stripeListener}
        className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white"
        size="lg"
      >
        {loading || stripeListener ? (
          <>
            <Loader size="sm" className="mr-2" />
            {stripeListener && alias === 'stripe'
              ? t("processing_stripe_payment")
              : t("processing_payment")}
          </>
        ) : (
          <>
            <span className="mr-2">{icon}</span>
            {buttonText}
            <ChevronRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>
    );
  };

  // Helper function to safely extract fee values
  const extractFeeValue = (feeData: any, currency: string): number => {
    if (!feeData && feeData !== 0) return 0;
    
    // Handle objects
    if (typeof feeData === 'object' && feeData !== null) {
      // Try to get the value for the selected currency
      if (feeData[currency] !== undefined) {
        return parseFloat(String(feeData[currency])) || 0;
      }
      
      // Try to get the first available value
      const values = Object.values(feeData);
      if (values.length > 0) {
        return parseFloat(String(values[0])) || 0;
      }
      
      return 0;
    }
    
    // Handle primitive values
    return parseFloat(String(feeData)) || 0;
  };

  // Helper function to safely extract amount values
  const extractAmountValue = (amountData: any, currency: string): number => {
    if (!amountData && amountData !== 0) return 0;
    
    // Handle objects
    if (typeof amountData === 'object' && amountData !== null) {
      // Try to get the value for the selected currency
      if (amountData[currency] !== undefined) {
        return parseFloat(String(amountData[currency])) || 0;
      }
      
      // Try to get the first available value
      const values = Object.values(amountData);
      if (values.length > 0) {
        return parseFloat(String(values[0])) || 0;
      }
      
      return 0;
    }
    
    // Handle primitive values
    return parseFloat(String(amountData)) || 0;
  };

  // Helper function to safely render any value
  const safeRender = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
      // For objects, try to extract a meaningful value or return empty string
      return '';
    }
    return String(value);
  };

  const getNetworkDisplayName = (chain: any): string => {
    try {
      // If there's a custom name, use it
      if (chain.name && typeof chain.name === 'string' && chain.name !== chain.id) {
        return chain.name;
      }
      
      // Create a user-friendly name based on the chain ID
      if (chain.id) {
        const id = String(chain.id);
        
        // Handle common patterns
        if (id.includes('_NATIVE')) {
          return id.replace('_NATIVE', ' Native');
        }
        if (id.includes('_')) {
          // Split by underscore and format
          const parts = id.split('_');
          if (parts.length === 2 && parts[0] === parts[1]) {
            // Handle BTC_BTC -> BTC Network
            return `${parts[0]} Network`;
          }
          // Handle other patterns like ETH_ERC20 -> ETH (ERC20)
          return `${parts[0]} (${parts[1]})`;
        }
        
        return id;
      }
      
      return typeof chain.chain === 'string' ? chain.chain : 'Unknown Network';
    } catch (error) {
      console.error('Error in getNetworkDisplayName:', error, chain);
      return 'Unknown Network';
    }
  };

  const getNetworkSubtitle = (chain: any): string => {
    try {
      // Show the chain type or network info
      if (chain.chain && typeof chain.chain === 'string' && chain.chain !== chain.id) {
        return chain.chain;
      }
      
      // Show contract type if available
      if (chain.contractType && typeof chain.contractType === 'string') {
        return chain.contractType;
      }
      
      // Show the currency
      return selectedCurrency || 'Unknown';
    } catch (error) {
      console.error('Error in getNetworkSubtitle:', error, chain);
      return selectedCurrency || 'Unknown';
    }
  };





  // Stripe processing state
  if (stripeListener) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div {...fadeInUp} className="text-center space-y-8">
          <div className="mx-auto w-20 h-20 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {t("processing_stripe_payment")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              {t("please_complete_your_checkout_window")}<br />
              {t("do_not_close_this_page")}
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              {t("until_the_payment_is_completed")}.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              stopStripeListener();
              setError(null);
              toast.info("Payment cancelled");
            }}
            className="mt-4"
          >
            {t("cancel_payment")}
          </Button>
        </motion.div>
      </div>
    );
  }

  // Manual deposit success state (step 6)
  if (step === 6 && deposit) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <motion.div {...fadeInUp} className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-green-600 dark:text-green-400">
            Deposit Request Submitted
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Your deposit request has been submitted successfully and is being processed.
          </p>
        </motion.div>

        <motion.div {...scaleIn}>
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Transaction Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Transaction ID</span>
                  <span className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
                    {deposit.transaction?.id || deposit.id}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Amount</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {deposit.transaction?.amount || deposit.amount} {deposit.currency || selectedCurrency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Method</span>
                  <span className="font-medium">{deposit.method || selectedDepositMethod?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Status</span>
                  <span className="text-sm px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                    {deposit.transaction?.status || deposit.status || "PENDING"}
                  </span>
                </div>
                {deposit.transaction?.fee && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Fee</span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">
                      {deposit.transaction.fee} {deposit.currency || selectedCurrency}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Wallet</span>
                  <span className="font-medium">{selectedWalletType?.label}</span>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Next Steps:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Our team will review your deposit request</li>
                  <li>• You will receive an email confirmation shortly</li>
                  <li>• Processing typically takes 1-3 business days</li>
                  <li>• You can track the status in your transaction history</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/finance/transactions'}
                  className="flex-1"
                >
                  View Transactions
                </Button>
                <Button
                  onClick={reset}
                  className="flex-1"
                >
                  Make Another Deposit
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (deposit?.confirmed) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <motion.div {...fadeInUp} className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {t("deposit_successful")}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {t("your_deposit_has_been_added_to_your_account")}
          </p>
        </motion.div>

        <motion.div {...scaleIn}>
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {t("deposit_details")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">{t("amount")}</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {deposit.amount} {deposit.currency?.toUpperCase() || selectedCurrency}
                  </span>
                </div>
                {deposit.fee && Number(deposit.fee) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">{t("fee")}</span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">
                      {deposit.fee} {deposit.currency?.toUpperCase() || selectedCurrency}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">{t("method")}</span>
                  <span className="font-medium">{deposit.method}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">{t("wallet")}</span>
                  <span className="font-medium">{selectedWalletType?.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">{t("status")}</span>
                  <span className={`font-medium ${
                    deposit.status === "COMPLETED" ? "text-green-600 dark:text-green-400" : 
                    deposit.status === "PENDING" ? "text-yellow-600 dark:text-yellow-400" : 
                    "text-red-600 dark:text-red-400"
                  }`}>
                    {deposit.status}
                  </span>
                </div>
                {deposit.balance && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">{t("new_balance")}</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {deposit.balance} {deposit.currency?.toUpperCase() || selectedCurrency}
                    </span>
                  </div>
                )}
                {deposit.transactionHash && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">{t("transaction_hash")}</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                        {deposit.transactionHash.slice(0, 16)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(deposit.transactionHash)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {deposit.blockNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">{t("block_number")}</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {deposit.blockNumber}
                    </span>
                  </div>
                )}
                {deposit.from && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">{t("from")}</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                        {deposit.from.slice(0, 8)}{deposit.from.slice(-6)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(deposit.from)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {deposit.to && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">{t("to")}</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                        {deposit.to.slice(0, 8)}{deposit.to.slice(-6)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(deposit.to)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => {
                    setDeposit(null);
                    reset();
                  }}
                  className="flex-1"
                >
                  {t("make_another_deposit")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/finance/wallet")}
                  className="flex-1"
                >
                  {t("view_wallet")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error && !stripeListener) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div {...fadeInUp} className="text-center space-y-8">
          <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {t("deposit_failed")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => {
                setError(null);
                setDeposit(null);
                setStep(1);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t("try_again")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                setDeposit(null);
              }}
            >
              {t("Cancel")}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main component render
  try {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          {t("deposit_funds")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {t("add_funds_to_your_wallet_quickly_and_securely")}
        </p>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div {...fadeInUp}>
            <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertTitle className="text-red-800 dark:text-red-300">
                Error
              </AlertTitle>
              <AlertDescription className="text-red-700 dark:text-red-400">
                {error}
                {selectedWalletType?.value === "ECO" &&
                  (error.includes("custodial wallets are currently in use") ||
                  error.includes("All custodial wallets") ||
                  error.includes("try again")) && (
                  <div className="mt-3">
                    <Button
                      onClick={retryFetchDepositAddress}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
                          {t("Retrying")}.
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {t("try_again")}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expired Alert */}
      <AnimatePresence>
        {depositExpired && (
          <motion.div {...fadeInUp}>
            <Alert className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertTitle className="text-orange-800 dark:text-orange-300">
                {t("deposit_expired")}
              </AlertTitle>
              <AlertDescription className="text-orange-700 dark:text-orange-400">
                {t("the_deposit_session_has_expired")}. {t("please_start_a_new_deposit")}.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 1: Wallet Selection */}
      {step !== 4 && step !== 5 && step !== 6 && (
        <motion.div {...fadeInUp}>
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                  1
                </span>
                {t("select_wallet_type")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { value: "FIAT", label: "Fiat" },
                  ...(isSpotEnabled ? [{ value: "SPOT", label: "Spot" }] : []),
                  { value: "ECO", label: "Eco" },
                ].map((wallet) => (
                  <motion.button
                    key={wallet.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleWalletSelect(wallet)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedWalletType?.value === wallet.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div
                        className={`p-3 rounded-full ${
                          selectedWalletType?.value === wallet.value
                            ? "bg-blue-500 text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {getWalletIcon(wallet.value)}
                      </div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {wallet.label}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 2: Currency Selection */}
      <AnimatePresence>
        {selectedWalletType &&
          currencies.length > 0 &&
          step !== 4 && 
          step !== 5 && 
          step !== 6 && (
            <motion.div {...fadeInUp}>
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                      2
                    </span>
                    {t("select_currency")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      placeholder={t("search_currencies")}
                      value={currencySearch}
                      onChange={(e) => handleCurrencySearchChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Results Info */}
                  {currencySearch && (
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {filteredCurrencies.length} {t("results_found")} for "{currencySearch}"
                    </div>
                  )}

                  {/* Currency Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedCurrencies.map((currency: any) => (
                      <motion.button
                        key={currency.value}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleCurrencySelect(currency.value)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedCurrency === currency.value
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                            : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                selectedCurrency === currency.value
                                  ? "bg-blue-500 text-white"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                              }`}
                            >
                              <span className="text-xs font-bold">
                                {currency.value.slice(0, 2)}
                              </span>
                            </div>
                            <div className="text-left">
                              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {currency.value}
                              </div>
                              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                {currency.label.split("-")[1] || currency.label}
                              </div>
                            </div>
                          </div>
                          {selectedCurrency === currency.value && (
                            <CheckCircle className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {/* Empty State */}
                  {paginatedCurrencies.length === 0 && currencySearch && (
                    <div className="text-center py-8">
                      <div className="text-zinc-500 dark:text-zinc-400">
                        {t("no_currencies_found")} "{currencySearch}"
                      </div>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalCurrencyPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        {t("showing")} {startIndex + 1}-{Math.min(endIndex, filteredCurrencies.length)} {t("of")} {filteredCurrencies.length}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCurrencyPageChange(currencyPage - 1)}
                          disabled={currencyPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {currencyPage} / {totalCurrencyPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCurrencyPageChange(currencyPage + 1)}
                          disabled={currencyPage === totalCurrencyPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Step 3: Loading State for Deposit Methods */}
      <AnimatePresence>
        {selectedCurrency &&
          loading &&
          (!depositMethods ||
            (Array.isArray(depositMethods) && depositMethods.length === 0)) && 
          step !== 4 && 
          step !== 5 && 
          step !== 6 && (
            <motion.div {...fadeInUp}>
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                      3
                    </span>
                    {t("select_deposit_method")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                      {selectedWalletType?.value === "FIAT"
                        ? "Loading Payment Methods..."
                        : "Loading Blockchain Networks..."}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 animate-pulse"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                                <div className="h-4 w-4 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-24"></div>
                                <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-16"></div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-20"></div>
                                <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-16"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-center mt-6">
                      <div className="flex items-center justify-center space-x-2 text-zinc-600 dark:text-zinc-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-sm">
                          {selectedWalletType?.value === "FIAT"
                            ? "Loading payment methods..."
                            : "Loading blockchain networks..."}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Step 3: Deposit Method Selection */}
      <AnimatePresence>
        {selectedCurrency && depositMethods && !loading && step !== 4 && step !== 5 && step !== 6 && (
          <motion.div {...fadeInUp}>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                    3
                  </span>
                  {t("select_deposit_method")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* FIAT: Payment Gateways */}
                {selectedWalletType?.value === "FIAT" &&
                  (depositMethods as any)?.gateways &&
                  Array.isArray((depositMethods as any).gateways) &&
                  (depositMethods as any).gateways.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                        {t("payment_gateways")}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(depositMethods as any).gateways.map((gateway: any) => (
                          <motion.button
                            key={gateway.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleMethodSelect(gateway)}
                            className={`p-6 rounded-xl border-2 transition-all text-left ${
                              selectedDepositMethod?.id === gateway.id
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                                : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"
                            }`}
                          >
                            <div className="flex items-start space-x-4">
                              {gateway.image && (
                                <img
                                  src={gateway.image}
                                  alt={gateway.title}
                                  className="w-12 h-12 object-contain rounded"
                                />
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                                  {typeof gateway.title === 'string' ? gateway.title : (gateway.name || 'Payment Gateway')}
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                  {(() => {
                                    if (typeof gateway.description === 'string') {
                                      return gateway.description;
                                    } else if (typeof gateway.description === 'object' && gateway.description !== null) {
                                      // If it's an object, try to get a meaningful description
                                      if (gateway.description[selectedCurrency]) {
                                        return gateway.description[selectedCurrency];
                                      }
                                      // Fallback to a generic description
                                      return `${gateway.title} payment gateway`;
                                    }
                                    return gateway.title ? `${gateway.title} payment gateway` : "Payment gateway";
                                  })()}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {(() => {
                                      try {
                                        const fixedFee = extractFeeValue(gateway.fixedFee, selectedCurrency);
                                        const percentageFee = extractFeeValue(gateway.percentageFee, selectedCurrency);
                                        return `${fixedFee} + ${percentageFee}% ${t("fee")}`;
                                      } catch (error) {
                                        console.error('Fee extraction error:', error, gateway);
                                        return `${t("fee")} ${t("not_available")}`;
                                      }
                                    })()}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {(() => {
                                      try {
                                        const minAmount = extractAmountValue(gateway.minAmount, selectedCurrency);
                                        const maxAmount = extractAmountValue(gateway.maxAmount, selectedCurrency);
                                        return `${minAmount} - ${maxAmount || "∞"} ${selectedCurrency}`;
                                      } catch (error) {
                                        console.error('Amount extraction error:', error, gateway);
                                        return `${t("amount_range")} ${t("not_available")}`;
                                      }
                                    })()}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                {/* FIAT: Manual Methods */}
                {selectedWalletType?.value === "FIAT" &&
                  (depositMethods as any)?.methods &&
                  Array.isArray((depositMethods as any).methods) &&
                  (depositMethods as any).methods.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                        {t("manual_transfer_methods")}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(depositMethods as any).methods.map((method: any) => (
                          <motion.button
                            key={method.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleMethodSelect(method)}
                            className={`p-6 rounded-xl border-2 transition-all text-left ${
                              selectedDepositMethod?.id === method.id
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                                : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"
                            }`}
                          >
                            <div className="flex items-start space-x-4">
                              {method.image ? (
                                <img
                                  src={method.image}
                                  alt={method.title}
                                  className="w-12 h-12 object-contain rounded"
                                />
                              ) : (
                                <div
                                  className={`p-3 rounded-full ${
                                    selectedDepositMethod?.id === method.id
                                      ? "bg-blue-500 text-white"
                                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                  }`}
                                >
                                  <Landmark className="h-5 w-5" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                                  {typeof method.title === 'string' ? method.title : (method.name || 'Payment Method')}
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                  {typeof method.description === 'string' 
                                    ? method.description 
                                    : typeof method.description === 'object' && method.description !== null
                                      ? JSON.stringify(method.description)
                                      : "Manual transfer method"}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {(() => {
                                      try {
                                        const fixedFee = extractFeeValue(method.fixedFee, selectedCurrency);
                                        const percentageFee = extractFeeValue(method.percentageFee, selectedCurrency);
                                        return `${fixedFee} + ${percentageFee}% ${t("fee")}`;
                                      } catch (error) {
                                        console.error('Fee extraction error:', error, method);
                                        return `${t("fee")} ${t("not_available")}`;
                                      }
                                    })()}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {(() => {
                                      try {
                                        const minAmount = extractAmountValue(method.minAmount, selectedCurrency);
                                        const maxAmount = extractAmountValue(method.maxAmount, selectedCurrency);
                                        return `${minAmount} - ${maxAmount || "∞"} ${selectedCurrency}`;
                                      } catch (error) {
                                        console.error('Amount extraction error:', error, method);
                                        return `${t("amount_range")} ${t("not_available")}`;
                                      }
                                    })()}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                {/* SPOT/ECO: Blockchain Networks */}
                {(selectedWalletType?.value === "SPOT" || selectedWalletType?.value === "ECO") &&
                  Array.isArray(depositMethods) &&
                  depositMethods.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                        {t("select_blockchain_network")}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {depositMethods.map((chain: any) => (
                          <motion.button
                            key={chain.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleMethodSelect(chain)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                              selectedDepositMethod?.id === chain.id
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                                : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`p-2 rounded-full ${
                                    selectedDepositMethod?.id === chain.id
                                      ? "bg-blue-500 text-white"
                                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                  }`}
                                >
                                  <Coins className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {getNetworkDisplayName(chain)}
                                  </h4>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {getNetworkSubtitle(chain)}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-zinc-600 dark:text-zinc-400">
                                    {t("network_fee")}
                                  </span>
                                  <span className="font-medium text-orange-600 dark:text-orange-400">
                                    {(() => {
                                      if (!chain.fee) return `0 ${selectedCurrency}`;
                                      if (typeof chain.fee === "object") {
                                        return `${chain.fee?.percentage || chain.fee?.min || 0}%`;
                                      }
                                      return `${chain.fee} ${selectedCurrency}`;
                                    })()}
                                  </span>
                                </div>
                                {(chain.limits?.withdraw?.min || chain.limits?.deposit?.min) && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-600 dark:text-zinc-400">
                                      {t("min_amount")}
                                    </span>
                                    <span className="font-medium">
                                      {(() => {
                                        const minAmount = chain.limits?.withdraw?.min || chain.limits?.deposit?.min;
                                        return typeof minAmount === 'object' ? '0' : (minAmount || '0');
                                      })()} {selectedCurrency}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 4: Amount Input - Only for FIAT methods */}
      <AnimatePresence>
        {step === 4 && selectedDepositMethod && selectedWalletType?.value === "FIAT" && (
          <motion.div {...fadeInUp}>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                    4
                  </span>
                  {t("enter_amount")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("deposit_amount")}
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={depositAmount || ""}
                      onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
                      min="0"
                      step="0.00000001"
                      className="text-lg pr-16"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {selectedCurrency}
                    </div>
                  </div>
                  {(selectedDepositMethod.minAmount ||
                    selectedDepositMethod.limits?.withdraw?.min ||
                    selectedDepositMethod.limits?.deposit?.min) && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {t("minimum")} {extractAmountValue(
                        selectedDepositMethod.minAmount ||
                        selectedDepositMethod.limits?.withdraw?.min ||
                        selectedDepositMethod.limits?.deposit?.min, 
                        selectedCurrency
                      )} {selectedCurrency}
                    </p>
                  )}
                </div>

                <div className="max-w-md mx-auto">
                  {renderPaymentGatewayButton(selectedDepositMethod)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 4: ECO/SPOT Deposit Address Display or Pending Transaction View - Full Screen */}
      {step === 4 && (selectedWalletType?.value === "ECO" || selectedWalletType?.value === "SPOT") && depositAddress && (
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div {...fadeInUp}>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader className="text-center pb-4">
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 justify-center text-xl">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white text-sm font-semibold">
                    4
                  </span>
                  {/* Only show processing title for ECO wallets with pending transactions */}
                  {selectedWalletType?.value === "ECO" && deposit?.status === "PENDING" && deposit?.confirmations !== undefined
                    ? `Processing ${selectedCurrency} Deposit`
                    : `Deposit ${selectedCurrency} to Your Wallet`}
                </CardTitle>
                <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                  {/* Only show processing message for ECO wallets with pending transactions */}
                  {selectedWalletType?.value === "ECO" && deposit?.status === "PENDING" && deposit?.confirmations !== undefined
                    ? "Your transaction has been detected and is being confirmed on the blockchain."
                    : `Send ${selectedCurrency} to the address below. Your deposit will be credited after network confirmation.`}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Show pending transaction view ONLY for ECO wallets when transaction is detected but not confirmed */}
                {selectedWalletType?.value === "ECO" && deposit?.status === "PENDING" && deposit?.confirmations !== undefined ? (
                  <>
                    {/* Pending Transaction View */}
                    <div className="space-y-6">
                      {/* Transaction Status Card */}
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400 animate-pulse" />
                              </div>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                                Transaction Pending
                              </h3>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                Waiting for blockchain confirmations
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Confirmation Progress */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-yellow-800 dark:text-yellow-200">Confirmations</span>
                            <span className="font-mono font-semibold text-yellow-900 dark:text-yellow-100">
                              {deposit.confirmations} / {deposit.requiredConfirmations || getRequiredConfirmations(selectedDepositMethod?.chain)}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="relative">
                            <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-3 overflow-hidden">
                              <motion.div
                                className="bg-gradient-to-r from-yellow-400 to-orange-400 dark:from-yellow-500 dark:to-orange-500 h-full rounded-full flex items-center justify-end pr-2"
                                initial={{ width: "0%" }}
                                animate={{
                                  width: `${Math.min(100, (deposit.confirmations / (deposit.requiredConfirmations || getRequiredConfirmations(selectedDepositMethod?.chain))) * 100)}%`
                                }}
                                transition={{ duration: 0.5 }}
                              >
                                {deposit.confirmations > 0 && (
                                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                )}
                              </motion.div>
                            </div>
                          </div>

                          <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            {deposit.confirmations < (deposit.requiredConfirmations || getRequiredConfirmations(selectedDepositMethod?.chain))
                              ? `Your deposit needs ${(deposit.requiredConfirmations || getRequiredConfirmations(selectedDepositMethod?.chain)) - deposit.confirmations} more confirmations`
                              : "Processing your deposit..."}
                          </p>
                        </div>
                      </div>

                      {/* Transaction Details */}
                      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-6 space-y-4">
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-green-500" />
                          Transaction Details
                        </h4>

                        <div className="space-y-3">
                          {/* Transaction Hash */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">Transaction Hash</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-zinc-900 dark:text-zinc-100 max-w-[200px] truncate">
                                {deposit.transactionHash}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(deposit.transactionHash)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">Amount</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {deposit.amount} {selectedCurrency}
                            </span>
                          </div>

                          {/* Network */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">Network</span>
                            <span className="text-sm text-zinc-900 dark:text-zinc-100">
                              {deposit.chain || selectedDepositMethod?.chain}
                            </span>
                          </div>

                          {/* Fee */}
                          {deposit.fee !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">Network Fee</span>
                              <span className="text-sm text-zinc-900 dark:text-zinc-100">
                                {deposit.fee} {selectedCurrency}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* View on Blockchain Explorer */}
                        {deposit.transactionHash && (
                          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                            <a
                              href={getBlockchainExplorerUrl(deposit.chain || selectedDepositMethod?.chain, deposit.transactionHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <QrCode className="w-4 h-4" />
                              View on Blockchain Explorer
                              <ChevronRight className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Information Banner */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                            <p className="font-medium">What happens next?</p>
                            <ul className="space-y-1">
                              <li>• Your transaction is being verified on the {deposit.chain || selectedDepositMethod?.chain} blockchain</li>
                              <li>• Once {deposit.requiredConfirmations || getRequiredConfirmations(selectedDepositMethod?.chain)} confirmations are reached, your funds will be credited</li>
                              <li>• This usually takes {getEstimatedTime(selectedDepositMethod?.chain)} depending on network congestion</li>
                              <li>• You can safely leave this page - we'll notify you when complete</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Normal deposit address view */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left Side - QR Code */}
                      <div className="space-y-4">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                            Scan QR Code
                          </h3>
                          <div className="flex justify-center">
                            <div className="bg-white p-6 rounded-2xl shadow-lg border">
                              <QRCodeCanvas
                                value={depositAddress?.address || depositAddress}
                                size={256}
                                level="M"
                                includeMargin={true}
                                bgColor="#FFFFFF"
                                fgColor="#000000"
                              />
                            </div>
                          </div>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3">
                            Scan with your crypto wallet app
                          </p>
                        </div>
                      </div>

                      {/* Right Side - Address Details */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                            Deposit Address
                          </h3>

                          {/* Address Display */}
                          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                {selectedCurrency} Address
                              </label>
                              <div className="relative">
                                <div className="font-mono text-sm bg-white dark:bg-zinc-900 p-4 rounded-lg border break-all pr-12">
                                  {depositAddress?.address || depositAddress}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(depositAddress?.address || depositAddress)}
                                  className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Network and Balance Info */}
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                              <div>
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">Network</span>
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {depositAddress?.network || selectedDepositMethod?.chain}
                                </div>
                              </div>
                              {depositAddress?.balance !== undefined && (
                                <div>
                                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Current Balance</span>
                                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {depositAddress.balance} {selectedCurrency}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Important Information */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
                        Important Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800 dark:text-yellow-200">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-yellow-600 dark:bg-yellow-400 rounded-full"></div>
                            <span>Only send <strong>{selectedCurrency}</strong> to this address</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-yellow-600 dark:bg-yellow-400 rounded-full"></div>
                            <span>Network: <strong>{depositAddress?.network || selectedDepositMethod?.chain}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-yellow-600 dark:bg-yellow-400 rounded-full"></div>
                            <span>Minimum: <strong>{selectedDepositMethod?.limits?.deposit?.min || 1} {selectedCurrency}</strong></span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {shouldShowCountdown() && (
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                              <span>This address expires in <strong>30 minutes</strong></span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-yellow-600 dark:bg-yellow-400 rounded-full"></div>
                            <span>Deposits are credited after network confirmation</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-yellow-600 dark:bg-yellow-400 rounded-full"></div>
                            <span>Do not send from exchange accounts</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Countdown Timer */}
                {shouldShowCountdown() && countdownActive && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <div className="text-sm text-blue-700 dark:text-blue-300 mb-2">Time Remaining</div>
                        <Countdown
                          initialTimeInSeconds={depositStartTime ? Math.max(0, DEPOSIT_TIME_LIMIT - Math.floor((Date.now() - depositStartTime) / 1000)) : DEPOSIT_TIME_LIMIT}
                          onExpire={handleCountdownExpire}
                          className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <div className="w-16 h-16 relative">
                        <div className="w-full h-full bg-blue-200 dark:bg-blue-800 rounded-full"></div>
                        <div className="absolute inset-2 bg-blue-50 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SPOT: Transaction Hash Input */}
                {selectedWalletType?.value === "SPOT" && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                          {t("transaction_hash_required")}
                        </h4>
                        <div className="text-sm text-red-800 dark:text-red-200 space-y-1">
                          <p><strong>{t("critical")}</strong> {t("your_deposit_will_transaction_hash")}</p>
                          <p>{t("this_is_mandatory_for_all_spot_deposits")}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border">
                        <h5 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">
                          {t("after_sending_your")} {selectedCurrency} {t("to_the_deposit_your_wallet")}
                        </h5>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                          {t("without_this_your_and_processed")}
                        </p>
                        
                        <div className="space-y-3">
                          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {t("transaction_hash")} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Input
                              type="text"
                              value={transactionHash}
                              onChange={(e) => setTransactionHash(e.target.value)}
                              placeholder="0x..."
                              className="font-mono text-sm pr-20"
                              disabled={loading || transactionSent}
                            />
                            {transactionHash && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTransactionHash("")}
                                className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                disabled={loading || transactionSent}
                              >
                                ×
                              </Button>
                            )}
                          </div>
                          
                          <Button
                            onClick={sendTransactionHash}
                            disabled={!transactionHash || loading || transactionSent}
                            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
                          >
                            {loading ? (
                              <>
                                <Loader className="w-4 h-4 mr-2 animate-spin" />
                                {t("Submitting")}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {t("submit_transaction_hash")}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                          ⚠️ {t("⚠️_deposit_will_transaction_hash")}
                        </p>
                        <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                          <p className="font-medium">{t("how_to_find_your_transaction_hash")}</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>{t("•_check_your_wallets_transaction_history")}</li>
                            <li>{t("•_look_for_the_recent")} {selectedCurrency} {t("transaction")}</li>
                            <li>{t("•_copy_the_with_0x)")}</li>
                            <li>{t("•_paste_it_in_the_field_above")}</li>
                          </ul>
                          <p className="font-medium mt-2">{t("you_must_submit_your_deposit")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(3)}
                    className="flex-1 h-12"
                    disabled={transactionSent}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Networks
                  </Button>
                  <Button
                    onClick={reset}
                    className="flex-1 h-12"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    New Deposit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Step 5: SPOT Deposit Monitoring */}
      <AnimatePresence>
        {step === 5 && selectedWalletType?.value === "SPOT" && transactionSent && (
          <motion.div {...fadeInUp}>
            <Card className="w-full max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-blue-600 dark:text-blue-400">
                  {t("monitoring_your_deposit")}
                </CardTitle>
                <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                  {t("were_monitoring_the_your_transaction")}
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {t("youll_be_notified_is_confirmed")}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Transaction Details */}
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{t("transaction_hash")}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                        {transactionHash.slice(0, 16)}...
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(transactionHash)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{t("currency")}</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedCurrency}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{t("network")}</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {selectedDepositMethod?.chain || selectedDepositMethod?.id}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{t("status")}</span>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      {t("pending_confirmation")}
                    </Badge>
                  </div>
                </div>
                
                {/* Monitoring Status */}
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                      {t("please_wait")}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {t("deposit_confirmation_can_network_congestion")}
                    </p>
                  </div>
                </div>
                
                {/* Countdown Timer - Only if enabled */}
                {shouldShowCountdown() && countdownActive && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <div className="text-sm text-blue-700 dark:text-blue-300 mb-2">Time Remaining</div>
                        <Countdown
                          initialTimeInSeconds={depositStartTime ? Math.max(0, DEPOSIT_TIME_LIMIT - Math.floor((Date.now() - depositStartTime) / 1000)) : DEPOSIT_TIME_LIMIT}
                          onExpire={handleCountdownExpire}
                          className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <div className="w-16 h-16 relative">
                        <div className="w-full h-full bg-blue-200 dark:bg-blue-800 rounded-full"></div>
                        <div className="absolute inset-2 bg-blue-50 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={reset}
                    className="flex-1 h-12"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    New Deposit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 5: Manual Deposit Form - Only for manual methods without alias */}
      <AnimatePresence>
        {step === 5 && selectedDepositMethod && selectedWalletType?.value === "FIAT" && !selectedDepositMethod.alias && (
          <motion.div {...fadeInUp}>
            <ManualDepositForm
              method={selectedDepositMethod}
              currency={selectedCurrency}
              amount={depositAmount}
              onSubmit={handleFiatDeposit}
              loading={loading}
              onBack={() => setStep(4)}
              t={t}
              extractFeeValue={extractFeeValue}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 6: Success View for Manual Deposits and SPOT Deposits */}
      <AnimatePresence>
        {step === 6 && deposit && (
          <motion.div {...fadeInUp}>
            <Card className="w-full max-w-md mx-auto">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-green-600 dark:text-green-400">
                  Deposit Request Submitted
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                  Your deposit request has been submitted successfully and is being processed.
                </div>
                
                {/* Transaction Details */}
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Transaction ID:</span>
                    <span className="text-sm font-mono text-zinc-900 dark:text-zinc-100">
                      {deposit.transaction?.id || deposit.id}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Amount:</span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {deposit.transaction?.amount || deposit.amount} {deposit.currency || selectedCurrency}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Method:</span>
                    <span className="text-sm text-zinc-900 dark:text-zinc-100">
                      {deposit.method || selectedDepositMethod?.name}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Status:</span>
                    <span className="text-sm px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                      {deposit.transaction?.status || deposit.status || "PENDING"}
                    </span>
                  </div>
                  
                  {deposit.transaction?.fee && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">Fee:</span>
                      <span className="text-sm text-zinc-900 dark:text-zinc-100">
                        {deposit.transaction.fee} {deposit.currency || selectedCurrency}
                      </span>
                    </div>
                  )}
                </div>

                {/* Next Steps */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Next Steps:</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Our team will review your deposit request</li>
                    <li>• You will receive an email confirmation shortly</li>
                    <li>• Processing typically takes 1-3 business days</li>
                    <li>• You can track the status in your transaction history</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/finance/transactions'}
                    className="flex-1"
                  >
                    View Transactions
                  </Button>
                  <Button
                    onClick={reset}
                    className="flex-1"
                  >
                    Make Another Deposit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Button */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          onClick={reset}
          className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {t("start_over")}
        </Button>
      </div>
    </div>
  );
  } catch (error) {
    console.error("Error rendering deposit form:", error);
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div {...fadeInUp} className="text-center space-y-8">
          <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {t("deposit_failed")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              An error occurred while loading the deposit form. Please refresh the page.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t("refresh_page")}
            </Button>
            <Button
              variant="outline"
              onClick={() => reset()}
            >
              {t("try_again")}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }
} 