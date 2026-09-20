"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user";
import { Shield, RefreshCw, ArrowRight, AlertTriangle } from "lucide-react";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

interface TwoFactorFormProps {
  twoFactorToken: string;
  type: string;
  /**
   * Why the code could not be sent, when it could not. Shown immediately: the
   * challenge is still valid and a recovery code still completes the login, so
   * the one thing that must not happen is an empty box with no explanation.
   */
  deliveryError?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function TwoFactorForm({
  twoFactorToken,
  type,
  deliveryError,
  onSuccess,
  onCancel,
}: TwoFactorFormProps) {
  const t = useTranslations("common");
  const tComponentsAuth = useTranslations("components_auth");
  const { toast } = useToast();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(deliveryError ?? null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const setUser = useUserStore((state) => state.setUser);

  /*
   * RECOVERY CODES.
   *
   * `POST /api/auth/otp/login` has always accepted one on this same `otp`
   * field — it tries the OTP first and falls back to `consumeRecoveryCode`.
   * This form made that unreachable: six single-character boxes that reject
   * anything non-numeric on both change and paste, and a Verify button
   * disabled until exactly six digits are present. A recovery code is
   * `XXXX-XXXX-XXXX` hex, so it could not be typed OR pasted here.
   *
   * That mattered most in the one situation the codes exist for. When delivery
   * fails, the login route returns a `deliveryHint` reading "…or use one of
   * your recovery codes", which this form displays — advice the form itself
   * made impossible to follow.
   */
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  // `normalizeCode` on the server strips hyphens and upper-cases, so grouping
  // is presentation only. Twelve characters after stripping.
  const normalisedRecoveryCode = recoveryCode.replace(/[\s-]/g, "").toUpperCase();
  const recoveryCodeComplete = normalisedRecoveryCode.length === 12;

  // Focus the first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleInputChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    // Update the OTP array
    const newOtp = [...otp];
    newOtp[index] = value;

    // Move to next input if current input is filled
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    setOtp(newOtp);
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Move to previous input on backspace if current input is empty
    if (
      e.key === "Backspace" &&
      !otp[index] &&
      index > 0 &&
      inputRefs.current[index - 1]
    ) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();

    // Check if pasted data is a valid OTP (numbers only)
    if (!/^\d+$/.test(pastedData)) return;

    // Fill the OTP inputs with the pasted data
    const newOtp = [...otp];
    for (let i = 0; i < Math.min(pastedData.length, 6); i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    // Focus the appropriate input
    if (pastedData.length < 6 && inputRefs.current[pastedData.length]) {
      inputRefs.current[pastedData.length]?.focus();
    }
  };

  const handleVerify = async () => {
    // One field on the wire either way — the server tries the OTP first and
    // falls back to the recovery-code list.
    const otpValue = useRecoveryCode ? normalisedRecoveryCode : otp.join("");

    if (useRecoveryCode) {
      if (!recoveryCodeComplete) {
        setError(t("enter_a_full_recovery_code_for"));
        return;
      }
    } else if (otpValue.length !== 6) {
      setError(t("please_enter_a_complete_6_digit_code"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await $fetch({
        url: "/api/auth/otp/login",
        method: "POST",
        body: {
          twoFactorToken,
          otp: otpValue,
        },
      });

      if (!error) {
        toast({
          title: t("verification_successful"),
          description: t("you_have_been_successfully_logged_in"),
        });

        // Update user state if user data is returned
        if (data?.user) {
          setUser(data.user);
        }

        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(error || t("invalid_verification_code"));
        toast({
          title: t("verification_failed"),
          description: error || t("invalid_verification_code_please_try_again"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("2FA verification error:", error);
      setError(t("unexpected_error"));
      toast({
        title: t("verification_error"),
        description: t("an_unexpected_error_occurred_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);

    try {
      const { data, error } = await $fetch({
        url: "/api/auth/otp/resend",
        method: "POST",
        body: {
          twoFactorToken,
          type,
        },
      });

      if (!error) {
        toast({
          title: t("code_resent"),
          description: `A new verification code has been sent to your ${type === "EMAIL" ? "email" : "phone"}.`,
        });
      } else {
        setError(error || t("failed_to_resend_code"));
        toast({
          title: t("resend_failed"),
          description:
            error || t("failed_to_resend_verification_code_please"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Resend 2FA code error:", error);
      setError(t("unexpected_error"));
      toast({
        title: t("resend_error"),
        description: t("an_unexpected_error_occurred_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary-ink to-primary-ink/70">
          {t("two_factor_authentication")}
        </h2>
        <p className="text-muted-foreground">
          {type === "EMAIL"
            ? t("enter_the_6_digit_code_sent_to_your_email")
            : type === "SMS"
              ? t("enter_the_6_digit_code_sent_to_your_phone")
              : t("enter_the_6_digit_code_from_your_authenticator_app")}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive-ink flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {useRecoveryCode ? (
        <div className="space-y-2">
          <input
            type="text"
            autoFocus
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            placeholder="ABCD-EF12-3456"
            spellCheck={false}
            autoCapitalize="characters"
            autoComplete="one-time-code"
            className="w-full h-14 text-center text-lg font-mono tracking-widest border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all bg-background uppercase"
            disabled={isLoading}
          />
          <p className="text-center text-xs text-muted-foreground">
            {t("one_of_the_codes_you_saved")}
          </p>
        </div>
      ) : (
        <div className="flex justify-center space-x-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              className="w-12 h-14 text-center text-xl font-semibold border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all bg-background"
              disabled={isLoading}
            />
          ))}
        </div>
      )}

      <div className="space-y-4">
        <Button
          onClick={handleVerify}
          className="w-full py-6 text-base bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          loading={isLoading}
          disabled={useRecoveryCode ? !recoveryCodeComplete : otp.join("").length !== 6}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              {t("verifying")}.
            </span>
          ) : (
            <span className="flex items-center justify-center">
              {t("verify")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </span>
          )}
        </Button>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleResend}
            loading={isResending}
            className="text-sm"
          >
            {isResending ? (
              <span className="flex items-center">
                {t("resending")}.
              </span>
            ) : (
              <span className="flex items-center">
                <RefreshCw className="h-3 w-3 mr-1" />
                {t("resend_code")}
              </span>
            )}
          </Button>

          <Button variant="ghost" onClick={onCancel} className="text-sm">
            {t("cancel")}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => {
            setUseRecoveryCode((on) => !on);
            // Clear whichever field is being left behind, so a half-typed code
            // cannot be submitted through the other mode.
            setError(null);
            setRecoveryCode("");
            setOtp(["", "", "", "", "", ""]);
          }}
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
          disabled={isLoading}
        >
          {useRecoveryCode
            ? t("use_a_code_from_your_authenticator_instead")
            : t("cant_get_a_code_use_a_recovery_code")}
        </button>
      </div>

      <div className="text-center text-xs text-muted-foreground mt-4">
        <p>{tComponentsAuth("didnt_receive_a_the_code")}.</p>
      </div>
    </div>
  );
}
