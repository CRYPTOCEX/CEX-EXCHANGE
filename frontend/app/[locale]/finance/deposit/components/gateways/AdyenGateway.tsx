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
  loadExternalScript,
} from "./gateway-utils";

const ADYEN_SDK_URL = "https://checkoutshopper-live.adyen.com/checkoutshopper/sdk/5.59.0/adyen.js";
const ADYEN_CSS_URL = "https://checkoutshopper-live.adyen.com/checkoutshopper/sdk/5.59.0/adyen.css";

export function AdyenGateway({
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
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const dropinRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<any>(null);
  const sessionDataRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (checkoutRef.current) {
        try {
          checkoutRef.current.unmount();
        } catch {
          /* Adyen throws if the node is already gone; we drop the ref below
             regardless, so there is nothing left to recover. */
        }
        checkoutRef.current = null;
      }
    };
  }, []);

  const initializeAdyen = useCallback(async () => {
    if (!amount || !currency) {
      onError("Missing required deposit information");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Get session from backend
      const data = await initiateGatewayPayment("adyen", amount, currency);

      if (!data?.sessionId || !data?.sessionData) {
        onError("Invalid Adyen response - no session data received");
        setLoading(false);
        return;
      }

      sessionDataRef.current = data;

      // Step 2: Load Adyen CSS
      const linkId = "adyen-css";
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = ADYEN_CSS_URL;
        document.head.appendChild(link);
      }

      // Step 3: Load Adyen JS SDK
      await loadExternalScript(ADYEN_SDK_URL, "adyen-sdk");
      setSdkLoaded(true);

      // Step 4: Initialize Adyen Checkout
      const AdyenCheckout = (window as any).AdyenCheckout;
      if (!AdyenCheckout) {
        onError("Failed to load Adyen SDK");
        setLoading(false);
        return;
      }

      const checkout = await AdyenCheckout({
        environment: "live",
        clientKey: data.clientKey,
        session: {
          id: data.sessionId,
          sessionData: data.sessionData,
        },
        onPaymentCompleted: async (result: any) => {
          onProcessing(true);
          try {
            const verifyData = await verifyGatewayPayment("adyen", {
              reference: data.reference,
              pspReference: result.pspReference || "",
            });
            onProcessing(false);
            const depositResult = formatDepositResult(verifyData, "Adyen", amount, currency);
            onSuccess(depositResult);
            toast.success(t("adyen_payment_completed_successfully"));
          } catch (err: any) {
            onProcessing(false);
            onError(err.message || "Adyen payment verification failed");
          }
        },
        onError: (error: any) => {
          console.error("Adyen error:", error);
          setSessionActive(false);
          onError(error?.message || "Adyen payment failed");
        },
      });

      checkoutRef.current = checkout;

      // Step 5: Mount Drop-in
      if (dropinRef.current) {
        checkout.create("dropin").mount(dropinRef.current);
        setSessionActive(true);
      }

      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      onError(err.message || "Failed to initialize Adyen payment");
    }
  }, [amount, currency, onSuccess, onError, onProcessing]);

  if (sessionActive) {
    return (
      <div className="w-full space-y-4">
        <div ref={dropinRef} className="adyen-dropin-container" />
        <Button
          variant="outline"
          onClick={() => {
            if (checkoutRef.current) {
              try {
                checkoutRef.current.unmount();
              } catch {
                /* Already unmounted, or the node is gone. Cancelling must still
                   tear the session down, so swallow and continue. */
              }
            }
            setSessionActive(false);
            onCancel();
          }}
          className="w-full"
        >
          {t("cancel_payment")}
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={initializeAdyen}
      disabled={loading}
      className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary text-primary-foreground"
      size="lg"
    >
      {loading ? (
        <>
          <Loader size="sm" className="mr-2" />
          {t("processing_payment")}…
        </>
      ) : (
        <>
          <span className="mr-2">💚</span>
          {t("pay_with_provider", { provider: "Adyen" })}
          <ChevronRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  );
}
