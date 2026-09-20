"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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

export function PaytmGateway({
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
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      sessionRef.current = null;
    };
  }, []);

  const handlePayment = useCallback(async () => {
    if (!amount || !currency) {
      onError("Missing required deposit information");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Get session from backend
      const responseData = await initiateGatewayPayment("paytm", amount, currency);
      const data = responseData?.data || responseData;

      if (!data?.txn_token || !data?.order_id) {
        onError("Invalid Paytm response - no transaction token received");
        setLoading(false);
        return;
      }

      sessionRef.current = data;

      const config = data.paytm_config || {};
      const mid = config.mid;
      const isSandbox = config.is_sandbox;

      // Step 2: Load Paytm SDK
      const sdkUrl = isSandbox
        ? `https://securegw-stage.paytm.in/merchantpgpui/checkoutjs/merchants/${mid}.js`
        : `https://securegw.paytm.in/merchantpgpui/checkoutjs/merchants/${mid}.js`;

      await loadExternalScript(sdkUrl, "paytm-sdk");

      const Paytm = (window as any).Paytm;
      if (!Paytm?.CheckoutJS) {
        onError("Failed to load Paytm SDK");
        setLoading(false);
        return;
      }

      // Step 3: Initialize and invoke checkout
      await Paytm.CheckoutJS.init({
        root: "",
        flow: "DEFAULT",
        data: {
          orderId: data.order_id,
          token: data.txn_token,
          tokenType: "TXN_TOKEN",
          amount: String(amount),
        },
        merchant: {
          mid: mid,
          redirect: false,
        },
        handler: {
          transactionStatus: async (txnStatus: any) => {
            onProcessing(true);
            try {
              const verifyData = await verifyGatewayPayment("paytm", {
                orderId: data.order_id,
                txnId: txnStatus?.TXNID || "",
              });
              onProcessing(false);
              const result = formatDepositResult(verifyData, "Paytm", amount, currency);
              onSuccess(result);
              toast.success(t("paytm_payment_completed_successfully"));
            } catch (err: any) {
              onProcessing(false);
              onError(err.message || "Paytm payment verification failed");
            }
            Paytm.CheckoutJS.close();
          },
          notifyMerchant: (eventName: string, data: any) => {
            if (eventName === "APP_CLOSED") {
              setLoading(false);
              onCancel();
            }
          },
        },
      });

      setLoading(false);
      await Paytm.CheckoutJS.invoke();
    } catch (err: any) {
      setLoading(false);
      onError(err.message || "Failed to initialize Paytm payment");
    }
  }, [amount, currency, onSuccess, onError, onCancel, onProcessing]);

  return (
    <Button
      onClick={handlePayment}
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
          <span className="mr-2">🔵</span>
          {t("pay_with_provider", { provider: "Paytm" })}
          <ChevronRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  );
}
