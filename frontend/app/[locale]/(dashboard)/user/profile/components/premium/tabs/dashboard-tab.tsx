"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Calendar,
  Key,
  Wallet,
  Users,
  Activity,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  TrendingUp,
  ArrowUpRight,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";

interface DashboardTabProps {
  onTabChange: (tab: string) => void;
}

const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "amber",
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
  color?: "amber" | "emerald" | "blue" | "purple" | "red";
  delay?: number;
}) {
  const colorClasses = {
    amber: {
      bg: "bg-amber-500/10",
      icon: "text-amber-400",
      trend: "text-amber-400",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      icon: "text-emerald-400",
      trend: "text-emerald-400",
    },
    blue: {
      bg: "bg-blue-500/10",
      icon: "text-blue-400",
      trend: "text-blue-400",
    },
    purple: {
      bg: "bg-purple-500/10",
      icon: "text-purple-400",
      trend: "text-purple-400",
    },
    red: {
      bg: "bg-red-500/10",
      icon: "text-red-400",
      trend: "text-red-400",
    },
  };

  const styles = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5 group hover:border-zinc-700/50 transition-colors"
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-amber-500/5 to-transparent" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <div className={cn("inline-flex p-2.5 rounded-xl", styles.bg)}>
            <Icon className={cn("h-5 w-5", styles.icon)} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-zinc-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trend.positive ? "text-emerald-400" : "text-red-400"
            )}
          >
            <TrendingUp
              className={cn("h-4 w-4", !trend.positive && "rotate-180")}
            />
            {trend.value}%
          </div>
        )}
      </div>
    </motion.div>
  );
});

const SecurityCheckItem = memo(function SecurityCheckItem({
  label,
  enabled,
  action,
  onAction,
}: {
  label: string;
  enabled: boolean;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-lg",
            enabled ? "bg-emerald-500/10" : "bg-zinc-800"
          )}
        >
          {enabled ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <XCircle className="h-4 w-4 text-zinc-600" />
          )}
        </div>
        <span className={cn("text-sm", enabled ? "text-white" : "text-zinc-400")}>
          {label}
        </span>
      </div>
      {!enabled && action && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAction}
          className="h-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
        >
          {action}
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      )}
      {enabled && (
        <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-xs">
          Active
        </Badge>
      )}
    </div>
  );
});

