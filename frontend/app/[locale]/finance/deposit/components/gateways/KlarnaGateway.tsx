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

const KLARNA_SDK_URL = "https://x.klarnacdn.net/kp/lib/v1/api.js";

export function KlarnaGateway({
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
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      sessionRef.current = null;
    };
  }, []);

  const initializeKlarna = useCallback(async () => {
    if (!amount || !currency) {
      onError("Missing required deposit information");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Get session from backend
      const data = await initiateGatewayPayment("klarna", amount, currency);

      if (!data?.client_token) {
        onError("Invalid Klarna response - no client token received");
        setLoading(false);
        return;
      }

      sessionRef.current = data;

      // Step 2: Load Klarna SDK
      await loadExternalScript(KLARNA_SDK_URL, "klarna-sdk");

      const Klarna = (window as any).Klarna;
      if (!Klarna?.Payments) {
        onError("Failed to load Klarna SDK");
        setLoading(false);
        return;
      }

      // Step 3: Initialize Klarna
      Klarna.Payments.init({ client_token: data.client_token });

      // Step 4: Load payment widget
      const category = data.payment_method_categories?.[0]?.identifier || "pay_later";

      Klarna.Payments.load(
        {
          container: containerRef.current,
          payment_method_category: category,
        },
        (res: any) => {
          if (res.show_form) {
            setWidgetLoaded(true);
            setLoading(false);
          } else {
            setLoading(false);
            onError("Klarna payment method not available for this transaction");
          }
        }
      );
    } catch (err: any) {
      setLoading(false);
      onError(err.message || "Failed to initialize Klarna payment");
    }
  }, [amount, currency, onError]);

  const handleAuthorize = useCallback(async () => {
    const Klarna = (window as any).Klarna;
    const session = sessionRef.current;

    if (!Klarna?.Payments || !session) {
      onError("Klarna session not initialized");
      return;
    }

    setAuthorizing(true);

    const category = session.payment_method_categories?.[0]?.identifier || "pay_later";

    Klarna.Payments.authorize(
      { payment_method_category: category },
      async (res: any) => {
        if (res.approved && res.authorization_token) {
          onProcessing(true);
          try {
            const verifyData = await verifyGatewayPayment("klarna", {
              authorization_token: res.authorization_token,
              session_id: session.session_id,
            });
            onProcessing(false);
            const result = formatDepositResult(verifyData, "Klarna", amount, currency);
            onSuccess(result);
            toast.success(t("klarna_payment_completed_successfully"));
          } catch (err: any) {
            onProcessing(false);
            onError(err.message || "Klarna payment verification failed");
          }
        } else if (res.show_form === false) {
          onError("Klarna payment was declined");
        } else {
          // User needs to try again or select different method
          toast.info(t("please_complete_the_klarna_verification"));
        }
        setAuthorizing(false);
      }
    );
  }, [amount, currency, onSuccess, onError, onProcessing]);

  if (widgetLoaded) {
    return (
      <div className="w-full space-y-4">
        <div ref={containerRef} className="klarna-widget-container min-h-[200px]" />
        <div className="flex gap-3">
          <Button
            onClick={handleAuthorize}
            disabled={authorizing}
            className="flex-1 h-12 text-lg font-semibold bg-destructive hover:bg-destructive text-destructive-foreground"
            size="lg"
          >
            {authorizing ? (
              <>
                <Loader size="sm" className="mr-2" />
                {t("processing_payment")}…
              </>
            ) : (
              t("confirm_payment")
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setWidgetLoaded(false);
              sessionRef.current = null;
              onCancel();
            }}
          >
            {t("cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={initializeKlarna}
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
          <span className="mr-2">🩷</span>
          {t("pay_with_provider", { provider: "Klarna" })}
          <ChevronRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  );
}
