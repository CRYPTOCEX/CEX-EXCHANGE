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
import { isWaitingPayment, isPaymentSent, isCompleted, isDisputed, isExpired, isCancelled, canDispute } from "@/utils/p2p-status";
import { DisputeDialog } from "./dispute-dialog";

interface TradeActionsProps {
  status: string;
  type: "buy" | "sell";
  loading: boolean;
  onConfirmPayment: () => Promise<void>;
  onReleaseFunds: () => Promise<void>;
  onCancelTrade: () => Promise<void>;
  onDisputeTrade: (reason: string, description: string) => Promise<void>;
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
  const t = useTranslations("ext_p2p");
  const tExt = useTranslations("ext");
  const router = useRouter();

  // Buyer waiting to confirm payment sent (PENDING status)
  if (isWaitingPayment(status) && type === "buy") {
    return (
      <>
        <Button
          variant="outline"
          onClick={onCancelTrade}
          disabled={loading}
          className="flex-1 sm:flex-none"
        >
          {tExt("cancel_trade")}
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

  // Seller waiting for buyer to confirm payment (PENDING status)
  if (isWaitingPayment(status) && type === "sell") {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {t("waiting_for_buyer_to_confirm_payment")}
          </p>
        </div>
      </div>
    );
  }

  // Seller can release funds after buyer confirms payment (PAYMENT_SENT status)
  if (isPaymentSent(status) && type === "sell") {
    return (
      <>
        <DisputeDialog onSubmit={onDisputeTrade} loading={loading} userRole="seller">
          <Button
            variant="outline"
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            {tExt("dispute")}
          </Button>
        </DisputeDialog>
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

  // Buyer waiting for seller to release funds (PAYMENT_SENT status)
  // Buyer can also file a dispute at this point
  if (isPaymentSent(status) && type === "buy") {
    return (
      <>
        <DisputeDialog onSubmit={onDisputeTrade} loading={loading} userRole="buyer">
          <Button
            variant="outline"
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            {tExt("dispute")}
          </Button>
        </DisputeDialog>
        <div className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
          <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            {t("waiting_for_seller_to_release_funds")}
          </p>
        </div>
      </>
    );
  }

  // Trade completed - allow feedback
  if (isCompleted(status)) {
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

  // Trade disputed - show admin message
  if (isDisputed(status)) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-600 dark:text-red-400">
            {t("dispute_in_progress_admin_will_contact_you")}
          </p>
        </div>
      </div>
    );
  }

  // Trade expired - show expired message
  if (isExpired(status)) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-900/20 p-3 rounded-md border border-gray-200 dark:border-gray-800">
          <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("this_trade_has_expired_no_further")}
          </p>
        </div>
      </div>
    );
  }

  // Trade cancelled - show cancelled message
  if (isCancelled(status)) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-900/20 p-3 rounded-md border border-gray-200 dark:border-gray-800">
          <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("this_trade_has_been_cancelled_no")}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
