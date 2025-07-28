"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { $fetch } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";

interface ResetPasswordFormProps {
  token: string;
  onSuccess?: () => void;
  onLoginClick?: () => void;
  preserveToken?: boolean;
}

export default function ResetPasswordForm({
  token,
  onSuccess,
  onLoginClick,
  preserveToken = false,
}: ResetPasswordFormProps) {
  const t = useTranslations("components/auth/reset-password-form");
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");

  // Skip token verification and assume token is valid if provided
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      setVerificationError("No token provided");
    } else {
      // Skip verification and assume token is valid
      // The actual token validation will happen when user submits the form
      setVerifying(false);
      setTokenValid(true);
      setVerificationError(null);
    }
  }, [token]);

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      setPasswordFeedback("");
      return;
    }

    // Basic password strength calculation
    let strength = 0;
    let feedback = "";

    // Length check
    if (password.length >= 8) {
      strength += 25;
    } else {
      feedback = "Password should be at least 8 characters";
    }

    // Contains uppercase
    if (/[A-Z]/.test(password)) {
      strength += 25;
    } else if (!feedback) {
      feedback = "Add uppercase letters";
    }

    // Contains lowercase
    if (/[a-z]/.test(password)) {
      strength += 25;
    } else if (!feedback) {
      feedback = "Add lowercase letters";
    }

    // Contains numbers or special chars
    if (/[0-9!@#$%^&*(),.?":{}|<>]/.test(password)) {
      strength += 25;
    } else if (!feedback) {
      feedback = "Add numbers or special characters";
    }

    // Set feedback based on strength
    if (strength === 100 && !feedback) {
      feedback = "Strong password";
    } else if (strength >= 75 && !feedback) {
      feedback = "Good password";
    } else if (strength >= 50 && !feedback) {
      feedback = "Fair password";
    } else if (!feedback) {
      feedback = "Weak password";
    }

    setPasswordStrength(strength);
    setPasswordFeedback(feedback);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Use the user store to reset the password
      const resetPassword = useUserStore.getState().resetPassword;
      const success = await resetPassword(token, password);

      if (success) {
        setSubmitted(true);
        toast({
          title: "Password reset successful",
          description:
            "Your password has been reset. You can now log in with your new password.",
        });

        if (onSuccess) {
          onSuccess();
        }
      } else {
        const storeError = useUserStore.getState().error;
        
        // Check if the error is related to invalid token
        if (storeError && (storeError.includes("Invalid token") || storeError.includes("expired") || storeError.includes("used"))) {
          setTokenValid(false);
          setVerificationError(storeError);
          toast({
            title: "Invalid or expired token",
            description: storeError,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Reset failed",
            description: storeError || "An unexpected error occurred.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Reset error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get color for password strength
  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 75) return "bg-green-500";
    if (passwordStrength >= 50) return "bg-yellow-500";
    if (passwordStrength >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  if (verifying) {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            {t("verifying_link")}
          </h2>
          <p className="text-muted-foreground">
            {t("please_wait_while_we_verify_your_reset_link")}.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="h-12 w-12 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            {t("invalid_link")}
          </h2>
          <p className="text-muted-foreground">
            {t("this_password_reset_link_is_invalid_or_has_expired")}.
          </p>
          {verificationError && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{verificationError}</span>
            </div>
          )}
        </div>
        <Button
          onClick={onLoginClick}
          className="mt-4 py-6 px-8 relative overflow-hidden btn-glow transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
        >
          <span className="flex items-center justify-center">
            {t("return_to_login")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
          {submitted ? "Password reset" : "Create new password"}
        </h2>
        <p className="text-muted-foreground">
          {submitted
            ? "Your password has been reset"
            : "Enter your new password below"}
        </p>
      </div>

      {submitted ? (
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center mb-6">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
          </div>

          <div className="p-5 bg-primary/5 rounded-lg border border-primary/20 mb-6 shine">
            <p className="text-sm">
              {t("your_password_has_been_successfully_reset")}.
            </p>
            <p className="text-sm mt-2">
              {t("you_can_now_log_in_with_your_new_password")}.
            </p>
          </div>

          <Button
            variant="default"
            className="mt-4 px-8 py-6 relative overflow-hidden btn-glow transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            onClick={onLoginClick}
          >
            <span className="flex items-center justify-center">
              {t("return_to_login")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </span>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <div
              className={`relative transition-all duration-300 form-field-animate rounded-lg ${
                passwordFocused
                  ? "shadow-md ring-2 ring-primary/20"
                  : "ring-1 ring-input"
              }`}
            >
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-0 pl-10 pr-10 py-6 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={loading}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <Lock
                className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                  passwordFocused ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-primary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password strength meter */}
            {password && (
              <div className="space-y-1 mt-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs flex items-center">
                    <Shield className="h-3 w-3 mr-1 text-muted-foreground" />
                    <span>{t("password_strength")}</span>
                  </div>
                  <div className="text-xs">
                    <span
                      className={`
                        ${passwordStrength >= 75 ? "text-green-500" : ""}
                        ${passwordStrength >= 50 && passwordStrength < 75 ? "text-yellow-500" : ""}
                        ${passwordStrength >= 25 && passwordStrength < 50 ? "text-orange-500" : ""}
                        ${passwordStrength > 0 && passwordStrength < 25 ? "text-red-500" : ""}
                      `}
                    >
                      {passwordFeedback}
                    </span>
                  </div>
                </div>
                <Progress
                  value={passwordStrength}
                  className="h-1"
                  indicatorClassName={getPasswordStrengthColor()}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div
              className={`relative transition-all duration-300 form-field-animate rounded-lg ${
                confirmPasswordFocused
                  ? "shadow-md ring-2 ring-primary/20"
                  : "ring-1 ring-input"
              } ${confirmPassword && password !== confirmPassword ? "ring-destructive/50" : ""}`}
            >
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`border-0 pl-10 pr-10 py-6 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 ${
                  confirmPassword && password !== confirmPassword
                    ? "text-destructive"
                    : ""
                }`}
                disabled={loading}
                onFocus={() => setConfirmPasswordFocused(true)}
                onBlur={() => setConfirmPasswordFocused(false)}
              />
              <Lock
                className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                  confirmPasswordFocused
                    ? "text-primary"
                    : "text-muted-foreground"
                } ${confirmPassword && password !== confirmPassword ? "text-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-primary transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive mt-1 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t("passwords_do_not_match")}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full py-6 text-base relative overflow-hidden btn-glow transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            disabled={
              loading || (!!confirmPassword && password !== confirmPassword)
            }
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
                {t("resetting_password")}.
              </span>
            ) : (
              <span className="flex items-center justify-center">
                {t("reset_password")}
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
