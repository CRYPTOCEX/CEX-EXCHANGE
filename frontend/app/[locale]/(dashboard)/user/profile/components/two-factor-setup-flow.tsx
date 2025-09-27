"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  X,
  Smartphone,
  Mail,
  Copy,
  Check,
  RefreshCw,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

interface TwoFactorSetupFlowProps {
  onCancel: () => void;
  onComplete: () => void;
}

type TwoFactorMethod = "APP" | "SMS" | "EMAIL" | null;
type TwoFactorSetupStep = "select" | "setup" | "verify" | "success";

export function TwoFactorSetupFlow({
  onCancel,
  onComplete,
}: TwoFactorSetupFlowProps) {
  const t = useTranslations("dashboard");
  const { user, setUser } = useUserStore();
  const { toast } = useToast();
  const [step, setStep] = useState<TwoFactorSetupStep>("select");
  const [method, setMethod] = useState<TwoFactorMethod>(
    (user?.twoFactor?.type as TwoFactorMethod) || null
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [secretCopied, setSecretCopied] = useState(false);
  const [codeInputs, setCodeInputs] = useState<string[]>(Array(6).fill(""));
  const [activeInput, setActiveInput] = useState(0);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [otpSecret, setOtpSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // Refs to track if API calls are in progress
  const apiCallInProgressRef = useRef(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleMethodChange = (value: string) => {
    setMethod(value as TwoFactorMethod);
  };

  const handleSelectMethod = async () => {
    if (!method || apiCallInProgressRef.current) return;

    // Validate SMS method requires phone number
    if (method === "SMS" && !user?.phone) {
      toast({
        title: "Phone Number Required",
        description: "Please update your profile with a phone number to use SMS authentication.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    apiCallInProgressRef.current = true;

    try {
      // Generate OTP secret based on selected method
      const payload = {
        type: method, // No need to map EMAIL to APP anymore
        phoneNumber: method === "SMS" ? user?.phone : undefined,
        email: user?.email,
      };

      const response = await $fetch({
        url: "/api/user/profile/otp/secret",
        method: "POST",
        body: payload,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setOtpSecret(response.data.secret);
      if (method === "APP" || method === "EMAIL") {
        setQrCodeUrl(response.data.qrCode);
      }

      setStep("setup");
    } catch (error) {
      console.error("Error generating OTP secret:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate OTP secret",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      apiCallInProgressRef.current = false;
    }
  };

  const handleSetupComplete = async () => {
    if (apiCallInProgressRef.current) return;

    setIsLoading(true);
    apiCallInProgressRef.current = true;

    try {
      if (method === "SMS" || method === "EMAIL") {
        // For SMS and EMAIL, we need to send a verification code
        // This is handled by the secret endpoint already for SMS
        // For EMAIL, we'd need a separate endpoint, but we're using APP flow for EMAIL
        setCountdown(60);
      }

      setStep("verify");
    } catch (error) {
      console.error("Error completing setup:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to complete setup",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      apiCallInProgressRef.current = false;
    }
  };

  const handleVerify = async () => {
    if (
      codeInputs.some((input) => !input) ||
      codeInputs.join("").length !== 6 ||
      apiCallInProgressRef.current
    ) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    apiCallInProgressRef.current = true;

    try {
      // Verify OTP
      const verifyResponse = await $fetch({
        url: "/api/user/profile/otp/verify",
        method: "POST",
        body: {
          otp: codeInputs.join(""),
          secret: otpSecret,
          type: method, // No need to map EMAIL to APP anymore
        },
      });

      if (verifyResponse.error) {
        throw new Error(verifyResponse.error);
      }

      // Save OTP configuration and get recovery codes in one call
      const saveResponse = await $fetch({
        url: "/api/user/profile/otp/index",
        method: "POST",
        body: {
          secret: otpSecret,
          type: method, // No need to map EMAIL to APP anymore
        },
      });

      if (saveResponse.error) {
        throw new Error(saveResponse.error);
      }

      // Set recovery codes from the response
      setRecoveryCodes(saveResponse.data.recoveryCodes || []);

      // Update user in store
      await setUser({
        ...user,
        twoFactor: {
          enabled: true,
          type: method,
        },
      } as any);

      setStep("success");
    } catch (error) {
      console.error("Error verifying code:", error);
      toast({
        title: "Verification Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to verify the code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
      apiCallInProgressRef.current = false;
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(otpSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const handleCodeInputChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCodeInputs = [...codeInputs];
    newCodeInputs[index] = value.slice(0, 1);
    setCodeInputs(newCodeInputs);

    // Auto-focus next input if current input is filled
    if (value && index < 5) {
      setActiveInput(index + 1);
      document.getElementById(`code-input-${index + 1}`)?.focus();
    } else if (index > 0 && !value) {
      // If backspace is pressed and current input is empty, focus previous input
      setActiveInput(index - 1);
      document.getElementById(`code-input-${index - 1}`)?.focus();
    }
  };

  const handleResendCode = async () => {
    if (apiCallInProgressRef.current) return;

    setIsResendingCode(true);
    apiCallInProgressRef.current = true;

    try {
      // Regenerate OTP secret
      const payload = {
        type: method, // No need to map EMAIL to APP anymore
        phoneNumber: method === "SMS" ? user?.phone : undefined,
        email: user?.email,
      };

      const response = await $fetch({
        url: "/api/user/profile/otp/secret",
        method: "POST",
        body: payload,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setOtpSecret(response.data.secret);
      setCountdown(60);

      toast({
        title: "Code Resent",
        description: `A new verification code has been sent to your ${method === "SMS" ? "phone" : "email"}.`,
      });
    } catch (error) {
      console.error("Error resending code:", error);
      toast({
        title: "Failed to Resend",
        description: "Could not resend verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResendingCode(false);
      apiCallInProgressRef.current = false;
    }
  };

  const handleDownloadRecoveryCodes = () => {
    const element = document.createElement("a");
    const file = new Blob([recoveryCodes.join("\n")], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "recovery-codes.txt";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  };

  const renderStepIndicator = () => {
    return (
      <div className="w-full mb-8">
        <div className="flex justify-between mb-2">
          <div
            className={`text-sm font-medium ${step === "select" ? "text-primary" : "text-zinc-500 dark:text-zinc-400"}`}
          >
            {t("select_method")}
          </div>
          <div
            className={`text-sm font-medium ${step === "setup" ? "text-primary" : "text-zinc-500 dark:text-zinc-400"}`}
          >
            {t("Setup")}
          </div>
          <div
            className={`text-sm font-medium ${step === "verify" ? "text-primary" : "text-zinc-500 dark:text-zinc-400"}`}
          >
            {t("Verify")}
          </div>
          <div
            className={`text-sm font-medium ${step === "success" ? "text-primary" : "text-zinc-500 dark:text-zinc-400"}`}
          >
            {t("Complete")}
          </div>
        </div>
        <div className="relative w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-500"
            style={{
              width:
                step === "select"
                  ? "25%"
                  : step === "setup"
                    ? "50%"
                    : step === "verify"
                      ? "75%"
                      : "100%",
            }}
          />
        </div>
      </div>
    );
  };

  const renderMethodSelection = () => {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            {user?.twoFactor?.enabled
              ? "Change Authentication Method"
              : "Choose Authentication Method"}
          </h2>
          <p className="text-muted-foreground">
            {t("select_your_preferred_two-factor_authentication")}
          </p>
        </div>

        <RadioGroup
          value={method || ""}
          onValueChange={handleMethodChange}
          className="space-y-4"
        >
          <Card
            className={`overflow-hidden cursor-pointer transition-all duration-200 ${method === "APP" ? "border-primary ring-2 ring-primary/10" : "hover:border-primary/50"}`}
            onClick={() => setMethod("APP")}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <RadioGroupItem value="APP" id="app" className="mt-1" />
                <div className="flex-1">
                  <Label
                    htmlFor="app"
                    className="text-base font-medium cursor-pointer"
                  >
                    {t("authenticator_app")}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("use_google_authenticator_verification_codes")}.{" "}
                    {t("this_method_works_secure_option")}.
                  </p>
                </div>
                <div className="bg-primary/10 p-2 rounded-full">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`overflow-hidden cursor-pointer transition-all duration-200 ${method === "SMS" ? "border-primary ring-2 ring-primary/10" : "hover:border-primary/50"}`}
            onClick={() => setMethod("SMS")}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <RadioGroupItem value="SMS" id="sms" className="mt-1" />
                <div className="flex-1">
                  <Label
                    htmlFor="sms"
                    className="text-base font-medium cursor-pointer"
                  >
                    {t("sms_authentication")}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("receive_verification_codes_phone_number")}.{" "}
                    {t("simple_to_use_but_requires_cellular_service")}.
                  </p>
                </div>
                <div className="bg-primary/10 p-2 rounded-full">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`overflow-hidden cursor-pointer transition-all duration-200 ${method === "EMAIL" ? "border-primary ring-2 ring-primary/10" : "hover:border-primary/50"}`}
            onClick={() => setMethod("EMAIL")}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <RadioGroupItem value="EMAIL" id="email" className="mt-1" />
                <div className="flex-1">
                  <Label
                    htmlFor="email"
                    className="text-base font-medium cursor-pointer"
                  >
                    {t("email_authentication")}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("receive_verification_codes_email_address")}.{" "}
                    {t("convenient_but_requires_email_access")}.
                  </p>
                </div>
                <div className="bg-primary/10 p-2 rounded-full">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </RadioGroup>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("Back")}
          </Button>
          <Button onClick={handleSelectMethod} disabled={!method || isLoading}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t("Loading")}.
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderSetup = () => {
    if (method === "APP" || method === "EMAIL") {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">
              {t("set_up_authenticator_app")}
            </h2>
            <p className="text-muted-foreground">
              {t("follow_these_steps_authenticator_app")}
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                1. {t("install_an_authenticator_app")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("if_you_havent_microsoft_authenticator")}.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                2. {t("scan_this_qr_code")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("open_your_authenticator_your_account")}.
              </p>
              <div className="flex justify-center py-4">
                <div className="bg-white dark:bg-zinc-100 p-4 rounded-lg border border-zinc-200 dark:border-zinc-300 shadow-sm">
                  <div className="relative">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl || "/placeholder.svg"}
                        alt="QR Code for authenticator app"
                        className="h-48 w-48"
                      />
                    ) : (
                      <div className="h-48 w-48 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                        <RefreshCw className="h-8 w-8 animate-spin text-zinc-400 dark:text-zinc-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full bg-white/80 shadow-md flex items-center justify-center">
                        <Shield className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("cant_scan_the_key_instead")}
              </p>
              <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-md font-mono text-center relative">
                {otpSecret || "Loading..."}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2"
                  onClick={handleCopySecret}
                  disabled={!otpSecret}
                >
                  {secretCopied ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                3. {t("verify_setup")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("after_scanning_the_30_seconds")}.{" "}
                {t("youll_use_this_next_step")}.
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep("select")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("Back")}
            </Button>
            <Button onClick={handleSetupComplete} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t("Loading")}.
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      );
    }

    if (method === "SMS") {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">
              {t("set_up_sms_authentication")}
            </h2>
            <p className="text-muted-foreground">
              {t("verify_your_phone_via_sms")}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t("phone_number")}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={user?.phone || ""}
                disabled
              />
              <p className="text-sm text-muted-foreground">
                {t("this_is_the_your_account")}.{" "}
                {t("to_change_it_update_your_profile_information")}.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t("make_sure_your_to_it")}. {t("youll_need_it_log_in")}.
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep("select")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("Back")}
            </Button>
            <Button onClick={handleSetupComplete} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t("Loading")}.
                </>
              ) : (
                "Send Verification Code"
              )}
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderVerify = () => {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{t("verify_your_identity")}</h2>
          <p className="text-muted-foreground">
            {method === "APP"
              ? "Enter the 6-digit code from your authenticator app"
              : method === "EMAIL"
                ? "Enter the 6-digit code sent to your email"
                : method === "SMS"
                  ? "Enter the 6-digit code sent to your phone"
                  : "Enter the 6-digit verification code"}
          </p>
        </div>

        <div className="space-y-4">
          <Label htmlFor="verificationCode">{t("verification_code")}</Label>
          <div className="flex justify-center gap-2 sm:gap-3">
            {codeInputs.map((value, index) => (
              <Input
                key={index}
                id={`code-input-${index}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={value}
                onChange={(e) => handleCodeInputChange(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !value && index > 0) {
                    setActiveInput(index - 1);
                    document.getElementById(`code-input-${index - 1}`)?.focus();
                  }
                }}
                onFocus={() => setActiveInput(index)}
                autoFocus={index === activeInput}
                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold p-0 border-2 focus:ring-2 focus:ring-primary/50"
              />
            ))}
          </div>

          <div className="text-sm text-muted-foreground text-center">
            {method === "APP" ? (
              <p>{t("open_your_authenticator_verification_code")}.</p>
            ) : method === "EMAIL" ? (
              <div className="space-y-2">
                <p>
                  {t("weve_sent_a_verification_code_to_your")} email.{" "}
                  {t("it_may_take_a_moment_to_arrive")}.
                </p>
                <p>
                  {countdown > 0 ? (
                    <span>
                      {t("resend_code_in")} {countdown} {t("seconds")}
                    </span>
                  ) : (
                    <Button
                      variant="link"
                      className="p-0 h-auto text-primary"
                      onClick={handleResendCode}
                      disabled={isResendingCode}
                    >
                      {isResendingCode ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          {t("Resending")}...
                        </>
                      ) : (
                        "Resend code"
                      )}
                    </Button>
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  {t("weve_sent_a_verification_code_to_your")}{" "}
                  {method === "SMS" ? "phone" : "email"}
                  {t("it_may_take_a_moment_to_arrive")}.
                </p>
                <p>
                  {countdown > 0 ? (
                    <span>
                      {t("resend_code_in")}
                      {countdown}
                      {t("seconds")}
                    </span>
                  ) : (
                    <Button
                      variant="link"
                      className="p-0 h-auto text-primary"
                      onClick={handleResendCode}
                      disabled={isResendingCode}
                    >
                      {isResendingCode ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          {t("Resending")}.
                        </>
                      ) : (
                        "Resend code"
                      )}
                    </Button>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setStep("setup")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("Back")}
          </Button>
          <Button
            onClick={handleVerify}
            disabled={isVerifying || codeInputs.some((input) => !input)}
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t("Verifying")}.
              </>
            ) : (
              "Verify"
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderSuccess = () => {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold">{t("setup_complete")}</h2>
          <p className="text-muted-foreground">
            {t("two-factor_authentication_has_successfully_enabled")}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            {t("your_account_is_two-factor_authentication")}.{" "}
            {t("youll_need_to_log_in")}.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">{t("recovery_codes")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("save_these_recovery_codes_in_a_secure_place")}.{" "}
            {t("you_can_use_authentication_device")}.
          </p>

          <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-md font-mono text-sm">
            <div className="grid grid-cols-2 gap-2">
              {recoveryCodes.map((code, index) => (
                <div key={index} className="overflow-hidden text-ellipsis">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleDownloadRecoveryCodes}
            >
              <Copy className="h-4 w-4 mr-2" />
              {t("download_recovery_codes")}
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleComplete}>{t("Finish")}</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 w-full">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4"
        onClick={onCancel}
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-bold">
          {t("two-factor_authentication_setup")}
        </h1>
      </div>

      {renderStepIndicator()}

      {step === "select" && renderMethodSelection()}
      {step === "setup" && renderSetup()}
      {step === "verify" && renderVerify()}
      {step === "success" && renderSuccess()}
    </div>
  );
}
