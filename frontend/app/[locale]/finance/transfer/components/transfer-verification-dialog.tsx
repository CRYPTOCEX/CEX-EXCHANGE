"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { AlertTriangle, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { useTransferStore } from "@/store/finance/transfer-store";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

const PIN_LENGTH = 4;
const CODE_LENGTH = 6;

/**
 * Confirms a transfer with the credential the operator asks for.
 *
 * Two mechanisms share one dialog because from the user's side they are the
 * same moment — "prove this is you before the money moves" — and because an
 * install that accepts BOTH must let them switch between the two without
 * abandoning the transfer. The store decides which one is preselected; this
 * only renders it.
 */
export function TransferVerificationDialog() {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");

  const {
    verificationPolicy,
    verificationPrompt,
    verificationCodeSent,
    verificationSending,
    verificationVerifying,
    verificationError,
    verificationMethod,
    setVerificationMethod,
    requestVerification,
    confirmVerification,
    cancelVerification,
  } = useTransferStore();

  const isPin = verificationMethod === "PIN";
  const length = isPin ? PIN_LENGTH : CODE_LENGTH;

  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const value = digits.join("");
  const channel = verificationPolicy?.userType ?? null;

  const lockedUntil = verificationPolicy?.pinLockedUntil
    ? new Date(verificationPolicy.pinLockedUntil)
    : null;
  const pinLocked = Boolean(lockedUntil && lockedUntil > new Date());

  // Both credentials are offered only when the operator accepts both AND the
  // user actually holds both — an option that leads to a guaranteed refusal is
  // worse than no option.
  const canSwitch = useMemo(() => {
    if (!verificationPolicy) return false;
    return (
      verificationPolicy.pinAccepted &&
      verificationPolicy.hasPin &&
      verificationPolicy.twoFactorAccepted &&
      verificationPolicy.hasTwoFactor
    );
  }, [verificationPolicy]);

  // Clear and refocus whenever the prompt opens, the method changes, OR an
  // attempt is rejected.
  //
  // `verificationError` is in the dependency list for a reason that is easy to
  // drop: neither of the other two changes on a wrong PIN, so without it the
  // rejected digits sit in the boxes with Verify still enabled, and one more
  // click resubmits the SAME wrong PIN — spending another attempt out of five
  // against a database lockout that escalates. The wrong value must never be
  // one click away from being sent again.
  useEffect(() => {
    if (!verificationPrompt) return;
    setDigits(Array(length).fill(""));
    const id = window.setTimeout(() => inputRefs.current[0]?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [verificationPrompt, length, verificationError]);

  const handleChange = (index: number, raw: string) => {
    if (raw && !/^\d+$/.test(raw)) return;
    const next = [...digits];
    next[index] = raw.slice(-1);
    setDigits(next);
    if (raw && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && value.length === length) {
      void confirmVerification(value);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain").trim();
    if (!/^\d+$/.test(pasted)) return;
    const next = [...digits];
    for (let i = 0; i < Math.min(pasted.length, length); i++) next[i] = pasted[i];
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  const busy = verificationSending || verificationVerifying;

  const description = isPin
    ? t("enter_your_transfer_pin_to_confirm")
    : channel === "EMAIL"
      ? t("enter_the_code_we_sent_to_your_email")
      : channel === "SMS"
        ? t("enter_the_code_we_sent_to_your_phone")
        : t("enter_the_code_from_your_authenticator_app");

  return (
    <Dialog
      open={verificationPrompt}
      onOpenChange={(open) => {
        if (!open) cancelVerification();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {isPin ? (
              <KeyRound className="h-6 w-6 text-primary" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-primary" />
            )}
          </div>
          <DialogTitle className="text-center">
            {t("confirm_your_transfer")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        {verificationError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{verificationError}</span>
          </div>
        )}

        {/* A locked PIN cannot be typed out of — say so, and point at the way
            back in, rather than letting the user spend the lockout guessing. */}
        {isPin && pinLocked && (
          <div className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm">
            {t("your_transfer_pin_is_locked")}{" "}
            <Link
              href="/user/profile?tab=security"
              className="font-medium underline underline-offset-2"
            >
              {t("reset_it_in_security_settings")}
            </Link>
          </div>
        )}

        {verificationSending && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader size="sm" />
            {tCommon("sending_verification_code")}…
          </div>
        )}

        <div className="flex justify-center gap-2 py-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="password"
              inputMode="numeric"
              autoComplete={isPin ? "off" : "one-time-code"}
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={verificationVerifying || (isPin && pinLocked)}
              className="h-14 w-11 rounded-lg border bg-background text-center text-xl font-semibold transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
          ))}
        </div>

        <Button
          onClick={() => confirmVerification(value)}
          disabled={busy || value.length !== length || (isPin && pinLocked)}
          size="xl"
          fullWidth
          className="bg-primary font-semibold text-primary-foreground"
        >
          {verificationVerifying ? (
            <>
              <Loader size="sm" className="mr-2" />
              {tCommon("verifying")}
            </>
          ) : (
            tCommon("verify")
          )}
        </Button>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Resend only makes sense for a delivered code. */}
            {!isPin && channel !== "APP" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => requestVerification()}
                disabled={busy}
                className="gap-1.5"
              >
                <RefreshCw
                  className={
                    verificationSending ? "h-3 w-3 animate-spin" : "h-3 w-3"
                  }
                />
                {tCommon("resend_code")}
              </Button>
            )}

            {canSwitch && (
              <Button
                variant="ghost"
                size="sm"
                disabled={verificationVerifying}
                onClick={async () => {
                  setVerificationMethod(isPin ? "OTP" : "PIN");
                  // Switching TO a delivered code has to actually deliver one.
                  if (isPin) await requestVerification();
                }}
              >
                {isPin ? t("use_a_code_instead") : t("use_your_pin_instead")}
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={cancelVerification}
            disabled={verificationVerifying}
          >
            {tCommon("cancel")}
          </Button>
        </div>

        {verificationCodeSent && !verificationError && (
          <p className="text-center text-xs text-muted-foreground">
            {t("code_expires_shortly")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
