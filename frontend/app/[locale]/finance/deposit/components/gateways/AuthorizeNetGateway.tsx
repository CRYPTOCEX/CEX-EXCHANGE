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

export function AuthorizeNetGateway({
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
      const responseData = await initiateGatewayPayment("authorizenet", amount, currency);
      const data = responseData?.data || responseData;

      const formUrl = data?.formUrl;
      const referenceId = data?.referenceId;

      if (!formUrl) {
        onError("Invalid Authorize.Net response - no form URL received");
        setLoading(false);
        return;
      }

      setLoading(false);
      setProcessing(true);
      onProcessing(true);

      const popup = openGatewayPopup(formUrl, "authorizeNetPayment");

      if (!popup) {
        setProcessing(false);
        onProcessing(false);
        window.location.href = formUrl;
        return;
      }

      const cleanup = monitorPopup(popup, async () => {
        try {
          const verifyData = await verifyGatewayPayment(
            "authorizenet",
            { referenceId: referenceId || "" },
          );
          setProcessing(false);
          onProcessing(false);

          if (verifyData?.status === "completed" || verifyData?.confirmed || verifyData?.data?.status === "COMPLETED") {
            const result = formatDepositResult(verifyData, "Authorize.Net", amount, currency);
            onSuccess(result);
            toast.success(t("authorize_net_payment_completed"));
          } else {
            onError("Payment was not completed successfully");
          }
        } catch (err: any) {
          setProcessing(false);
          onProcessing(false);
          onError(err.message || "Authorize.Net payment verification failed");
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
      onError(err.message || "Failed to initiate Authorize.Net payment");
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
          <span className="mr-2">🔴</span>
          {t("pay_with_provider", { provider: "Authorize.Net" })}
          <ChevronRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  );
}
