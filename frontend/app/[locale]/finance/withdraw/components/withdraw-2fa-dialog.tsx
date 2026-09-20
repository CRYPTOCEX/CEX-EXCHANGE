"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { useWithdrawStore } from "@/store/finance/withdraw-store";
import { useTranslations } from "next-intl";

const CODE_LENGTH = 6;

function channelCopy(type: string | null | undefined) {
  switch (type) {
    case "EMAIL":
      return "Enter the 6-digit code we sent to your email address.";
    case "SMS":
      return "Enter the 6-digit code we sent to your phone.";
    default:
      return "Enter the current 6-digit code from your authenticator app.";
  }
}

/**
 * Step-up verification for a withdrawal. Shown only when the admin has enabled
 * "Verify 2FA on Every Withdrawal" — the store opens it instead of submitting,
 * and submission resumes automatically once the code is accepted.
 */
export function WithdrawTwoFactorDialog() {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");

  const {
    twoFactorPolicy,
    twoFactorPrompt,
    twoFactorCodeSent,
    twoFactorSending,
    twoFactorVerifying,
    twoFactorError,
    requestTwoFactorCode,
    confirmTwoFactor,
    cancelTwoFactor,
  } = useWithdrawStore();

  const [digits, setDigits] = useState<string[]>(
    Array(CODE_LENGTH).fill("")
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const code = digits.join("");
  const type = twoFactorPolicy?.userType ?? null;

  // Clear the previous code and focus the first box each time the prompt opens,
  // so a re-verification after a failure never starts from stale digits.
  useEffect(() => {
    if (twoFactorPrompt) {
      setDigits(Array(CODE_LENGTH).fill(""));
      // The dialog animates in; focus once it is actually mounted.
      const id = window.setTimeout(() => inputRefs.current[0]?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [twoFactorPrompt]);

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d+$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && code.length === CODE_LENGTH) {
      void confirmTwoFactor(code);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain").trim();
    if (!/^\d+$/.test(pasted)) return;
    const next = [...digits];
    for (let i = 0; i < Math.min(pasted.length, CODE_LENGTH); i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  const busy = twoFactorSending || twoFactorVerifying;

  return (
    <Dialog
      open={twoFactorPrompt}
      onOpenChange={(open) => {
        if (!open) cancelTwoFactor();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            {tCommon("confirm_your_withdrawal")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {channelCopy(type)}
          </DialogDescription>
        </DialogHeader>

        {twoFactorError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{twoFactorError}</span>
          </div>
        )}

        {twoFactorSending && (
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
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={twoFactorVerifying}
              className="h-14 w-11 rounded-lg border bg-background text-center text-xl font-semibold transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
          ))}
        </div>

        <Button
          onClick={() => confirmTwoFactor(code)}
          disabled={busy || code.length !== CODE_LENGTH}
          className="h-12 w-full bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20"
        >
          {twoFactorVerifying ? (
            <>
              <Loader size="sm" className="mr-2" />
              {tCommon("verifying")}
            </>
          ) : (
            tCommon("verify")
          )}
        </Button>

        <div className="flex items-center justify-between">
          {/* Nothing is delivered for authenticator apps, so resend is hidden. */}
          {type !== "APP" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestTwoFactorCode()}
              disabled={busy}
              className="gap-1.5"
            >
              <RefreshCw
                className={twoFactorSending ? "h-3 w-3 animate-spin" : "h-3 w-3"}
              />
              {tCommon("resend_code")}
            </Button>
          ) : (
            <span />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelTwoFactor}
            disabled={twoFactorVerifying}
          >
            {tCommon("cancel")}
          </Button>
        </div>

        {twoFactorCodeSent && !twoFactorError && (
          <p className="text-center text-xs text-muted-foreground">
            {t("code_expires_shortly")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
