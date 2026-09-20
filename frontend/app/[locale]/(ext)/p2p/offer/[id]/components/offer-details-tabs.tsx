import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Clock,
  Info,
  Lock,
  Shield,
  Timer,
  Zap,
  User,
  Calendar,
  CheckCircle,
  Globe,
} from "lucide-react";
import { PaymentMethodIcon } from "./payment-method-icon";
import { useTranslations } from "next-intl";
interface OfferDetailsTabsProps {
  offer: any;
  timeLimit: number;
}
export function OfferDetailsTabs({ offer, timeLimit }: OfferDetailsTabsProps) {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  // Parse JSON strings if they haven't been parsed already
  const amountConfig =
    typeof offer.amountConfig === "string"
      ? JSON.parse(offer.amountConfig)
      : offer.amountConfig;
  const priceConfig =
    typeof offer.priceConfig === "string"
      ? JSON.parse(offer.priceConfig)
      : offer.priceConfig;
  const tradeSettings =
    typeof offer.tradeSettings === "string"
      ? JSON.parse(offer.tradeSettings)
      : offer.tradeSettings;
  const locationSettings =
    typeof offer.locationSettings === "string"
      ? JSON.parse(offer.locationSettings)
      : offer.locationSettings;
  const userRequirements =
    typeof offer.userRequirements === "string"
      ? JSON.parse(offer.userRequirements)
      : offer.userRequirements;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4 p-1 rounded-t-lg bg-muted/50">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{tCommon("offer_details")}</h3>
              <Badge variant="outline" className="text-xs">
                {priceConfig.model || "Fixed Price"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {t("price_information")}
                  </h4>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">
                        {tCommon("price_per")} {offer.currency}
                      </span>
                      <span className="font-medium">
                        {priceConfig.finalPrice.toLocaleString()} {offer.priceCurrency || priceConfig.currency || "USD"}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">{t("price_type")}</span>
                      <span className="font-medium">
                        {priceConfig.model || "Fixed"}
                      </span>
                    </div>
                    {priceConfig.marketPrice && (
                      <div className="flex justify-between">
                        <span className="text-sm">{tCommon("market_price")}</span>
                        <span className="font-medium">
                          {priceConfig.marketPrice.toLocaleString()} USD
                        </span>
                      </div>
                    )}
                    {priceConfig.marketPrice && priceConfig.finalPrice && (
                      <div className="flex justify-between mt-2">
                        <span className="text-sm">{t("market_difference")}</span>
                        <span
                          className={`font-medium ${((priceConfig.finalPrice - priceConfig.marketPrice) / priceConfig.marketPrice) * 100 <= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {(
                            ((priceConfig.finalPrice -
                              priceConfig.marketPrice) /
                              priceConfig.marketPrice) *
                            100
                          ).toFixed(2)}
                          %
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {tCommon("trade_settings")}
                  </h4>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">{t("time_limit")}</span>
                      <span className="font-medium">{timeLimit} minutes</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Location</span>
                      <span className="font-medium">
                        {locationSettings.city && locationSettings.country
                          ? `${locationSettings.city}, ${locationSettings.country}`
                          : "Global"}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">{tCommon("wallet_type")}</span>
                      <span className="font-medium">{offer.walletType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Created</span>
                      <span className="font-medium">
                        {new Date(
                          offer.createdAt || Date.now()
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {locationSettings.restrictions &&
              locationSettings.restrictions.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {t("location_restrictions")}
                  </h4>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex items-start">
                      <Globe className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{tExt("restricted_countries")}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {locationSettings.restrictions.map(
                            (country, index) => (
                              <Badge key={index} variant="secondary">
                                {country}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </TabsContent>

          <TabsContent value="terms" className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{tExt("terms_conditions")}</h3>
              <Badge variant="outline" className="text-xs">
                Required
              </Badge>
            </div>

            <div className="bg-muted/30 p-5 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center">
                <Info className="h-4 w-4 mr-1.5 text-primary" />
                {tCommon("trade_terms")}
              </h4>
              <div className="text-sm whitespace-pre-line">
                {tradeSettings.termsOfTrade ||
                  `1. Please make sure to complete the payment within the time limit.\n
2. Include the trade reference in your payment description.\n
3. Do not mention cryptocurrency or crypto-related terms in the payment notes.\n
4. Contact me if you have any questions before initiating the trade.`}
              </div>
            </div>

            {tradeSettings.additionalNotes && (
              <div className="bg-muted/30 p-5 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center">
                  <Info className="h-4 w-4 mr-1.5 text-primary" />
                  {t("additional_notes")}
                </h4>
                <div className="text-sm whitespace-pre-line">
                  {tradeSettings.additionalNotes}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="font-medium">{t("security_features")}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                  <Shield className="h-5 w-5 mr-3 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-400">
                      {t("escrow_protection")}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                      {t("funds_are_held_in_secure_escrow")} {t("this_protects_both_buyer_and_seller")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                  <Timer className="h-5 w-5 mr-3 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-400">
                      {t("time_protection")}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-500 mt-1">
                      {timeLimit} {t("minute_window_to_complete_payment_safely")} {t("the_timer_starts_once_you_initiate_the_trade")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
                  <Lock className="h-5 w-5 mr-3 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-600 dark:text-blue-400">
                      {t("secure_chat")}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      {t("end_to_end_encrypted_chat_for")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                  <Zap className="h-5 w-5 mr-3 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-400">
                      {t("dispute_resolution")}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                      {t("our_dedicated_support_team_is_available")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payment" className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{tExt("payment_methods")}</h3>
              <Badge variant="outline" className="text-xs">
                {offer.paymentMethods?.length || 0} Available
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offer.paymentMethods &&
                offer.paymentMethods.map((method: any) => {
                  return (
                    <div
                      key={method.id}
                      className="flex items-center p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <PaymentMethodIcon methodId={method.icon} />
                      <div className="ml-3 flex-1">
                        <p className="font-medium">{method.name}</p>
                        {method.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {method.description}
                          </p>
                        )}
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>
                            {tCommon("processing_time")} {method.processingTime || "5-15"}{" "}
                            minutes
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle>{t("important_payment_information")}</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-500">
                {t("always_use_the_payment_methods_listed_above")} {t("never_accept_requests_to_use_alternative")} {t("this_ensures_your_transaction_remains_protected")}
              </AlertDescription>
            </Alert>

            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-medium mb-3">{tCommon("payment_instructions")}</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  {t("select_your_preferred_payment_method_when")}
                </li>
                <li>
                  {t("youll_receive_detailed_payment_instructions_on")}
                </li>
                <li>
                  {t("complete_the_payment_within_the")} {timeLimit}{t("minute_time_limit")}
                </li>
                <li>
                  {t("include_the_trade_reference_number_in")}
                </li>
                <li>{t("mark_payment_as_completed_once_youve")}</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="requirements" className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{t("user_requirements")}</h3>
              <Badge variant="outline" className="text-xs">
                {t("eligibility_criteria")}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-muted/30 p-5 rounded-lg">
                <h4 className="font-medium mb-4 flex items-center">
                  <User className="h-4 w-4 mr-1.5 text-primary" />
                  {t("trade_history_requirements")}
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-muted">
                    <span className="text-sm">{t("minimum_completed_trades")}</span>
                    <Badge
                      variant={
                        userRequirements.minCompletedTrades > 0
                          ? "default"
                          : "outline"
                      }
                    >
                      {userRequirements.minCompletedTrades || "None"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-muted">
                    <span className="text-sm">{`${t("minimum_success_rate")} (%)`}</span>
                    <Badge
                      variant={
                        userRequirements.minSuccessRate > 0
                          ? "default"
                          : "outline"
                      }
                    >
                      {userRequirements.minSuccessRate > 0
                        ? `${userRequirements.minSuccessRate}%`
                        : "None"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("trusted_users_only")}</span>
                    <Badge
                      variant={
                        userRequirements.trustedOnly ? "default" : "outline"
                      }
                    >
                      {userRequirements.trustedOnly ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 p-5 rounded-lg">
                <h4 className="font-medium mb-4 flex items-center">
                  <Calendar className="h-4 w-4 mr-1.5 text-primary" />
                  {t("account_requirements")}
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-muted">
                    <span className="text-sm">{tCommon('minimum_account_age_days')}</span>
                    <Badge
                      variant={
                        userRequirements.minAccountAge > 0
                          ? "default"
                          : "outline"
                      }
                    >
                      {userRequirements.minAccountAge > 0
                        ? `${userRequirements.minAccountAge} days`
                        : "None"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {(userRequirements.minCompletedTrades > 0 ||
              userRequirements.minSuccessRate > 0 ||
              userRequirements.minAccountAge > 0) && (
              <div className="bg-muted/20 p-4 rounded-lg border border-muted">
                <h4 className="font-medium mb-2">{t("why_these_requirements")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("these_requirements_help_ensure_safe_and")} {t("traders_set_these_criteria_based_on")} {t("if_you_dont_meet_these_requirements")}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
