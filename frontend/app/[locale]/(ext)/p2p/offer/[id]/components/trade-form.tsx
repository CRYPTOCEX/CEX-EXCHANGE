"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Shield, Timer } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useState, useEffect } from "react";
import { PaymentMethodIcon } from "./payment-method-icon";
import { $fetch } from "@/lib/api";
import Image from "next/image";
import { useUserStore } from "@/store/user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useTranslations } from "next-intl";
import { isValidCurrencyCode, formatAmount } from "@/utils/currency";

// Update the TradeFormProps interface to include isOwner
interface TradeFormProps {
  offer: any;
  actionText: string;
  timeLimit: number;
  settings: any;
  isOwner?: boolean;
}

// Update the function parameters to include isOwner
export function TradeForm({
  offer,
  actionText,
  timeLimit,
  settings,
  isOwner = false,
}: TradeFormProps) {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings: globalSettings } = useConfigStore();
  const kycEnabled = globalSettings?.kycStatus === "true";

  const { user } = useUserStore();
  const router = useRouter();
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>("");
  const [total, setTotal] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  // Safely get the currency code
  const currencyCode = offer?.currency || "BTC";

  // Parse JSON strings if they haven't been parsed already
  const amountConfig =
    typeof offer?.amountConfig === "string"
      ? JSON.parse(offer.amountConfig || "{}")
      : offer?.amountConfig || {};

  const priceConfig =
    typeof offer?.priceConfig === "string"
      ? JSON.parse(offer.priceConfig || "{}")
      : offer?.priceConfig || {};

  // Get price currency from offer (EUR, USD, etc.)
  // Check both priceCurrency field and priceConfig.currency for compatibility
  const priceCurrency = offer?.priceCurrency || priceConfig?.currency || "USD";

  const tradeSettings =
    typeof offer?.tradeSettings === "string"
      ? JSON.parse(offer.tradeSettings || "{}")
      : offer?.tradeSettings || {};

  // Decide feature needed based on offer type
  const requiredFeature =
    offer?.type === "BUY"
      ? "make_p2p_offer" // If user is selling to buyer
      : "buy_p2p_offer"; // If user is buying from seller

  const canProceed =
    !kycEnabled || (hasKyc() && canAccessFeature(requiredFeature));

  // Set selected payment method when offer changes
  useEffect(() => {
    console.log("Offer payment methods:", offer?.paymentMethods);
    if (offer?.paymentMethods?.length > 0) {
      console.log("Setting payment method to:", offer.paymentMethods[0].id);
      setSelectedPaymentMethod(offer.paymentMethods[0].id);
    } else {
      console.warn("No payment methods available for this offer");
    }
  }, [offer]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimals
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      // Update total based on amount
      if (value && price > 0) {
        const calculatedTotal = Number.parseFloat(value) * price;
        setTotal(calculatedTotal.toFixed(2));
      } else {
        setTotal("");
      }
    }
  };

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimals
    if (/^\d*\.?\d*$/.test(value)) {
      setTotal(value);
      // Update amount based on total
      if (value && price > 0) {
        const calculatedAmount = Number.parseFloat(value) / price;
        setAmount(calculatedAmount.toString());
      } else {
        setAmount("");
      }
    }
  };

  const price = priceConfig?.finalPrice || priceConfig?.value || 0;
  const isBuyOffer = offer?.type === "BUY"; // If offer type is BUY, user is selling
  const isOfferFiatCurrency = isValidCurrencyCode(currencyCode);

  // Calculate total price in the price currency (EUR, USD, etc.)
  // Price is always: priceCurrency per crypto
  // So: totalPrice (EUR/USD) = amount (crypto) * price (EUR/USD per crypto)
  const totalPrice = total ? Number.parseFloat(total) : (Number.parseFloat(amount || "0") * price || 0);

  // Min/max amounts are stored in FIAT currency (EUR, USD, etc.)
  // When trading crypto, we need to convert to crypto amounts
  // minAmount (BTC) = minLimit (EUR) / price (EUR per BTC)
  let minAmount = 0;
  let maxAmount = 0;

  if (isOfferFiatCurrency) {
    // Trading FIAT: limits are already in the correct currency
    minAmount = amountConfig?.min || 0;
    maxAmount = amountConfig?.max || amountConfig?.total || 0;
  } else {
    // Trading crypto: convert FIAT limits to crypto amounts
    if (price > 0) {
      minAmount = (amountConfig?.min || 0) / price;
      maxAmount = (amountConfig?.max || amountConfig?.total || 0) / price;
    }
  }

  // For display purposes
  const minAmountDisplay = formatAmount(minAmount, currencyCode);
  const maxAmountDisplay = formatAmount(maxAmount, currencyCode);

  // Calculate min/max for total in price currency
  const minTotal = minAmount * price;
  const maxTotal = maxAmount * price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if P2P trading is enabled
    if (!settings.p2pEnabled) {
      toast({
        title: "Trading Disabled",
        description:
          "P2P trading is currently disabled. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    // Check if maintenance mode is active
    if (settings.p2pMaintenanceMode) {
      toast({
        title: "Maintenance Mode",
        description:
          "The platform is currently in maintenance mode. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    // Validate amount
    if (!amount || Number.parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const amountValue = Number.parseFloat(amount);

    // Check minimum amount (use offer limits, not global settings for crypto)
    if (amountValue < minAmount) {
      toast({
        title: "Amount too low",
        description: `Minimum amount is ${minAmount} ${currencyCode}`,
        variant: "destructive",
      });
      return;
    }

    // Check maximum amount (use offer limits, not global settings for crypto)
    if (amountValue > maxAmount) {
      toast({
        title: "Amount too high",
        description: `Maximum amount is ${maxAmount} ${currencyCode}`,
        variant: "destructive",
      });
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Initiating trade with offer:", offer?.id);
      const { data, error } = await $fetch({
        url: `/api/p2p/offer/${offer?.id}/initiate-trade`,
        method: "POST",
        body: {
          amount: amountValue,
          paymentMethodId: selectedPaymentMethod,
        },
      });

      console.log("Trade initiation response:", { data, error });

      if (error) {
        console.error("Trade initiation error:", error);
        throw new Error(typeof error === "string" ? error : "Failed to create trade");
      }

      toast({
        title: "Trade initiated",
        description: "You will be redirected to the trade page",
      });

      // Redirect to trade page
      setTimeout(() => {
        router.push(`/p2p/trade/${data.trade.id}`);
      }, 500);
    } catch (error: any) {
      console.error("Error creating trade:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create trade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle removing the offer
  const handleRemoveOffer = async () => {
    if (!offer?.id) {
      console.error("Cannot remove offer: offer ID is missing");
      toast({
        title: "Error",
        description: "Cannot remove offer: offer ID is missing",
        variant: "destructive",
      });
      return;
    }

    // Confirm deletion
    const confirmMessage = t("are_you_sure_you_want_to_remove_this_offer") || "Are you sure you want to remove this offer? This action cannot be undone.";
    const userConfirmed = window.confirm(confirmMessage);

    if (!userConfirmed) {
      console.log("User cancelled offer removal");
      return;
    }

    console.log("Removing offer:", offer.id);
    setIsDisabling(true);

    try {
      const { data, error } = await $fetch({
        url: `/api/p2p/offer/${offer.id}`,
        method: "DELETE",
      });

      console.log("Delete API response:", { data, error });

      if (error) {
        console.error("API returned error:", error);
        // Extract meaningful error message
        const errorMessage = typeof error === "string"
          ? error
          : (error as any)?.message || JSON.stringify(error) || "Failed to remove offer";

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
          duration: 10000, // Show error for 10 seconds
        });
        return; // Don't throw, just return to prevent further processing
      }

      console.log("Offer removed successfully");
      toast({
        title: t("offer_removed") || "Offer Removed",
        description: t("your_offer_has_been_successfully_removed") || "Your offer has been successfully removed",
      });

      // Redirect to offers list
      setTimeout(() => {
        router.push("/p2p/offer");
      }, 500);
    } catch (error: any) {
      console.error("Error removing offer:", error);
      const errorMessage = error?.message || error?.toString() || t("failed_to_remove_offer") || "Failed to remove offer";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // Show error for 10 seconds
      });
    } finally {
      setIsDisabling(false);
    }
  };

  if (!canProceed) {
    return <KycRequiredNotice feature={requiredFeature} />;
  }

  if (isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("manage_your_offer")}</CardTitle>
          <CardDescription>
            {t("this_is_your_own_offer")}. {t("you_can_manage_it_from_here")}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Link href={`/p2p/offer/${offer.id}/edit`}>
              <Button className="w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                {tCommon("edit_offer")}
              </Button>
            </Link>

            <Button
              variant="destructive"
              className="w-full"
              onClick={handleRemoveOffer}
              disabled={isDisabling}
            >
              {isDisabling ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                  {t("removing")}...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  {t("remove_offer")}
                </>
              )}
            </Button>
          </div>

          <div className="rounded-md bg-blue-50 dark:bg-zinc-800/50 border border-blue-200 dark:border-zinc-700 p-4 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-400 dark:text-blue-300"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  {t("offer_status")}{" "}
                  {offer.status.replace(/_/g, " ")}
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                  <p>
                    {offer.status === "PENDING_APPROVAL"
                      ? "Your offer is currently under review by our team. It will be available for trading once approved."
                      : "Your offer is active and visible to other traders."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If offer is not available yet, show loading state
  if (!offer) {
    return (
      <div className="border rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <div className="h-8 w-48 bg-muted/50 rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-muted/50 rounded mt-2 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-muted/50 rounded animate-pulse"></div>
                <div className="h-10 w-full bg-muted/50 rounded animate-pulse"></div>
              </div>
            ))}
            <div className="h-10 w-full bg-muted/50 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b bg-muted/30">
        <div className="flex items-center gap-2 mb-1">
          {/* Check if it's a fiat currency (3 letter code like USD, AED, EUR) */}
                          {isValidCurrencyCode(offer.currency) ? (
            <div className="w-8 h-8 flex items-center justify-center text-foreground font-bold text-sm bg-muted rounded-full">
              {offer.currency}
            </div>
          ) : (
            <Image
              src={`/img/crypto/${(offer.currency || "generic").toLowerCase()}.webp`}
              alt={currencyCode || "generic"}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <h3 className="text-xl font-semibold">
            {actionText} {currencyCode}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("enter_the_amount_you_want_to")}
          {actionText.toLowerCase()}
        </p>
      </div>

      {/* Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              {tCommon("amount")}
              {currencyCode}
              )
            </Label>
            <div className="relative">
              <Input
                id="amount"
                placeholder={`${minAmountDisplay} - ${maxAmountDisplay}`}
                value={amount}
                onChange={handleAmountChange}
                className="pr-16"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-sm font-medium text-muted-foreground">
                  {currencyCode}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                min {minAmountDisplay}
              </span>
              <span className="text-muted-foreground">
                {tCommon("max")} {maxAmountDisplay}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total" className="text-sm font-medium">
              {tCommon("total")} ({priceCurrency})
            </Label>
            <div className="relative">
              <Input
                id="total"
                placeholder={`${minTotal.toFixed(2)} - ${maxTotal.toFixed(2)}`}
                value={total}
                onChange={handleTotalChange}
                className="pr-16"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-sm font-medium text-muted-foreground">
                  {priceCurrency}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                min {minTotal.toFixed(2)} {priceCurrency}
              </span>
              <span className="text-muted-foreground">
                {tCommon("max")} {maxTotal.toFixed(2)} {priceCurrency}
              </span>
            </div>
          </div>

          {/* Display fees based on settings - only if fees are configured */}
          {/* Note: The current user initiating a trade is ALWAYS the taker (offer acceptor) */}
          {/* Therefore, they should ALWAYS pay the taker fee, regardless of buy/sell direction */}
          {(() => {
            const feeRate = settings.p2pTakerFee || 0; // Always use taker fee for trade initiator
            const feeAmount = (feeRate / 100) * totalPrice;
            const totalWithFees = totalPrice + feeAmount;

            // Only show fees section if there's actually a fee
            if (feeRate > 0 && totalPrice > 0) {
              return (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{tCommon("fees")}</Label>
                  <div className="bg-muted/20 p-3 rounded-md space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {tCommon("platform_fee")}
                        {feeRate}
                        %)
                      </span>
                      <span>
                        {feeAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {priceCurrency}
                      </span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-sm font-medium">
                      <span>{t("total_with_fees")}</span>
                      <span>
                        {totalWithFees.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {priceCurrency}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="space-y-2">
            <Label className="text-sm font-medium">{tCommon("payment_method")}</Label>
            {offer.paymentMethods && offer.paymentMethods.length > 0 ? (
              <RadioGroup
                value={selectedPaymentMethod}
                onValueChange={setSelectedPaymentMethod}
                className="space-y-2"
              >
                {offer.paymentMethods.map((method: any) => (
                  <div
                    key={method.id}
                    className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/20 transition-colors"
                  >
                    <RadioGroupItem
                      value={method.id}
                      id={`payment-${method.id}`}
                    />
                    <Label
                      htmlFor={`payment-${method.id}`}
                      className="flex items-center cursor-pointer"
                    >
                      <PaymentMethodIcon
                        methodId={method.icon || "credit-card"}
                      />
                      <span className="ml-2">{method.name}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="text-sm text-muted-foreground p-3 border rounded-md">
                {tCommon("no_payment_methods")}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 bg-muted/20 p-3 rounded-md">
            <Timer className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {t("time_limit")} {timeLimit} {tCommon("minutes")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("once_you_start_the_trade_you_will_have")} {timeLimit} {t("minutes_to_complete_the_payment")}.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={(() => {
              const amountValue = Number.parseFloat(amount || "0");
              // Use a small epsilon for floating-point comparison to avoid precision issues
              const epsilon = minAmount * 0.0001; // 0.01% tolerance
              const disabled =
                isSubmitting ||
                !amount ||
                amountValue < (minAmount - epsilon) ||
                amountValue > maxAmount ||
                settings.p2pMaintenanceMode ||
                !selectedPaymentMethod;

              return disabled;
            })()}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                {tCommon("processing")}.
              </>
            ) : (
              <>
                {actionText} {currencyCode} {t("now")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Footer */}
      <div className="bg-muted/20 flex flex-col items-center text-center px-6 py-4 border-t">
        <div className="flex items-center mb-2">
          <Shield className="h-5 w-5 mr-2 text-primary" />
          <span className="font-medium">
            {t("n_100_secure_escrow_protection")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("your_funds_are_completed_successfully")}.
        </p>
      </div>
    </div>
  );
}
