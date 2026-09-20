"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { GatewayComponentProps } from "./types";
import { REDIRECT_GATEWAY_CONFIGS } from "./types";
import {
  initiateGatewayPayment,
  verifyGatewayPayment,
  formatDepositResult,
  openGatewayPopup,
  monitorPopup,
  extractUrl,
  extractPaymentId,
  isPaymentSuccessful,
} from "./gateway-utils";
import { getPaymentGatewayIcon } from "../deposit-helpers";

interface RedirectGatewayProps extends GatewayComponentProps {
  alias: string;
}

export function RedirectGateway({
  alias,
  amount,
  currency,
  method,
  onSuccess,
  onError,
  onCancel,
  onProcessing,
}: RedirectGatewayProps) {
  const t = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const config = REDIRECT_GATEWAY_CONFIGS[alias];

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

    if (!config) {
      onError(`Unknown gateway: ${alias}`);
      return;
    }

    setLoading(true);

    try {
      const data = await initiateGatewayPayment(alias, amount, currency);

      // Extract redirect URL using config field paths
      // Also check common fallback fields
      const allUrlFields = [
        ...config.urlFields,
        "redirectUrl", "redirect_url", "checkoutUrl", "checkout_url",
        "authorization_url", "payment_url", "formUrl", "url",
        "data.payment_url", "data.checkout_url", "data.authorization_url",
        "data.redirectUrl", "data.formUrl",
      ];
      const redirectUrl = extractUrl(data, allUrlFields);

      if (!redirectUrl) {
        onError(`Invalid ${config.displayName} response - no redirect URL received`);
        setLoading(false);
        return;
      }

      // Extract payment ID for verification
      const allIdFields = [
        ...config.paymentIdFields,
        "sessionId", "session_id", "orderId", "order_id",
        "transactionId", "transaction_id", "paymentId", "payment_id",
        "reference", "id",
        "data.transaction_id", "data.reference", "data.paymentId",
      ];
      const paymentId = extractPaymentId(data, allIdFields);

      // Extract extra verify fields if configured
      const extraParams: Record<string, string> = {};
      if (config.extraVerifyFields) {
        for (const field of config.extraVerifyFields) {
          if (!extraParams[field.verifyParam]) {
            const value = extractPaymentId(data, [field.responseField]);
            if (value) extraParams[field.verifyParam] = value;
          }
        }
      }

      setLoading(false);
      setProcessing(true);
      onProcessing(true);

      const popup = openGatewayPopup(redirectUrl, `${alias}Payment`);

      if (!popup) {
        setProcessing(false);
        onProcessing(false);
        window.location.href = redirectUrl;
        return;
      }

      const cleanup = monitorPopup(popup, async () => {
        if (!paymentId) {
          setProcessing(false);
          onProcessing(false);
          onError("Missing payment reference for verification");
          return;
        }

        try {
          const verifyData = await verifyGatewayPayment(
            alias,
            { [config.verifyParamName]: paymentId, ...extraParams },
            config.verifyMethod || "POST"
          );
          setProcessing(false);
          onProcessing(false);

          // Single shared predicate. The previous inline OR-chain treated a bare
          // `success: true` as completed, which scored `{success:true,
          // data:{status:"FAILED"}}` — the exact shape a verify handler returns
          // when it successfully determined the payment FAILED — as a success.
          if (isPaymentSuccessful(verifyData)) {
            const result = formatDepositResult(verifyData, config.displayName, amount, currency);
            onSuccess(result);
            toast.success(t("payment_completed", { displayName: String(config.displayName) }));
          } else {
            // Surface the provider's own reason when it gave one; "not completed"
            // on its own leaves the customer with nothing to act on.
            onError(
              verifyData?.message ||
                (verifyData?.status
                  ? `Payment status: ${verifyData.status}`
                  : "Payment was not completed successfully")
            );
          }
        } catch (err: any) {
          setProcessing(false);
          onProcessing(false);
          onError(err.message || `${config.displayName} payment verification failed`);
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
      onError(err.message || `Failed to initiate ${config?.displayName || alias} payment`);
    }
  }, [alias, amount, currency, config, onSuccess, onError, onCancel, onProcessing]);

  const icon = getPaymentGatewayIcon(alias);
  // ONE message with the brand as an argument, so a gateway added tomorrow is
  // translated the day it ships. The previous shape built the key at runtime -
  // `pay_with_${alias}` - which the static extractor cannot see, so those keys
  // never reached the built chunk and every redirect gateway fell through to a
  // concatenation. And a concatenation cannot be translated: it assumes the
  // brand goes last, while German wants "Mit Stripe bezahlen" and Japanese
  // "Stripeで支払う".
  const buttonText = t("pay_with_provider", { provider: config?.displayName || alias });

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
          <span className="mr-2">{icon}</span>
          {buttonText}
          <ChevronRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  );
}
