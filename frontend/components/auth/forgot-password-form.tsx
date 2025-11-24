"use client";

import type React from "react";
import { useState, useEffect } from "react";
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

const recaptchaEnabled =
  process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_STATUS === "true";
const recaptchaSiteKey = process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY;

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
  const t = useTranslations("components/auth/forgot-password-form");
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [tokenFocused, setTokenFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<HTMLScriptElement | null>(null);

  // Initialize recaptcha if enabled
  useEffect(() => {
    if (typeof window !== "undefined" && recaptchaEnabled && recaptchaSiteKey) {
      try {
        // Check if script already exists
        const existingScript = document.querySelector(`script[src*="recaptcha/api.js"]`);
        if (existingScript) {
          console.log("reCAPTCHA script already loaded");
          return;
        }

        const scriptElement = document.createElement("script");
        scriptElement.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
        scriptElement.async = true;
        scriptElement.defer = true;
        document.body.appendChild(scriptElement);
        setScript(scriptElement);

        scriptElement.onload = () => {
          console.log("reCAPTCHA script loaded successfully");
          const { grecaptcha } = window as any;
          if (grecaptcha) {
            grecaptcha.ready(() => {
              console.log("reCAPTCHA is ready for use");
            });
          }
        };

        scriptElement.onerror = () => {
          console.error("Failed to load reCAPTCHA script");
        };
      } catch (err) {
        console.error("Error loading reCAPTCHA:", err);
      }
    } else {
      if (!recaptchaSiteKey && recaptchaEnabled) {
        console.error("reCAPTCHA is enabled but site key is missing");
      }
    }

    return () => {
      try {
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
        const recaptchaContainer = document.querySelector(".grecaptcha-badge");
        if (recaptchaContainer && recaptchaContainer.parentNode) {
          recaptchaContainer.parentNode.removeChild(recaptchaContainer);
        }
      } catch (err) {
        console.error("Error cleaning up reCAPTCHA:", err);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Generate reCAPTCHA token if enabled
      let recaptchaToken = null;
      if (recaptchaEnabled && typeof window !== "undefined") {
        try {
          // Wait for grecaptcha to be available (max 5 seconds)
          let attempts = 0;
          const maxAttempts = 10;
          while (attempts < maxAttempts) {
            const { grecaptcha } = window as any;
            if (grecaptcha && grecaptcha.ready) {
              await new Promise((resolve) => {
                grecaptcha.ready(() => {
                  resolve(true);
                });
              });
              recaptchaToken = await grecaptcha.execute(recaptchaSiteKey, {
                action: "password_reset",
              });
              console.log("reCAPTCHA token generated:", recaptchaToken ? "Success" : "Failed");
              break;
            }
            attempts++;
            if (attempts < maxAttempts) {
              console.log(`Waiting for reCAPTCHA to load... Attempt ${attempts}/${maxAttempts}`);
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          if (!recaptchaToken) {
            console.error("reCAPTCHA not loaded after maximum attempts");
            toast({
              title: "reCAPTCHA Loading Error",
              description: "reCAPTCHA failed to load. Please refresh the page and try again.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        } catch (recaptchaError) {
          console.error("reCAPTCHA error:", recaptchaError);
          toast({
            title: "reCAPTCHA Error",
            description: "Failed to verify reCAPTCHA. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Call the forgot password API endpoint
      const requestBody: any = { email };
      if (recaptchaEnabled && recaptchaToken) {
        requestBody.recaptchaToken = recaptchaToken;
      }

      const result = await $fetch({
        url: "/api/auth/reset",
        method: "POST",
        body: requestBody,
        successMessage: "Reset link sent",
      });

      if (result.data) {
        setSubmitted(true);
        toast({
          title: "Reset link sent",
          description:
            "If an account exists with that email, you'll receive a password reset link.",
        });

        // Call onSuccess for any parent component tracking
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(result.error || "Failed to send reset link");
        toast({
          title: "Request failed",
          description: result.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      setError("An unexpected error occurred");
      toast({
        title: "Request error",
        description: "An unexpected error occurred. Please try again.",
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
      setError("Token is required");
      toast({
        title: "Token required",
        description: "Please enter the reset token from your email.",
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
        setError(result.error || "Invalid token");
        toast({
          title: "Invalid token",
          description:
            result.error ||
            "The token is invalid or has expired. Please request a new one.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Token verification error:", error);
      setError("Failed to verify token");
      toast({
        title: "Verification error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTokenLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
          {submitted ? "Check your email" : "Forgot password"}
        </h2>
        <p className="text-muted-foreground">
          {submitted
            ? "We've sent you a reset link. You can also enter the token below."
            : "Enter your email and we'll send you a reset link"}
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-center">
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
                  placeholder="Enter reset token"
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
              className="w-full py-6 text-base relative overflow-hidden btn-glow transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              disabled={tokenLoading}
            >
              {tokenLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
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
              className="px-4 py-2 relative overflow-hidden group"
              onClick={() => setSubmitted(false)}
            >
              <span className="relative z-10 flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("try_another_email")}
              </span>
            </Button>

            <Button
              variant="ghost"
              className="px-4 py-2"
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
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-0 pl-10 py-6 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={loading}
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

          <Button
            type="submit"
            className="w-full py-6 text-base relative overflow-hidden btn-glow transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
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
