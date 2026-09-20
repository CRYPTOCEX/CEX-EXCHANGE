"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserStore } from "@/store/user";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  signInWithGoogle,
  preloadGoogleAuth,
  GoogleAuthError,
} from "@/utils/google-auth";
import { $fetch } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import TwoFactorForm from "@/components/auth/two-factor-form";
import { useSettings } from "@/hooks/use-settings";
import { useCaptcha } from "@/hooks/use-captcha";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
  onForgotPasswordClick?: () => void;
  onWalletLoginClick?: () => void;
}

export default function LoginForm({
  onSuccess,
  onRegisterClick,
  onForgotPasswordClick,
  onWalletLoginClick,
}: LoginFormProps) {
  const t = useTranslations("components_auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const returnUrl = searchParams?.get("return") || "";
  const login = useUserStore((state) => state.login);
  const isLoading = useUserStore((state) => state.isLoading);
  const error = useUserStore((state) => state.error);
  const { settings } = useSettings();
  const {
    getSubmission: getCaptcha,
    isLoading: powLoading,
    containerRef: captchaRef,
    needsContainer: showCaptchaSlot,
  } = useCaptcha();

  // Settings-based feature flags (handle both boolean and string values).
  // The client id is inlined at BUILD time, so an install that enabled the
  // setting without rebuilding with a client id would otherwise render a button
  // that can only ever fail. Both have to be present for the button to appear.
  const googleAuthStatus =
    (settings?.googleAuthStatus === true ||
      settings?.googleAuthStatus === "true") &&
    !!googleClientId;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // 2FA state
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<{
    token: string;
    type: string;
    // Set when the backend could not deliver the code (email 2FA switched off
    // platform-wide, SMTP down, Twilio unconfigured). The challenge is still
    // issued so a recovery code can be used — but only if we say so.
    deliveryError?: string;
  } | null>(null);

  // Track if Google button was clicked
  const googleButtonClicked = useRef(false);

  /*
   * Warm the Google script before anyone taps. The popup has to be requested
   * inside the tap's own user-activation window, so it cannot wait on a network
   * round trip at click time — that is precisely what made mobile sign-in
   * impossible before.
   */
  useEffect(() => {
    if (googleAuthStatus) preloadGoogleAuth(googleClientId);
  }, [googleAuthStatus]);

  // Watch for errors from the store
  useEffect(() => {
    if (error && googleButtonClicked.current) {
      toast({
        title: t("google_login_error"),
        description: error || t("an_error_occurred_during_google_login"),
        variant: "destructive",
      });
      googleButtonClicked.current = false;
      setGoogleLoading(false);
    }
  }, [error, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);

    try {
      console.log("Login form submitted:", { email });

      // Validate inputs
      if (!email || !password) {
        toast({
          title: t("missing_information"),
          description: t("please_enter_both_email_and_password"),
          variant: "destructive",
        });
        setLocalLoading(false);
        return;
      }

      // Satisfy whichever captcha provider the server has armed. This THROWS
      // when it cannot produce one — including when it could not reach the
      // server to ask — so a failed config fetch aborts the submit instead of
      // posting without a captcha, which is what the old hook did.
      let captcha: any = null;
      try {
        captcha = await getCaptcha("login");
      } catch (powError) {
        console.error("Captcha error:", powError);
        toast({
          title: t("security_verification_failed"),
          description: t("please_try_again"),
          variant: "destructive",
        });
        setLocalLoading(false);
        return;
      }

      // Call login with the captcha submission
      const success = await login(email, password, captcha).catch((err) => {
        console.error("Login promise rejection:", err);
        return false;
      });

      // Check if 2FA is required
      if (success && typeof success === 'object' && success.requiresTwoFactor) {
        setTwoFactorData({
          token: success.twoFactorToken,
          type: success.twoFactor.type,
          deliveryError: success.deliveryError
            ? [success.deliveryError, success.deliveryHint]
                .filter(Boolean)
                .join(" ")
            : undefined,
        });
        setShowTwoFactor(true);
        setLocalLoading(false);
        return;
      }

      if (success) {
        // If remember me is checked, store email in localStorage
        if (rememberMe && typeof window !== "undefined") {
          try {
            localStorage.setItem("rememberedEmail", email);
          } catch (err) {
            console.error("Error storing email in localStorage:", err);
          }
        } else if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("rememberedEmail");
          } catch (err) {
            console.error("Error removing email from localStorage:", err);
          }
        }

        // Remove auth=false parameter from URL after successful login
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          const authParam = url.searchParams.get("auth");
          
          if (authParam === "false") {
            url.searchParams.delete("auth");
            // Update URL without page reload
            window.history.replaceState({}, "", url.toString());
          }
        }

        toast({
          title: t("login_successful"),
          description: t("welcome_back"),
        });

        // Always call onSuccess to refresh the component state
        if (onSuccess) {
          onSuccess();
        }

        // Refresh the page to ensure all user details and permissions are updated
        setTimeout(() => {
          window.location.reload();
        }, 500); // Small delay to let the success toast show
      } else {
        const currentError = useUserStore.getState().error;
        toast({
          title: t("login_failed"),
          description: currentError || t("invalid_email_or_password"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: t("login_error"),
        description: tCommon("an_unexpected_error_occurred_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleGoogleButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading || googleLoading) return;

    try {
      setGoogleLoading(true);
      googleButtonClicked.current = true;

      /*
       * Called with NO await in front of it: the popup is opened synchronously
       * inside this handler so the tap that authorised it is still live. Adding
       * anything awaited above this line re-breaks mobile sign-in.
       */
      const googleResponse = await signInWithGoogle(googleClientId);

      // The server re-fetches the profile from Google and checks the token's
      // audience, so the token is the only thing worth sending.
      const requestBody = { access_token: googleResponse.access_token };

      // Send to our backend
      const { data, error } = await $fetch({
        url: "/api/auth/login/google",
        method: "POST",
        body: requestBody,
      });

      if (error) {
        toast({
          title: t("google_login_error"),
          description:
            error || t("failed_to_authenticate_with_google_please"),
          variant: "destructive",
        });
        setGoogleLoading(false);
        googleButtonClicked.current = false;
        return;
      }

      /*
       * A 2FA challenge is an HTTP 200 carrying no user and no session — the
       * same shape the password door handles above. Falling through to the
       * success path announced "Welcome back", set the store user to undefined
       * and reloaded the page back to a guest, burning the OTP that had just
       * been delivered.
       */
      if (data?.twoFactorToken) {
        setTwoFactorData({
          token: data.twoFactorToken,
          type: data.twoFactor?.type,
          deliveryError: data.deliveryError
            ? [data.deliveryError, data.deliveryHint].filter(Boolean).join(" ")
            : undefined,
        });
        setShowTwoFactor(true);
        googleButtonClicked.current = false;
        return;
      }

      toast({
        title: t("login_successful"),
        description: t("welcome_back"),
      });

      // Always call onSuccess to refresh the component state
      if (onSuccess) {
        onSuccess();
      }

      // Refresh the page to ensure all user details and permissions are updated
      setTimeout(() => {
        window.location.reload();
      }, 500); // Small delay to let the success toast show
    } catch (error) {
      console.error("Google login error:", error);

      /*
       * Only a real cancellation is silent. This used to substring-match
       * "cancelled" on the message, which also matched the 120s timeout the old
       * flow produced on every mobile tap — so the one case that most needed an
       * error message was the one case that showed none.
       */
      const isCancellation =
        error instanceof GoogleAuthError && error.code === "cancelled";

      if (!isCancellation) {
        toast({
          title: t("google_login_error"),
          description:
            error instanceof Error
              ? error.message
              : t("failed_to_initialize_google_login_please_try_again"),
          variant: "destructive",
        });
      }
      
      googleButtonClicked.current = false;
    } finally {
      setGoogleLoading(false);
    }
  };

  // Load remembered email on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const rememberedEmail = localStorage.getItem("rememberedEmail");
        if (rememberedEmail) {
          setEmail(rememberedEmail);
          setRememberMe(true);
        }
      } catch (err) {
        console.error("Error reading from localStorage:", err);
      }
    }
  }, []);

  // Determine if button should show loading state
  const buttonLoading = localLoading || isLoading || powLoading;

  const handleTwoFactorSuccess = () => {
    setShowTwoFactor(false);
    setTwoFactorData(null);
    
    toast({
      title: t("login_successful"),
      description: t("welcome_back"),
    });

    // Always call onSuccess to refresh the component state
    if (onSuccess) {
      onSuccess();
    }

    // Refresh the page to ensure all user details and permissions are updated
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleTwoFactorCancel = () => {
    setShowTwoFactor(false);
    setTwoFactorData(null);
  };

  // Show 2FA form if required
  if (showTwoFactor && twoFactorData) {
    return (
      <TwoFactorForm
        twoFactorToken={twoFactorData.token}
        type={twoFactorData.type}
        deliveryError={twoFactorData.deliveryError}
        onSuccess={handleTwoFactorSuccess}
        onCancel={handleTwoFactorCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold">{tCommon("welcome_back")}</h2>
        <p className="text-muted-foreground">
          {t("enter_your_credentials_to_sign_in_to_your_account")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <div
            className={`relative transition-all duration-200 ${
              emailFocused
                ? "transform -translate-y-1 shadow-md rounded-lg"
                : ""
            }`}
          >
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 py-6 transition-all"
              disabled={buttonLoading}
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

        <div className="space-y-2">
          <div
            className={`relative transition-all duration-200 ${
              passwordFocused
                ? "transform -translate-y-1 shadow-md rounded-lg"
                : ""
            }`}
          >
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pl-10 pr-10 py-6 transition-all"
              disabled={buttonLoading}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <label
                htmlFor="remember-me"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                {t("remember_me")}
              </label>
            </div>
            <Button
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={onForgotPasswordClick}
              type="button"
            >
              {t("forgot_password")}
            </Button>
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
          className="w-full py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!!buttonLoading || !email.trim() || !password}
        >
          {localLoading ? `${t("signing_in")}…` : tCommon("sign_in")}
        </Button>

      </form>

      {googleAuthStatus && (
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t("or_continue_with")}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGoogleButtonClick}
            disabled={!!buttonLoading || googleLoading}
          >
            <svg
              className="mr-2 h-5 w-5"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              ></path>
            </svg>
            {googleLoading ? `${tCommon("connecting")}…` : t("continue_with_google")}
          </Button>
        </div>
      )}

      {/* Add wallet login button */}
      {onWalletLoginClick && (
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full py-6 text-base"
            onClick={onWalletLoginClick}
            disabled={!!buttonLoading}
          >
            <svg
              className="mr-2 h-5 w-5"
              aria-hidden="true"
              focusable="false"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
            >
              <path
                fill="currentColor"
                d="M461.2 128H80c-8.84 0-16-7.16-16-16s7.16-16 16-16h384c8.84 0 16-7.16 16-16 0-26.51-21.49-48-48-48H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h397.2c28.02 0 50.8-21.53 50.8-48V176c0-26.47-22.78-48-50.8-48zM416 336c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32z"
              ></path>
            </svg>
            {t("continue_with_wallet")}
          </Button>
        </div>
      )}

      {/* Social proof */}
      <div className="text-center text-xs text-muted-foreground">
        <p>{t("trusted_by_over_10000_users_worldwide")}</p>
        <div className="flex justify-center mt-2 space-x-1">
          {[...Array(5)].map((_, i) => (
            <CheckCircle2 key={i} className="h-3 w-3 text-primary" />
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {t("dont_have_an_account")}{" "}
          <Button
            variant="link"
            className="p-0 h-auto"
            onClick={onRegisterClick}
          >
            {tCommon("sign_up")}
          </Button>
        </p>
      </div>
    </div>
  );
}
