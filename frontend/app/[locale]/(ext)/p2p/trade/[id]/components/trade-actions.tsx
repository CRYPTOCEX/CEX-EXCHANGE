"use client";

import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Clock,
  ThumbsUp,
  Upload,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface TradeActionsProps {
  status: string;
  type: "buy" | "sell";
  loading: boolean;
  onConfirmPayment: () => Promise<void>;
  onReleaseFunds: () => Promise<void>;
  onCancelTrade: () => Promise<void>;
  onDisputeTrade: () => Promise<void>;
}

export function TradeActions({
  status,
  type,
  loading,
  onConfirmPayment,
  onReleaseFunds,
  onCancelTrade,
  onDisputeTrade,
}: TradeActionsProps) {
  const t = useTranslations("ext");
  const router = useRouter();

  if (status === "waiting_payment" && type === "buy") {
    return (
      <>
        <Button
          variant="outline"
          onClick={onCancelTrade}
          disabled={loading}
          className="flex-1 sm:flex-none"
        >
          {t("cancel_trade")}
        </Button>
        <Button
          onClick={onConfirmPayment}
          disabled={loading}
          className="flex-1 sm:flex-none"
        >
          <Upload className="mr-2 h-4 w-4" />
          {t("confirm_payment_sent")}
        </Button>
      </>
    );
  }

  if (status === "payment_confirmed" && type === "sell") {
    return (
      <>
        <Button
          variant="outline"
          onClick={onDisputeTrade}
          disabled={loading}
          className="flex-1 sm:flex-none"
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          {t("Dispute")}
        </Button>
        <Button
          onClick={onReleaseFunds}
          disabled={loading}
          className="flex-1 sm:flex-none"
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          {t("release_funds")}
        </Button>
      </>
    );
  }

  if (status === "payment_confirmed" && type === "buy") {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
          <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            {t("waiting_for_seller_to_release_funds")}
          </p>
        </div>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => router.push("/p2p/trade")}
      >
        <ThumbsUp className="mr-2 h-4 w-4" />
        {t("leave_feedback")}
      </Button>
    );
  }

  if (status === "disputed") {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-600 dark:text-red-400">
            {t("dispute_in_progress")}. {t("admin_will_contact_you")}.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
