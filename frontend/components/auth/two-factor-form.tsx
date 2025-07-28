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
  userId: string;
  type: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function TwoFactorForm({
  userId,
  type,
  onSuccess,
  onCancel,
}: TwoFactorFormProps) {
  const t = useTranslations("components/auth/two-factor-form");
  const { toast } = useToast();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const setUser = useUserStore((state) => state.setUser);

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
    // Check if OTP is complete
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setError("Please enter a complete 6-digit code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await $fetch({
        url: "/api/auth/otp/login",
        method: "POST",
        body: {
          id: userId,
          otp: otpValue,
        },
      });

      if (!error) {
        toast({
          title: "Verification successful",
          description: "You have been successfully logged in.",
        });

        // Update user state if user data is returned
        if (data?.user) {
          setUser(data.user);
        }

        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(error || "Invalid verification code");
        toast({
          title: "Verification failed",
          description: error || "Invalid verification code. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("2FA verification error:", error);
      setError("An unexpected error occurred");
      toast({
        title: "Verification error",
        description: "An unexpected error occurred. Please try again.",
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
          id: userId,
          type,
        },
      });

      if (!error) {
        toast({
          title: "Code resent",
          description: `A new verification code has been sent to your ${type === "EMAIL" ? "email" : "phone"}.`,
        });
      } else {
        setError(error || "Failed to resend code");
        toast({
          title: "Resend failed",
          description:
            error || "Failed to resend verification code. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Resend 2FA code error:", error);
      setError("An unexpected error occurred");
      toast({
        title: "Resend error",
        description: "An unexpected error occurred. Please try again.",
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
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
          {t("two-factor_authentication")}
        </h2>
        <p className="text-muted-foreground">
          {type === "EMAIL"
            ? "Enter the 6-digit code sent to your email"
            : type === "SMS"
              ? "Enter the 6-digit code sent to your phone"
              : "Enter the 6-digit code from your authenticator app"}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

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

      <div className="space-y-4">
        <Button
          onClick={handleVerify}
          className="w-full py-6 text-base relative overflow-hidden btn-glow transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
          disabled={isLoading || otp.join("").length !== 6}
        >
          {isLoading ? (
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
              {t("Verifying")}.
            </span>
          ) : (
            <span className="flex items-center justify-center">
              {t("Verify")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </span>
          )}
        </Button>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={isResending}
            className="text-sm"
          >
            {isResending ? (
              <span className="flex items-center">
                <RefreshCw className="animate-spin h-3 w-3 mr-1" />
                {t("Resending")}.
              </span>
            ) : (
              <span className="flex items-center">
                <RefreshCw className="h-3 w-3 mr-1" />
                {t("resend_code")}
              </span>
            )}
          </Button>

          <Button variant="ghost" onClick={onCancel} className="text-sm">
            {t("Cancel")}
          </Button>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground mt-4">
        <p>{t("didnt_receive_a_the_code")}.</p>
      </div>
    </div>
  );
}