const ActivityItem = memo(function ActivityItem({
  icon: Icon,
  title,
  description,
  time,
  status,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  time: string;
  status: "success" | "warning" | "info";
}) {
  const statusColors = {
    success: "bg-emerald-500/10 text-emerald-400",
    warning: "bg-amber-500/10 text-amber-400",
    info: "bg-blue-500/10 text-blue-400",
  };

  return (
    <div className="flex items-start gap-4 py-4 border-b border-zinc-800/50 last:border-0">
      <div className={cn("p-2.5 rounded-xl flex-shrink-0", statusColors[status])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-zinc-600">
        <Clock className="h-3 w-3" />
        {time}
      </div>
    </div>
  );
});

export const DashboardTab = memo(function DashboardTab({
  onTabChange,
}: DashboardTabProps) {
  const router = useRouter();
  const { user, securityScore } = useUserStore();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  // Check if KYC is enabled in settings
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";

  if (!user) return null;

  const handleVerifyEmail = async () => {
    setIsVerifyingEmail(true);
    try {
      const { error } = await $fetch({
        url: "/api/user/profile/verify-email",
        method: "POST",
      });
      if (error) throw new Error(error);
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox.",
      });
    } catch {
      toast({
        title: "Failed to Send Email",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const accountAge = Math.floor(
    (Date.now() - new Date(user.createdAt || Date.now()).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const getSecurityLevel = () => {
    if (securityScore >= 80) return { label: "Excellent", color: "emerald" };
    if (securityScore >= 60) return { label: "Good", color: "amber" };
    if (securityScore >= 40) return { label: "Fair", color: "amber" };
    return { label: "Needs Attention", color: "red" };
  };

  const securityLevel = getSecurityLevel();

  // Mock activity data - in real app, fetch from API
  const recentActivity = [
    {
      icon: Globe,
      title: "Login from new device",
      description: "Chrome on Windows",
      time: "2h ago",
      status: "info" as const,
    },
    {
      icon: Key,
      title: "API Key Created",
      description: "Trading Bot Key",
      time: "1d ago",
      status: "success" as const,
    },
    {
      icon: Shield,
      title: "2FA Enabled",
      description: "Authenticator app",
      time: "3d ago",
      status: "success" as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Welcome back, {user.firstName}
          </h1>
          <p className="text-zinc-500 mt-1">
            Here&apos;s an overview of your account status and security.
          </p>
        </div>
{kycEnabled && (
          <Link href="/user/kyc">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/20">
              <Zap className="h-4 w-4 mr-2" />
              Upgrade KYC
            </Button>
          </Link>
        )}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Security Score"
          value={`${securityScore}/100`}
          subtitle={securityLevel.label}
          icon={Shield}
          color={securityLevel.color as any}
          delay={0}
        />
        <StatCard
          title="Account Age"
          value={`${accountAge} days`}
          subtitle="Member since"
          icon={Calendar}
          color="blue"
          delay={0.1}
        />
{kycEnabled && (
          <StatCard
            title="KYC Level"
            value={user.kycLevel || 0}
            subtitle={
              (user.kycLevel || 0) >= 2
                ? "Advanced verified"
                : "Basic verified"
            }
            icon={Users}
            color="purple"
            delay={0.2}
          />
        )}
        <StatCard
          title="API Keys"
          value={user.apiKeys?.length || 0}
          subtitle="Active keys"
          icon={Key}
          color="amber"
          delay={0.3}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-zinc-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <Shield className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Security Checklist</h3>
                  <p className="text-xs text-zinc-500">Protect your account</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTabChange("security")}
                className="text-zinc-400 hover:text-white"
              >
                View All
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
          <div className="px-6 py-2">
            <SecurityCheckItem
              label="Two-Factor Authentication"
              enabled={user.twoFactor?.enabled || false}
              action="Enable"
              onAction={() => onTabChange("security")}
            />
            <SecurityCheckItem
              label="Email Verified"
              enabled={user.emailVerified}
              action={isVerifyingEmail ? "Sending..." : "Verify"}
              onAction={handleVerifyEmail}
            />
            <SecurityCheckItem
              label="Phone Verified"
              enabled={user.phoneVerified || false}
              action="Verify"
              onAction={() => onTabChange("phone-verification")}
            />
            {kycEnabled && (
              <SecurityCheckItem
                label="KYC Verification"
                enabled={(user.kycLevel || 0) > 0}
                action="Complete"
                onAction={() => router.push("/user/kyc")}
              />
            )}
          </div>

          {/* Security Score Ring */}
          <div className="px-6 py-5 bg-zinc-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Your Security Level</p>
                <p className={cn(
                  "text-2xl font-bold mt-1",
                  securityScore >= 80 ? "text-emerald-400" :
                  securityScore >= 50 ? "text-amber-400" : "text-red-400"
                )}>
                  {securityLevel.label}
                </p>
              </div>
              <div className="relative h-20 w-20">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-zinc-800"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="url(#scoreGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={251}
                    initial={{ strokeDashoffset: 251 }}
                    animate={{
                      strokeDashoffset: 251 - (251 * securityScore) / 100,
                    }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{securityScore}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-zinc-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                  <p className="text-xs text-zinc-500">Your account activity</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-white"
              >
                View All
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
          <div className="px-6">
            {recentActivity.map((activity, index) => (
              <ActivityItem key={index} {...activity} />
            ))}
          </div>

          {/* Wallet Status */}
          <div className="px-6 py-5 bg-zinc-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl",
                  user.walletAddress ? "bg-emerald-500/10" : "bg-zinc-800"
                )}>
                  <Wallet className={cn(
                    "h-5 w-5",
                    user.walletAddress ? "text-emerald-400" : "text-zinc-600"
                  )} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Wallet Status</p>
                  <p className="text-xs text-zinc-500">
                    {user.walletAddress
                      ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                      : "No wallet connected"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTabChange("wallet")}
                className={cn(
                  user.walletAddress
                    ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                )}
              >
                {user.walletAddress ? "Manage" : "Connect"}
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            onClick={() => onTabChange("personal")}
            className="h-auto py-4 flex-col gap-2 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-white"
          >
            <Users className="h-5 w-5 text-amber-400" />
            <span className="text-sm">Edit Profile</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onTabChange("security")}
            className="h-auto py-4 flex-col gap-2 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-white"
          >
            <Shield className="h-5 w-5 text-emerald-400" />
            <span className="text-sm">Security</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onTabChange("api")}
            className="h-auto py-4 flex-col gap-2 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-white"
          >
            <Key className="h-5 w-5 text-blue-400" />
            <span className="text-sm">API Keys</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onTabChange("notifications")}
            className="h-auto py-4 flex-col gap-2 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-white"
          >
            <Activity className="h-5 w-5 text-purple-400" />
            <span className="text-sm">Notifications</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
});

export default DashboardTab;
