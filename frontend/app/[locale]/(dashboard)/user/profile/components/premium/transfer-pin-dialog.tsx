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
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/loader";
import { AlertTriangle, KeyRound } from "lucide-react";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

const PIN_LENGTH = 4;

export interface TransferPinStatus {
  hasPin: boolean;
  pinLength: number;
  lockedUntil: string | null;
  lastChangedAt: string | null;
  requiredForTransfers: boolean;
  canProveWithPassword: boolean;
  canProveWithTwoFactor: boolean;
}

type Mode = "set" | "clear";

/**
 * Sets, changes or clears the Transfer PIN.
 *
 * The proof field is the point of this dialog, not an afterthought: the server
 * refuses to write a PIN without the account password, the current PIN, or a
 * two-factor code, because a credential a stolen session can silently replace
 * protects nobody. `status` says which of the three this account actually has,
 * so the dialog offers only fields that can succeed.
 */
export function TransferPinDialog({
  open,
  onOpenChange,
  status,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: TransferPinStatus | null;
  onSaved: () => void;
}) {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");

  const [mode, setMode] = useState<Mode>("set");
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [currentPin, setCurrentPin] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pin = digits.join("");
  const hasPin = Boolean(status?.hasPin);

  /*
    Which proof fields to show — and it must never be "some, but none of them".

    Every input below is gated on a concrete `status` field, so returning true
    for a null status rendered the panel with nothing but its heading and a
    submit blocked forever on a client-side check the user had no field to
    satisfy. A null status means the status fetch has not landed (or failed), so
    there is nothing to render a ceremony from: show no proof panel and let the
    server refuse the write if proof is in fact required. The server is the
    enforcer; this decides only what to draw.

    With a status, the one case that legitimately needs NO proof is an account
    holding none of the three credentials — see `assertTransferPinProof`.
  */
  const needsProof = useMemo(() => {
    if (!status) return false;
    return (
      status.hasPin ||
      status.canProveWithPassword ||
      status.canProveWithTwoFactor
    );
  }, [status]);

  useEffect(() => {
    if (!open) return;
    setMode("set");
    setDigits(Array(PIN_LENGTH).fill(""));
    setCurrentPin("");
    setPassword("");
    setOtp("");
    setError(null);
    const id = window.setTimeout(() => inputRefs.current[0]?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open]);

  const handleChange = (index: number, raw: string) => {
    if (raw && !/^\d+$/.test(raw)) return;
    const next = [...digits];
    next[index] = raw.slice(-1);
    setDigits(next);
    if (raw && index < PIN_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const proofBody = () => {
    const body: Record<string, string> = {};
    if (currentPin) body.currentPin = currentPin;
    if (password) body.password = password;
    if (otp) body.otp = otp;
    return body;
  };

  const submit = async () => {
    setError(null);

    if (mode === "set" && pin.length !== PIN_LENGTH) {
      setError(t("enter_a_4_digit_pin"));
      return;
    }
    if (needsProof && !currentPin && !password && !otp) {
      setError(t("confirm_with_your_password_pin_or_code"));
      return;
    }

    setBusy(true);
    const { error: apiError } = await $fetch({
      url: "/api/user/profile/transfer-pin",
      method: mode === "set" ? "POST" : "DELETE",
      body: mode === "set" ? { pin, ...proofBody() } : proofBody(),
      silent: true,
    });
    setBusy(false);

    if (apiError) {
      setError(apiError);
      // A rejected current-PIN moves the server-side lockout counter, so never
      // leave the wrong value sitting in the field to be resubmitted.
      setCurrentPin("");
      return;
    }

    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            {mode === "clear"
              ? t("remove_transfer_pin")
              : hasPin
                ? t("change_transfer_pin")
                : t("set_a_transfer_pin")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === "clear"
              ? t("removing_your_pin_may_block_transfers")
              : t("a_4_digit_pin_confirms_your_transfers")}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === "set" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("new_pin")}</label>
            <div className="flex justify-center gap-2 py-1">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={busy}
                  className="h-14 w-11 rounded-lg border bg-background text-center text-xl font-semibold transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {t("avoid_repeated_digits_and_sequences")}
            </p>
          </div>
        )}

        {needsProof && (
          <div className="space-y-3 rounded-lg border border-border/50 bg-surface-2/40 p-3">
            <p className="text-xs text-muted-foreground">
              {t("confirm_this_change_is_you")}
            </p>

            {hasPin && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("current_pin")}</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={PIN_LENGTH}
                  value={currentPin}
                  onChange={(e) =>
                    setCurrentPin(e.target.value.replace(/\D/g, ""))
                  }
                  disabled={busy}
                  placeholder="••••"
                />
              </div>
            )}

            {status?.canProveWithPassword && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {tCommon("password")}
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  autoComplete="current-password"
                />
              </div>
            )}

            {status?.canProveWithTwoFactor && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {t("two_factor_code")}
                </label>
                <Input
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.trim())}
                  disabled={busy}
                  autoComplete="one-time-code"
                  placeholder="000000"
                />
              </div>
            )}
          </div>
        )}

        <Button onClick={submit} disabled={busy} size="lg" fullWidth>
          {busy ? (
            <>
              <Loader size="sm" className="mr-2" />
              {tCommon("saving")}
            </>
          ) : mode === "clear" ? (
            t("remove_pin")
          ) : hasPin ? (
            t("change_pin")
          ) : (
            t("set_pin")
          )}
        </Button>

        <div className="flex items-center justify-between">
          {hasPin ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setMode(mode === "clear" ? "set" : "clear");
                setError(null);
              }}
              className={mode === "clear" ? "" : "text-destructive"}
            >
              {mode === "clear" ? tCommon("back") : t("remove_pin")}
            </Button>
          ) : (
            <span />
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {tCommon("cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
