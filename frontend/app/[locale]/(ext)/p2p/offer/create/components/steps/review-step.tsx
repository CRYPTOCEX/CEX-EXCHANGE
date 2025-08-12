"use client";

import { useEffect, useState } from "react";
import { useWizard } from "../trading-wizard";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowUpDown,
  Wallet,
  CreditCard,
  DollarSign,
  Clock,
  Shield,
  Eye,
  Bitcoin,
  BadgeCheck,
  AlertCircle,
  MapPin,
  InfoIcon,
  Globe,
  Percent,
  MessageSquare,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function ReviewStep() {
  const t = useTranslations("ext");
  const { tradeData, markStepComplete } = useWizard();

  // Use useEffect to mark the step as complete after render
  useEffect(() => {
    markStepComplete(9); // Ensure this is the correct step number
  }, [markStepComplete, tradeData]);

  // Helper function to get wallet type name
  const getWalletTypeName = (walletType: string): string => {
    const walletNames: Record<string, string> = {
      FIAT: "Fiat",
      SPOT: "Spot",
      ECO: "Funding",
      FUNDING: "Funding",
    };
    return walletNames[walletType] || walletType;
  };

  // Helper to get trade type color
  const getTradeTypeColor = (type: string): string => {
    return type?.toLowerCase() === "buy" ? "text-green-500" : "text-red-500";
  };

  // Format account age for display
  const formatAccountAge = (days?: number) => {
    if (!days || days === 0) return "No minimum";
    if (days < 30) return `${days} days`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? "s" : ""}`;
    }
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? "s" : ""}`;
  };

  // Format price with currency
  const formatPrice = (price: any, currency: string) => {
    // Handle the new priceConfig format
    if (price && typeof price === "object" && price.finalPrice !== undefined) {
      return (
        <div className="space-y-1">
          <div className="text-lg font-medium">
            {price.finalPrice}{" "}
            {t("usd_per")}{" "}
            {currency || "crypto"}
          </div>
          {price.model === "MARGIN" && (
            <Badge variant={Number(price.value) > 0 ? "outline" : "secondary"}>
              {Number(price.value) > 0 ? "+" : ""}{" "}
              {price.value}{" "}
              {t("%_from_market_price")}
            </Badge>
          )}
        </div>
      );
    }

    // Handle the old price format
    if (!price || !price.value) return "Not specified";

    return (
      <div className="space-y-1">
        <div className="text-lg font-medium">
          {price.value}{" "}
          {t("usd_per")}{" "}
          {currency || "crypto"}
        </div>
        {price.model === "MARGIN" && (
          <Badge variant={Number(price.value) > 0 ? "outline" : "secondary"}>
            {Number(price.value) > 0 ? "+" : ""}{" "}
            {price.value}{" "}
            {t("%_from_market_price")}
          </Badge>
        )}
      </div>
    );
  };

  // Format amount with currency
  const formatAmount = (amount: any, currency: string) => {
    if (amount && typeof amount === "object" && amount.total !== undefined) {
      return (
        <div className="space-y-1">
          <div className="text-lg font-medium">
            {amount.total} {currency || "units"}
          </div>
          {amount.min !== undefined && amount.max !== undefined && (
            <div className="flex gap-2">
              <Badge variant="outline">
                min{" "}
                {amount.min}
              </Badge>
              <Badge variant="outline">
                {t("max")}{" "}
                {amount.max}
              </Badge>
            </div>
          )}
        </div>
      );
    }

    // Handle the old amount format
    if (!amount || !amount.total) return "Not specified";

    return (
      <div className="space-y-1">
        <div className="text-lg font-medium">
          {amount.total} {currency || "units"}
        </div>
        {amount.min && amount.max && (
          <div className="flex gap-2">
            <Badge variant="outline">
              min{" "}
              {amount.min}
            </Badge>
            <Badge variant="outline">
              {t("max")}{" "}
              {amount.max}
            </Badge>
          </div>
        )}
      </div>
    );
  };

  // Get the amount to display
  const getAmount = () => {
    if (tradeData.amountConfig) {
      return tradeData.amountConfig;
    }
    return tradeData.amount;
  };

  // Get the price to display
  const getPrice = () => {
    if (tradeData.priceConfig) {
      return tradeData.priceConfig;
    }
    return tradeData.price;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 rounded-lg border border-blue-100 dark:border-blue-900">
        <div className="flex items-start gap-4">
          <div className="bg-white dark:bg-blue-900/50 p-3 rounded-full">
            <BadgeCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">
              {t("review_your_offer")}
            </h3>
            <p className="text-muted-foreground">
              {t("please_review_your_your_offer")}.{" "}
              {t("make_sure_all_information_is_correct")}.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Trade Details Card */}
        <Card className="overflow-hidden border-t-4 border-t-blue-500 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{t("trade_details")}</h3>
              <Badge
                variant={
                  tradeData.tradeType?.toLowerCase() === "buy"
                    ? "success"
                    : "destructive"
                }
                className="uppercase px-3 py-1"
              >
                {tradeData.tradeType || "Not specified"}
              </Badge>
            </div>

            <Separator />

            <div className="space-y-6">
              {/* Trade Type */}
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                  <ArrowUpDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {t("trade_type")}
                  </h4>
                  <p
                    className={cn(
                      "text-lg font-medium capitalize",
                      getTradeTypeColor(tradeData.tradeType)
                    )}
                  >
                    {tradeData.tradeType || "Not specified"}
                  </p>
                </div>
              </div>

              {/* Wallet Type */}
              <div className="flex items-start gap-4">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-full">
                  <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {t("wallet_type")}
                  </h4>
                  <p className="text-lg font-medium">
                    {getWalletTypeName(tradeData.walletType) || "Not specified"}
                  </p>
                </div>
              </div>

              {/* Currency */}
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
                  <Bitcoin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {t("Currency")}
                  </h4>
                  <p className="text-lg font-medium">
                    {tradeData.currency ||
                      tradeData.cryptoSymbol ||
                      "Not specified"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amount & Pricing Card */}
        <Card className="overflow-hidden border-t-4 border-t-green-500 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-6 space-y-5">
            <h3 className="font-semibold text-lg">{t("amount_&_pricing")}</h3>

            <Separator />

            <div className="space-y-6">
              {/* Amount */}
              <div className="flex items-start gap-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {t("Amount")}
                  </h4>
                  {formatAmount(
                    getAmount(),
                    tradeData.cryptoSymbol || tradeData.currency
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="flex items-start gap-4">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full">
                  <Percent className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {t("Price")}
                  </h4>
                  {formatPrice(getPrice(), "BTC")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Payment Methods Card */}
        <Card className="overflow-hidden border-t-4 border-t-purple-500 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{t("payment_methods")}</h3>
              <Badge variant="outline" className="px-3 py-1">
                {Array.isArray(tradeData.paymentMethods)
                  ? tradeData.paymentMethods.length
                  : 0}{" "}
                {t("Selected")}
              </Badge>
            </div>

            <Separator />

            <div className="flex items-start gap-4">
              <div className="bg-teal-100 dark:bg-teal-900/30 p-3 rounded-full">
                <CreditCard className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {t("accepted_methods")}
                </h4>
                {Array.isArray(tradeData.paymentMethods) &&
                tradeData.paymentMethods.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tradeData.paymentMethods.map(
                      (method: any, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1"
                        >
                          {typeof method === "string"
                            ? method
                            : method.name || method.id || "Unknown method"}
                        </Badge>
                      )
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-3 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>
                      {t("no_payment_methods_specified")}.{" "}
                      {t("please_go_back_payment_method")}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trade Settings Card */}
        <Card className="overflow-hidden border-t-4 border-t-teal-500 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-6 space-y-5">
            <h3 className="font-semibold text-lg">{t("trade_settings")}</h3>

            <Separator />

            <div className="space-y-6">
              {/* Auto Cancel */}
              <div className="flex items-start gap-4">
                <div className="bg-rose-100 dark:bg-rose-900/30 p-3 rounded-full">
                  <Clock className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {t("auto_cancel")}
                  </h4>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-medium">
                      {tradeData.tradeSettings?.autoCancel || "30"}{" "}
                      {t("minutes")}
                    </p>
                    {!tradeData.tradeSettings?.autoCancel && (
                      <Badge variant="outline" className="text-xs">
                        {t("Default")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Visibility */}
              <div className="flex items-start gap-4">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full">
                  <Eye className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {t("Visibility")}
                  </h4>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-medium capitalize">
                      {tradeData.tradeSettings?.visibility || "PUBLIC"}
                    </p>
                    {!tradeData.tradeSettings?.visibility && (
                      <Badge variant="outline" className="text-xs">
                        {t("Default")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms of Trade */}
              {tradeData.tradeSettings?.termsOfTrade && (
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                    <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {t("terms_of_trade")}
                    </h4>
                    <p className="mt-1 text-sm border-l-2 border-blue-200 pl-3 py-1">
                      {tradeData.tradeSettings.termsOfTrade}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Location Settings Card */}
        <Card className="overflow-hidden border-t-4 border-t-emerald-500 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-6 space-y-5">
            <h3 className="font-semibold text-lg">{t("location_settings")}</h3>

            <Separator />

            {tradeData.locationSettings ? (
              <div className="space-y-6">
                {/* Trading Location */}
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-full">
                    <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {t("trading_location")}
                    </h4>
                    <p className="text-lg font-medium">
                      {tradeData.locationSettings.country ? (
                        <>
                          {tradeData.locationSettings.country}
                          {tradeData.locationSettings.region &&
                            `, ${tradeData.locationSettings.region}`}
                          {tradeData.locationSettings.city &&
                            `, ${tradeData.locationSettings.city}`}
                        </>
                      ) : (
                        "No location specified"
                      )}
                    </p>
                  </div>
                </div>

                {/* Geographical Restrictions */}
                {tradeData.locationSettings.restrictions &&
                  tradeData.locationSettings.restrictions.length > 0 && (
                    <div className="flex items-start gap-4">
                      <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                        <Globe className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {t("geographical_restrictions")}
                        </h4>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {tradeData.locationSettings.restrictions.map(
                            (restriction: string, index: number) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="px-3 py-1"
                              >
                                {restriction}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-md">
                <InfoIcon className="h-5 w-5 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {t("no_location_settings_specified")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Requirements Card */}
        <Card className="overflow-hidden border-t-4 border-t-yellow-500 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-6 space-y-5">
            <h3 className="font-semibold text-lg">{t("user_requirements")}</h3>

            <Separator />

            {tradeData.userRequirements ? (
              <div className="space-y-6">
                {/* Trading Experience */}
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {t("trading_experience")}
                    </h4>
                    <div className="mt-3 space-y-2">
                      {tradeData.userRequirements.minCompletedTrades > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="px-3 py-1">
                            {t("Min")}.
                            {tradeData.userRequirements.minCompletedTrades}{" "}
                            {t("completed_trades")}
                          </Badge>
                        </div>
                      )}
                      {tradeData.userRequirements.minSuccessRate > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="px-3 py-1">
                            {t("Min")}.
                            {tradeData.userRequirements.minSuccessRate}
                            {t("%_success_rate")}
                          </Badge>
                        </div>
                      )}
                      {!tradeData.userRequirements.minCompletedTrades &&
                        !tradeData.userRequirements.minSuccessRate && (
                          <p className="text-sm text-muted-foreground">
                            {t("no_minimum_experience_required")}
                          </p>
                        )}
                    </div>
                  </div>
                </div>

                {/* Trust & Security */}
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
                    <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {t("trust_&_security")}
                    </h4>
                    <div className="mt-3 space-y-2">
                      {tradeData.userRequirements.minAccountAge > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="px-3 py-1">
                            {t("Min")}. {t("account_age")}{" "}
                            {formatAccountAge(
                              tradeData.userRequirements.minAccountAge
                            )}
                          </Badge>
                        </div>
                      )}
                      {tradeData.userRequirements.trustedOnly && (
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="px-3 py-1">
                            {t("trusted_users_only")}
                          </Badge>
                        </div>
                      )}
                      {!tradeData.userRequirements.minAccountAge &&
                        !tradeData.userRequirements.trustedOnly && (
                          <p className="text-sm text-muted-foreground">
                            {t("no_additional_trust_requirements")}
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-md">
                <InfoIcon className="h-5 w-5 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {t("no_user_requirements_specified")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Final Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-5 rounded-lg border border-blue-100 dark:border-blue-900 mt-6">
        <div className="flex items-start gap-4">
          <div className="bg-white dark:bg-blue-900/50 p-2 rounded-full">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium mb-1">
              {t("ready_to_create_your_offer")}
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              {t("once_you_click_visibility_settings")}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
