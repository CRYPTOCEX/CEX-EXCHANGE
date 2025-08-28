"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Wallet,
  CreditCard,
  Landmark,
  DollarSign,
  Smartphone,
  Send,
  AlertCircle,
  Zap,
  Shield,
  Star,
  Users,
  TrendingUp,
  Globe,
  PiggyBank,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { $fetch } from "@/lib/api";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";

// Define types for our data
interface WalletOption {
  id: string;
  name: string;
}
interface WalletData {
  id: string;
  userId: string;
  type: "FIAT" | "SPOT" | "ECO" | "FUTURES";
  currency: string;
  balance: number;
  inOrder?: number;
  address?: {
    [key: string]: {
      address: string;
      network: string;
      balance: number;
    };
  };
  status: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}
interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  processingTime: string;
  fees: string;
  available: boolean;
  popularityRank: number;
}

// Update the Location interface to match the API response
interface Location {
  country: string;
}
interface FormData {
  tradeType: string;
  walletType: string;
  cryptocurrency: string;
  amount: string;
  paymentMethods: string[];
  pricePreference: string;
  traderPreference: string;
  minAmount: string;
  maxAmount: string;
  location: string;
}
interface GuidedMatchingWizardProps {
  onComplete: (criteria: FormData, matches: any) => void;
}

