"use client";

/**
 * TransFi deposit gateway.
 *
 * Every other gateway in this folder is a single button: click, get a redirect
 * URL, pay. TransFi cannot be, because it refuses to create a payment until the
 * payer exists on its side as a screened identity. The backend therefore answers
 * `initiate` with one of several structured states, and this component is the UI
 * for them:
 *
 *   PAYER_DETAILS_REQUIRED — collect date of birth + address, then resubmit
 *   PAYER_SCREENING        — registered, screening in flight; auto-retry
 *   KYC_REQUIRED           — send the customer to TransFi's hosted verification
 *   PAYER_REJECTED         — terminal; tell them to contact support
 *   success                — behave like RedirectGateway from here on
 *
 * Without this, the deposit button would silently do nothing on a first deposit.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, ChevronRight, Clock, ShieldCheck } from "lucide-react";
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

type PayerDetails = {
  dateOfBirth: string;
  country: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
};

const EMPTY_DETAILS: PayerDetails = {
  dateOfBirth: "",
  country: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
};

const FIELD_LABELS: Record<keyof PayerDetails, string> = {
  dateOfBirth: "Date of birth",
  country: "Country (2-letter code)",
  street: "Street address",
  city: "City",
  state: "State / region",
  postalCode: "Postal code",
};

export function TransfiGateway({
  amount,
  currency,
  onSuccess,
  onError,
  onCancel,
  onProcessing,
}: GatewayComponentProps) {
  const t = useTranslations("common");
  const alias = "transfi";
  const config = REDIRECT_GATEWAY_CONFIGS[alias];

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [details, setDetails] = useState<PayerDetails>(EMPTY_DETAILS);
  const [screening, setScreening] = useState<number | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, []);

  /** Opens the hosted checkout and verifies once the customer comes back. */
  const openCheckout = useCallback(
    (data: any) => {
      const redirectUrl = extractUrl(data, [
        ...(config?.urlFields || []),
        "data.checkout_url",
        "checkout_url",
      ]);

      if (!redirectUrl) {
        onError("TransFi did not return a checkout URL");
        setLoading(false);
        return;
      }

      const paymentId = extractPaymentId(data, [
        ...(config?.paymentIdFields || []),
        "data.order_id",
        "order_id",
      ]);
      const transactionId = extractPaymentId(data, [
        "data.transaction_id",
        "transaction_id",
      ]);

      setLoading(false);
      setProcessing(true);
      onProcessing(true);

      const popup = openGatewayPopup(redirectUrl, "transfiPayment");

      if (!popup) {
        // Popup blocked. A full-page redirect still completes the payment, and
        // the webhook credits the wallet regardless of whether this tab survives.
        setProcessing(false);
        onProcessing(false);
        window.location.href = redirectUrl;
        return;
      }

      const cleanup = monitorPopup(popup, async () => {
        try {
          const verifyData = await verifyGatewayPayment(
            alias,
            {
              order_id: paymentId || "",
              ...(transactionId ? { transaction_id: transactionId } : {}),
            },
            "POST"
          );
          setProcessing(false);
          onProcessing(false);

          if (isPaymentSuccessful(verifyData)) {
            onSuccess(formatDepositResult(verifyData, "TransFi", amount, currency));
            toast.success(t("transfi_payment_completed"));
            return;
          }

          // Bank transfer and mobile money settle asynchronously, so "not yet"
          // is the normal outcome of closing the window — not a failure. Saying
          // "payment failed" here would be wrong and would send the customer to
          // support for a deposit that is about to land.
          const status = String(verifyData?.status || "").toUpperCase();
          if (status === "PENDING" || status === "MANUAL_REVIEW") {
            toast.info(
              verifyData?.message ||
                t("your_payment_is_still_processing_we")
            );
            onCancel();
            return;
          }

          onError(verifyData?.message || "TransFi payment was not completed");
        } catch (err: any) {
          setProcessing(false);
          onProcessing(false);
          onError(err.message || "TransFi payment verification failed");
        }
      });

      cleanupRef.current = () => {
        cleanup();
        setProcessing(false);
        onProcessing(false);
      };
    },
    [alias, amount, currency, config, onCancel, onError, onProcessing, onSuccess]
  );

  const startScreeningRetry = useCallback(
    (seconds: number, payload?: Partial<PayerDetails>) => {
      setScreening(seconds);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      countdownTimer.current = setInterval(() => {
        setScreening((s) => (s === null ? null : Math.max(0, s - 1)));
      }, 1000);

      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => {
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        setScreening(null);
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        void attempt(payload);
      }, Math.max(1, seconds) * 1000);
    },
    // `attempt` is defined below and stable enough for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const attempt = useCallback(
    async (payerDetails?: Partial<PayerDetails>) => {
      if (!amount || !currency) {
        onError("Missing required deposit information");
        return;
      }

      setLoading(true);
      setBlocked(null);

      try {
        const data = await initiateGatewayPayment(
          alias,
          amount,
          currency,
          payerDetails && Object.keys(payerDetails).length ? { payerDetails } : undefined
        );

        const status = String(data?.status || "").toUpperCase();

        if (data?.success === true) {
          openCheckout(data);
          return;
        }

        setLoading(false);

        switch (status) {
          case "PAYER_DETAILS_REQUIRED": {
            const fields: string[] = data?.data?.missing || [];
            setMissing(fields);
            setDetails((prev) => ({ ...EMPTY_DETAILS, ...prev, ...(payerDetails || {}) }));
            setDetailsOpen(true);
            return;
          }
          case "PAYER_SCREENING": {
            const wait = Number(data?.data?.retryAfterSeconds) || 30;
            startScreeningRetry(wait, payerDetails);
            return;
          }
          case "KYC_REQUIRED": {
            const kycUrl = data?.data?.kycUrl;
            if (kycUrl) {
              toast.info(t("additional_verification_is_required_before_this"));
              window.open(kycUrl, "transfiKyc", "width=600,height=700");
              setBlocked(
                "Complete the verification in the window that just opened, then try your deposit again."
              );
            } else {
              setBlocked(
                data?.message ||
                  "Additional identity verification is required. Please contact support."
              );
            }
            return;
          }
          case "PAYER_REJECTED": {
            setBlocked(
              data?.message ||
                "Our payment partner could not verify your details. Please contact support."
            );
            return;
          }
          default:
            onError(data?.message || "TransFi could not start this payment");
        }
      } catch (err: any) {
        setLoading(false);
        setProcessing(false);
        onProcessing(false);
        onError(err.message || "Failed to initiate TransFi payment");
      }
    },
    [alias, amount, currency, onError, onProcessing, openCheckout, startScreeningRetry]
  );

  const submitDetails = useCallback(() => {
    const stillMissing = (missing.length ? missing : Object.keys(EMPTY_DETAILS)).filter(
      (f) => !String((details as any)[f] || "").trim()
    );
    if (stillMissing.length) {
      toast.error(
        `Please fill in: ${stillMissing.map((f) => FIELD_LABELS[f as keyof PayerDetails] || f).join(", ")}`
      );
      return;
    }
    setDetailsOpen(false);
    void attempt(details);
  }, [attempt, details, missing]);

  const fieldsToShow = (missing.length ? missing : Object.keys(EMPTY_DETAILS)).filter(
    (f): f is keyof PayerDetails => f in EMPTY_DETAILS
  );

  const icon = getPaymentGatewayIcon(alias);
  // The brand is an ARGUMENT, never part of the message: "TransFi" is the same
  // in all 90 locales, and each locale decides where in the sentence it goes.
  const buttonText = t("pay_with_provider", { provider: "TransFi" });

  return (
    <>
      {blocked && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>{blocked}</span>
        </div>
      )}

      {screening !== null && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-info/40 bg-info/10 p-3 text-sm text-foreground">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <span>
            {t("verifying_your_payment_profile_with_our")}
            {screening > 0 ? t("in_s", { screening: String(screening) }) : " now"}&hellip;
          </span>
        </div>
      )}

      <Button
        onClick={() => void attempt()}
        disabled={loading || processing || screening !== null}
        className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary text-primary-foreground"
        size="lg"
      >
        {loading || processing || screening !== null ? (
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

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t("a_few_more_details")}
            </DialogTitle>
            <DialogDescription>
              {t("our_payment_partner_needs_these_to")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            {fieldsToShow.map((field) => (
              <div key={field} className="grid gap-1.5">
                <Label htmlFor={`transfi-${field}`}>{FIELD_LABELS[field]}</Label>
                <Input
                  id={`transfi-${field}`}
                  type={field === "dateOfBirth" ? "date" : "text"}
                  value={details[field]}
                  maxLength={field === "country" ? 2 : undefined}
                  placeholder={
                    field === "country"
                      ? "KE"
                      : field === "postalCode"
                        ? "00100"
                        : undefined
                  }
                  onChange={(e) =>
                    setDetails((prev) => ({
                      ...prev,
                      [field]:
                        field === "country"
                          ? e.target.value.toUpperCase().slice(0, 2)
                          : e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitDetails}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
