"use client";

import React from "react";
import { CheckCircle2, Mail, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface RegisterSuccessProps {
  email: string;
  needsEmailVerification: boolean;
  onLoginClick: () => void;
  onClose: () => void;
}

export default function RegisterSuccess({
  email,
  needsEmailVerification,
  onLoginClick,
  onClose,
}: RegisterSuccessProps) {
  const t = useTranslations("components/auth/register-success");

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-6">
      {/* Success Icon with Animation */}
      <div className="relative">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-pulse">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles className="w-6 h-6 text-yellow-500 animate-bounce" />
        </div>
      </div>

      {/* Success Title */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          {t("registration_successful")}
        </h2>
        <p className="text-muted-foreground max-w-md">
          {needsEmailVerification
            ? t("welcome_your_account_has")
            : t("welcome_your_account_is_ready_to_use")}
        </p>
      </div>

      {/* Email Verification Section */}
      {needsEmailVerification ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md">
          <div className="flex items-start space-x-3">
            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-left space-y-2">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                {t("verify_your_email")}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t("weve_sent_a_verification_email_to")} <strong>{email}</strong>. 
                {t("please_check_your")}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {t("dont_see_the_email_check_your_spam_folder")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 max-w-md">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="text-left">
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                {t("account_ready")}
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                {t("your_account_is_fully_activated_and_ready_to_use")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        {needsEmailVerification ? (
          <>
            <Button
              onClick={onLoginClick}
              variant="outline"
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <span>{t("go_to_login")}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              onClick={onClose}
              variant="default"
              className="flex-1"
            >
              {t("Close")}
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={onLoginClick}
              variant="default"
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <span>{t("continue_to_login")}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              {t("Close")}
            </Button>
          </>
        )}
      </div>

      {/* Additional Help Text */}
      <div className="text-xs text-muted-foreground max-w-md">
        {needsEmailVerification ? (
          <p>
            {t("after_verifying_your_email")}
          </p>
        ) : (
          <p>
            {t("you_can_now_log")}
          </p>
        )}
      </div>
    </div>
  );
} 