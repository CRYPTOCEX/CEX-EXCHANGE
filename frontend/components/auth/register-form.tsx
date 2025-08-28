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
import { useUserStore } from "@/store/user";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { openGoogleLoginPopup } from "@/utils/google-auth";
import { $fetch } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

// Environment variables
const recaptchaEnabled =
  process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_STATUS === "true";
const recaptchaSiteKey = process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY;
const googleAuthStatus =
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_STATUS === "true";
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
  const t = useTranslations("components/auth/register-form");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const register = useUserStore((state) => state.register);
  const isLoading = useUserStore((state) => state.isLoading);
  const error = useUserStore((state) => state.error);

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

  // Fetch referrer information when refCode changes
  useEffect(() => {
    const fetchReferrerInfo = async () => {
      if (refCode) {
        setLoadingReferrer(true);
        try {
          const { data, error } = await $fetch({
            url: `/api/public/referrer/${refCode}`,
            method: "GET",
            silent: true,
          });
          
          if (data && !error) {
            setReferrerInfo(data);
          } else {
            // If fetching fails, just show the code
            setReferrerInfo(null);
          }
        } catch (err) {
          console.error("Failed to fetch referrer info:", err);
          setReferrerInfo(null);
        } finally {
          setLoadingReferrer(false);
        }
      }
    };

    fetchReferrerInfo();
  }, [refCode]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [script, setScript] = useState<HTMLScriptElement | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Track if Google button was clicked
  const googleButtonClicked = useRef(false);

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
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      const recaptchaContainer = document.querySelector(".grecaptcha-badge");
      if (recaptchaContainer && recaptchaContainer.parentNode) {
        recaptchaContainer.parentNode.removeChild(recaptchaContainer);
      }
    };
  }, []);

  // Watch for errors from the store
  useEffect(() => {
    if (error && googleButtonClicked.current) {
      toast({
        title: "Google login error",
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
        title: "Invalid first name",
        description: "First name can only contain letters, spaces, hyphens, apostrophes, and periods.",
        variant: "destructive",
      });
      return;
    }

    if (!lastName.trim() || !nameRegex.test(lastName.trim())) {
      toast({
        title: "Invalid last name",
        description: "Last name can only contain letters, spaces, hyphens, apostrophes, and periods.",
        variant: "destructive",
      });
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    // Validate password strength (matches backend requirements)
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!/[A-Z]/.test(password)) {
      toast({
        title: "Password missing uppercase",
        description: "Password must contain at least one uppercase letter.",
        variant: "destructive",
      });
      return;
    }

    if (!/[a-z]/.test(password)) {
      toast({
        title: "Password missing lowercase",
        description: "Password must contain at least one lowercase letter.",
        variant: "destructive",
      });
      return;
    }

    if (!/\d/.test(password)) {
      toast({
        title: "Password missing numbers",
        description: "Password must contain at least one number.",
        variant: "destructive",
      });
      return;
    }

    if (!/\W/.test(password)) {
      toast({
        title: "Password missing special characters",
        description: "Password must contain at least one special character.",
        variant: "destructive",
      });
      return;
    }

    setLocalLoading(true);

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
                action: "register",
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
            setLocalLoading(false);
            return;
          }
        } catch (recaptchaError) {
          console.error("reCAPTCHA error:", recaptchaError);
          toast({
            title: "reCAPTCHA Error",
            description: "Failed to verify reCAPTCHA. Please try again.",
            variant: "destructive",
          });
          setLocalLoading(false);
          return;
        }
      }

      // Call register with reCAPTCHA token
      const result = await registerWithRecaptcha({
        firstName,
        lastName,
        email,
        password,
        ref: refCode || undefined,
        recaptchaToken,
      });

      console.log("Registration result:", result);
      console.log("User store error:", useUserStore.getState().error);

      if (result.success) {
        if (result.userLoggedIn) {
          // User is automatically logged in
          toast({
            title: "Registration successful",
            description: "Welcome to our platform!",
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
          const needsEmailVerification = process.env.NEXT_PUBLIC_VERIFY_EMAIL_STATUS === "true";
          
          if (onRegistrationSuccess) {
            onRegistrationSuccess(email, needsEmailVerification);
          } else {
            // Fallback to old behavior if onRegistrationSuccess is not provided
            toast({
              title: "Registration successful",
              description: result.data?.message || "Please check your email to verify your account.",
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
          title: "Registration failed",
          description: errorDescription,
          variant: "destructive",
        });
        
        // DO NOT call onSuccess() here - keep modal open for user to fix the error
      }
    } catch (error) {
      toast({
        title: "Registration error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLocalLoading(false);
    }
  };

  // Helper function to call register with reCAPTCHA
  const registerWithRecaptcha = async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    ref?: string;
    recaptchaToken: string | null;
  }) => {
    const { register } = useUserStore.getState();
    
    // If we have a recaptchaToken, use the direct API call with token
    if (recaptchaEnabled && userData.recaptchaToken) {
      useUserStore.setState({ isLoading: true, error: null });
      
      try {
        const { data, error } = await $fetch({
          url: "/api/auth/register",
          method: "POST",
          body: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            password: userData.password,
            ref: userData.ref,
            recaptchaToken: userData.recaptchaToken,
          },
        });

        // First check if there's an explicit error
        if (error) {
          console.log("Registration error detected:", error);
          useUserStore.setState({ error, isLoading: false });
          return { success: false, data: null, userLoggedIn: false };
        }

        // Check if response data indicates an error (fallback for HTTP 200 with error content)
        if (data && typeof data === "object") {
          // If the response contains just a message without success indicators, check if it's an error or success
          if (data.message && !data.cookies && !data.user && !data.accessToken) {
            const messageText = data.message.toLowerCase();
            
            // Success patterns - messages that indicate successful operations
            const successPatterns = [
              'successful',
              'success',
              'verify your email',
              'verification email sent',
              'registered successfully',
              'registration successful',
              'created successfully',
              'completed',
              'sent',
              'you have been registered successfully',
              'you have been logged in successfully',
              'email verified successfully',
              'password reset successfully',
              'email with reset instructions sent successfully',
              'otp saved successfully',
              'otp resent successfully',
              'you have been logged out',
              'user already registered but email not verified'
            ];
            
            // Error patterns - messages that indicate errors
            const errorPatterns = [
              'already in use',
              'not found',
              'invalid',
              'failed',
              'error',
              'denied',
              'forbidden',
              'unauthorized',
              'expired',
              'missing',
              'required'
            ];
            
            const looksLikeSuccess = successPatterns.some(pattern => messageText.includes(pattern));
            const looksLikeError = errorPatterns.some(pattern => messageText.includes(pattern));
            
            if (looksLikeError) {
              const errorMessage = data.message;
              console.log("Registration failed - error message in response:", errorMessage);
              useUserStore.setState({ error: errorMessage, isLoading: false });
              return { success: false, data: null, userLoggedIn: false };
            } else if (looksLikeSuccess) {
              console.log("Registration succeeded - success message in response:", data.message);
              useUserStore.setState({ isLoading: false, error: null });
              return { success: true, data: data, userLoggedIn: false };
            }
            // If it's neither clearly success nor error, fall through to default handling
          }
          
          // Check for explicit error fields
          if (data.error || data.errors || data.success === false) {
            const errorMessage = data.error || data.message || "Registration failed";
            console.log("Registration failed - error fields in response:", errorMessage);
            useUserStore.setState({ error: errorMessage, isLoading: false });
            return { success: false, data: null, userLoggedIn: false };
          }
        }

        // If the backend returns tokens, it means the user is logged in
        if (data && data.cookies) {
          // Try to fetch user profile after successful registration with tokens
          try {
            const { data: profileData, error: profileError } = await $fetch({
              url: "/api/user/profile",
              method: "GET",
              silentSuccess: true,
            });

            if (profileData && !profileError) {
              useUserStore.setState({
                user: profileData,
                isLoading: false,
                error: null,
              });
              return { success: true, data: data, userLoggedIn: true };
            }
          } catch (profileFetchError) {
            console.warn("Error fetching user profile after registration:", profileFetchError);
          }
        }

        useUserStore.setState({ isLoading: false });
        return { success: true, data: data, userLoggedIn: false };
      } catch (error) {
        useUserStore.setState({
          error: error instanceof Error ? error.message : "Registration failed",
          isLoading: false,
        });
        return { success: false, data: null, userLoggedIn: false };
      }
    } else {
      // Use the store's register function if reCAPTCHA is disabled
      return await register({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        ref: userData.ref,
      });
    }
  };

  const handleGoogleButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading || localLoading) return;

    try {
      setLocalLoading(true);
      googleButtonClicked.current = true;

      // Open Google login popup and get the ID token
      const idToken = await openGoogleLoginPopup(googleClientId);

      // Send the ID token to our backend for registration
      const { data, error } = await $fetch({
        url: "/api/auth/register/google",
        method: "POST",
        body: { token: idToken, ref: refCode },
      });

      if (error) {
        toast({
          title: "Google registration error",
          description:
            error || "Failed to register with Google. Please try again.",
          variant: "destructive",
        });
        setLocalLoading(false);
        googleButtonClicked.current = false;
        return;
      }

      // Update user state with the returned user data
      useUserStore.getState().setUser(data.user);

      toast({
        title: "Registration successful",
        description: "Welcome to our platform!",
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
      
      // Check if it's a cancellation error and don't show toast for user cancellation
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isCancellation = errorMessage.includes("cancelled") || errorMessage.includes("closed");
      
      if (!isCancellation) {
        toast({
          title: "Google registration error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to initialize Google registration. Please try again.",
          variant: "destructive",
        });
      }
      
      googleButtonClicked.current = false;
    } finally {
      setLocalLoading(false);
    }
  };

  // Get color for password strength
  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 75) return "bg-green-500";
    if (passwordStrength >= 50) return "bg-yellow-500";
    if (passwordStrength >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  // Determine if button should show loading state
  const buttonLoading =
    localLoading || (isLoading && googleButtonClicked.current);

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
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
          {t("create_an_account")}
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
              placeholder="First Name"
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
              placeholder="Last Name"
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
              <Input
                type="text"
                placeholder={t("referrer")}
                value={loadingReferrer ? "Loading..." : (referrerInfo?.name || refCode)}
                readOnly
                className="border-0 pl-10 py-6 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base text-muted-foreground cursor-not-allowed"
                disabled
              />
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {loadingReferrer ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Info className="h-3 w-3 mr-1" />
              <span>
                {t("you_were_referred_by")}: 
                <span className="font-medium text-foreground ml-1">
                  {loadingReferrer ? "..." : (referrerInfo?.name || `ID: ${refCode}`)}
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
                  <span className="font-medium">Password must contain:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 ml-4 text-xs">
                  <li>At least 8 characters</li>
                  <li>One uppercase letter</li>
                  <li>One lowercase letter</li>
                  <li>One number</li>
                  <li>One special character</li>
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
                        ${passwordStrength === 100 ? "text-green-500" : ""}
                        ${passwordStrength >= 60 && passwordStrength < 100 ? "text-yellow-500" : ""}
                        ${passwordStrength >= 20 && passwordStrength < 60 ? "text-orange-500" : ""}
                        ${passwordStrength > 0 && passwordStrength < 20 ? "text-red-500" : ""}
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
              placeholder="Confirm Password"
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
                <span>{loadingReferrer ? "Loading..." : (referrerInfo?.name || `ID: ${refCode}`)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("referral_code_applied")}
              </p>
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full py-6 text-base relative overflow-hidden btn-glow transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={
            buttonLoading || !isFormValid()
          }
        >
          {localLoading ? (
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
              {t("creating_account")}.
            </span>
          ) : (
            <span className="flex items-center justify-center">
              {t("create_account")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </span>
          )}
        </Button>

        {recaptchaEnabled && (
          <div id="recaptcha-container" className="hidden"></div>
        )}
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
            <span className="absolute inset-0 w-full h-full transition-all duration-300 ease-out transform translate-x-0 -skew-x-12 bg-gradient-to-r from-primary/10 to-transparent group-hover:translate-x-full group-hover:-skew-x-12"></span>
            <span className="absolute inset-0 w-full h-full transition-all duration-300 ease-out transform skew-x-12 bg-gradient-to-r from-transparent to-primary/10 group-hover:translate-x-full group-hover:skew-x-12"></span>

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
              {isLoading && googleButtonClicked.current
                ? "Connecting..."
                : "Continue with Google"}
            </span>
          </Button>
        </>
      )}

      {/* Social proof */}
      <div className="text-center text-xs text-muted-foreground">
        <p>{t("join_over_10000+_users_worldwide")}</p>
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
            {t("sign_in")}
          </Button>
        </p>
      </div>
    </div>
  );
}
