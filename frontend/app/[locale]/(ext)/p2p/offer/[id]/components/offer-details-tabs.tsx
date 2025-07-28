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
interface OfferDetailsTabsProps {
  offer: any;
  timeLimit: number;
}
export function OfferDetailsTabs({ offer, timeLimit }: OfferDetailsTabsProps) {
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
              <h3 className="text-xl font-semibold">Offer Details</h3>
              <Badge variant="outline" className="text-xs">
                {priceConfig.model || "Fixed Price"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Price Information
                  </h4>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">
                        Price per {offer.currency}
                      </span>
                      <span className="font-medium">
                        {priceConfig.finalPrice.toLocaleString()} USD
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Price Type</span>
                      <span className="font-medium">
                        {priceConfig.model || "Fixed"}
                      </span>
                    </div>
                    {priceConfig.marketPrice && (
                      <div className="flex justify-between">
                        <span className="text-sm">Market Price</span>
                        <span className="font-medium">
                          {priceConfig.marketPrice.toLocaleString()} USD
                        </span>
                      </div>
                    )}
                    {priceConfig.marketPrice && priceConfig.finalPrice && (
                      <div className="flex justify-between mt-2">
                        <span className="text-sm">Market Difference</span>
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
                    Trade Settings
                  </h4>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Time Limit</span>
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
                      <span className="text-sm">Wallet Type</span>
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
                    Location Restrictions
                  </h4>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex items-start">
                      <Globe className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Restricted Countries</p>
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
              <h3 className="text-xl font-semibold">Terms & Conditions</h3>
              <Badge variant="outline" className="text-xs">
                Required
              </Badge>
            </div>

            <div className="bg-muted/30 p-5 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center">
                <Info className="h-4 w-4 mr-1.5 text-primary" />
                Trade Terms
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
                  Additional Notes
                </h4>
                <div className="text-sm whitespace-pre-line">
                  {tradeSettings.additionalNotes}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="font-medium">Security Features</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                  <Shield className="h-5 w-5 mr-3 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-400">
                      Escrow Protection
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                      Funds are held in secure escrow until the trade is
                      completed successfully. This protects both buyer and
                      seller.
                    </p>
                  </div>
                </div>

                <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                  <Timer className="h-5 w-5 mr-3 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-400">
                      Time Protection
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-500 mt-1">
                      {timeLimit} minute window to complete payment safely. The
                      timer starts once you initiate the trade.
                    </p>
                  </div>
                </div>

                <div className="flex items-start p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                  <Lock className="h-5 w-5 mr-3 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-800 dark:text-purple-400">
                      Secure Chat
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-500 mt-1">
                      End-to-end encrypted chat for secure communication between
                      buyer and seller during the trade.
                    </p>
                  </div>
                </div>

                <div className="flex items-start p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                  <Zap className="h-5 w-5 mr-3 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-400">
                      Dispute Resolution
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                      Our dedicated support team is available to resolve any
                      disputes that may arise during the trade.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payment" className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Payment Methods</h3>
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
                            Processing time: {method.processingTime || "5-15"}{" "}
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
              <AlertTitle>Important Payment Information</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-500">
                Always use the payment methods listed above. Never accept
                requests to use alternative payment methods or to send payments
                outside the platform. This ensures your transaction remains
                protected.
              </AlertDescription>
            </Alert>

            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Payment Instructions</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  Select your preferred payment method when initiating the trade
                </li>
                <li>
                  You'll receive detailed payment instructions on the trade page
                </li>
                <li>
                  Complete the payment within the {timeLimit}-minute time limit
                </li>
                <li>
                  Include the trade reference number in your payment description
                </li>
                <li>Mark payment as completed once you've sent the funds</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="requirements" className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">User Requirements</h3>
              <Badge variant="outline" className="text-xs">
                Eligibility Criteria
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-muted/30 p-5 rounded-lg">
                <h4 className="font-medium mb-4 flex items-center">
                  <User className="h-4 w-4 mr-1.5 text-primary" />
                  Trade History Requirements
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-muted">
                    <span className="text-sm">Minimum Completed Trades</span>
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
                    <span className="text-sm">Minimum Success Rate</span>
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
                    <span className="text-sm">Trusted Users Only</span>
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
                  Account Requirements
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-muted">
                    <span className="text-sm">Minimum Account Age</span>
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
                <h4 className="font-medium mb-2">Why These Requirements?</h4>
                <p className="text-sm text-muted-foreground">
                  These requirements help ensure safe and reliable trading.
                  Traders set these criteria based on their risk tolerance and
                  trading preferences. If you don't meet these requirements yet,
                  you can build your trading history with other offers that have
                  lower requirements.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
