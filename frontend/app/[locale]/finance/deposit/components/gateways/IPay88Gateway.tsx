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
  verifyGatewayPayment,
  formatDepositResult,
  openGatewayPopup,
  monitorPopup,
} from "./gateway-utils";

export function IPay88Gateway({
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
      const responseData = await initiateGatewayPayment("ipay88", amount, currency);
      const data = responseData?.data || responseData;

      const paymentUrl = data?.payment_url;
      const reference = data?.reference;
      const paymentId = data?.payment_id;
      const transactionId = data?.transaction_id;

      if (!paymentUrl) {
        onError("Invalid iPay88 response - no payment URL received");
        setLoading(false);
        return;
      }

      setLoading(false);
      setProcessing(true);
      onProcessing(true);

      const popup = openGatewayPopup(paymentUrl, "ipay88Payment");

      if (!popup) {
        setProcessing(false);
        onProcessing(false);
        window.location.href = paymentUrl;
        return;
      }

      const cleanup = monitorPopup(popup, async () => {
        try {
          // Status check mode: send only RefNo, backend checks transaction status
          // (iPay88's ResponseURL callback will have already updated the transaction)
          const verifyData = await verifyGatewayPayment("ipay88", {
            RefNo: reference || "",
          });
          setProcessing(false);
          onProcessing(false);

          if (
            verifyData?.status === "COMPLETED" ||
            verifyData?.status === "completed" ||
            verifyData?.confirmed ||
            verifyData?.data?.status === "COMPLETED"
          ) {
            const result = formatDepositResult(verifyData, "iPay88", amount, currency);
            onSuccess(result);
            toast.success(t("ipay88_payment_completed"));
          } else {
            onError("Payment was not completed successfully");
          }
        } catch (err: any) {
          setProcessing(false);
          onProcessing(false);
          onError(err.message || "iPay88 payment verification failed");
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
      onError(err.message || "Failed to initiate iPay88 payment");
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
          {t("processing_payment")}…
        </>
      ) : (
        <>
          <span className="mr-2">🟣</span>
          {t("pay_with_provider", { provider: "iPay88" })}
          <ChevronRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  );
}
