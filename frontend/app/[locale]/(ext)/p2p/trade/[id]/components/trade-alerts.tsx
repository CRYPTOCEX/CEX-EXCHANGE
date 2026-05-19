"use client";

import { AlertCircle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "next-intl";

interface TradeAlertsProps {
  status: string;
  type: "buy" | "sell";
}

export function TradeAlerts({ status, type }: TradeAlertsProps) {
  const t = useTranslations("ext_p2p");
  if (status === "waiting_payment" && type === "buy") {
    return (
      <Alert className="mt-4 border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-200">
        <Clock className="h-4 w-4" />
        <AlertTitle>{t("payment_required")}</AlertTitle>
        <AlertDescription className="dark:text-yellow-300">
          {t("please_send_payment_when_done")}.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "payment_confirmed" && type === "sell") {
    return (
      <Alert className="mt-4 border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("payment_received")}</AlertTitle>
        <AlertDescription className="dark:text-blue-300">
          {t("the_buyer_has_confirmed_payment")}.{" "}
          {t("please_verify_youve_releasing_escrow")}.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "disputed") {
    return (
      <Alert
        className="mt-4 border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
        variant="destructive"
      >
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{t("trade_disputed")}</AlertTitle>
        <AlertDescription className="dark:text-red-300">
          {t("this_trade_is_currently_under_dispute")}.{" "}
          {t("an_admin_will_both_parties")}.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "completed") {
    return (
      <Alert className="mt-4 border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-200">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>{t("trade_completed")}</AlertTitle>
        <AlertDescription className="dark:text-green-300">
          {t("this_trade_has_been_successfully_completed")}.{" "}
          {t("thank_you_for_using_our_platform")}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
