"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { GatewayComponentProps } from "./types";
import {
  initiateGatewayPayment,
  readGatewayPaymentStatus,
  formatDepositResult,
  submitFormInPopup,
  monitorPopup,
  openGatewayPopup,
} from "./gateway-utils";

export function PayFastGateway({
  amount,
  currency,
  method,
  onSuccess,
  onError,
  onCancel,
  onProcessing,
}: GatewayComponentProps) {
  const t = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  const handlePayment = useCallback(async () => {
    if (!amount || !currency) {
      onError("Missing required deposit information");
      return;
    }

    setLoading(true);

    try {
      const responseData = await initiateGatewayPayment("payfast", amount, currency);
      const data = responseData?.data || responseData;

      const paymentUrl = data?.paymentUrl || data?.redirectUrl;
      const paymentData = data?.paymentData;
      // m_payment_id in verify = transaction.id (backend does findOne({ where: { id: body.m_payment_id } }))
      const transactionId = data?.transactionId;
      const reference = data?.reference;

      if (!paymentUrl) {
        onError("Invalid PayFast response - no payment URL received");
        setLoading(false);
        return;
      }

      setLoading(false);
      setProcessing(true);
      onProcessing(true);

      // Use form POST if we have form data, otherwise redirect
      let popup: Window | null;
      if (paymentData && typeof paymentData === "object") {
        popup = submitFormInPopup(paymentUrl, paymentData, "payfastPayment");
      } else {
        popup = openGatewayPopup(paymentUrl, "payfastPayment");
      }

      if (!popup) {
        setProcessing(false);
        onProcessing(false);
        window.location.href = paymentUrl;
        return;
      }

      const cleanup = monitorPopup(popup, async () => {
        try {
          /*
           * The popup closing means the user is done looking at PayFast. It
           * does NOT mean they paid, and this component must not claim they
           * did — it used to POST `payment_status: "COMPLETE"` to the verify
           * route, which believed it and credited the wallet for a popup the
           * user had simply dismissed.
           *
           * PayFast settles by ITN, server to server. So we READ.
           */
          const statusData = await readGatewayPaymentStatus("payfast", {
            transactionId: transactionId || "",
          });
          setProcessing(false);
          onProcessing(false);

          const status = String(
            statusData?.data?.status ?? statusData?.status ?? ""
          ).toUpperCase();

          if (status === "COMPLETED") {
            const result = formatDepositResult(statusData, "PayFast", amount, currency);
            onSuccess(result);
            toast.success(t("payfast_payment_completed"));
          } else if (status === "PENDING" || status === "PROCESSING") {
            // The ITN can legitimately arrive after the popup closes. This is
            // not a failure, and calling it one trains users to retry a
            // payment they have already made.
            toast.info(t("payfast_awaiting_confirmation"));
          } else {
            onError("Payment was not completed successfully");
          }
        } catch (err: any) {
          setProcessing(false);
          onProcessing(false);
          onError(err.message || "PayFast payment verification failed");
        }
      });

      cleanupRef.current = () => {
        cleanup();
        setProcessing(false);
        onProcessing(false);
      };
    } catch (err: any) {
      setLoading(false);
      setProcessing(false);
      onProcessing(false);
      onError(err.message || "Failed to initiate PayFast payment");
    }
  }, [amount, currency, onSuccess, onError, onCancel, onProcessing]);

  return (
    <Button
      onClick={handlePayment}
      disabled={loading || processing}
      className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary text-primary-foreground"
      size="lg"
    >
      {loading || processing ? (
        <>
          <Loader size="sm" className="mr-2" />
          {processing ? `${t("processing_payment")}…` : `${t("processing_payment")}…`}
        </>
      ) : (
        <>
          <span className="mr-2">🟢</span>
          {t("pay_with_provider", { provider: "PayFast" })}
          <ChevronRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  );
}
