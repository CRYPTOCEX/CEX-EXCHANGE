"use client";

import { useState, memo } from "react";
import {
  Shield,
  Calendar,
  Key,
  ChevronRight,
  Check,
  X,
  Activity,
  Users,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatCard } from "../ui/stat-card";
import { ActivityCard } from "../ui/activity-card";
import { useUserStore } from "@/store/user";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface DashboardTabProps {
  onTabChange: (tab: string) => void;
}

// Memoize the dashboard tab to prevent unnecessary re-renders
export const DashboardTab = memo(function DashboardTab({
  onTabChange,
}: DashboardTabProps) {
  const t = useTranslations("dashboard");
  const { user, securityScore } = useUserStore();
  const [activity] = useState<any[]>([]);

  if (!user) return null;

  const getSecurityScoreColor = () => {
    if (securityScore >= 80) return "text-green-600 dark:text-green-400";
    if (securityScore >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getSecurityScoreText = () => {
    if (securityScore >= 80) return "Excellent";
    if (securityScore >= 50) return "Good";
    if (securityScore >= 30) return "Fair";
    return "Poor";
  };

  const getSecurityScoreStrokeColor = () => {
    if (securityScore >= 80) return "stroke-green-500 dark:stroke-green-400";
    if (securityScore >= 50) return "stroke-amber-500 dark:stroke-amber-400";
    return "stroke-red-500 dark:stroke-red-400";
  };

  // Handle navigation to security tab for 2FA setup
  const handleNavigateToSecurity = () => {
    if (onTabChange) {
      onTabChange("security");
    }
  };

  // Handle email verification
  const handleVerifyEmail = async () => {
    try {
      // Simulate API call to send verification email
      await fetch("/api/user/profile/verify-email", {
        method: "POST",
      });

      // Show success message (would be handled by toast in a real implementation)
      alert("Verification email sent. Please check your inbox.");
    } catch (error) {
      console.error("Error sending verification email:", error);
      alert("Failed to send verification email. Please try again.");
    }
  };

  // Handle phone verification
  const handleVerifyPhone = () => {
    if (onTabChange) {
      onTabChange("phone-verification");
    }
  };

  // Format date for display
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">{t("Dashboard")}</h2>
      </div>

      {/* Account summary card */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                {t("your_account_summary")}
              </h3>
              <p className="text-muted-foreground mt-1">
                {t("account_status")}{" "}
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {user.status || "Active"}
                </span>{" "}
                {t("•_member_since")}
                {formatDate(user.createdAt)}
              </p>
            </div>
            <Link href="/user/kyc">
              <Button className="gap-1.5">
                <Shield className="h-4 w-4" />
                {t("kyc_verification")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Security Score"
          value={`${securityScore}/100`}
          description={getSecurityScoreText()}
          icon={Shield}
          color={
            securityScore >= 80
              ? "green"
              : securityScore >= 50
                ? "amber"
                : "red"
          }
        />
        <StatCard
          title="Account Age"
          value={`${Math.floor((new Date().getTime() - new Date(user.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24))} days`}
          icon={Calendar}
          color="blue"
          trend={{ value: 100, label: "Lifetime" }}
        />
        <StatCard
          title="API Keys"
          value={user.apiKeys?.length || "0"}
          description={user.apiKeys?.length ? "Active keys" : "No keys created"}
          icon={Key}
          color="purple"
        />
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Login Activity"
          value="4"
          description="Logins this month"
          icon={Activity}
          color="blue"
          trend={{ value: 33, label: "vs last month" }}
        />
        <StatCard
          title="KYC Level"
          value={user.kycLevel || 0}
          description={
            user.kycLevel && user.kycLevel >= 2
              ? "Advanced verification"
              : "Basic verification"
          }
          icon={Users}
          color="green"
        />
        <StatCard
          title="Wallet Status"
          value={user.walletAddress ? "Connected" : "Not Connected"}
          description={
            user.walletAddress ? "Ethereum wallet" : "Connect your wallet"
          }
          icon={Wallet}
          color="amber"
        />
      </div>

      {/* Recent activity and security overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm h-full overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-foreground">
                {t("recent_activity")}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                {t("view_all")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {activity &&
                activity.length > 0 &&
                activity
                  .slice(0, 5)
                  .map((item, index) => (
                    <ActivityCard key={item.id} activity={item} index={index} />
                  ))}
              {(!activity || activity.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  {t("no_recent_activity_to_display")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security overview */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm h-full overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-foreground">
                {t("security_overview")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">
                    {t("security_score")}
                  </h3>
                  <p
                    className={`text-2xl font-bold ${getSecurityScoreColor()}`}
                  >
                    {getSecurityScoreText()}
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative h-20 w-20 cursor-help">
                        {/* Background circle */}
                        <svg
                          className="h-full w-full -rotate-90"
                          viewBox="0 0 36 36"
                        >
                          <circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            className="stroke-muted"
                            strokeWidth="3"
                          ></circle>

                          {/* Progress circle */}
                          <circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            className={getSecurityScoreStrokeColor()}
                            strokeWidth="3"
                            strokeDasharray="100"
                            strokeDashoffset={100 - securityScore}
                          ></circle>
                        </svg>

                        {/* Percentage text */}
                        <div className="absolute inset-0 flex items-center justify-center text-lg font-medium text-foreground">
                          {securityScore}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("your_security_score_security_features")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                  <div className="flex items-center">
                    <div
                      className={`p-1.5 rounded-full ${user.twoFactor?.enabled ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"} mr-3 shadow-sm`}
                    >
                      {user.twoFactor?.enabled ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {t("two-factor_authentication")}
                    </span>
                  </div>
                  {!user.twoFactor?.enabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs shadow-sm"
                      onClick={handleNavigateToSecurity}
                    >
                      {t("Enable")}
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                  <div className="flex items-center">
                    <div
                      className={`p-1.5 rounded-full ${user.emailVerified ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"} mr-3 shadow-sm`}
                    >
                      {user.emailVerified ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {t("email_verified")}
                    </span>
                  </div>
                  {!user.emailVerified && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs shadow-sm"
                      onClick={handleVerifyEmail}
                    >
                      {t("Verify")}
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                  <div className="flex items-center">
                    <div
                      className={`p-1.5 rounded-full ${user.phoneVerified ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"} mr-3 shadow-sm`}
                    >
                      {user.phoneVerified ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {t("phone_verified")}
                    </span>
                  </div>
                  {!user.phoneVerified && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs shadow-sm"
                      onClick={handleVerifyPhone}
                    >
                      {t("Verify")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

// Add CSS for fade-in animation
const styles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}
`;

// Add the styles to the document
if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
