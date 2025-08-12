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

type VerificationStep = "phone" | "code" | "success";

// Mock user store for demo
const useUserStore = () => ({
  user: { phone: "", phoneVerified: false },
  setUser: (user: any) => console.log("User updated:", user),
});

// Mock API function for demo
const $fetch = async ({ url, method, body }: any) => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  if (url.includes("/send")) {
    return { success: true };
  }
  if (url.includes("/verify")) {
    return { success: true };
  }
  return { error: "Something went wrong" };
};

export function PhoneVerificationTab() {
  const t = useTranslations("dashboard");
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

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return !match[2]
        ? match[1]
        : `(${match[1]}) ${match[2]}${match[3] ? `-${match[3]}` : ""}`;
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    const phoneRegex = /^$$\d{3}$$\s\d{3}-\d{4}$/;
    if (!phoneRegex.test(phoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await $fetch({
        url: "/api/user/phone/send",
        method: "POST",
        body: { phoneNumber },
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: "Code Sent Successfully! 📱",
        description: "Check your phone for the verification code",
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
        title: "Failed to Send Code",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send verification code",
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
        title: "Invalid Code",
        description: "Please enter the complete 6-digit verification code",
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
        title: "Phone Verified Successfully! ✅",
        description: "Your account is now more secure",
      });

      setStep("success");
    } catch (error) {
      console.error("Error verifying code:", error);
      toast({
        title: "Verification Failed",
        description:
          error instanceof Error ? error.message : "Failed to verify code",
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
      setCodeInputs(digits.split("untitled"));
      inputRefs.current[5]?.focus();
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    await handleSendCode();
  };

  return (
    <div className="min-h-[calc(80vh)] flex items-center justify-center">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm dark:bg-zinc-900/80 dark:backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              {t("phone_verification")}
            </CardTitle>
            <CardDescription className="text-base mt-2 dark:text-zinc-400">
              {t("secure_your_account_with_two-factor_authentication")}
            </CardDescription>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground dark:text-zinc-400">
              <span>{t("Progress")}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 dark:bg-zinc-800" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === "phone" && (
            <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
              <div className="space-y-3">
                <Label
                  htmlFor="phone"
                  className="text-base font-medium dark:text-zinc-200"
                >
                  {t("phone_number")}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-zinc-400 w-5 h-5" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    disabled={isLoading}
                    className="pl-12 h-12 text-lg border-2 focus:border-blue-500 dark:focus:border-blue-400 transition-colors dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
                    maxLength={14}
                  />
                </div>
                <p className="text-sm text-muted-foreground dark:text-zinc-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  {t("well_send_a_verification_code_via_sms")}
                </p>
              </div>

              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
                <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-300">
                  <strong>{t("secure_&_private")}</strong>
                  {t("your_phone_number_third_parties")}.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      1
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-zinc-500">
                    {t("enter_phone")}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-gray-400 dark:text-zinc-500 font-bold">
                      2
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-zinc-500">
                    {t("verify_code")}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-gray-400 dark:text-zinc-500 font-bold">
                      3
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-zinc-500">
                    {t("Complete")}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSendCode}
                disabled={isLoading || !phoneNumber}
                className="w-full h-12 text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 dark:from-blue-600 dark:to-purple-700 dark:hover:from-blue-700 dark:hover:to-purple-800 transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    {t("sending_code")}.
                  </>
                ) : (
                  <>
                    <Phone className="h-5 w-5 mr-2" />
                    {t("send_verification_code")}
                  </>
                )}
              </Button>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/50 rounded-full">
                  <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    {t("code_sent_to")}
                  </span>
                </div>
                <p className="font-semibold text-lg dark:text-zinc-100">
                  {phoneNumber}
                </p>
                <Badge
                  variant="secondary"
                  className="text-xs dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {t("expires_in_10_minutes")}
                </Badge>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium dark:text-zinc-200">
                  {t("enter_verification_code")}
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
                      className="w-14 h-14 text-center text-xl font-bold border-2 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 transform focus:scale-110 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                      disabled={isLoading}
                    />
                  ))}
                </div>
                <p className="text-xs text-center text-muted-foreground dark:text-zinc-500">
                  {t("tip_you_can_paste_the_entire_code_at_once")}
                </p>
              </div>

              <div className="text-center">
                {countdown > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground dark:text-zinc-400">
                      {t("resend_code_in")}{" "}
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {countdown}
                        s
                      </span>
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1">
                      <div
                        className="bg-blue-500 dark:bg-blue-400 h-1 rounded-full transition-all duration-1000"
                        style={{ width: `${(countdown / 60) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t("resend_code")}
                  </Button>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("phone")}
                  disabled={isLoading}
                  className="flex-1 h-12 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("Back")}
                </Button>
                <Button
                  onClick={handleVerifyCode}
                  disabled={isLoading || codeInputs.some((code) => !code)}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 dark:from-blue-600 dark:to-purple-700 dark:hover:from-blue-700 dark:hover:to-purple-800"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {t("Verifying")}.
                    </>
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
                <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 dark:from-green-500 dark:to-emerald-600 mb-4 animate-pulse">
                  <Check className="h-12 w-12 text-white animate-bounce" />
                </div>
                <div className="absolute inset-0 h-24 w-24 rounded-full bg-green-400 dark:bg-green-500 opacity-20 animate-ping mx-auto" />
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {t("phone_verified_successfully_🎉")}
                </h3>
                <p className="text-muted-foreground dark:text-zinc-400">
                  {t("your_account_is_two-factor_authentication")}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950/50 rounded-full">
                  <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">
                    {t("security_enhanced")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="font-semibold text-blue-800 dark:text-blue-300">
                    {t("enhanced_security")}
                  </div>
                  <div className="text-blue-600 dark:text-blue-400">
                    {t("two-factor_authentication_active")}
                  </div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                  <div className="font-semibold text-purple-800 dark:text-purple-300">
                    {t("account_recovery")}
                  </div>
                  <div className="text-purple-600 dark:text-purple-400">
                    {t("phone_number_verified")}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setStep("phone")}
                variant="outline"
                className="w-full h-12 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/50"
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
