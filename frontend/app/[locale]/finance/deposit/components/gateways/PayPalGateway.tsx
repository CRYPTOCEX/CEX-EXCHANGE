"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { GatewayComponentProps } from "./types";
import { $fetch } from "@/lib/api";
import {
  initiateGatewayPayment,
  formatDepositResult,
} from "./gateway-utils";

export function PayPalGateway({
  amount,
  currency,
  onSuccess,
  onError,
  onCancel,
  onProcessing,
}: GatewayComponentProps) {
  const t = useTranslations("common");
  const [sdkReady, setSdkReady] = useState(false);
  const [buttonsRendered, setButtonsRendered] = useState(false);
  const renderAttemptedRef = useRef(false);
  const paypalRef = useRef<any>(null);
  const amountRef = useRef(amount);
  const currencyRef = useRef(currency);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onCancelRef = useRef(onCancel);
  const onProcessingRef = useRef(onProcessing);

  // Keep refs in sync with latest props without triggering re-renders
  amountRef.current = amount;
  currencyRef.current = currency;
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  onCancelRef.current = onCancel;
  onProcessingRef.current = onProcessing;

  // Load PayPal SDK
  useEffect(() => {
    const APP_PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_APP_PAYPAL_CLIENT_ID;
    const scriptId = "paypal-js";

    if (typeof window !== "undefined" && (window as any).paypal) {
      paypalRef.current = (window as any).paypal;
      setSdkReady(true);
    } else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${APP_PAYPAL_CLIENT_ID}&components=buttons&enable-funding=venmo,paylater`;
      script.onload = () => {
        paypalRef.current = (window as any).paypal;
        setSdkReady(true);
      };
      document.body.appendChild(script);
    }

    return () => {
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        paypalRef.current = null;
        setSdkReady(false);
        setButtonsRendered(false);
        renderAttemptedRef.current = false;
        existingScript.remove();
      }
    };
  }, []);

  // Render PayPal buttons when SDK is ready
  useEffect(() => {
    if (!sdkReady || buttonsRendered || !paypalRef.current) return;
    // One-shot guard: if we already attempted rendering, don't retry on failure.
    // Resetting state in catch causes an infinite re-render loop.
    if (renderAttemptedRef.current) return;
    renderAttemptedRef.current = true;

    const container = document.getElementById("paypal-button-container");
    if (!container) {
      const retryTimer = setTimeout(() => {
        const retryContainer = document.getElementById("paypal-button-container");
        if (retryContainer) renderButtons(retryContainer);
      }, 100);
      return () => clearTimeout(retryTimer);
    }
    renderButtons(container);

    function renderButtons(el: HTMLElement) {
      try {
        // Cleanup existing elements
        const selectors = [
          "[data-paypal-button-id]", ".paypal-buttons", ".paypal-button",
          "[data-funding-source]", ".paypal-checkout-button", 'div[id*="paypal"]',
        ];
        selectors.forEach((sel) => {
          el.querySelectorAll(sel).forEach((child) => {
            try {
              child.remove();
            } catch {
              /* The SDK may have detached this node already; the innerHTML
                 clear below is the backstop. */
            }
          });
        });
        if (el.children.length > 0) el.innerHTML = "";

        let orderId: string;
        const sdk = paypalRef.current;
        const FUNDING_SOURCES = [sdk.FUNDING.PAYPAL];

        FUNDING_SOURCES.forEach((fundingSource: any) => {
          sdk
            .Buttons({
              fundingSource,
              style: {
                layout: "vertical",
                shape: "pill",
                color: fundingSource === sdk.FUNDING.PAYLATER ? "gold" : "",
              },
              createOrder: async () => {
                try {
                  const data = await initiateGatewayPayment("paypal", amountRef.current, currencyRef.current);
                  if (!data?.id) throw new Error("No order ID received");
                  orderId = data.id;
                  return orderId;
                } catch (error) {
                  toast.error(t("error_creating_paypal_order"));
                  throw error;
                }
              },
              onApprove: async () => {
                try {
                  onProcessingRef.current(true);
                  const { data: verifyData, error: verifyError } = await $fetch({
                    url: "/api/finance/deposit/fiat/paypal/verify",
                    method: "POST",
                    silent: true,
                    params: { orderId },
                  });
                  onProcessingRef.current(false);
                  if (verifyError || !verifyData) throw new Error(verifyError || "Verification failed");
                  const result = formatDepositResult(verifyData, "PayPal", amountRef.current, currencyRef.current);
                  onSuccessRef.current(result);
                  toast.success(t("paypal_payment_completed_successfully"));
                } catch (error) {
                  onProcessingRef.current(false);
                  toast.error(t("error_approving_paypal_transaction"));
                  onErrorRef.current("Failed to verify PayPal payment");
                }
              },
              onError: () => {
                toast.error(t("paypal_payment_failed"));
                onErrorRef.current("PayPal payment failed");
              },
              onCancel: () => {
                toast.info(t("paypal_payment_cancelled"));
                onCancelRef.current();
              },
            })
            .render("#paypal-button-container")
            .then(() => {
              // Mark as rendered AFTER the async render completes — not before
              setButtonsRendered(true);
              const isDarkMode = document.documentElement.classList.contains("dark");
              if (isDarkMode) injectPayPalDarkCSS();
            })
            .catch(() => {
              // Render failed — leave container as-is, one-shot guard prevents retry loops
            });
        });
      } catch {
        // Don't reset buttonsRendered — that would re-trigger this effect and cause an infinite loop
      }
    }

    // No container cleanup on effect re-run — clearing innerHTML destroys successfully rendered buttons
  }, [sdkReady, buttonsRendered]);

  // Dark mode observer
  useEffect(() => {
    if (buttonsRendered) {
      const isDarkMode = document.documentElement.classList.contains("dark");
      if (isDarkMode) {
        injectPayPalDarkCSS();
        const container = document.getElementById("paypal-button-container");
        if (container) {
          const observer = new MutationObserver(() => setTimeout(injectPayPalDarkCSS, 100));
          observer.observe(container, { childList: true, subtree: true, attributes: true });
          return () => {
            observer.disconnect();
            removePayPalDarkCSS();
          };
        }
      }
    }
    return () => removePayPalDarkCSS();
  }, [buttonsRendered]);

  return (
    <div className="w-full">
      <div
        id="paypal-button-container"
        className="w-full min-h-[50px] bg-transparent rounded-lg overflow-hidden"
        style={{ backgroundColor: "transparent", border: "none", outline: "none" }}
      >
        <div className="flex items-center justify-center space-x-2 text-muted-foreground bg-transparent">
          {!buttonsRendered && (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">{t("loading_paypal_sdk")}…</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function injectPayPalDarkCSS() {
  const style = document.createElement("style");
  style.id = "paypal-dark-mode-fix";
  style.textContent = `
    #paypal-button-container, #paypal-button-container *, #paypal-button-container div, #paypal-button-container iframe {
      background-color: transparent !important; background: transparent !important;
      border: none !important; outline: none !important; box-shadow: none !important;
    }
  `;
  const existing = document.getElementById("paypal-dark-mode-fix");
  if (existing) existing.remove();
  document.head.appendChild(style);
}

function removePayPalDarkCSS() {
  const existing = document.getElementById("paypal-dark-mode-fix");
  if (existing) existing.remove();
}
