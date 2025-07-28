"use client";

import { AlertCircle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "next-intl";

interface TradeAlertsProps {
  status: string;
  type: "buy" | "sell";
}

export function TradeAlerts({ status, type }: TradeAlertsProps) {
  const t = useTranslations("ext");
  if (status === "waiting_payment" && type === "buy") {
    return (
      <Alert className="mt-4 border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-yellow-300">
        <Clock className="h-4 w-4" />
        <AlertTitle>{t("payment_required")}</AlertTitle>
        <AlertDescription>
          {t("please_send_payment_when_done")}.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "payment_confirmed" && type === "sell") {
    return (
      <Alert className="mt-4 border-blue-200 bg-blue-50 text-blue-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-blue-300">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("payment_received")}</AlertTitle>
        <AlertDescription>
          {t("the_buyer_has_confirmed_payment")}.{" "}
          {t("please_verify_youve_releasing_escrow")}.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "disputed") {
    return (
      <Alert
        className="mt-4 border-red-200 bg-red-50 text-red-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-red-300"
        variant="destructive"
      >
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{t("trade_disputed")}</AlertTitle>
        <AlertDescription>
          {t("this_trade_is_currently_under_dispute")}.{" "}
          {t("an_admin_will_both_parties")}.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "completed") {
    return (
      <Alert className="mt-4 border-green-200 bg-green-50 text-green-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-green-300">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>{t("trade_completed")}</AlertTitle>
        <AlertDescription>
          {t("this_trade_has_been_successfully_completed")}.{" "}
          {t("thank_you_for_using_our_platform")}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
