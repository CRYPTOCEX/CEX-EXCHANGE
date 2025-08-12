"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Shield,
  AlertCircle,
  ArrowRight,
  LockIcon,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface TradeEscrowProps {
  trade: any;
  onReleaseFunds: () => Promise<void>;
  onDisputeTrade: () => Promise<void>;
}

export function TradeEscrow({
  trade,
  onReleaseFunds,
  onDisputeTrade,
}: TradeEscrowProps) {
  const t = useTranslations("ext");
  const isEscrowActive = [
    "funded",
    "waiting_payment",
    "payment_confirmed",
  ].includes(trade.status);
  const canRelease =
    trade.status === "payment_confirmed" && trade.type === "sell";

  // Calculate escrow time
  const getEscrowTime = () => {
    const createdTime = new Date(trade.escrowTime || trade.createdAt).getTime();
    const currentTime = new Date().getTime();
    const elapsedTime = currentTime - createdTime;
    const hours = Math.floor(elapsedTime / (60 * 60 * 1000));
    const minutes = Math.floor((elapsedTime % (60 * 60 * 1000)) / (60 * 1000));

    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>{t("escrow_protection")}</CardTitle>
        </div>
        <CardDescription>
          {t("our_escrow_system_during_trades")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isEscrowActive ? (
          <>
            <div className="bg-primary/10 p-4 rounded-md flex items-start gap-3">
              <LockIcon className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium">{t("escrow_active")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {trade.amount} {trade.coin}
                  {t("is_securely_held_is_completed")}.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("escrow_status")}</span>
                <span>
                  {t("active_for")}
                  {getEscrowTime()}
                </span>
              </div>
              <Progress value={75} className="h-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-primary/10">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2 flex items-center">
                    <ShieldCheck className="h-4 w-4 mr-2 text-primary" />
                    {t("escrow_details")}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("amount_in_escrow")}
                      </span>
                      <span className="font-medium">
                        {trade.amount} {trade.coin}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("usd_value")}
                      </span>
                      <span className="font-medium">
                        / $
                        {trade.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("escrow_fee")}
                      </span>
                      <span className="font-medium">
                        / $
                        {(trade.total * 0.001).toFixed(2)}
                        (0. 1%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("locked_since")}
                      </span>
                      <span className="font-medium">
                        {new Date(
                          trade.escrowTime || trade.createdAt
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("auto-release")}
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                      >
                        {t("in_23h_45m")}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/10">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2 flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-primary" />
                    {t("escrow_release_conditions")}
                  </h3>
                  <ul className="space-y-2 text-sm list-disc pl-5">
                    <li>{t("buyer_confirms_payment_has_been_sent")}</li>
                    <li>{t("seller_verifies_payment_receipt")}</li>
                    <li>{t("seller_releases_funds_from_escrow")}</li>
                    <li>{t("automatic_release_after_no_dispute)")}</li>
                    <li>{t("admin_intervention_in_case_of_disputes")}</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {trade.status === "payment_confirmed" && (
              <Alert
                className={
                  trade.type === "sell"
                    ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
                    : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                }
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("payment_confirmed")}</AlertTitle>
                <AlertDescription>
                  {trade.type === "sell"
                    ? "The buyer has confirmed payment. Please verify you've received the funds before releasing escrow."
                    : "You've confirmed payment. Waiting for the seller to release the funds from escrow."}
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">
              {t("Escrow")}
              {trade.status === "completed" ? "Released" : "Not Active"}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {trade.status === "completed"
                ? "The escrow has been released and the funds have been transferred to the buyer."
                : trade.status === "disputed"
                  ? "This trade is under dispute. The escrow will be held until the dispute is resolved."
                  : "The escrow for this trade is not currently active. It will be activated once the trade is funded."}
            </p>

            {trade.status === "completed" && (
              <div className="mt-6 flex justify-center">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 flex items-center gap-1 px-3 py-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("funds_released_successfully")}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {isEscrowActive && (
          <>
            <Button
              variant="outline"
              onClick={onDisputeTrade}
              disabled={trade.status === "disputed"}
              className="flex-1 sm:flex-none"
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              {t("open_dispute")}
            </Button>
            {canRelease && (
              <Button onClick={onReleaseFunds} className="flex-1 sm:flex-none">
                <ArrowRight className="mr-2 h-4 w-4" />
                {t("release_funds")}
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}
