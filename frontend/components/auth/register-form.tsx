"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loadable } from "@/components/ui/skeleton";
import { useUserStore } from "@/store/user";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  signInWithGoogle,
  preloadGoogleAuth,
  GoogleAuthError,
} from "@/utils/google-auth";
import { $fetch } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useSettings } from "@/hooks/use-settings";
import { useCaptcha } from "@/hooks/use-captcha";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

interface RegisterFormProps {
  onSuccess?: () => void;
  onRegistrationSuccess?: (email: string, needsEmailVerification: boolean) => void;
  onLoginClick?: () => void;
}

export default function RegisterForm({
  onSuccess,
  onRegistrationSuccess,
  onLoginClick,
}: RegisterFormProps) {
  const t = useTranslations("components_auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const register = useUserStore((state) => state.register);
  const isLoading = useUserStore((state) => state.isLoading);
  const error = useUserStore((state) => state.error);
  const { settings } = useSettings();
  const {
    getSubmission: getCaptcha,
    isLoading: powLoading,
    containerRef: captchaRef,
    needsContainer: showCaptchaSlot,
  } = useCaptcha();

  // Settings-based feature flags (handle both boolean and string values)
  // The client id is inlined at BUILD time, so without it the button could only
  // ever fail — both it and the setting have to be present to show the button.
  const googleAuthStatus =
    (settings?.googleAuthStatus === true ||
      settings?.googleAuthStatus === "true") &&
    !!googleClientId;
  const verifyEmailStatus = settings?.verifyEmailStatus === true || settings?.verifyEmailStatus === "true";

  // Get referral code from URL or sessionStorage
  const urlRef = searchParams.get("ref") || "";
  const [refCode, setRefCode] = useState(urlRef);
  const [referrerInfo, setReferrerInfo] = useState<{ name: string; avatar?: string } | null>(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);

  // Check sessionStorage for affiliate ref on mount
  useEffect(() => {
    if (!urlRef && typeof window !== "undefined") {
      const storedRef = sessionStorage.getItem("affiliateRef");
      if (storedRef) {
        setRefCode(storedRef);
      }
    }
  }, [urlRef]);

  // Look up referrer details to display a friendly name on the form.
  useEffect(() => {
    let cancelled = false;

    const fetchReferrerInfo = async () => {
      if (!refCode) {
        setReferrerInfo(null);
        setLoadingReferrer(false);
        return;
      }

      setLoadingReferrer(true);
      try {
        const { data, error } = await $fetch({
          url: `/api/public/referrer/${refCode}`,
          method: "GET",
          silent: true,
        });

        if (cancelled) return;

        if (data && !error) {
          // username only — the route deliberately no longer returns a legal
          // name, because it is unauthenticated and the refCode is public.
          setReferrerInfo({
            name: data.username || refCode,
            avatar: data.avatar || undefined,
          });
        } else {
          setReferrerInfo(null);
        }
      } catch (err) {
        if (!cancelled) setReferrerInfo(null);
      } finally {
        if (!cancelled) setLoadingReferrer(false);
      }
    };

    fetchReferrerInfo();

    return () => {
      cancelled = true;
    };
  }, [refCode]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  // Separate from localLoading so the Google popup and the captcha solve that
  // follows it do not drive the submit button's "Creating account" label.
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Track if Google button was clicked
  const googleButtonClicked = useRef(false);

  /*
   * Warm the Google script before anyone taps, so the popup can be requested
   * inside the tap's own activation window rather than after a round trip.
   */
  useEffect(() => {
    if (googleAuthStatus) preloadGoogleAuth(googleClientId);
  }, [googleAuthStatus]);

  // Watch for errors from the store
  useEffect(() => {
    if (error && googleButtonClicked.current) {
      toast({
        title: t("google_login_error"),
        description: error,
        variant: "destructive",
      });
      googleButtonClicked.current = false;
    }
  }, [error, toast]);

  // Calculate password strength (matches backend validation)
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      setPasswordFeedback("");
      return;
    }

    // Backend password validation requirements
    let strength = 0;
    let feedback = "";
    const requirements: string[] = [];

    // Length check (required)
    if (password.length >= 8) {
      strength += 20;
    } else {
      requirements.push("at least 8 characters");
    }

    // Contains uppercase (required)
    if (/[A-Z]/.test(password)) {
      strength += 20;
    } else {
      requirements.push("uppercase letters");
    }

    // Contains lowercase (required)
    if (/[a-z]/.test(password)) {
      strength += 20;
    } else {
      requirements.push("lowercase letters");
    }

    // Contains numbers (required)
    if (/\d/.test(password)) {
      strength += 20;
    } else {
      requirements.push("numbers");
    }

    // Contains special characters (required)
    if (/\W/.test(password)) {
      strength += 20;
    } else {
      requirements.push("special characters");
    }

    // Set feedback based on requirements
    if (requirements.length === 0) {
      feedback = "Strong password";
      strength = 100;
    } else if (requirements.length === 1) {
      feedback = `Add ${requirements[0]}`;
    } else if (requirements.length === 2) {
      feedback = `Add ${requirements.join(" and ")}`;
    } else {
      feedback = `Add ${requirements.slice(0, -1).join(", ")} and ${requirements[requirements.length - 1]}`;
    }

    setPasswordStrength(strength);
    setPasswordFeedback(feedback);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate names
    const nameRegex = /^[\p{L} \-'.]+$/u;
    if (!firstName.trim() || !nameRegex.test(firstName.trim())) {
      toast({
        title: t("invalid_first_name"),
        description: t("first_name_can_only_contain_letters"),
        variant: "destructive",
      });
      return;
    }

    if (!lastName.trim() || !nameRegex.test(lastName.trim())) {
      toast({
        title: t("invalid_last_name"),
        description: t("last_name_can_only_contain_letters"),
        variant: "destructive",
      });
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      toast({
        title: t("passwords_dont_match"),
        description: t("please_make_sure_your_passwords_match"),
        variant: "destructive",
      });
      return;
    }

    // Validate password strength (matches backend requirements)
    if (password.length < 8) {
      toast({
        title: t("password_too_short"),
        description: t("password_must_be_at_least_8_characters_long"),
        variant: "destructive",
      });
      return;
    }

    if (!/[A-Z]/.test(password)) {
      toast({
        title: t("password_missing_uppercase"),
        description: t("password_must_contain_at_least_one"),
        variant: "destructive",
      });
      return;
    }

    if (!/[a-z]/.test(password)) {
      toast({
        title: t("password_missing_lowercase"),
        description: t("password_must_contain_at_least_one"),
        variant: "destructive",
      });
      return;
    }

    if (!/\d/.test(password)) {
      toast({
        title: t("password_missing_numbers"),
        description: t("password_must_contain_at_least_one_number"),
        variant: "destructive",
      });
      return;
    }

    if (!/\W/.test(password)) {
      toast({
        title: t("password_missing_special_characters"),
        description: t("password_must_contain_at_least_one_2"),
        variant: "destructive",
      });
      return;
    }

    setLocalLoading(true);

    try {
      // Satisfy whichever captcha provider the server has armed. This THROWS
      // when it cannot produce one — including when it could not reach the
      // server to ask — so a failed config fetch aborts the submit instead of
      // posting without a captcha, which is what the old hook did.
      let captcha: any = null;
      try {
        captcha = await getCaptcha("register");
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

      // Call register with PoW solution
      const result = await register({
        firstName,
        lastName,
        email,
        password,
        ref: refCode || undefined,
        captcha: captcha || undefined,
      });

      console.log("Registration result:", result);
      console.log("User store error:", useUserStore.getState().error);

      if (result.success) {
        if (result.userLoggedIn) {
          // User is automatically logged in
          toast({
            title: t("registration_successful"),
            description: t("welcome_to_our_platform"),
          });
          
          if (onSuccess) {
            onSuccess();
          }

          // Refresh the page to ensure all user details and permissions are updated
          setTimeout(() => {
            window.location.reload();
          }, 500); // Small delay to let the success toast show
        } else {
          // User needs to verify their email or registration successful but not logged in
          // Check if the backend response indicates email verification is needed
          const responseMessage = (result.data?.message || "").toLowerCase();
          const needsVerification = responseMessage.includes("verify") ||
                                    responseMessage.includes("verification") ||
                                    responseMessage.includes("not verified");

          if (onRegistrationSuccess) {
            onRegistrationSuccess(email, needsVerification);
          } else {
            // Fallback to old behavior if onRegistrationSuccess is not provided
            toast({
              title: t("registration_successful"),
              description: result.data?.message || t("please_check_your_email_to_verify_your_account"),
            });
            
            if (onSuccess) {
              onSuccess();
            }
          }
        }
      } else {
        // Get the detailed error from the store
        const error = useUserStore.getState().error;
        console.error("Registration error:", error);
        
        // Parse specific validation errors if they exist
        let errorDescription = error || "An unexpected error occurred.";
        
        // Check for common validation errors and provide user-friendly messages
        if (error?.includes("lastName:") || error?.includes("firstName:")) {
          errorDescription = "Please check your name format. Names can only contain letters, spaces, hyphens, apostrophes, and periods.";
        } else if (error?.includes("Email already in use")) {
          errorDescription = "This email is already registered. Please try logging in instead.";
        } else if (error?.includes("Invalid password format")) {
          errorDescription = "Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters.";
        }
        
        toast({
          title: t("registration_failed"),
          description: errorDescription,
          variant: "destructive",
        });
        
        // DO NOT call onSuccess() here - keep modal open for user to fix the error
      }
    } catch (error) {
      toast({
        title: t("registration_error"),
        description: tCommon("an_unexpected_error_occurred_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleGoogleButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading || localLoading || googleLoading) return;

    try {
      setGoogleLoading(true);
      googleButtonClicked.current = true;

      /*
       * Called with NO await in front of it: the popup is opened synchronously
       * inside this handler so the tap that authorised it is still live. The
       * captcha is solved AFTER the popup resolves, for the same reason —
       * awaiting it first would spend the activation and the popup would be
       * blocked.
       */
      const googleResponse = await signInWithGoogle(googleClientId);

      /*
       * register/google.post.ts gates on verifyCaptchaOrThrow exactly like the
       * password door, and a fresh install runs proof-of-work by default. This
       * handler never solved one, so Google registration answered 400 "Security
       * verification failed" on every device — the mobile report was only where
       * it was noticed.
       */
      let captcha: any = null;
      try {
        captcha = await getCaptcha("register");
      } catch (captchaError) {
        console.error("Captcha error:", captchaError);
        toast({
          title: t("security_verification_failed"),
          description: t("please_try_again"),
          variant: "destructive",
        });
        setGoogleLoading(false);
        googleButtonClicked.current = false;
        return;
      }

      // The server re-fetches the profile from Google and checks the token's
      // audience, so the token is the only thing worth sending.
      const requestBody: any = {
        ref: refCode,
        access_token: googleResponse.access_token,
        captcha: captcha || undefined,
      };

      // Send to our backend for registration
      const { data, error } = await $fetch({
        url: "/api/auth/register/google",
        method: "POST",
        body: requestBody,
      });

      if (error) {
        toast({
          title: t("google_registration_error"),
          description:
            error || t("failed_to_register_with_google_please_try_again"),
          variant: "destructive",
        });
        setGoogleLoading(false);
        googleButtonClicked.current = false;
        return;
      }

      /*
       * register/google.post.ts answers an existing account by signing it in,
       * which means it can return a 2FA challenge: an HTTP 200 with no user and
       * no session. This form has no second-factor step, so treating it as
       * success announced "Welcome" and reloaded the page back to a guest.
       * Hand those users to the login form, which does have one.
       */
      if (data?.twoFactorToken) {
        toast({
          title: t("account_already_exists"),
          description: t("please_sign_in_to_continue"),
        });
        googleButtonClicked.current = false;
        if (onLoginClick) onLoginClick();
        return;
      }

      toast({
        title: t("registration_successful"),
        description: t("welcome_to_our_platform"),
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
      console.error("Google registration error:", error);

      /*
       * Only a real cancellation is silent. Substring-matching "cancelled" also
       * matched the old flow's 120s timeout, so a blocked popup — the mobile
       * case — showed the user nothing at all.
       */
      const isCancellation =
        error instanceof GoogleAuthError && error.code === "cancelled";

      if (!isCancellation) {
        toast({
          title: t("google_registration_error"),
          description:
            error instanceof Error
              ? error.message
              : t("failed_to_initialize_google_registration_please"),
          variant: "destructive",
        });
      }
      
      googleButtonClicked.current = false;
    } finally {
      setGoogleLoading(false);
    }
  };

  // Get color for password strength
  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 75) return "bg-success";
    if (passwordStrength >= 50) return "bg-warning";
    if (passwordStrength >= 25) return "bg-warning";
    return "bg-destructive";
  };

  // Determine if button should show loading state
  const buttonLoading =
    localLoading || googleLoading || powLoading;

  // Check if all form conditions are met
  const isFormValid = () => {
    // Check all required fields are filled
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      return false;
    }

    // Check name validation (matches backend model validation)
    const nameRegex = /^[\p{L} \-'.]+$/u;
    if (!nameRegex.test(firstName.trim())) {
      return false;
    }
    if (!nameRegex.test(lastName.trim())) {
      return false;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      return false;
    }

    // Check password meets all requirements (matches backend validation)
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false; // uppercase
    if (!/[a-z]/.test(password)) return false; // lowercase
    if (!/\d/.test(password)) return false; // numbers
    if (!/\W/.test(password)) return false; // special characters

    // Check email format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    return true;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary-ink to-primary-ink/70">
          {tCommon("create_an_account")}
        </h2>
        <p className="text-muted-foreground">
          {t("enter_your_details_to_create_your_account")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className={`relative transition-all duration-300 form-field-animate rounded-lg ${
              firstNameFocused
                ? "shadow-md ring-2 ring-primary/20"
                : firstName && (!firstName.trim() || !/^[\p{L} \-'.]+$/u.test(firstName.trim()))
                ? "ring-1 ring-destructive/50"
                : "ring-1 ring-input"
            }`}
          >
            <Input
              type="text"
              placeholder={tCommon("first_name")}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="border-0 pl-10 py-6 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
              disabled={buttonLoading}
              onFocus={() => setFirstNameFocused(true)}
              onBlur={() => setFirstNameFocused(false)}
            />
            <User
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                firstNameFocused ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </div>

          <div
            className={`relative transition-all duration-300 form-field-animate rounded-lg ${
              lastNameFocused
                ? "shadow-md ring-2 ring-primary/20"
                : lastName && (!lastName.trim() || !/^[\p{L} \-'.]+$/u.test(lastName.trim()))
                ? "ring-1 ring-destructive/50"
                : "ring-1 ring-input"
            }`}
          >
            <Input
              type="text"
              placeholder={tCommon("last_name")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="border-0 pl-10 py-6 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
              disabled={buttonLoading}
              onFocus={() => setLastNameFocused(true)}
              onBlur={() => setLastNameFocused(false)}
            />
            <User
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                lastNameFocused ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div
            className={`relative transition-all duration-300 form-field-animate rounded-lg ${
              emailFocused
                ? "shadow-md ring-2 ring-primary/20"
                : email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                ? "ring-1 ring-destructive/50"
                : "ring-1 ring-input"
            }`}
          >
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-0 pl-10 py-6 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
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

        {/* Referrer field - shown when ref parameter is present */}
        {refCode && (
          <div className="space-y-2">
            <div className="relative transition-all duration-300 form-field-animate rounded-lg ring-1 ring-input bg-muted/30">
              {/*
                No "Loading..." in the field.

                `refCode` comes off the URL, so it is in hand before the lookup
                is even sent — the fetch only UPGRADES it to a display name.
                Writing the literal string "Loading..." into a form control
                threw away a value we already had in order to say nothing, and
                a read-only field is exactly where a user checks that the code
                they clicked is the code that got applied. Now the field shows
                the code immediately and refines to the name; nothing about its
                box changes either way, because an input is the same height
                whatever is in it.
              */}
              <Input
                type="text"
                placeholder={tCommon("referrer")}
                value={referrerInfo?.name || refCode}
                readOnly
                className="border-0 pl-10 py-6 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base text-muted-foreground cursor-not-allowed"
                disabled
              />
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
              />
              {/*
                ONE 16px glyph in both states, tinted rather than swapped.

                This was a `<div className="animate-spin ... h-4 w-4">` traded
                for a `<CheckCircle2 className="h-4 w-4">` — two different
                elements standing in the same 16px slot, which React tears down
                and rebuilds at the exact moment the lookup returns. Keeping the
                check and moving only its COLOUR means the transition is a
                colour transition, and there is no second element whose size
                has to be kept in agreement with the first.

                It stays honest about what it knows: muted and pulsing is "this
                code has not been confirmed against a person yet", green is
                "it has". `animate-pulse` is the same signal every skeleton in
                this app uses for a pending value, so it reads as waiting
                rather than as a disabled control.
              */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <CheckCircle2
                  className={`h-4 w-4 transition-colors ${
                    loadingReferrer
                      ? "animate-pulse text-muted-foreground/50"
                      : "text-success"
                  }`}
                />
              </div>
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Info className="h-3 w-3 mr-1" />
              <span>
                {t("you_were_referred_by")}:
                {/* `"..."` is a three-character stand-in for a name that runs
                    ten to twenty, so this line visibly stretched as the lookup
                    landed. The placeholder is the REAL fallback value —
                    `ID: {refCode}` is what renders when no name comes back —
                    so the pending width is the resolved width in that case and
                    close to it in the other. */}
                <span className="font-medium text-foreground ml-1">
                  <Loadable loading={loadingReferrer} placeholder={t("id", { refCode: String(refCode) })}>
                    {referrerInfo?.name || t("id", { refCode: String(refCode) })}
                  </Loadable>
                </span>
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div
            className={`relative transition-all duration-300 form-field-animate rounded-lg ${
              passwordFocused
                ? "shadow-md ring-2 ring-primary/20"
                : password && passwordStrength < 100
                ? "ring-1 ring-destructive/50"
                : "ring-1 ring-input"
            }`}
          >
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-0 pl-10 pr-10 py-6 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
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

          {/* Password requirements and strength meter */}
          <div className="space-y-2 mt-2">
            {!password && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center mb-1">
                  <Info className="h-3 w-3 mr-1" />
                  <span className="font-medium">{t("password_must_contain")}:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 ml-4 text-xs">
                  <li>{t("at_least_8_characters")}</li>
                  <li>{t("one_uppercase_letter")}</li>
                  <li>{t("one_lowercase_letter")}</li>
                  <li>{t("one_number")}</li>
                  <li>{t("one_special_character")}</li>
                </ul>
              </div>
            )}
            
            {password && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs flex items-center">
                    <Info className="h-3 w-3 mr-1 text-muted-foreground" />
                    <span>{t("password_strength")}</span>
                  </div>
                  <div className="text-xs">
                    <span
                      className={`
                        ${passwordStrength === 100 ? "text-success" : ""}
                        ${passwordStrength >= 60 && passwordStrength < 100 ? "text-warning" : ""}
                        ${passwordStrength >= 20 && passwordStrength < 60 ? "text-warning" : ""}
                        ${passwordStrength > 0 && passwordStrength < 20 ? "text-destructive" : ""}
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
              placeholder={tCommon("confirm_password")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`border-0 pl-10 pr-10 py-6 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 ${
                confirmPassword && password !== confirmPassword
                  ? "text-destructive"
                  : ""
              }`}
              disabled={buttonLoading}
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

        {refCode && (
          <div className="space-y-2">
            <div className="relative p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center">
                <span className="text-primary font-medium mr-2">#</span>
                <span>{loadingReferrer ? `${tCommon("loading")}…` : (referrerInfo?.name || t("id", { refCode: String(refCode) }))}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("referral_code_applied")}
              </p>
            </div>
          </div>
        )}

        {/*
          `<Button loading>`, not a hand-rolled two-branch swap.

          What was here was a 20-line inline `<svg>` spinner wrapped in one
          `<span className="flex items-center justify-center">`, traded for a
          second, differently-populated span — a full subtree replacement for a
          control whose only real difference is which word is on it and whether
          something is spinning. `Button` already owns both: it draws a `size-4`
          spinner into its leading slot when `loading`, sets `aria-busy` so the
          state is announced rather than merely animated, and folds `loading`
          into its own `disabled`.

          `disabled` keeps `buttonLoading` even so, and the two are not
          redundant: `buttonLoading` is
          `localLoading || (isLoading && googleButtonClicked) || powLoading`, so
          it also covers the proof-of-work captcha solve and an in-flight Google
          sign-in. Those disable the control without being what the spinner is
          about — the spinner says "your registration is being submitted", and
          `localLoading` is the only one of the three that means that.

          The two wrapper spans are gone as well: `Button`'s base is already
          `inline-flex items-center justify-center gap-2`, so they were
          re-declaring the layout they sat inside.

          NOTHING MOVES between the two states. The button is `w-full`, so the
          longer pending label re-centres inside a box whose width is set by the
          form, not by its own content, and `py-6 text-base` fixes the height in
          both. The arrow stays put through the whole submit rather than
          vanishing and returning — it is a TRAILING glyph, so unlike a leading
          icon it never competes with the spinner slot for position.

          No auth logic, validation or proof-of-work handling is touched here —
          `isFormValid()`, `buttonLoading` and `localLoading` all keep exactly
          the meanings they had.
        */}
        {showCaptchaSlot && (
          <div
            ref={captchaRef}
            className="flex justify-center empty:hidden"
            data-testid="captcha-slot"
          />
        )}

        <Button
          type="submit"
          className="w-full py-6 text-base bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          loading={localLoading}
          disabled={buttonLoading || !isFormValid()}
        >
          {localLoading ? `${t("creating_account")}.` : tCommon("create_account")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      {googleAuthStatus && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t("or_continue_with")}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full py-6 text-base relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGoogleButtonClick}
            disabled={buttonLoading}
          >
            <span className="absolute inset-0 w-full h-full transition-all duration-300 ease-out transform translate-x-0 -skew-x-12 bg-linear-to-r from-primary/10 to-transparent group-hover:translate-x-full group-hover:-skew-x-12"></span>
            <span className="absolute inset-0 w-full h-full transition-all duration-300 ease-out transform skew-x-12 bg-linear-to-r from-transparent to-primary/10 group-hover:translate-x-full group-hover:skew-x-12"></span>

            <span className="relative flex items-center justify-center">
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
              {googleLoading
                ? `${tCommon("connecting")}…`
                : t("continue_with_google")}
            </span>
          </Button>
        </>
      )}

      {/* Social proof */}
      <div className="text-center text-xs text-muted-foreground">
        <p>{t("join_over_10000_users_worldwide")}</p>
        <div className="flex justify-center mt-2 space-x-1">
          {[...Array(5)].map((_, i) => (
            <CheckCircle2 key={i} className="h-3 w-3 text-primary" />
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {t("already_have_an_account")}{" "}
          <Button
            variant="link"
            className="p-0 h-auto font-semibold"
            onClick={onLoginClick}
          >
            {tCommon("sign_in")}
          </Button>
        </p>
      </div>
    </div>
  );
}
