"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useWithdrawStore } from "@/store/finance/withdraw-store";
import { getKycRequirement } from "@/utils/kyc";
import { useWalletStore } from "@/store/finance/wallet-store";
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
  Send,
  Building,
  CreditCard,
  Landmark,
  ChevronRight,
  Info,
  ExternalLink,
} from "lucide-react";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { $fetch } from "@/lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { 
  countDecimals, 
  getCurrencyPrecision, 
  validateDecimalPrecision 
} from "@/lib/precision-utils";

const fadeInUp = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -20,
  },
  transition: {
    duration: 0.3,
  },
};
const scaleIn = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
  },
  transition: {
    duration: 0.2,
  },
};
interface WithdrawFormProps {
  initialType?: string;
  initialCurrency?: string;
}
export function WithdrawForm() {
  const t = useTranslations("finance/withdraw/client");
  const searchParams = useSearchParams();
  const initialType = searchParams?.get("type");
  const initialCurrency = searchParams?.get("currency");
  const { hasKyc, canAccessFeature, user } = useUserStore();
  const { settings } = useConfigStore();
  const router = useRouter();
  
  // Add precision validation state
  const [precisionError, setPrecisionError] = useState<string | null>(null);
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
    isLoading,
    isSubmitting,
    currentStep,
    error,
    success,
    setWalletType,
    setCurrency,
    setAmount,
    setAddress,
    setNetwork,
    setWithdrawMethod,
    setBankDetails,
    setCustomFields,
    fetchWithdrawalMethods,
    submitWithdrawal,
    nextStep,
    prevStep,
    reset,
  } = useWithdrawStore();
  const {
    fetchWallets,
    fetchWallet,
    wallet,
    fiatWallets,
    spotWallets,
    ecoWallets,
    futuresWallets,
  } = useWalletStore();
  const [availableWallets, setAvailableWallets] = useState<any[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([]);
  const [isFetchingCurrencies, setIsFetchingCurrencies] = useState(false);
  const [walletTypesWithBalance, setWalletTypesWithBalance] = useState<Set<string>>(new Set());

  // Check which wallet types have available currencies for withdrawal
  const checkAvailableWalletTypes = useCallback(async () => {
    // Exclude FUTURES from withdrawal options (futures can only transfer to ECO)
    const isSpotEnabled = settings?.spotWallets === true || settings?.spotWallets === "true";
    const walletTypes = isSpotEnabled ? ["FIAT", "SPOT", "ECO"] : ["FIAT", "ECO"];
    const availableTypes = new Set<string>();

    for (const type of walletTypes) {
      try {
        const { data, error } = await $fetch({
          url: `/api/finance/currency?action=withdraw&walletType=${type}`,
          silent: true,
        });
        if (!error && data && data.length > 0) {
          availableTypes.add(type);
        }
      } catch (err) {
        // Wallet type has no available currencies
      }
    }
    
    setWalletTypesWithBalance(availableTypes);
  }, [settings]);

  // Initialize store
  useEffect(() => {
    reset();
    fetchWallets();
    checkAvailableWalletTypes();
    if (initialType && initialType.toUpperCase() !== "FUTURES") {
      setWalletType(initialType.toUpperCase());
    }
  }, [reset, fetchWallets, checkAvailableWalletTypes, initialType, setWalletType]);
  const fetchCurrencies = useCallback(async (type: string) => {
    if (!type) return;
    setIsFetchingCurrencies(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/finance/currency?action=withdraw&walletType=${type}`,
        silent: true,
      });
      if (!error && data) {
        setAvailableCurrencies(data);
      } else {
        setAvailableCurrencies([]);
        // Handle specific error cases
        if (error?.includes("No") && error?.includes("wallets found")) {
          toast.error(`No ${type.toLowerCase()} wallets with balance available for withdrawal`);
        } else {
          console.error("Error fetching currencies:", error);
        }
      }
    } catch (err) {
      console.error("Exception in fetchCurrencies:", err);
      setAvailableCurrencies([]);
    } finally {
      setIsFetchingCurrencies(false);
    }
  }, []);
  useEffect(() => {
    if (walletType && walletType !== "FUTURES") {
      let wallets: any[] = [];
      switch (walletType) {
        case "FIAT":
          wallets = fiatWallets || [];
          break;
        case "SPOT":
          wallets = spotWallets || [];
          break;
        case "ECO":
          wallets = ecoWallets || [];
          break;
        default:
          wallets = [];
          break;
      }
      setAvailableWallets(wallets);
      fetchCurrencies(walletType);
      if (
        initialCurrency &&
        wallets.some((w) => w.currency === initialCurrency.toUpperCase())
      ) {
        setCurrency(initialCurrency.toUpperCase());
      }
    }
  }, [
    walletType,
    fiatWallets,
    spotWallets,
    ecoWallets,
    initialCurrency,
    setCurrency,
    fetchCurrencies,
  ]);
  useEffect(() => {
    if (walletType && currency) {
      fetchWallet(walletType, currency);
      fetchWithdrawalMethods();
    }
  }, [walletType, currency, fetchWallet, fetchWithdrawalMethods]);
  const getWalletIcon = (walletType: string) => {
    switch (walletType) {
      case "FIAT":
        return <DollarSign className="h-5 w-5" />;
      case "SPOT":
        return <Coins className="h-5 w-5" />;
      case "ECO":
        return <TrendingUp className="h-5 w-5" />;
      case "FUTURES":
        return <Banknote className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };
  const getMethodIcon = (methodType: string) => {
    switch (methodType?.toLowerCase()) {
      case "bank":
        return <Landmark className="h-5 w-5" />;
      case "card":
        return <CreditCard className="h-5 w-5" />;
      case "crypto":
        return <Send className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };
  const handleMaxAmount = () => {
    if (wallet && wallet.balance) {
      const maxAmount = Math.max(0, wallet.balance * 0.999);
      setAmount(maxAmount.toString());
    }
  };
  const getNetworkFee = () => {
    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
    if (method) {
      const fixedFee = method.fixedFee || 0;
      const percentageFee = method.percentageFee || 0;
      const amountNum = Number(amount) || 0;
      const percentageFeeAmount = (amountNum * percentageFee) / 100;
      return (fixedFee + percentageFeeAmount).toFixed(8);
    }
    return "0.00000000";
  };
  const getEstimatedTime = () => {
    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
    if (method && method.processingTime) {
      return `${method.processingTime} days`;
    }
    return "1-3 days";
  };
  const getMinWithdrawalAmount = () => {
    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
    if (method && method.minAmount) {
      const fixedFee = method.fixedFee || 0;
      const percentageFee = method.percentageFee || 0;
      const minReceiveAmount = method.minAmount; // This is what user should receive

      // Calculate withdrawal amount needed to receive minAmount after fees
      // Formula: withdrawAmount - fixedFee - (withdrawAmount * percentageFee/100) = minReceiveAmount
      // Solving for withdrawAmount: withdrawAmount = (minReceiveAmount + fixedFee) / (1 - percentageFee/100)
      if (percentageFee > 0) {
        const minWithdrawAmount =
          (minReceiveAmount + fixedFee) / (1 - percentageFee / 100);
        return parseFloat(minWithdrawAmount.toFixed(8));
      } else {
        // For fixed fee only
        return minReceiveAmount + fixedFee;
      }
    }
    return 1;
  };
  const getMinAmount = () => {
    return getMinWithdrawalAmount().toString();
  };
  const handleSetMinAmount = () => {
    const minAmount = getMinWithdrawalAmount();
    setAmount(minAmount.toString());
  };
  const getMaxAmount = () => {
    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
    if (method && method.maxAmount) {
      return method.maxAmount;
    }
    return null;
  };
  const getDisabledReason = () => {
    // Check KYC requirements for withdrawal feature only if KYC is enabled
    const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
    if (kycEnabled) {
      const kycRequirement = getKycRequirement(user, 'WITHDRAW');
      if (kycRequirement.required) {
        return kycRequirement.message;
      }
    }

    if (!amount || Number(amount) <= 0) return "Enter valid amount";

    // Check for precision errors first
    if (precisionError) return "Fix decimal precision error";

    // Use wallet store balance as primary source
    let balance = 0;
    if (wallet && wallet.balance !== undefined) {
      balance = wallet.balance;
    } else {
      // Fallback to currency API response with improved parsing
      const curr = availableCurrencies.find((c) => 
        (c.value || c.name || c.currency) === currency
      );
      
      if (curr) {
        // Handle direct balance property
        if (curr.balance !== undefined) {
          balance = parseFloat(curr.balance) || 0;
        } else if (curr.label && curr.label.includes("-")) {
          // Handle label format "USD - 109.01" with better parsing
          const parts = curr.label.split("-");
          if (parts.length >= 2) {
            const balanceStr = parts[parts.length - 1].trim();
            const parsedBalance = parseFloat(balanceStr);
            balance = isNaN(parsedBalance) ? 0 : parsedBalance;
          }
        }
      }
    }

    if (Number(amount) > balance) return "Insufficient balance";
    
    const minAmount = getMinAmount();
    if (minAmount && Number(amount) < Number(minAmount))
      return `Minimum amount: ${minAmount} ${currency}`;
      
    const maxAmount = getMaxAmount();
    if (maxAmount && Number(amount) > maxAmount)
      return `Maximum amount: ${maxAmount} ${currency}`;

    // Validate withdrawal method selection for non-FIAT
    if (walletType !== "FIAT" && !withdrawMethod) {
      return "Please select a withdrawal method";
    }

    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);

    // Check custom fields validation
    if (method?.customFields) {
      try {
        const fields = JSON.parse(method.customFields);
        for (const field of fields) {
          if (field.required && !customFields[field.name]) {
            return `${field.title || field.name} is required`;
          }
        }
      } catch (err) {
        console.error("Error parsing custom fields for validation:", err);
        return "Invalid method configuration";
      }
    }
    return null;
  };
  const handleWalletTypeSelect = (type: string) => {
    setWalletType(type);
    // Clear previous currencies when switching wallet types
    setAvailableCurrencies([]);
  };

  // Success state
  if (success) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <motion.div {...fadeInUp} className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {t("withdrawal_submitted")}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {t("your_withdrawal_request_processed_soon")}
          </p>
        </motion.div>

        <motion.div {...scaleIn}>
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {t("withdrawal_details")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {t("amount")}
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{amount} {currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {t("wallet")}
                  </span>
                  <span className="font-medium">{walletType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {t("method")}
                  </span>
                  <span className="font-medium">
                    {
                      withdrawalMethods.find((m) => m.id === withdrawMethod)
                        ?.title
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {t("estimated_time")}
                  </span>
                  <span className="font-medium">{getEstimatedTime()}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={reset} className="flex-1">
                  {t("make_another_withdrawal")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/en/finance/history")}
                  className="flex-1"
                >
                  {t("view_history")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          {t("withdraw_funds")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {t("withdraw_your_funds_preferred_destination")}
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
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 1: Wallet Selection */}
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
            {walletTypesWithBalance.size === 0 ? (
              <Alert className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertTitle className="text-yellow-800 dark:text-yellow-300">
                  {t("no_wallets_available")}
                </AlertTitle>
                <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                  {t("you_dont_have_any")}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    value: "FIAT",
                    label: "Fiat",
                  },
                  {
                    value: "SPOT",
                    label: "Spot",
                  },
                  {
                    value: "ECO",
                    label: "Eco",
                  },
                ].filter((wallet) => walletTypesWithBalance.has(wallet.value)).map((wallet) => (
                <motion.button
                  key={wallet.value}
                  whileHover={{
                    scale: 1.05,
                  }}
                  whileTap={{
                    scale: 0.95,
                  }}
                  onClick={() => handleWalletTypeSelect(wallet.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${walletType === wallet.value ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"}`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div
                      className={`p-3 rounded-full ${walletType === wallet.value ? "bg-blue-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}
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
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Step 2: Currency Selection */}
      <AnimatePresence>
        {walletType && availableCurrencies.length === 0 && !isFetchingCurrencies && (
          <motion.div {...fadeInUp}>
            <Alert className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                             <AlertTitle className="text-yellow-800 dark:text-yellow-300">
                 {t("no_currencies_available")}
               </AlertTitle>
               <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                 {t("no_currencies_with_balance_available_in")} {walletType.toLowerCase()} {t("wallet")}
               </AlertDescription>
            </Alert>
          </motion.div>
        )}
        {walletType && availableCurrencies.length > 0 && (
          <motion.div {...fadeInUp}>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                    2
                  </span>
                  {t("select_currency")}
                  {isFetchingCurrencies && (
                    <Loader size="sm" className="ml-2" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableCurrencies.filter(curr => curr).map((curr: any, index: number) => {
                    // Handle multiple API response formats
                    const currencyCode = curr.value || curr.name || curr.currency || `currency-${index}`;
                    const label = curr.label || curr.name || currencyCode;
                    const icon = curr.icon || null;
                    const chain = curr.chain || null;
                    
                    // Skip invalid entries
                    if (!currencyCode || currencyCode === `currency-${index}`) {
                      console.warn('Invalid currency entry:', curr);
                      return null;
                    }
                    
                    // Extract balance from the label (format: "USD - 109.01") or use direct balance
                    let balance = 0;
                    if (curr.balance !== undefined) {
                      balance = parseFloat(curr.balance) || 0;
                    } else if (label && typeof label === 'string' && label.includes("-")) {
                      const balanceFromLabel = label.split("-")[1];
                      balance = balanceFromLabel ? parseFloat(balanceFromLabel.trim()) : 0;
                    }
                    
                    // For ecosystem tokens without balance info, show as available but with 0 balance
                    const isEcosystemToken = curr.type === "NATIVE" || curr.type === "BEP20" || curr.chain;
                                          return (
                        <motion.button
                          key={currencyCode}
                          whileHover={{
                            scale: 1.03,
                          }}
                          whileTap={{
                            scale: 0.97,
                          }}
                          onClick={() => setCurrency(currencyCode)}
                          className={`p-4 rounded-xl border-2 transition-all ${currency === currencyCode ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"}`}
                      >
                                                  <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${currency === currencyCode ? "bg-blue-500 text-white ring-2 ring-blue-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}
                              >
                                {icon ? (
                                  <img
                                    src={icon}
                                    alt={currencyCode}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback to text if image fails to load
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling.style.display = 'block';
                                    }}
                                  />
                                ) : null}
                                <span 
                                  className={`text-xs font-bold ${icon ? 'hidden' : 'block'}`}
                                  style={{ display: icon ? 'none' : 'block' }}
                                >
                                  {currencyCode.slice(0, 2)}
                                </span>
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                  {currencyCode}
                                  {chain && (
                                    <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                                      ({chain})
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                  {isEcosystemToken && balance === 0 ? (
                                    <span>{t("available_for_withdrawal")}</span>
                                  ) : (
                                    <>
                                      {t("balance")}{" "}
                                      {balance.toFixed(8)}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {currency === currencyCode && (
                              <CheckCircle className="h-5 w-5 text-blue-500" />
                            )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 3: Withdrawal Method Selection */}
      <AnimatePresence>
        {currency && withdrawalMethods.length === 0 && !isLoading && (
          <motion.div {...fadeInUp}>
            <Alert className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-300">
                {t("no_withdrawal_methods_available")}
              </AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                {t("no_withdrawal_methods_available_for")} {currency}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
        {currency && withdrawalMethods.length > 0 && (
          <motion.div {...fadeInUp}>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                    3
                  </span>
                  {t("select_withdrawal_method")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {withdrawalMethods.map((method: any) => {
                    return (
                      <motion.button
                        key={method.id}
                        whileHover={{
                          scale: 1.02,
                        }}
                        whileTap={{
                          scale: 0.98,
                        }}
                        onClick={() => {
                          setWithdrawMethod(method.id);
                          // Set network for crypto methods
                          if (walletType === "SPOT" || walletType === "ECO") {
                            setNetwork(method.network || method.id);
                          }
                        }}
                        className={`p-6 rounded-xl border-2 transition-all text-left ${withdrawMethod === method.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"}`}
                      >
                        <div className="flex items-start space-x-4">
                          <div
                            className={`w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center ${withdrawMethod === method.id ? "ring-2 ring-blue-500" : "bg-zinc-100 dark:bg-zinc-800"}`}
                          >
                            {method.image ? (
                              <img
                                src={method.image}
                                alt={method.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className={`p-2 ${withdrawMethod === method.id ? "text-blue-500" : "text-zinc-600 dark:text-zinc-400"}`}
                              >
                                {getMethodIcon("payment")}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {method.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              {method.processingTime && (
                                <Badge variant="outline" className="text-xs">
                                  {method.processingTime} {t("days")}
                                </Badge>
                              )}
                              {(method.fixedFee > 0 || method.percentageFee > 0) && (
                                <Badge variant="outline" className="text-xs">
                                  {method.fixedFee > 0 &&
                                    `${method.fixedFee} ${currency}`}
                                  {method.percentageFee > 0 &&
                                    `${method.fixedFee > 0 ? " + " : ""}${method.percentageFee}%`}
                                </Badge>
                              )}
                              {method.fixedFee === 0 && method.percentageFee === 0 && (
                                <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400">
                                  {t("Free")}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                              {method.minAmount &&
                                method.maxAmount &&
                                `${method.minAmount} - ${method.maxAmount} ${currency}`}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 4: Amount and Destination */}
      <AnimatePresence>
        {withdrawMethod && (
          <motion.div {...fadeInUp}>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                    4
                  </span>
                  {t("enter_details")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Amount Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {t("withdrawal_amount")}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSetMinAmount}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {t("set_min")}
                      </button>
                      <button
                        type="button"
                        onClick={handleMaxAmount}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {t("use_max")}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        
                        // Clear previous precision error when user starts typing
                        if (precisionError) {
                          setPrecisionError(null);
                        }
                        
                        // Allow empty value
                        if (value === "" || value === "0") {
                          setAmount(value);
                          return;
                        }
                        
                        const numValue = parseFloat(value);
                        
                        // Validate that it's a valid positive number
                        if (isNaN(numValue) || numValue < 0) {
                          return; // Don't update for invalid values
                        }
                        
                        // Get the selected withdrawal method for network information
                        const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
                        const selectedNetwork = method?.network || network;
                        
                        // Get precision for this currency and network
                        const maxPrecision = getCurrencyPrecision(currency, selectedNetwork);
                        
                        // Validate decimal precision
                        const validation = validateDecimalPrecision(value, maxPrecision);
                        
                        if (!validation.isValid) {
                          setPrecisionError(
                            `${currency} on ${selectedNetwork || 'this network'} supports maximum ${validation.maxDecimals} decimal places. You entered ${validation.actualDecimals} decimal places.`
                          );
                          // Still update the value but show error
                          setAmount(value);
                        } else {
                          setAmount(value);
                        }
                      }}
                      min="0"
                      step="0.00000001"
                      className={`text-lg pr-16 ${precisionError ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {currency}
                    </div>
                  </div>
                  {/* Precision Error Alert */}
                  {precisionError && (
                    <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <AlertDescription className="text-red-700 dark:text-red-300 text-sm">
                        {precisionError}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                    <span>
                      {t("available")}{" "}
                      {(() => {
                        const curr = availableCurrencies.find(
                          (c) => (c.value || c.name || c.currency) === currency
                        );
                        if (curr) {
                          // Handle direct balance property
                          if (curr.balance !== undefined) {
                            return parseFloat(curr.balance).toFixed(8);
                          }
                          // Handle label format "USD - 109.01"
                          if (curr.label && curr.label.includes("-")) {
                            const balanceFromLabel = curr.label.split("-")[1];
                            const balance = balanceFromLabel
                              ? parseFloat(balanceFromLabel)
                              : 0;
                            return balance.toFixed(8);
                          }
                        }
                        return wallet?.balance?.toFixed(8) || "0.00000000";
                      })()}{" "}
                      {currency}
                    </span>
                    <span>
                      {t("min")} {getMinAmount()} {currency} {t("(to_receive")}{" "}
                      {(() => {
                        const method = withdrawalMethods.find(
                          (m) => m.id === withdrawMethod
                        );
                        return method?.minAmount || 1;
                      })()}{" "}
                      {currency} )
                      {getMaxAmount() &&
                        ` | Max: ${getMaxAmount()} ${currency}`}
                    </span>
                  </div>
                </div>

                {/* Method Instructions */}
                {(() => {
                  const method = withdrawalMethods.find(
                    (m) => m.id === withdrawMethod
                  );
                  if (method?.instructions) {
                    return (
                      <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-700 dark:text-blue-300">
                          <strong>{t("instructions")}</strong>{" "}
                          {method.instructions}
                        </AlertDescription>
                      </Alert>
                    );
                  }
                  return null;
                })()}

                {/* Dynamic Custom Fields */}
                {(() => {
                  const method = withdrawalMethods.find(
                    (m) => m.id === withdrawMethod
                  );
                  if (!method?.customFields) return null;
                  try {
                    const fields = JSON.parse(method.customFields);
                    return (
                      <div className="space-y-4">
                        {fields.map((field: any, index: number) => {
                          return (
                            <div
                              key={field.name || index}
                              className="space-y-2"
                            >
                              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                {field.title}
                                {field.required && (
                                  <span className="text-red-500 ml-1">
                                    *
                                  </span>
                                )}
                              </label>
                              {field.type === "textarea" ? (
                                <textarea
                                  placeholder={`Enter ${field.title.toLowerCase()}`}
                                  value={customFields[field.name] || ""}
                                  onChange={(e) =>
                                    setCustomFields({
                                      [field.name]: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  rows={3}
                                />
                              ) : field.type === "select" && field.options ? (
                                <select
                                  value={customFields[field.name] || ""}
                                  onChange={(e) =>
                                    setCustomFields({
                                      [field.name]: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="">
                                    {t("Select")}
                                    {field.title}
                                  </option>
                                  {field.options.map((option: any, optionIndex: number) => (
                                    <option
                                      key={option.value || `option-${optionIndex}`}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <Input
                                  type={
                                    field.type === "number" ? "number" : "text"
                                  }
                                  placeholder={`Enter ${field.title.toLowerCase()}`}
                                  value={customFields[field.name] || ""}
                                  onChange={(e) =>
                                    setCustomFields({
                                      [field.name]: e.target.value,
                                    })
                                  }
                                  className={
                                    field.type === "number"
                                      ? ""
                                      : field.name
                                            .toLowerCase()
                                            .includes("address")
                                        ? "font-mono text-sm"
                                        : ""
                                  }
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  } catch (err) {
                    console.error("Error parsing custom fields:", err);
                    return null;
                  }
                })()}

                {/* Fee Information */}
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {t("withdrawal_amount")}
                    </span>
                    <span className="font-medium">
                      {amount || "0"} {currency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {t("network_fee")}
                    </span>
                    <span className="font-medium">
                      {getNetworkFee()} {currency}
                    </span>
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 mt-2">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-zinc-900 dark:text-zinc-100">
                        {t("youll_receive")}
                      </span>
                      <span className="text-zinc-900 dark:text-zinc-100">
                        {amount && !isNaN(Number(amount))
                          ? (Number(amount) - Number(getNetworkFee())).toFixed(
                              8
                            )
                          : "0.00000000"}{" "}
                        {currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Processing Time Info */}
                <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-700 dark:text-blue-300">
                    {t("estimated_processing_time")}{" "}
                    <strong>{getEstimatedTime()}</strong>
                  </AlertDescription>
                </Alert>

                {/* Submit Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={submitWithdrawal}
                          disabled={!!getDisabledReason() || isSubmitting}
                          className="w-full h-12 text-lg font-semibold"
                          size="lg"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader size="sm" className="mr-2" />
                              {t("Processing")}.
                            </>
                          ) : (
                            <>
                              {t("Withdraw")}
                              <ChevronRight className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {getDisabledReason() && (
                      <TooltipContent>
                        <p>{getDisabledReason()}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
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
}
