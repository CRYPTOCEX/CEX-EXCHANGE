"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useWizard } from "../trading-wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InfoIcon as InfoCircle,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { isValidCurrencyCode } from "@/utils/currency";

// Replace the useMarketPrice hook with this updated version that includes wallet type
const useMarketPrice = (currency: string, walletType: string) => {
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const fetchPrice = async () => {
      if (!currency || !walletType) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Include wallet type in the API request
        const response = await fetch(
          `/api/finance/currency/price?currency=${currency}&type=${walletType}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch price: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status && data.data) {
          setPrice(data.data);
          setLastUpdated(new Date());
        } else {
          console.error(
            "Failed to fetch price:",
            data.message || "Unknown error"
          );
        }
      } catch (error) {
        console.error("Error fetching price:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();

    // Refresh price every 30 seconds
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, [currency, walletType]);

  return { price, loading, lastUpdated };
};

// Update the formatPrice function to show "per BTC" instead of "per USD"
const formatPrice = (price: any, currency: string, tradeData: any) => {
  const t = useTranslations("ext");
  const getCryptoSymbol = useCallback(() => {
    // If we have the currency, use that
    if (tradeData.currency) {
      return tradeData.currency;
    }

    // Fallback to mapping common currencies
    switch (tradeData.currency) {
      case "bitcoin":
        return "BTC";
      case "ethereum":
        return "ETH";
      case "tether":
        return "USDT";
      case "bnb":
        return "BNB";
      case "solana":
        return "SOL";
      case "cardano":
        return "ADA";
      default:
        return "CRYPTO";
    }
  }, [tradeData.currency]);

  return (
    <div className="space-y-1">
      <div className="text-lg font-medium">
        {price}
        {t("usd_per")}{" "}
        {getCryptoSymbol()}
      </div>
    </div>
  );
};

export function AmountPriceStep() {
  const t = useTranslations("ext");
  const { tradeData, updateTradeData, markStepComplete } = useWizard();
  const [priceModel, setPriceModel] = useState<"FIXED" | "MARKET" | "MARGIN">(
    "FIXED"
  );
  const [marginType, setMarginType] = useState<"percentage" | "fixed">(
    "percentage"
  );
  const [marginValue, setMarginValue] = useState("2");
  const [minLimit, setMinLimit] = useState("100");
  const [maxLimit, setMaxLimit] = useState("5000");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidated, setIsValidated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Update the hook usage in the component to include wallet type
  const {
    price: marketPrice,
    loading: isLoadingPrice,
    lastUpdated,
  } = useMarketPrice(tradeData.currency, tradeData.walletType);

  // Get the current currency symbol
  const getCryptoSymbol = useCallback(() => {
    // If we have the currency, use that
    if (tradeData.currency) {
      return tradeData.currency;
    }

    // Fallback to mapping common currencies
    switch (tradeData.currency) {
      case "bitcoin":
        return "BTC";
      case "ethereum":
        return "ETH";
      case "tether":
        return "USDT";
      case "bnb":
        return "BNB";
      case "solana":
        return "SOL";
      case "cardano":
        return "ADA";
      default:
        return "CRYPTO";
    }
  }, [tradeData.currency]);

  // Get the current market price
  const getMarketPrice = useCallback(() => {
    return marketPrice || 0;
  }, [marketPrice]);

  // Calculate price based on model
  const calculatePrice = useCallback(() => {
    const marketPrice = getMarketPrice();

    if (priceModel === "FIXED") {
      return Number.parseFloat(tradeData.price || "0");
    } else if (priceModel === "MARKET") {
      return marketPrice;
    } else if (priceModel === "MARGIN") {
      const margin = Number.parseFloat(marginValue || "0");
      if (marginType === "percentage") {
        // If buying, price is higher than market; if selling, price is lower than market
        const multiplier =
          tradeData.tradeType === "BUY" ? 1 + margin / 100 : 1 - margin / 100;
        return marketPrice * multiplier;
      } else {
        // Fixed margin adds or subtracts a fixed amount
        return tradeData.tradeType === "BUY"
          ? marketPrice + margin
          : marketPrice - margin;
      }
    }
    return 0;
  }, [
    getMarketPrice,
    marginType,
    marginValue,
    priceModel,
    tradeData.price,
    tradeData.tradeType,
  ]);

  // Calculate minimum amount based on minimum limit and price
  const calculateMinimumAmount = useCallback(() => {
    const price = calculatePrice();
    if (!price || price <= 0) return 0.001; // Fallback to a small default

    const min = Number.parseFloat(minLimit || "100");
    if (!min || min <= 0) return 0.001; // Fallback if min limit is invalid

    // Calculate minimum amount needed to meet the minimum limit based on currency type
    const currencyCode = tradeData.currency || "";
    const isOfferFiatCurrency = isValidCurrencyCode(currencyCode);
    
    if (isOfferFiatCurrency) {
      // For fiat currencies: min limit is in USD, so multiply by price to get fiat amount
      // Add a small buffer (1.05) to ensure we're above the minimum
      return (min * price) * 1.05;
    } else {
      // For crypto currencies: min limit is in USD, so divide by price to get crypto amount
      // Add a small buffer (1.05) to ensure we're above the minimum
      return (min / price) * 1.05;
    }
  }, [calculatePrice, minLimit, tradeData.currency]);

  // Calculate total value
  const calculateTotalValue = useCallback(() => {
    // Get the amount, handling both string and object formats
    let amount = 0;
    if (typeof tradeData.amount === "object" && tradeData.amount !== null) {
      amount = Number(tradeData.amount.total) || 0;
    } else if (
      typeof tradeData.amount === "string" ||
      typeof tradeData.amount === "number"
    ) {
      amount = Number(tradeData.amount) || 0;
    }

    // Get the price, handling both string and object formats
    let price = 0;
    if (typeof tradeData.price === "object" && tradeData.price !== null) {
      price =
        Number(tradeData.price.finalPrice) ||
        Number(tradeData.price.value) ||
        0;
    } else if (
      typeof tradeData.price === "string" ||
      typeof tradeData.price === "number"
    ) {
      price = Number(tradeData.price) || 0;
    } else {
      price = calculatePrice();
    }

    // Calculate total value based on currency type
    const currencyCode = tradeData.currency || "";
    const isOfferFiatCurrency = isValidCurrencyCode(currencyCode);
    
    if (isOfferFiatCurrency) {
      // For fiat currencies, the price represents fiat per crypto
      // So: totalValue (USD) = amount (fiat) / price (fiat per crypto)
      return amount / price;
    } else {
      // For crypto currencies, the price represents USD per crypto
      // So: totalValue (USD) = amount (crypto) * price (USD per crypto)
      return amount * price;
    }
  }, [calculatePrice, tradeData.amount, tradeData.price, tradeData.currency]);

  // Validate inputs and mark step as complete if valid
  const validateAndMarkComplete = useCallback(() => {
    setIsValidated(true); // Mark that validation has run
    const errors: string[] = [];

    // Parse values
    let amount = 0;
    if (typeof tradeData.amount === "object" && tradeData.amount !== null) {
      amount = Number(tradeData.amount.total) || 0;
    } else {
      amount = Number(tradeData.amount) || 0;
    }

    const price = calculatePrice();
    const min = Number.parseFloat(minLimit || "0");
    const max = Number.parseFloat(maxLimit || "0");
    const totalValue = calculateTotalValue();

    // Validate amount
    if (!amount || amount <= 0) {
      errors.push("Amount must be greater than 0");
    }

    // For sell flow, check if amount is less than or equal to available balance
    if (
      tradeData.tradeType === "SELL" &&
      tradeData.availableBalance &&
      amount > tradeData.availableBalance
    ) {
      errors.push(
        `Amount exceeds available balance of ${tradeData.availableBalance} ${getCryptoSymbol()}`
      );
    }

    // Validate price
    if (!price || price <= 0) {
      errors.push("Price must be greater than 0");
    }

    // Validate limits
    if (!min || min <= 0) {
      errors.push("Minimum limit must be greater than 0");
    }

    if (!max || max <= 0) {
      errors.push("Maximum limit must be greater than 0");
    }

    if (max < min) {
      errors.push(
        "Maximum limit must be greater than or equal to minimum limit"
      );
    }

    // Validate total value against limits
    if (totalValue < min) {
      errors.push(
        `Total value (${totalValue.toFixed(2)} USD) is less than minimum limit (${min} USD)`
      );
    }

    if (totalValue > max) {
      errors.push(
        `Total value (${totalValue.toFixed(2)} USD) is greater than maximum limit (${max} USD)`
      );
    }

    // Update validation errors
    setValidationErrors(errors);

    // Mark step as complete if no errors
    if (errors.length === 0) {
      // Use the correct step number (4 for amount-price-step)
      markStepComplete(4);
      return true;
    }

    return false;
  }, [
    calculatePrice,
    calculateTotalValue,
    getCryptoSymbol,
    markStepComplete,
    maxLimit,
    minLimit,
    tradeData.amount,
    tradeData.availableBalance,
    tradeData.tradeType,
  ]);

  // Initialize with default values
  const isInitialized = useRef(false);

  // Update the handleAmountChange function to store data in the expected format
  const handleAmountChange = useCallback(
    (value: string) => {
      // Allow empty string to let users clear the field
      if (value === "") {
        updateTradeData({
          amountConfig: {
            total: 0,
            min: Number.parseFloat(minLimit) || 0,
            max: Number.parseFloat(maxLimit) || 0,
            availableBalance: tradeData.availableBalance,
          },
          // Keep the amount field for backward compatibility
          amount: 0,
        });
        return;
      }

      // Parse the value, default to 0 if invalid
      const amountValue = Number.parseFloat(value) || 0;

      // Format according to the API schema
      updateTradeData({
        amountConfig: {
          total: amountValue,
          min: Number.parseFloat(minLimit) || 0,
          max: Number.parseFloat(maxLimit) || 0,
          availableBalance: tradeData.availableBalance,
        },
        // Keep the amount field for backward compatibility
        amount: amountValue,
      });
    },
    [updateTradeData, minLimit, maxLimit, tradeData.availableBalance]
  );

  // Update the handlePriceChange function to store data in the expected format
  const handlePriceChange = useCallback(
    (value: string) => {
      const priceValue = Number.parseFloat(value) || 0;

      // Format according to the API schema
      updateTradeData({
        priceConfig: {
          model: "FIXED",
          value: priceValue,
          marketPrice: marketPrice,
          finalPrice: priceValue,
        },
        // Keep the price field for backward compatibility
        price: priceValue,
      });
    },
    [updateTradeData, marketPrice]
  );

  // Update the handlePriceModelChange function to store data in the expected format
  const handlePriceModelChange = useCallback(
    (value: "fixed" | "market" | "margin") => {
      // Convert to uppercase to match our type definitions
      const modelValue = value.toUpperCase() as "FIXED" | "MARKET" | "MARGIN";
      setPriceModel(modelValue);

      if (modelValue === "MARKET") {
        const marketPriceValue = getMarketPrice();

        // Format according to the API schema
        updateTradeData({
          priceConfig: {
            model: "MARKET",
            value: marketPriceValue,
            marketPrice: marketPriceValue,
            finalPrice: marketPriceValue,
          },
          priceModel: modelValue,
          // Keep the price field for backward compatibility
          price: marketPriceValue,
        });
      } else if (modelValue === "MARGIN") {
        const marginVal = Number.parseFloat(marginValue) || 0;
        const marketPriceValue = getMarketPrice();
        let finalPrice = marketPriceValue;

        if (marginType === "percentage") {
          const multiplier =
            tradeData.tradeType === "BUY"
              ? 1 + marginVal / 100
              : 1 - marginVal / 100;
          finalPrice = marketPriceValue * multiplier;
        } else {
          finalPrice =
            tradeData.tradeType === "BUY"
              ? marketPriceValue + marginVal
              : marketPriceValue - marginVal;
        }

        // Format according to the API schema
        updateTradeData({
          priceConfig: {
            model: "MARGIN",
            value: marginVal,
            marketPrice: marketPriceValue,
            finalPrice: finalPrice,
            marginType: marginType,
          },
          priceModel: modelValue,
          // Keep the price field for backward compatibility
          price: finalPrice,
        });
      } else {
        const priceValue =
          Number.parseFloat(tradeData.price?.toString() || "0") || 0;

        // Format according to the API schema
        updateTradeData({
          priceConfig: {
            model: "FIXED",
            value: priceValue,
            marketPrice: marketPrice,
            finalPrice: priceValue,
          },
          priceModel: modelValue,
          // Keep the price field for backward compatibility
          price: priceValue,
        });
      }
    },
    [
      getMarketPrice,
      marginType,
      marginValue,
      updateTradeData,
      tradeData.tradeType,
      marketPrice,
      tradeData.price,
    ]
  );

  // Update the handleMinLimitChange function to update the amount object
  const handleMinLimitChange = useCallback(
    (value: string) => {
      setMinLimit(value);
      const minValue = Number.parseFloat(value) || 0;

      // Format according to the API schema
      updateTradeData({
        minLimit: value,
        amountConfig: {
          ...(tradeData.amountConfig || {}),
          min: minValue,
        },
      });
    },
    [updateTradeData, tradeData.amountConfig]
  );

  // Update the handleMaxLimitChange function to update the amount object
  const handleMaxLimitChange = useCallback(
    (value: string) => {
      setMaxLimit(value);
      const maxValue = Number.parseFloat(value) || 0;

      // Format according to the API schema
      updateTradeData({
        maxLimit: value,
        amountConfig: {
          ...(tradeData.amountConfig || {}),
          max: maxValue,
        },
      });
    },
    [updateTradeData, tradeData.amountConfig]
  );

  const handleMarginTypeChange = useCallback(
    (value: "percentage" | "fixed") => {
      setMarginType(value);
    },
    []
  );

  const handleMarginValueChange = useCallback((value: string) => {
    setMarginValue(value);
  }, []);

  useEffect(() => {
    // Only run this initialization once and when price is loaded
    if (!isInitialized.current && !isLoadingPrice) {
      isInitialized.current = true;

      // Set default values
      const updates: Record<string, any> = {};

      // Set price if not already set or if it's zero
      if (!tradeData.priceConfig) {
        updates.priceConfig = {
          model: "FIXED",
          value: marketPrice || 0,
          marketPrice: marketPrice || 0,
          finalPrice: marketPrice || 0,
        };
        // Keep the price field for backward compatibility
        updates.price = marketPrice || 0;
      }

      // Set price model if not already set
      if (!tradeData.priceModel) {
        updates.priceModel = "FIXED";
      } else {
        // Convert to uppercase to match our type definitions
        setPriceModel(
          tradeData.priceModel.toUpperCase() as "FIXED" | "MARKET" | "MARGIN"
        );
      }

      // Set min/max limits if not already set
      if (!tradeData.minLimit) {
        updates.minLimit = "100";
      } else {
        setMinLimit(tradeData.minLimit);
      }

      if (!tradeData.maxLimit) {
        updates.maxLimit = "5000";
      } else {
        setMaxLimit(tradeData.maxLimit);
      }

      // Set margin settings if not already set
      if (tradeData.marginType) {
        setMarginType(tradeData.marginType as "percentage" | "fixed");
      }

      if (tradeData.marginValue) {
        setMarginValue(tradeData.marginValue);
      }

      // Update trade data with initial values
      if (Object.keys(updates).length > 0) {
        updateTradeData(updates);
      }

      // Set a small delay to allow price to be properly set before calculating amount
      setTimeout(() => {
        // Now calculate and set the amount if not already set
        if (!tradeData.amountConfig) {
          // For sell flow, set default to 10% of available balance
          if (tradeData.tradeType === "SELL" && tradeData.availableBalance) {
            const sellAmount = tradeData.availableBalance * 0.1;
            updateTradeData({
              amountConfig: {
                total: sellAmount,
                min: Number.parseFloat(minLimit) || 0,
                max: Number.parseFloat(maxLimit) || 0,
                availableBalance: tradeData.availableBalance,
              },
              // Keep the amount field for backward compatibility
              amount: sellAmount,
            });
          } else {
            // For buy flow, don't set a default amount - let the user enter it
            // Just initialize the config structure with empty values
            updateTradeData({
              amountConfig: {
                total: 0, // Start with 0 but display as empty string
                min: Number.parseFloat(minLimit) || 0,
                max: Number.parseFloat(maxLimit) || 0,
                availableBalance: tradeData.availableBalance,
              },
              // Keep the amount field for backward compatibility
              amount: 0,
            });
          }
        }

        // Calculate and update total value
        const calculatedTotal = calculateTotalValue();
        const totalValue =
          calculatedTotal > 0 ? calculatedTotal.toFixed(2) : "0.00";
        updateTradeData({ totalValue });

        setIsInitializing(false);

        // Run validation after initialization with a delay to ensure all values are set
        setTimeout(() => {
          validateAndMarkComplete();
        }, 500);
      }, 300);
    }
  }, [
    marketPrice,
    isLoadingPrice,
    tradeData,
    updateTradeData,
    calculateMinimumAmount,
    calculateTotalValue,
    validateAndMarkComplete,
    minLimit,
    maxLimit,
    getCryptoSymbol,
  ]);

  // Update total value when amount or price changes
  useEffect(() => {
    if (isInitializing) return; // Skip during initialization

    // Calculate total value
    const totalValue = calculateTotalValue().toFixed(2);

    // Only update if the total has changed
    if (tradeData.totalValue !== totalValue) {
      updateTradeData({ totalValue });
    }

    // Don't run validation on every render, only when relevant values change
    if (isValidated) {
      validateAndMarkComplete();
    }
  }, [
    tradeData.amount,
    tradeData.amountConfig,
    tradeData.price,
    tradeData.priceConfig,
    priceModel,
    marginType,
    marginValue,
    minLimit,
    maxLimit,
    calculateTotalValue,
    updateTradeData,
    isInitializing,
    isValidated,
    validateAndMarkComplete,
    getCryptoSymbol,
  ]);

  // Ensure validation runs when component is fully mounted
  useEffect(() => {
    if (!isInitializing && !isValidated) {
      validateAndMarkComplete();
    }
  }, [isInitializing, isValidated, validateAndMarkComplete]);



  // Helper to adjust amount to meet minimum limit
  const adjustAmountToMeetMinimum = useCallback(() => {
    const minAmount = calculateMinimumAmount();

    // Format according to the API schema
    updateTradeData({
      amountConfig: {
        total: minAmount,
        min: Number.parseFloat(minLimit) || 0,
        max: Number.parseFloat(maxLimit) || 0,
        availableBalance: tradeData.availableBalance,
      },
      // Keep the amount field for backward compatibility
      amount: minAmount,
    });
  }, [
    calculateMinimumAmount,
    updateTradeData,
    minLimit,
    maxLimit,
    tradeData.availableBalance,
  ]);

  // Add a useEffect that runs on every render to ensure the step is always marked as complete if validation passes
  useEffect(() => {
    if (
      (tradeData.amount ||
        (tradeData.amountConfig && tradeData.amountConfig.total)) &&
      (tradeData.price ||
        (tradeData.priceConfig && tradeData.priceConfig.finalPrice)) &&
      tradeData.minLimit &&
      tradeData.maxLimit
    ) {
      // Use the correct step number (4 for amount-price-step)
      markStepComplete(4);
    }
  }, [
    tradeData.amount,
    tradeData.amountConfig,
    tradeData.price,
    tradeData.priceConfig,
    tradeData.minLimit,
    tradeData.maxLimit,
    markStepComplete,
  ]);

  // Get the amount value to display in the input
  const getAmountValue = useCallback(() => {
    if (tradeData.amountConfig && tradeData.amountConfig.total !== undefined) {
      // Return empty string if the value is 0 to allow users to type freely
      return tradeData.amountConfig.total === 0 ? "" : tradeData.amountConfig.total;
    }
    // Return empty string if the value is 0 to allow users to type freely
    return tradeData.amount === 0 ? "" : (tradeData.amount || "");
  }, [tradeData.amount, tradeData.amountConfig]);

  // Get the price value to display in the input
  const getPriceValue = useCallback(() => {
    if (tradeData.priceConfig && tradeData.priceConfig.value !== undefined) {
      return tradeData.priceConfig.value;
    }
    return tradeData.price || "";
  }, [tradeData.price, tradeData.priceConfig]);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        {t("specify_how_much_currency_you_want_to")}{" "}
        {tradeData.tradeType || "trade"}{" "}
        {t("at_what_price_and_your_trade_limits")}.
      </p>

      {/* Validation Errors Alert - only show if there are errors */}
      {validationErrors.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription>
            <div className="font-medium text-amber-800 dark:text-amber-300">
              {t("please_fix_the_following_issues")}
            </div>
            <ul className="mt-2 list-disc pl-5 text-amber-700 dark:text-amber-400">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
            {validationErrors.some(
              (e) =>
                e.includes("Total value") && e.includes("less than minimum")
            ) && (
              <button
                onClick={adjustAmountToMeetMinimum}
                className="mt-2 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-zinc-700/50 dark:hover:bg-zinc-600/50 dark:text-amber-300 rounded-md text-sm font-medium transition-colors"
              >
                {t("automatically_adjust_amount_to_meet_minimum")}
              </button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label htmlFor="amount">
            {t("amount_(")} {getCryptoSymbol()})
          </Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={getAmountValue()}
            onChange={(e) => handleAmountChange(e.target.value)}
            min="0"
            step="0.00000001"
            max={
              tradeData.tradeType === "SELL"
                ? tradeData.availableBalance
                : undefined
            }
            className={
              validationErrors.some((e) => e.includes("Amount"))
                ? "border-amber-500 dark:border-amber-400"
                : ""
            }
          />

          {/* Show available balance for sell flow */}
          {tradeData.tradeType === "SELL" && tradeData.availableBalance && (
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">{t("available")}{": "}</span>
              <span className="font-medium">
                {tradeData.availableBalance.toLocaleString()}{" "}
                {getCryptoSymbol()}
              </span>
            </div>
          )}

          <div className="space-y-2 pt-4">
            <div className="flex justify-between">
              <Label htmlFor="minLimit">{t("minimum_limit_(usd)")}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      {t("the_minimum_amount_with_you")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="minLimit"
              type="number"
              placeholder="100"
              value={minLimit}
              onChange={(e) => handleMinLimitChange(e.target.value)}
              min="0"
              step="1"
              className={
                validationErrors.some((e) => e.includes("Minimum limit"))
                  ? "border-amber-500 dark:border-amber-400"
                  : ""
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="maxLimit">{t("maximum_limit_(usd)")}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      {t("the_maximum_amount_with_you")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="maxLimit"
              type="number"
              placeholder="5000"
              value={maxLimit}
              onChange={(e) => handleMaxLimitChange(e.target.value)}
              min="0"
              step="1"
              className={
                validationErrors.some((e) => e.includes("Maximum limit"))
                  ? "border-amber-500 dark:border-amber-400"
                  : ""
              }
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>{t("price_model")}</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    {t("choose_how_you_want_to_set_your_price")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Tabs
            defaultValue="fixed"
            value={priceModel.toLowerCase()}
            onValueChange={(v) => handlePriceModelChange(v as any)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="fixed">{t("fixed_price")}</TabsTrigger>
              <TabsTrigger value="market">{t("market_price")}</TabsTrigger>
              <TabsTrigger value="margin">{t("margin_trading")}</TabsTrigger>
            </TabsList>

            <TabsContent value="fixed" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="price">
                  {t("price_per")}{" "}
                  {getCryptoSymbol()}{" "}
                  (USD)
                </Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.00"
                  value={getPriceValue()}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  min="0"
                  step="0.01"
                  className={
                    validationErrors.some((e) => e.includes("Price"))
                      ? "border-amber-500 dark:border-amber-400"
                      : ""
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("set_a_specific_market_fluctuations")}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="market" className="space-y-4 pt-4">
              <Card className="border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {t("current_market_price")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingPrice ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      <span>{t("loading_price")}.</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${getMarketPrice().toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("last_updated")}{": "}
                        {lastUpdated.toLocaleTimeString()}
                      </p>
                    </>
                  )}
                  <p className="text-sm text-muted-foreground mt-4">
                    {t("your_offer_will_data_providers")}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="margin" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("margin_type")}</Label>
                  <RadioGroup
                    value={marginType}
                    onValueChange={(v) =>
                      handleMarginTypeChange(v as "percentage" | "fixed")
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="percentage" id="percentage" />
                      <Label htmlFor="percentage">{t("percentage_(%)")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fixed" id="fixed" />
                      <Label htmlFor="fixed">{t("fixed_amount_($)")}</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marginValue">
                    {marginType === "percentage"
                      ? "Margin Percentage"
                      : "Margin Amount"}
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="marginValue"
                      type="number"
                      placeholder={marginType === "percentage" ? "2" : "100"}
                      value={marginValue}
                      onChange={(e) => handleMarginValueChange(e.target.value)}
                      min="0"
                      step={marginType === "percentage" ? "0.1" : "1"}
                    />
                    <span className="text-sm font-medium">
                      {marginType === "percentage" ? "%" : "USD"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {marginType === "percentage"
                      ? `Your price will be ${tradeData.tradeType === "BUY" ? "above" : "below"} market price by this percentage`
                      : `Your price will be ${tradeData.tradeType === "BUY" ? "above" : "below"} market price by this fixed amount`}
                  </p>
                </div>

                <Card className="border-primary/10 bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">
                          {t("calculated_price")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("based_on_current_market_conditions")}
                        </p>
                      </div>
                      <div className="text-xl font-bold">
                        ${calculatePrice().toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {tradeData.tradeType === "BUY"
                        ? "Buyers will pay this price to purchase your currency"
                        : "You will pay this price to purchase currency"}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <div className="pt-2">
            <Label className="mb-2 block">{t("current_market_price")}</Label>
            {isLoadingPrice ? (
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>{t("loading_price")}.</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${getMarketPrice().toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("last_updated")}{": "}
                  {lastUpdated.toLocaleTimeString()}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className={`bg-muted p-4 rounded-md ${validationErrors.some((e) => e.includes("Total value")) ? "border border-amber-500 dark:border-amber-400" : ""}`}
      >
        <div className="flex justify-between items-center">
          <h4 className="font-medium">{t("total_value")}</h4>
          <div className="text-xl font-bold">
            ${tradeData.totalValue || "0.00"}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t("this_is_the_total_amount_in_usd_for_this_trade")}.
        </p>
      </div>

      {tradeData.tradeType === "SELL" && (
        <Alert>
          <InfoCircle className="h-4 w-4" />
          <AlertDescription>
            {t("when_selling_currency_completes_payment")}.{" "}
            {t("this_protects_both_parties_during_the_transaction")}.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
