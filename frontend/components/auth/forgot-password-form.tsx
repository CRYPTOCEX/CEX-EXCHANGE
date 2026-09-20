"use client";

import type React from "react";
import { useState } from "react";
import {
  Mail,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";
import { useCaptcha } from "@/hooks/use-captcha";

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
  onTokenSubmit?: (token: string) => void;
}

export default function ForgotPasswordForm({
  onSuccess,
  onLoginClick,
  onTokenSubmit,
}: ForgotPasswordFormProps) {
  const t = useTranslations("components_auth");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const {
    getSubmission: getCaptcha,
    isLoading: powLoading,
    containerRef: captchaRef,
    needsContainer: showCaptchaSlot,
  } = useCaptcha();

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [tokenFocused, setTokenFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Satisfy whichever captcha provider the server has armed. This THROWS
      // when it cannot produce one — including when it could not reach the
      // server to ask — so a failed config fetch aborts the submit instead of
      // posting without a captcha, which is what the old hook did.
      let captcha: any = null;
      try {
        captcha = await getCaptcha("reset");
      } catch (powError) {
        console.error("Captcha error:", powError);
        toast({
          title: t("security_verification_failed"),
          description: t("please_try_again"),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Call the forgot password API endpoint with PoW solution
      const result = await $fetch({
        url: "/api/auth/reset",
        method: "POST",
        body: { email, captcha: captcha || undefined },
        successMessage: t("reset_link_sent"),
      });

      if (result.data) {
        setSubmitted(true);
        toast({
          title: t("reset_link_sent"),
          description:
            t("if_an_account_exists_with_that"),
        });

        // Call onSuccess for any parent component tracking
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(result.error || t("failed_to_send_reset_link"));
        toast({
          title: tCommon("request_failed"),
          description: result.error || t("an_unexpected_error_occurred"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      setError(tCommon("unexpected_error"));
      toast({
        title: t("request_error"),
        description: tCommon("an_unexpected_error_occurred_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError(t("token_is_required"));
      toast({
        title: t("token_required"),
        description: t("please_enter_the_reset_token_from_your_email"),
        variant: "destructive",
      });
      return;
    }

    setTokenLoading(true);

    try {
      // Verify the token
      const result = await $fetch({
        url: "/api/auth/verify/reset",
        method: "POST",
        body: { token },
      });

      if (result.data?.success) {
        // Token is valid, proceed to reset password form
        if (onTokenSubmit) {
          onTokenSubmit(token);
        }
      } else {
        setError(result.error || t("invalid_token"));
        toast({
          title: t("invalid_token"),
          description:
            result.error ||
            t("the_token_is_invalid_or_has"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Token verification error:", error);
      setError(t("failed_to_verify_token"));
      toast({
        title: tCommon("verification_error"),
        description: tCommon("an_unexpected_error_occurred_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setTokenLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary-ink to-primary-ink/70">
          {submitted ? tCommon("check_your_email") : t("forgot_password")}
        </h2>
        <p className="text-muted-foreground">
          {submitted
            ? t("weve_sent_you_a_reset_link")
            : t("enter_your_email_and_well_send_you_a_reset_link")}
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive-ink flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        <div className="space-y-6">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="p-5 bg-primary/5 rounded-lg border border-primary/20 mb-4 shine">
            <p className="text-sm">
              {t("weve_sent_a_password_reset_link_to")}
              <strong>{email}</strong>
            </p>
            <p className="text-sm mt-2">
              {t("please_check_your_token_below")}.
            </p>
          </div>

          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div className="space-y-2">
              <div
                className={`relative transition-all duration-300 form-field-animate rounded-lg ${
                  tokenFocused
                    ? "shadow-md ring-2 ring-primary/20"
                    : "ring-1 ring-input"
                }`}
              >
                <Input
                  type="text"
                  placeholder={t("enter_reset_token")}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  className="border-0 pl-10 py-6 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={tokenLoading}
                  onFocus={() => setTokenFocused(true)}
                  onBlur={() => setTokenFocused(false)}
                />
                <KeyRound
                  className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                    tokenFocused ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-6 text-base bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              loading={tokenLoading}
            >
              {tokenLoading ? (
                <span className="flex items-center justify-center">
                  {t("verifying_token")}.
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  {t("verify_token")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              className="py-2 relative overflow-hidden group"
              onClick={() => setSubmitted(false)}
            >
              <span className="relative z-10 flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("try_another_email")}
              </span>
            </Button>

            <Button
              variant="ghost"
              className="py-2"
              onClick={onLoginClick}
              type="button"
            >
              {t("return_to_login")}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <div
              className={`relative transition-all duration-300 form-field-animate rounded-lg ${
                emailFocused
                  ? "shadow-md ring-2 ring-primary/20"
                  : "ring-1 ring-input"
              }`}
            >
              <Input
                type="email"
                placeholder={tCommon("email_address")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-0 pl-10 py-6 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={loading || powLoading}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
              <Mail
                className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                  emailFocused ? "text-primary" : "text-muted-foreground"
                }`}
              />
            </div>
          </div>

          {showCaptchaSlot && (
            <div
              ref={captchaRef}
              className="flex justify-center empty:hidden"
              data-testid="captcha-slot"
            />
          )}

          <Button
            type="submit"
            className="w-full py-6 text-base bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            loading={loading || powLoading}
          >
            {(loading || powLoading) ? (
              <span className="flex items-center justify-center">
                {t("sending_reset_link")}.
              </span>
            ) : (
              <span className="flex items-center justify-center">
                {t("send_reset_link")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
      )}

      {!submitted && (
        <div className="text-center text-sm">
          <Button
            variant="link"
            className="p-0 h-auto inline-flex items-center"
            onClick={onLoginClick}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("back_to_login")}
          </Button>
        </div>
      )}
    </div>
  );
}
