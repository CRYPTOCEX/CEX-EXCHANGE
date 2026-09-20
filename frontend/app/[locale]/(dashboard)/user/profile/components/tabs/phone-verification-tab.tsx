"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import {
  Phone,
  RefreshCw,
  Check,
  Shield,
  Smartphone,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";
import { $fetch } from "@/lib/api";
import { normalizePhoneE164, isValidPhoneE164 } from "@/lib/phone";

type VerificationStep = "phone" | "code" | "success";

export function PhoneVerificationTab() {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const { user, setUser } = useUserStore();
  const { toast } = useToast();

  const [step, setStep] = useState<VerificationStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [codeInputs, setCodeInputs] = useState<string[]>(Array(6).fill(""));
  const [progress, setProgress] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Progress calculation
  useEffect(() => {
    if (step === "phone") setProgress(33);
    else if (step === "code") setProgress(66);
    else if (step === "success") setProgress(100);
  }, [step]);

  // Reset state when user.phone changes
  useEffect(() => {
    setStep("phone");
    setPhoneNumber(user?.phone || "");
    setCodeInputs(Array(6).fill(""));
    setCountdown(0);
  }, [user?.phone]);

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Delegates to the shared helper so every phone field normalizes identically.
  const formatPhoneNumber = (value: string) => normalizePhoneE164(value);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: t("phone_number_required"),
        description: t("please_enter_your_phone_number"),
        variant: "destructive",
      });
      return;
    }

    // E.164 format: leading "+" followed by 7-15 digits (country code + subscriber number)
    const digits = phoneNumber.replace(/\D/g, "");
    const e164PhoneNumber = `+${digits}`;
    if (!isValidPhoneE164(e164PhoneNumber)) {
      toast({
        title: t("invalid_phone_number"),
        description:
          t("please_enter_a_valid_phone_number"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await $fetch({
        url: "/api/user/phone/send",
        method: "POST",
        body: { phoneNumber: e164PhoneNumber },
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: t("code_sent_successfully"),
        description: t("check_your_phone_for_the_verification_code"),
      });

      setStep("code");
      setCountdown(60);

      // Auto-focus first input after animation
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    } catch (error) {
      console.error("Error sending verification code:", error);
      toast({
        title: t("failed_to_send_code"),
        description:
          error instanceof Error
            ? error.message
            : t("failed_to_send_verification_code"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = codeInputs.join("");

    if (code.length !== 6) {
      toast({
        title: t("invalid_code"),
        description: t("please_enter_the_complete_6_digit"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await $fetch({
        url: "/api/user/phone/verify",
        method: "POST",
        body: { code },
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (user) {
        setUser({
          ...user,
          phone: phoneNumber,
          phoneVerified: true,
        });
      }

      toast({
        title: t("phone_verified_successfully"),
        description: t("your_account_is_now_more_secure"),
      });

      setStep("success");
    } catch (error) {
      console.error("Error verifying code:", error);
      toast({
        title: tCommon("verification_failed"),
        description:
          error instanceof Error ? error.message : t("failed_to_verify_code"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCodeInputs = [...codeInputs];
    newCodeInputs[index] = value.slice(0, 1);
    setCodeInputs(newCodeInputs);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codeInputs[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text");
    const digits = paste.replace(/\D/g, "").slice(0, 6);

    if (digits.length === 6) {
      setCodeInputs(digits.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    await handleSendCode();
  };

  return (
    <div className="min-h-[calc(80vh)] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {/* Both of these were `from-primary to-primary` — identical stops, so a
              flat `--primary` all along. The clipped one also paid for a
              `text-transparent` that hides the title outright wherever
              background-clip:text is unsupported. */}
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
              {tCommon("phone_verification")}
            </CardTitle>
            <CardDescription className="text-base mt-2 text-muted-foreground">
              {t("secure_your_account_with_two_factor_authentication")}
            </CardDescription>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{tCommon("progress")}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-muted" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === "phone" && (
            <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
              <div className="space-y-3">
                <Label
                  htmlFor="phone"
                  className="text-base font-medium text-foreground"
                >
                  {tCommon("phone_number")}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-muted-foreground w-5 h-5" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+254711972926"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    disabled={isLoading}
                    className="pl-12 h-12 text-lg border-2 focus:border-primary transition-colors bg-muted border-border-strong text-foreground placeholder-muted"
                    maxLength={16}
                  />
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  {t("well_send_a_verification_code_via_sms")}
                </p>
              </div>

              <Alert className="border-primary/30 bg-primary/10 dark:bg-primary/50">
                <Phone className="h-4 w-4 text-primary" />
                <AlertDescription className="text-primary">
                  <strong>{t("secure_private")}</strong>
                  {t("your_phone_number_third_parties")}.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-primary/15 dark:bg-primary/50 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-primary font-bold">
                      1
                    </span>
                  </div>
                  <p className="text-xs text-subtle-foreground">
                    {t("enter_phone")}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <span className="text-subtle-foreground font-bold">
                      2
                    </span>
                  </div>
                  <p className="text-xs text-subtle-foreground">
                    {t("verify_code")}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <span className="text-subtle-foreground font-bold">
                      3
                    </span>
                  </div>
                  <p className="text-xs text-subtle-foreground">
                    {tCommon("complete")}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSendCode}
                loading={isLoading}
                disabled={!phoneNumber}
                className="w-full h-12 text-lg bg-primary hover:bg-primary/90 transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>{t("sending_code")}.</>
                ) : (
                  <>
                    <Phone className="h-5 w-5 mr-2" />
                    {tCommon("send_verification_code")}
                  </>
                )}
              </Button>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 dark:bg-primary/50 rounded-full">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {t("code_sent_to")}
                  </span>
                </div>
                <p className="font-semibold text-lg text-foreground font-mono tabular-nums">
                  {phoneNumber}
                </p>
                <Badge
                  variant="secondary"
                  className="text-xs bg-muted text-muted-foreground"
                >
                  Expires in 10 minutes
                </Badge>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium text-foreground">
                  {tCommon("enter_verification_code")}
                </Label>
                <div
                  className="flex justify-center gap-3"
                  onPaste={handlePaste}
                >
                  {codeInputs.map((value, index) => (
                    <Input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={value}
                      onChange={(e) =>
                        handleCodeInputChange(index, e.target.value)
                      }
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-14 h-14 text-center text-xl font-bold border-2 focus:border-primary transition-all duration-200 transform focus:scale-110 bg-muted border-border-strong text-foreground"
                      disabled={isLoading}
                    />
                  ))}
                </div>
                <p className="text-xs text-center text-subtle-foreground">
                  {t("tip_you_can_paste_the_entire_code_at_once")}
                </p>
              </div>

              <div className="text-center">
                {countdown > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t("resend_code_in")}{" "}
                      <span className="font-mono font-bold text-primary">
                        {countdown}
                        s
                      </span>
                    </p>
                    <div className="w-full bg-muted rounded-full h-1">
                      <div
                        className="bg-primary h-1 rounded-full transition-all duration-1000"
                        style={{ width: `${(countdown / 60) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-primary hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {tCommon("resend_code")}
                  </Button>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("phone")}
                  disabled={isLoading}
                  className="flex-1 h-12 border-border-strong text-muted-foreground dark:hover:bg-muted"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {tCommon("back")}
                </Button>
                <Button
                  onClick={handleVerifyCode}
                  loading={isLoading}
                  disabled={codeInputs.some((code) => !code)}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>{tCommon("verifying")}.</>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      {t("verify_code")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-6 text-center animate-in zoom-in-50 duration-500">
              <div className="relative">
                <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-success mb-4 animate-pulse">
                  <Check className="h-12 w-12 text-success-foreground animate-bounce" />
                </div>
                <div className="absolute inset-0 h-24 w-24 rounded-full bg-success opacity-20 animate-ping mx-auto" />
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-semibold leading-tight tracking-tight text-success">
                  {t("phone_verified_successfully")}
                </h3>
                <p className="text-muted-foreground">
                  {t("your_account_is_two_factor_authentication")}
                </p>
                {/* Was a SOLID `bg-success` holding a `text-success` glyph and
                    label — the same token on itself, so this chip read as an
                    empty green pill. Tint + on-tint ink. */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/15 rounded-full">
                  <Shield className="w-4 h-4 text-success-ink" />
                  <span className="text-sm font-medium text-success-ink">
                    {t("security_enhanced")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {/* Sibling tiles that disagreed with each other: the first was a
                    `/10` tint, the second a SOLID `bg-primary` in light mode
                    (only `dark:` dropped it to `/30`), and both inked `text-primary`
                    — so the right-hand tile's copy was invisible in light mode.
                    Both are the tint now, with the AA-safe on-tint ink. */}
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="font-semibold text-primary-ink">
                    {t("enhanced_security")}
                  </div>
                  <div className="text-primary-ink">
                    {t("two_factor_authentication_active")}
                  </div>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="font-semibold text-primary-ink">
                    {t("account_recovery")}
                  </div>
                  <div className="text-primary-ink">
                    {t("phone_number_verified")}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setStep("phone")}
                variant="outline"
                className="w-full h-12 border-success text-success hover:bg-success/10 hover:text-success"
              >
                {t("verify_another_number")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
