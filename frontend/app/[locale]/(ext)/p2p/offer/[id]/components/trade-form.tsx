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
  const t = useTranslations("ext");
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings: globalSettings } = useConfigStore();
  const kycEnabled = globalSettings?.kycStatus === "true";

  const { user } = useUserStore();
  const router = useRouter();
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (offer?.paymentMethods?.length > 0) {
      setSelectedPaymentMethod(offer.paymentMethods[0].id);
    }
  }, [offer]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimals
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const price = priceConfig?.finalPrice || priceConfig?.value || 0;
  const isBuyOffer = offer?.type === "BUY"; // If offer type is BUY, user is selling
  const isOfferFiatCurrency = isValidCurrencyCode(currencyCode);

  // Calculate total price based on currency type and offer type
  let totalPrice = 0;
  if (isOfferFiatCurrency) {
    // For fiat currencies, the price represents fiat per crypto
    // So: totalPrice (USD) = amount (fiat) / price (fiat per crypto)
    totalPrice = Number.parseFloat(amount || "0") / price || 0;
  } else {
    // For crypto currencies, the price represents USD per crypto
    // So: totalPrice (USD) = amount (crypto) * price (USD per crypto)
    totalPrice = Number.parseFloat(amount || "0") * price || 0;
  }

  // Calculate min/max amounts based on currency type
  let minAmount = 0;
  let maxAmount = 0;
  
  if (isOfferFiatCurrency) {
    // For fiat currencies: min/max are in fiat, so multiply by price to get fiat amounts
    minAmount = amountConfig?.min ? amountConfig.min * price : 0;
    maxAmount = amountConfig?.max ? amountConfig.max * price : 0;
  } else {
    // For crypto currencies: min/max are in USD, so divide by price to get crypto amounts
    minAmount = amountConfig?.min ? amountConfig.min / price : 0;
    maxAmount = amountConfig?.max ? amountConfig.max / price : 0;
  }

  // For display purposes
  const minAmountDisplay = formatAmount(minAmount, currencyCode);
  const maxAmountDisplay = formatAmount(maxAmount, currencyCode);

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

    // Check minimum amount
    if (amountValue < (settings.p2pMinimumTradeAmount || minAmount)) {
      toast({
        title: "Amount too low",
        description: `Minimum amount is ${Math.max(settings.p2pMinimumTradeAmount || 0, minAmount)} ${currencyCode}`,
        variant: "destructive",
      });
      return;
    }

    // Check maximum amount
    if (amountValue > (settings.p2pMaximumTradeAmount || maxAmount)) {
      toast({
        title: "Amount too high",
        description: `Maximum amount is ${Math.min(settings.p2pMaximumTradeAmount || Number.POSITIVE_INFINITY, maxAmount)} ${currencyCode}`,
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
      const { data, error } = await $fetch({
        url: "/api/trades",
        method: "POST",
        body: {
          offerId: offer?.id,
          amount: amountValue,
          paymentMethodId: selectedPaymentMethod,
        },
      });

      if (error) {
        throw new Error("Failed to create trade");
      }

      toast({
        title: "Trade initiated",
        description: "You will be redirected to the trade page",
      });

      // Redirect to trade page
      router.push(`/p2p/trade/${data.id}`);
    } catch (error) {
      console.error("Error creating trade:", error);
      toast({
        title: "Error",
        description: "Failed to create trade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
                {t("edit_offer")}
              </Button>
            </Link>

            <Button variant="outline" className="w-full">
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
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="15"></line>
                <line x1="15" y1="9" x2="9" y2="15"></line>
              </svg>
              {t("disable_offer")}
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
              {t("amount_(")}
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
                min {minAmountDisplay} {currencyCode}
              </span>
              <span className="text-muted-foreground">
                {t("max")} {maxAmountDisplay} {currencyCode}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total" className="text-sm font-medium">
              {t("total_(usd)")}
            </Label>
            <div className="relative">
              <Input
                id="total"
                value={totalPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                readOnly
                className="bg-muted/20 pr-16"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-sm font-medium text-muted-foreground">
                  USD
                </span>
              </div>
            </div>
          </div>

          {/* Display fees based on settings */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("Fees")}</Label>
            <div className="bg-muted/20 p-3 rounded-md space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {t("platform_fee_(")}
                  {isBuyOffer ? settings.p2pTakerFee : settings.p2pMakerFee}
                  %)
                </span>
                <span>
                  {(
                    ((isBuyOffer
                      ? settings.p2pTakerFee
                      : settings.p2pMakerFee) /
                      100) *
                    totalPrice
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  USD
                </span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-sm font-medium">
                <span>{t("total_with_fees")}</span>
                <span>
                  {(
                    totalPrice +
                    ((isBuyOffer
                      ? settings.p2pTakerFee
                      : settings.p2pMakerFee) /
                      100) *
                      totalPrice
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  USD
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("payment_method")}</Label>
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
                {t("no_payment_methods_available")}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 bg-muted/20 p-3 rounded-md">
            <Timer className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {t("time_limit")}
                {timeLimit}
                {t("minutes")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("once_you_start_the_trade_you_will_have")}
                {timeLimit}
                {t("minutes_to_complete_the_payment")}.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              isSubmitting ||
              !amount ||
              Number.parseFloat(amount) <
                Math.max(settings.p2pMinimumTradeAmount || 0, minAmount) ||
              Number.parseFloat(amount) >
                Math.min(
                  settings.p2pMaximumTradeAmount || Number.POSITIVE_INFINITY,
                  maxAmount
                ) ||
              settings.p2pMaintenanceMode ||
              !selectedPaymentMethod
            }
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                {t("Processing")}.
              </>
            ) : (
              <>
                {actionText} {currencyCode} {t("Now")}
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
            {t("100%_secure_escrow_protection")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("your_funds_are_completed_successfully")}.
        </p>
      </div>
    </div>
  );
}