// Add after the existing interfaces
interface Currency {
  value: string;
  label: string;
}
interface CurrencyResponse {
  FIAT: Currency[];
  SPOT: Currency[];
  FUNDING: Currency[];
}
const DEFAULT_FORM_DATA: FormData = {
  tradeType: "buy",
  walletType: "",
  cryptocurrency: "",
  amount: "0.1",
  paymentMethods: [],
  pricePreference: "best_price",
  traderPreference: "all",
  minAmount: "",
  maxAmount: "",
  location: "any",
};
export function GuidedMatchingWizard({
  onComplete,
}: GuidedMatchingWizardProps) {
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyResponse>({
    FIAT: [],
    SPOT: [],
    FUNDING: [],
  });
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [currencyPrice, setCurrencyPrice] = useState<number>(0);
  const [loading, setLoading] = useState({
    walletOptions: true,
    currencies: true,
    paymentMethods: true,
    locations: true,
    walletData: false,
    currencyPrice: false,
    submission: false,
  });
  const [error, setError] = useState<string | null>(null);
  const totalSteps = 5; // Updated to 5 steps
  const progress = (step / totalSteps) * 100;
  const requiredFeature =
    formData.tradeType === "sell" ? "make_p2p_offer" : "buy_p2p_offer";
  const canProceed =
    !kycEnabled || (hasKyc() && canAccessFeature(requiredFeature));

  // Fetch initial data
  useEffect(() => {
    async function fetchInitialData() {
      try {
        // Fetch wallet options
        const { data: walletData, error: walletError } = await $fetch({
          url: "/api/finance/wallet/options",
          silentSuccess: true,
        });

        // Fetch currencies from the finance API
        const { data: currencyData, error: currencyError } = await $fetch({
          url: "/api/finance/currency/valid",
          silentSuccess: true,
        });

        // Fetch payment methods from the P2P API
        const { data: paymentMethodsData, error: paymentMethodsError } =
          await $fetch({
            url: "/api/p2p/payment-method",
            silentSuccess: true,
          });

        // Fetch locations from the P2P API
        const { data: locationsData, error: locationsError } = await $fetch({
          url: "/api/p2p/location",
          silentSuccess: true,
        });
        if (
          !walletError &&
          !currencyError &&
          !paymentMethodsError &&
          !locationsError
        ) {
          setWalletOptions(walletData);
          setCurrencies(currencyData);
          setPaymentMethods(
            paymentMethodsData.filter((method) => method.available)
          );
          setLocations(locationsData);

          // Set default wallet type if available
          if (walletData.length > 0 && !formData.walletType) {
            setFormData((prev) => ({
              ...prev,
              walletType: walletData[0].id,
            }));
          }
          if (
            paymentMethodsData.length > 0 &&
            formData.paymentMethods.length === 0
          ) {
            const availableMethods = paymentMethodsData.filter(
              (method) => method.available
            );
            if (availableMethods.length > 0) {
              setFormData((prev) => ({
                ...prev,
                paymentMethods: [availableMethods[0].id],
              }));
            }
          }
        } else {
          throw new Error(
            walletError ||
              currencyError ||
              paymentMethodsError ||
              locationsError ||
              "Failed to fetch data"
          );
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError("Failed to load initial data. Please try again.");
      } finally {
        setLoading({
          walletOptions: false,
          currencies: false,
          paymentMethods: false,
          locations: false,
          walletData: false,
          currencyPrice: false,
          submission: false,
        });
      }
    }
    fetchInitialData();
  }, []);

  // Fetch wallet data when selling and both wallet type and cryptocurrency are selected
  useEffect(() => {
    async function fetchWalletData() {
      if (
        formData.tradeType === "sell" &&
        formData.walletType &&
        formData.cryptocurrency
      ) {
        try {
          setLoading((prev) => ({
            ...prev,
            walletData: true,
          }));
          const { data, error } = await $fetch({
            url: `/api/finance/wallet/${formData.walletType}/${formData.cryptocurrency}`,
            silentSuccess: true,
          });
          if (!error) {
            setWalletData(data);
            // Reset amount when wallet data changes
            setFormData((prev) => ({
              ...prev,
              amount: "0",
            }));
          } else {
            setWalletData(null);
            console.warn("Wallet not found or error:", error);
          }
        } catch (err) {
          console.error("Error fetching wallet data:", err);
          setWalletData(null);
        } finally {
          setLoading((prev) => ({
            ...prev,
            walletData: false,
          }));
        }
      } else {
        setWalletData(null);
      }
    }
    fetchWalletData();
  }, [formData.tradeType, formData.walletType, formData.cryptocurrency]);

  // Fetch currency price when cryptocurrency is selected
  useEffect(() => {
    async function fetchCurrencyPrice() {
      if (formData.cryptocurrency && formData.walletType) {
        try {
          setLoading((prev) => ({
            ...prev,
            currencyPrice: true,
          }));
          const { data, error } = await $fetch({
            url: `/api/finance/currency/price?currency=${formData.cryptocurrency}&type=${formData.walletType}`,
            silentSuccess: true,
          });
          if (!error) {
            setCurrencyPrice(data.data);
          } else {
            setCurrencyPrice(0);
          }
        } catch (err) {
          console.error("Error fetching currency price:", err);
          setCurrencyPrice(0);
        } finally {
          setLoading((prev) => ({
            ...prev,
            currencyPrice: false,
          }));
        }
      } else {
        setCurrencyPrice(0);
      }
    }
    fetchCurrencyPrice();
  }, [formData.cryptocurrency, formData.walletType]);
  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Final step - submit the form and complete the wizard
      setLoading((prev) => ({
        ...prev,
        submission: true,
      }));
      setError(null);
      try {
        const { data, error } = await $fetch({
          url: "/api/p2p/guided-matching",
          method: "POST",
          body: formData,
        });
        if (error) {
          throw new Error(error);
        }
        onComplete(formData, data);
      } catch (err) {
        console.error("Error submitting form:", err);
        setError("Failed to find matches. Please try again.");
      } finally {
        setLoading((prev) => ({
          ...prev,
          submission: false,
        }));
      }
    }
  };
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  const handleChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    });

    // Reset cryptocurrency when wallet type changes
    if (field === "walletType") {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        cryptocurrency: "",
        // Reset cryptocurrency selection
        amount: "0", // Reset amount
      }));
    }

    // Reset amount when cryptocurrency changes
    if (field === "cryptocurrency") {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        amount: "0", // Reset amount
      }));
    }
  };
  const handlePaymentMethodToggle = (method: string) => {
    const currentMethods = [...formData.paymentMethods];
    if (currentMethods.includes(method)) {
      handleChange(
        "paymentMethods",
        currentMethods.filter((m) => m !== method)
      );
    } else {
      handleChange("paymentMethods", [...currentMethods, method]);
    }
  };

  // Get available cryptocurrencies based on selected wallet type
  const getAvailableCryptocurrencies = () => {
    if (!formData.walletType) return [];
    switch (formData.walletType) {
      case "FIAT":
        return currencies.FIAT;
      case "SPOT":
        return currencies.SPOT;
      case "ECO":
      case "FUNDING":
        return currencies.FUNDING;
      default:
        return [];
    }
  };

  // Get cryptocurrency symbol
  const getCryptoSymbol = () => {
    const availableCryptos = getAvailableCryptocurrencies();
    const crypto = availableCryptos.find(
      (c) => c.value === formData.cryptocurrency
    );
    return crypto ? crypto.value : "CRYPTO";
  };

  // Get cryptocurrency price
  const getCryptoPrice = () => {
    return currencyPrice || 1;
  };

  // Get maximum sellable amount
  const getMaxSellAmount = () => {
    if (formData.tradeType === "sell" && walletData) {
      return walletData.balance - (walletData.inOrder || 0);
    }
    return null;
  };

  // Check if amount is valid for selling
  const isAmountValid = () => {
    if (formData.tradeType === "sell") {
      const maxAmount = getMaxSellAmount();
      if (maxAmount === null) return false;
      const amount = Number.parseFloat(formData.amount || "0");
      return amount > 0 && amount <= maxAmount;
    }
    return Number.parseFloat(formData.amount || "0") > 0;
  };

  // Get icon component for payment method
  const getIconForPaymentMethod = (iconName: string) => {
    switch (iconName) {
      case "landmark":
        return <Landmark className="h-4 w-4 text-primary" />;
      case "credit-card":
        return <CreditCard className="h-4 w-4 text-primary" />;
      case "wallet":
        return <Wallet className="h-4 w-4 text-primary" />;
      case "smartphone":
        return <Smartphone className="h-4 w-4 text-primary" />;
      case "dollar-sign":
        return <DollarSign className="h-4 w-4 text-primary" />;
      case "send":
        return <Send className="h-4 w-4 text-primary" />;
      default:
        return <Wallet className="h-4 w-4 text-primary" />;
    }
  };

  // Get icon for wallet type
  const getWalletIcon = (walletId: string) => {
    switch (walletId) {
      case "FIAT":
        return <DollarSign className="h-8 w-8 text-primary" />;
      case "SPOT":
        return <TrendingUp className="h-8 w-8 text-primary" />;
      case "ECO":
      case "FUNDING":
        return <PiggyBank className="h-8 w-8 text-primary" />;
      default:
        return <Wallet className="h-8 w-8 text-primary" />;
    }
  };

  // Get wallet description
  const getWalletDescription = (walletId: string) => {
    switch (walletId) {
      case "FIAT":
        return "Traditional currencies like USD, EUR, etc.";
      case "SPOT":
        return "Cryptocurrencies for spot trading";
      case "ECO":
      case "FUNDING":
        return "Funding wallet for earning and lending";
      default:
        return "Digital wallet for trading";
    }
  };

  // Check if we're still loading initial data
  const isInitialLoading =
    loading.walletOptions ||
    loading.currencies ||
    loading.paymentMethods ||
    loading.locations;

  // Check if amount input should be disabled
  const isAmountDisabled = () => {
    if (formData.tradeType === "buy") {
      return (
        loading.currencies || !formData.walletType || !formData.cryptocurrency
      );
    } else {
      return (
        loading.currencies ||
        loading.walletData ||
        !formData.walletType ||
        !formData.cryptocurrency ||
        !walletData
      );
    }
  };
  if (!canProceed) {
    return <KycRequiredNotice feature={requiredFeature} />;
  }
  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            Step {step} of {totalSteps}
          </span>
          <span className="text-muted-foreground">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
            style={{
              width: `${progress}%`,
            }}
          ></div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{
              opacity: 0,
              x: 20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: -20,
            }}
            transition={{
              duration: 0.3,
            }}
          >
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                What would you like to do?
              </h3>

              <RadioGroup
                value={formData.tradeType}
                onValueChange={(value) => handleChange("tradeType", value)}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="relative">
                  <RadioGroupItem
                    value="buy"
                    id="buy"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="buy"
                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all duration-200 h-full"
                  >
                    <div className="absolute -inset-px bg-primary opacity-0 peer-data-[state=checked]:opacity-5 rounded-xl transition-opacity duration-300"></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Wallet className="h-8 w-8 text-primary" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-semibold">
                          Buy Cryptocurrency
                        </h3>
                        <p className="text-muted-foreground">
                          I want to buy crypto with my local currency
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="relative">
                  <RadioGroupItem
                    value="sell"
                    id="sell"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="sell"
                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all duration-200 h-full"
                  >
                    <div className="absolute -inset-px bg-primary opacity-0 peer-data-[state=checked]:opacity-5 rounded-xl transition-opacity duration-300"></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <DollarSign className="h-8 w-8 text-primary" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-semibold">
                          Sell Cryptocurrency
                        </h3>
                        <p className="text-muted-foreground">
                          I want to sell crypto for local currency
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{
              opacity: 0,
              x: 20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: -20,
            }}
            transition={{
              duration: 0.3,
            }}
          >
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select your wallet type</h3>

              {loading.walletOptions ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : (
                <RadioGroup
                  value={formData.walletType}
                  onValueChange={(value) => handleChange("walletType", value)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  {walletOptions.map((wallet) => (
                    <div key={wallet.id} className="relative">
                      <RadioGroupItem
                        value={wallet.id}
                        id={wallet.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={wallet.id}
                        className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all duration-200 h-full"
                      >
                        <div className="absolute -inset-px bg-primary opacity-0 peer-data-[state=checked]:opacity-5 rounded-xl transition-opacity duration-300"></div>
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            {getWalletIcon(wallet.id)}
                          </div>
                          <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold">
                              {wallet.name}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                              {getWalletDescription(wallet.id)}
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {formData.walletType && (
                <Card className="bg-muted/30 border-primary/10 overflow-hidden">
                  <div className="h-1 w-full bg-primary"></div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {getWalletIcon(formData.walletType)}
                      </div>
                      <div>
                        <p className="font-medium">
                          {
                            walletOptions.find(
                              (w) => w.id === formData.walletType
                            )?.name
                          }{" "}
                          Wallet Selected
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getWalletDescription(formData.walletType)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{
              opacity: 0,
              x: 20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: -20,
            }}
            transition={{
              duration: 0.3,
            }}
          >
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                Select cryptocurrency and amount
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Cryptocurrency</Label>
                  {loading.currencies || !formData.walletType ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={formData.cryptocurrency}
                      onValueChange={(value) =>
                        handleChange("cryptocurrency", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cryptocurrency" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableCryptocurrencies().map((crypto) => (
                          <SelectItem key={crypto.value} value={crypto.value}>
                            {crypto.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {formData.walletType &&
                    getAvailableCryptocurrencies().length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No cryptocurrencies available for{" "}
                        {
                          walletOptions.find(
                            (w) => w.id === formData.walletType
                          )?.name
                        }{" "}
                        wallet
                      </p>
                    )}
                </div>

                <div className="space-y-4">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                    min="0.001"
                    step="0.001"
                    max={
                      formData.tradeType === "sell"
                        ? getMaxSellAmount() || undefined
                        : undefined
                    }
                    disabled={isAmountDisabled()}
                  />
                  {formData.tradeType === "sell" && loading.walletData && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Skeleton className="h-4 w-4" />
                      <span>Loading wallet balance...</span>
                    </div>
                  )}
                  {formData.tradeType === "sell" && walletData && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Info className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">
                          Available:{" "}
                          <span className="font-medium text-foreground">
                            {getMaxSellAmount()?.toFixed(8)} {getCryptoSymbol()}
                          </span>
                        </span>
                      </div>
                      {getMaxSellAmount() && getMaxSellAmount()! > 0 && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleChange(
                                "amount",
                                (getMaxSellAmount()! * 0.25).toString()
                              )
                            }
                          >
                            25%
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleChange(
                                "amount",
                                (getMaxSellAmount()! * 0.5).toString()
                              )
                            }
                          >
                            50%
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleChange(
                                "amount",
                                (getMaxSellAmount()! * 0.75).toString()
                              )
                            }
                          >
                            75%
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleChange(
                                "amount",
                                getMaxSellAmount()!.toString()
                              )
                            }
                          >
                            Max
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {formData.tradeType === "sell" &&
                    walletData &&
                    getMaxSellAmount() === 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Insufficient balance. You need {getCryptoSymbol()} in
                          your wallet to sell.
                        </AlertDescription>
                      </Alert>
                    )}
                  {formData.tradeType === "sell" &&
                    formData.cryptocurrency &&
                    !loading.walletData &&
                    !walletData && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No {getCryptoSymbol()} wallet found. Please deposit{" "}
                          {getCryptoSymbol()} first.
                        </AlertDescription>
                      </Alert>
                    )}
                </div>
              </div>

              {formData.tradeType === "buy" && (
                <div className="pt-2">
                  <Label className="mb-2 block">Quick Select Amount</Label>
                  {loading.currencies || !formData.walletType ? (
                    <Skeleton className="h-5 w-full" />
                  ) : (
                    <>
                      <Slider
                        defaultValue={[0.1]}
                        max={1}
                        step={0.01}
                        onValueChange={(values) =>
                          handleChange("amount", values[0].toString())
                        }
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0.01</span>
                        <span>0.5</span>
                        <span>1.0</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <Card className="bg-muted/30 border-primary/10 overflow-hidden">
                <div className="h-1 w-full bg-primary"></div>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">Estimated Value</p>
                    <p className="text-xs text-muted-foreground">
                      {loading.currencyPrice
                        ? "Loading price..."
                        : "Based on current market price"}
                    </p>
                  </div>
                  {loading.currencies ||
                  loading.currencyPrice ||
                  !formData.walletType ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <div className="text-xl font-bold">
                      $
                      {(
                        Number.parseFloat(formData.amount || "0") *
                        getCryptoPrice()
                      ).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{
              opacity: 0,
              x: 20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: -20,
            }}
            transition={{
              duration: 0.3,
            }}
          >
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select payment methods</h3>

              {loading.paymentMethods ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {paymentMethods
                    .filter((method) => method.available)
                    .sort((a, b) => a.popularityRank - b.popularityRank)
                    .map((method) => {
                      return (
                        <div
                          key={method.id}
                          className="flex items-start space-x-2"
                        >
                          <Checkbox
                            id={method.id}
                            checked={formData.paymentMethods.includes(
                              method.id
                            )}
                            onCheckedChange={() =>
                              handlePaymentMethodToggle(method.id)
                            }
                          />
                          <div className="grid gap-1.5 leading-none">
                            <Label
                              htmlFor={method.id}
                              className="flex items-center gap-1.5"
                            >
                              {getIconForPaymentMethod(method.icon)}
                              {method.name}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {method.description || "No description available"}
                            </p>
                            {method.processingTime && (
                              <p className="text-xs text-muted-foreground">
                                Processing: {method.processingTime}
                              </p>
                            )}
                            {method.fees && (
                              <p className="text-xs text-muted-foreground">
                                Fees: {method.fees}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              <div className="pt-2">
                <div className="flex gap-2 flex-wrap">
                  {formData.paymentMethods.map((method) => {
                    const paymentMethod = paymentMethods.find(
                      (m) => m.id === method
                    );
                    return (
                      <Badge
                        key={method}
                        variant="outline"
                        className="bg-primary/10"
                      >
                        {paymentMethod
                          ? paymentMethod.name
                          : method
                              .replace("_", " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    );
                  })}
                  {formData.paymentMethods.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No payment methods selected
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div
            key="step5"
            initial={{
              opacity: 0,
              x: 20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: -20,
            }}
            transition={{
              duration: 0.3,
            }}
          >
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional preferences</h3>

              <div className="space-y-6">
                {/* Price Preference */}
                <div className="space-y-3">
                  <Label>Price Preference</Label>
                  <RadioGroup
                    value={formData.pricePreference}
                    onValueChange={(value) =>
                      handleChange("pricePreference", value)
                    }
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    <div className="relative">
                      <RadioGroupItem
                        value="best_price"
                        id="best_price"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="best_price"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-card p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all duration-200 h-full"
                      >
                        <div className="absolute -inset-px bg-primary opacity-0 peer-data-[state=checked]:opacity-5 rounded-lg transition-opacity duration-300"></div>
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <Zap className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-center">
                            <p className="font-medium">Best Price</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Lowest buy / highest sell
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div className="relative">
                      <RadioGroupItem
                        value="market_price"
                        id="market_price"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="market_price"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-card p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all duration-200 h-full"
                      >
                        <div className="absolute -inset-px bg-primary opacity-0 peer-data-[state=checked]:opacity-5 rounded-lg transition-opacity duration-300"></div>
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-center">
                            <p className="font-medium">Market Price</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Current market average
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div className="relative">
                      <RadioGroupItem
                        value="any_price"
                        id="any_price"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="any_price"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-card p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all duration-200 h-full"
                      >
                        <div className="absolute -inset-px bg-primary opacity-0 peer-data-[state=checked]:opacity-5 rounded-lg transition-opacity duration-300"></div>
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-center">
                            <p className="font-medium">Any Price</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Show all available offers
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Trader Preference */}
                <div className="space-y-3">
                  <Label>Trader Preference</Label>
                  <RadioGroup
                    value={formData.traderPreference}
                    onValueChange={(value) =>
                      handleChange("traderPreference", value)
                    }
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    <div className="relative">
                      <RadioGroupItem
                        value="all"
                        id="all_traders"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="all_traders"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-card p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all duration-200 h-full"
                      >
                        <div className="absolute -inset-px bg-primary opacity-0 peer-data-[state=checked]:opacity-5 rounded-lg transition-opacity duration-300"></div>
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-center">
                            <p className="font-medium">All Traders</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              No trader restrictions
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div className="relative">
                      <RadioGroupItem
                        value="verified"
                        id="verified_only"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="verified_only"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-card p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all duration-200 h-full"
                      >
                        <div className="absolute -inset-px bg-primary opacity-0 peer-data-[state=checked]:opacity-5 rounded-lg transition-opacity duration-300"></div>
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-center">
                            <p className="font-medium">Verified Only</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              KYC verified traders
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div className="relative">
                      <RadioGroupItem
                        value="top_rated"
                        id="top_rated"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="top_rated"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-card p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all duration-200 h-full"
                      >
                        <div className="absolute -inset-px bg-primary opacity-0 peer-data-[state=checked]:opacity-5 rounded-lg transition-opacity duration-300"></div>
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <Star className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-center">
                            <p className="font-medium">Top Rated</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              95%+ completion rate
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    {loading.locations ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <div className="relative">
                        <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Select
                          value={formData.location}
                          onValueChange={(value) =>
                            handleChange("location", value)
                          }
                        >
                          <SelectTrigger className="pl-9">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any Location</SelectItem>
                            {locations.map((location) => (
                              <SelectItem
                                key={location.country}
                                value={location.country}
                              >
                                {location.country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Card className="bg-muted/30 border-primary/10 overflow-hidden">
                <div className="h-1 w-full bg-primary"></div>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trade Type:</span>
                      <span className="font-medium capitalize">
                        {formData.tradeType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Wallet Type:
                      </span>
                      {loading.walletOptions ? (
                        <Skeleton className="h-4 w-20" />
                      ) : (
                        <span className="font-medium">
                          {walletOptions.find(
                            (w) => w.id === formData.walletType
                          )?.name || formData.walletType}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Cryptocurrency:
                      </span>
                      {loading.currencies ? (
                        <Skeleton className="h-4 w-20" />
                      ) : (
                        <span className="font-medium">
                          {getAvailableCryptocurrencies().find(
                            (c) => c.value === formData.cryptocurrency
                          )?.label || formData.cryptocurrency}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">
                        {formData.amount} {getCryptoSymbol()}
                      </span>
                    </div>
                    {formData.tradeType === "sell" && walletData && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Available Balance:
                        </span>
                        <span className="font-medium">
                          {getMaxSellAmount()?.toFixed(8)} {getCryptoSymbol()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Payment Methods:
                      </span>
                      {loading.paymentMethods ? (
                        <Skeleton className="h-4 w-20" />
                      ) : (
                        <span className="font-medium">
                          {formData.paymentMethods.length > 0
                            ? formData.paymentMethods.length > 1
                              ? `${formData.paymentMethods.length} methods selected`
                              : paymentMethods.find(
                                  (m) => m.id === formData.paymentMethods[0]
                                )?.name ||
                                formData.paymentMethods[0]
                                  .replace("_", " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())
                            : "None selected"}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Price Preference:
                      </span>
                      <span className="font-medium capitalize">
                        {formData.pricePreference.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Trader Preference:
                      </span>
                      <span className="font-medium capitalize">
                        {formData.traderPreference.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      {loading.locations ? (
                        <Skeleton className="h-4 w-20" />
                      ) : (
                        <span className="font-medium">
                          {formData.location === "any"
                            ? "Any Location"
                            : formData.location}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 1}
          className="gap-2 border-primary/20 hover:bg-primary/5"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {step < totalSteps ? (
          <Button
            onClick={handleNext}
            className="gap-2 bg-primary hover:bg-primary/90"
            disabled={
              isInitialLoading ||
              (step === 2 && !formData.walletType) ||
              (step === 3 &&
                (!formData.cryptocurrency ||
                  !formData.walletType ||
                  !isAmountValid()))
            }
          >
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            className="gap-2 bg-primary hover:bg-primary/90"
            disabled={
              loading.submission || isInitialLoading || !isAmountValid()
            }
          >
            {loading.submission ? (
              <>Finding Matches...</>
            ) : (
              <>
                Find Matches <Check className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
