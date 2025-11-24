"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Info,
  Shield,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { TwoFactorSetupFlow } from "../two-factor-setup-flow";
import { useUserStore } from "@/store/user";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

interface SecurityTabProps {
  startTwoFactorSetup: () => void;
}

export function SecurityTab({ startTwoFactorSetup }: SecurityTabProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { user, securityScore, setShowTwoFactorSetup, logout, setUser } =
    useUserStore();
  const { toast } = useToast();
  const [showTwoFactorSetupLocal, setShowTwoFactorSetupLocal] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);

  if (!user) return null;

  const getSecurityScoreColor = () => {
    if (securityScore >= 80) return "text-green-600";
    if (securityScore >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getSecurityScoreText = () => {
    if (securityScore >= 80) return "Excellent";
    if (securityScore >= 50) return "Good";
    return "Poor";
  };

  const getSecurityScoreProgressColor = () => {
    if (securityScore >= 80) return "#10b981";
    if (securityScore >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const handleTwoFactorSetupComplete = () => {
    setShowTwoFactorSetupLocal(false);
    setShowTwoFactorSetup(false);
    // Update profile to reflect 2FA is now enabled
    toast({
      title: "2FA Enabled",
      description:
        "Two-factor authentication has been successfully enabled for your account.",
    });
  };

  const handleToggle2FA = async () => {
    setIsDisabling2FA(true);
    try {
      const response = await $fetch({
        url: "/api/user/profile/otp/status",
        method: "POST",
        body: {
          status: !user.twoFactor?.enabled,
        },
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Update user in store
      await setUser({
        ...user,
        twoFactor: {
          enabled: !user.twoFactor?.enabled,
        },
      } as any);

      toast({
        title: `2FA ${user.twoFactor?.enabled ? "Disabled" : "Enabled"}`,
        description: `Two-factor authentication has been ${user.twoFactor?.enabled ? "disabled" : "enabled"}.`,
      });
    } catch (error) {
      console.error("Error toggling 2FA:", error);
      toast({
        title: "Action Failed",
        description: `Failed to ${user.twoFactor?.enabled ? "disable" : "enable"} 2FA. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsDisabling2FA(false);
    }
  };

  const handleChange2FA = () => {
    setShowTwoFactorSetupLocal(true);
    setShowTwoFactorSetup(true);
  };

  // If 2FA setup is showing, render the setup flow instead of the normal security tab
  if (showTwoFactorSetupLocal) {
    return (
      <TwoFactorSetupFlow
        onCancel={() => {
          setShowTwoFactorSetupLocal(false);
          setShowTwoFactorSetup(false);
        }}
        onComplete={handleTwoFactorSetupComplete}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border dark:border-zinc-800 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold dark:text-zinc-100">
              {t("security_dashboard")}
            </h2>
            <p className="text-muted-foreground dark:text-zinc-400">
              {t("manage_your_account_security_settings")}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg">
            <div className="relative h-16 w-16">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={getSecurityScoreProgressColor()}
                  strokeWidth="10"
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * securityScore) / 100}
                  transform="rotate(-90 50 50)"
                />
                <text
                  x="50"
                  y="50"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fontSize="24"
                  fontWeight="bold"
                  fill={getSecurityScoreProgressColor()}
                >
                  {securityScore}
                </text>
                <text
                  x="50"
                  y="65"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6b7280"
                >
                  ,
                </text>
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                {t("security_score")}
              </div>
              <div className={`text-xl font-bold ${getSecurityScoreColor()}`}>
                {getSecurityScoreText()}
              </div>
              <div className="text-xs text-gray-500 dark:text-zinc-400">
                {securityScore < 80 && "Improve your security by enabling 2FA"}
                {securityScore >= 80 && "Your account is well protected"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-white dark:bg-zinc-900 border dark:border-zinc-700 shadow-sm h-[200px] flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base dark:text-zinc-100">
                  {t("two-factor_auth")}
                </CardTitle>
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    user.twoFactor?.enabled
                      ? "bg-green-100 dark:bg-green-950"
                      : "bg-red-100 dark:bg-red-950"
                  }`}
                >
                  {user.twoFactor?.enabled ? (
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="text-sm text-gray-500 dark:text-zinc-400 mb-4 flex-grow">
                {user.twoFactor?.enabled
                  ? "Your account is protected with 2FA"
                  : "Enable 2FA for additional security"}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  className={`w-full ${
                    user.twoFactor?.enabled
                      ? "bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 hover:bg-gray-200 dark:hover:bg-zinc-600"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                  onClick={() => {
                    if (user.twoFactor) {
                      handleToggle2FA();
                    } else {
                      startTwoFactorSetup();
                    }
                  }}
                  disabled={isDisabling2FA}
                >
                  {user.twoFactor?.enabled ? (
                    isDisabling2FA ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("Disabling")}.
                      </>
                    ) : (
                      "Disable 2FA"
                    )
                  ) : (
                    "Enable 2FA"
                  )}
                </Button>
                {user.twoFactor?.enabled && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleChange2FA}
                  >
                    {t("change_2fa_method")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border dark:border-zinc-700 shadow-sm h-[200px] flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base dark:text-zinc-100">
                  {t("password_reset")}
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="text-sm text-gray-500 dark:text-zinc-400 mb-4 flex-grow">
                {t("for_security_reasons_email_verification")}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        logout();
                        router.push("/reset");
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t("log_out_&_reset_password")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {t("youll_be_redirected_to_the_login_page_after_logout")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-2 flex items-center dark:text-zinc-100">
            <Shield className="h-5 w-5 mr-2 text-blue-600" />
            {t("security_recommendations")}
          </h3>
          <div className="space-y-2">
            {!user.twoFactor?.enabled && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <span className="font-medium dark:text-zinc-100">
                    {t("enable_two-factor_authentication")}
                  </span>
                  <p className="text-gray-500 dark:text-zinc-400">
                    {t("add_an_extra_layer_of_security_to_your_account")}
                  </p>
                </div>
              </div>
            )}
            {user.twoFactor?.enabled && (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="text-sm">
                  <span className="font-medium dark:text-zinc-100">
                    {t("your_account_is_well_protected")}
                  </span>
                  <p className="text-gray-500 dark:text-zinc-400">
                    {t("youve_enabled_all_recommended_security_features")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">
            {t("about_our_password_reset_process")}
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            <p className="mb-2">
              {t("for_maximum_security_email_verification")}
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              <li>{t("log_out_from_your_account")}</li>
              <li>
                {t("visit_the_login_page_at")}{" "}
                <span className="font-medium">{'/login'}</span>
              </li>
              <li>{t("click_on_forgot_password_link")}</li>
              <li>{t("enter_your_email_address_to_receive_a_reset_link")}</li>
              <li>{t("check_your_email_and_click_the_secure_reset_link")}</li>
              <li>{t("create_a_new_password_and_log_in")}</li>
            </ol>
            <p className="mt-2 text-sm">
              {t("this_approach_prevents_best_practices")}.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
