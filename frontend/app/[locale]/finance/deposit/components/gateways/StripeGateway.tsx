"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import type { GatewayComponentProps } from "./types";
import {
  verifyGatewayPayment,
  formatDepositResult,
} from "./gateway-utils";

/**
 * StripeGateway — replicates the proven working logic from the old deposit store.
 * Opens Stripe Checkout in a popup after fetching the session URL.
 */
export function StripeGateway({
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

  const handlePayment = useCallback(async () => {
    if (!amount || !currency) {
      onError("Missing required deposit information");
      return;
    }

    setLoading(true);

    try {
      // 1) Fetch Stripe checkout session — exact same call as old store
      const { data, error } = await $fetch({
        url: "/api/finance/deposit/fiat/stripe",
        method: "POST",
        silent: true,
        body: { amount, currency },
      });

      setLoading(false);

      if (error) {
        onError(error || "Failed to process Stripe payment");
        return;
      }

      if (!data || !data.url) {
        onError("Invalid Stripe response - no checkout URL received");
        return;
      }

      // 2) Open Stripe Checkout in a popup — exact same as old store
      const stripePopup = window.open(
        data.url,
        "stripePopup",
        "width=500,height=700,scrollbars=yes,resizable=yes"
      );

      if (!stripePopup) {
        // Fallback to redirect if popup is blocked
        window.location.href = data.url;
        return;
      }

      setProcessing(true);
      onProcessing(true);

      // 3) Track payment state
      let verificationInProgress = false;
      let paymentCanceled = false;
      let paymentCompleted = false;

      const performVerification = async (sessionId: string) => {
        if (verificationInProgress || paymentCanceled) return;
        verificationInProgress = true;
        clearTimeout(paymentTimeout);

        try {
          // Stripe verify reads sessionId from query params, not body
          const { data: verifyData, error: verifyError } = await $fetch({
            url: "/api/finance/deposit/fiat/stripe/verify",
            method: "POST",
            silent: true,
            params: { sessionId },
          });
          paymentCompleted = true;
          setProcessing(false);
          onProcessing(false);

          if (verifyError) {
            // Check for duplicate transaction (treat as success)
            if (verifyError.includes("already exists")) {
              const result = formatDepositResult(
                { confirmed: true, status: "COMPLETED", id: sessionId },
                "Stripe", amount, currency
              );
              onSuccess(result);
              toast.success(t("stripe_payment_completed"));
            } else {
              onError(verifyError || "Payment verification failed");
            }
          } else if (
            verifyData?.transaction ||
            verifyData?.status === "completed" ||
            verifyData?.confirmed
          ) {
            const result = formatDepositResult(verifyData, "Stripe", amount, currency);
            onSuccess(result);
            toast.success(t("stripe_payment_completed"));
          } else {
            onError("Payment verification failed");
          }
        } catch (err: any) {
          setProcessing(false);
          onProcessing(false);
          onError(err.message || "Payment verification failed");
        }
      };

      // 4) Check if popup is closed — exact same pattern as old store
      const checkPopup = setInterval(() => {
        if (!stripePopup || stripePopup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener("message", messageHandler);
          clearTimeout(paymentTimeout);

          // Wait a moment to see if a message event was triggered
          setTimeout(() => {
            if (!verificationInProgress && !paymentCanceled && !paymentCompleted) {
              setProcessing(false);
              onProcessing(false);
              onError("Payment was not completed. Please try again.");
            }
          }, 500);
        }
      }, 500);

      // 5) Timeout — exact same as old store
      const paymentTimeout = setTimeout(() => {
        if (!paymentCompleted && !paymentCanceled) {
          clearInterval(checkPopup);
          window.removeEventListener("message", messageHandler);
          if (stripePopup && !stripePopup.closed) stripePopup.close();
          setProcessing(false);
          onProcessing(false);
          onError("Payment session timed out. Please try again.");
        }
      }, 10 * 60 * 1000);

      // 6) Listen for postMessage — exact same as old store
      const messageHandler = (event: MessageEvent) => {
        if (
          event.origin === window.location.origin ||
          event.origin.includes("stripe.com")
        ) {
          if (event.data.sessionId && !paymentCanceled) {
            performVerification(event.data.sessionId);
          } else if (event.data.status === "canceled") {
            paymentCanceled = true;
            clearTimeout(paymentTimeout);
            setProcessing(false);
            onProcessing(false);
            onCancel();
          }
        }
      };

      window.addEventListener("message", messageHandler);
    } catch (err: any) {
      setLoading(false);
      setProcessing(false);
      onProcessing(false);
      onError(err.message || "An unexpected error occurred with Stripe payment");
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
          {processing ? `${t("processing_stripe_payment")}…` : `${t("processing_payment")}…`}
        </>
      ) : (
        <>
          <span className="mr-2">💳</span>
          {t("pay_with_provider", { provider: "Stripe" })}
          <ChevronRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  );
}
