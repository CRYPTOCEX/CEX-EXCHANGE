"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Lock,
  Key,
  Smartphone,
  Monitor,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  LogOut,
  Fingerprint,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TwoFactorSetupFlow } from "../../two-factor-setup-flow";
import { useToast } from "@/hooks/use-toast";
import { $fetch } from "@/lib/api";

interface SecurityTabProps {
  startTwoFactorSetup: () => void;
}

const SecurityCard = memo(function SecurityCard({
  icon: Icon,
  title,
  description,
  enabled,
  action,
  onAction,
  loading,
  badge,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  enabled?: boolean;
  action?: string;
  onAction?: () => void;
  loading?: boolean;
  badge?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex items-center justify-center h-12 w-12 rounded-xl flex-shrink-0",
              enabled
                ? "bg-emerald-500/10"
                : enabled === false
                ? "bg-red-500/10"
                : "bg-zinc-800"
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6",
                enabled
                  ? "text-emerald-400"
                  : enabled === false
                  ? "text-red-400"
                  : "text-zinc-400"
              )}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              {badge && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    enabled
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400"
                  )}
                >
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-500">{description}</p>
          </div>
          {action && (
            <Button
              onClick={onAction}
              disabled={loading}
              className={cn(
                enabled
                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white"
              )}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                action
              )}
            </Button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
});

const SessionItem = memo(function SessionItem({
  device,
  browser,
  location,
  ip,
  time,
  current,
}: {
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  location: string;
  ip: string;
  time: string;
  current?: boolean;
}) {
  const DeviceIcon = device === "mobile" ? Smartphone : Monitor;

  return (
    <div className="flex items-center gap-4 py-4 border-b border-zinc-800/50 last:border-0">
      <div className="p-2.5 rounded-xl bg-zinc-800">
        <DeviceIcon className="h-5 w-5 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">{browser}</p>
          {current && (
            <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-xs">
              Current
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {location}
          </span>
          <span>{ip}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-zinc-500">{time}</p>
        {!current && (
          <button className="text-xs text-red-400 hover:text-red-300 mt-1">
            Revoke
          </button>
        )}
      </div>
    </div>
  );
});

export const SecurityTab = memo(function SecurityTab({
  startTwoFactorSetup,
}: SecurityTabProps) {
  const router = useRouter();
  const { user, securityScore, logout, setUser, setShowTwoFactorSetup } =
    useUserStore();
  const { toast } = useToast();
  const [showTwoFactorSetupLocal, setShowTwoFactorSetupLocal] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);

  if (!user) return null;

  const getSecurityLevel = () => {
    if (securityScore >= 80)
      return { label: "Excellent", color: "emerald", icon: ShieldCheck };
    if (securityScore >= 60)
      return { label: "Good", color: "amber", icon: Shield };
    if (securityScore >= 40)
      return { label: "Fair", color: "amber", icon: ShieldAlert };
    return { label: "At Risk", color: "red", icon: ShieldOff };
  };

  const securityLevel = getSecurityLevel();
  const SecurityLevelIcon = securityLevel.icon;

  const handleToggle2FA = async () => {
    if (!user.twoFactor?.enabled) {
      setShowTwoFactorSetupLocal(true);
      setShowTwoFactorSetup(true);
      return;
    }

    setIsDisabling2FA(true);
    try {
      const { error } = await $fetch({
        url: "/api/user/profile/otp/status",
        method: "POST",
        body: { status: false },
      });

      if (error) throw new Error(error);

      setUser({
        ...user,
        twoFactor: { ...user.twoFactor, enabled: false },
      } as any);

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled.",
      });
    } catch {
      toast({
        title: "Failed",
        description: "Could not disable 2FA. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDisabling2FA(false);
    }
  };

  const handleTwoFactorComplete = () => {
    setShowTwoFactorSetupLocal(false);
    setShowTwoFactorSetup(false);
    toast({
      title: "2FA Enabled",
      description: "Your account is now protected with two-factor authentication.",
    });
  };

  const handlePasswordReset = async () => {
    await logout();
    router.push("/reset");
  };

  // Circumference for score ring
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (securityScore / 100) * circumference;

  // If showing 2FA setup, render that instead
  if (showTwoFactorSetupLocal) {
    return (
      <TwoFactorSetupFlow
        onCancel={() => {
          setShowTwoFactorSetupLocal(false);
          setShowTwoFactorSetup(false);
        }}
        onComplete={handleTwoFactorComplete}
      />
    );
  }

  // Mock session data
  const sessions = [
    {
      device: "desktop" as const,
      browser: "Chrome on Windows",
      location: "New York, US",
      ip: "192.168.1.***",
      time: "Active now",
      current: true,
    },
    {
      device: "mobile" as const,
      browser: "Safari on iPhone",
      location: "New York, US",
      ip: "192.168.1.***",
      time: "2 hours ago",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header with Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800/50 overflow-hidden"
      >

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left: Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Security Center
                </h1>
                <p className="text-zinc-500 mt-1">
                  Manage your account security and authentication settings.
                </p>
              </div>

              {/* Security Status Pills */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "px-3 py-1",
                    user.twoFactor?.enabled
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  )}
                >
                  <Fingerprint className="h-3 w-3 mr-1.5" />
                  {user.twoFactor?.enabled ? "2FA Active" : "2FA Inactive"}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "px-3 py-1",
                    user.emailVerified
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400"
                  )}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1.5" />
                  Email {user.emailVerified ? "Verified" : "Unverified"}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "px-3 py-1",
                    user.phoneVerified
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400"
                  )}
                >
                  <Smartphone className="h-3 w-3 mr-1.5" />
                  Phone {user.phoneVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
            </div>

            {/* Right: Score Ring */}
            <div className="flex items-center gap-6">
              <div className="relative h-32 w-32">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-zinc-800"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#securityScoreGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient
                      id="securityScoreGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{securityScore}</span>
                  <span className="text-xs text-zinc-500">Score</span>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="flex items-center gap-2 mb-1">
                  <SecurityLevelIcon
                    className={cn(
                      "h-5 w-5",
                      securityLevel.color === "emerald"
                        ? "text-emerald-400"
                        : securityLevel.color === "amber"
                        ? "text-amber-400"
                        : "text-red-400"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xl font-bold",
                      securityLevel.color === "emerald"
                        ? "text-emerald-400"
                        : securityLevel.color === "amber"
                        ? "text-amber-400"
                        : "text-red-400"
                    )}
                  >
                    {securityLevel.label}
                  </span>
                </div>
                <p className="text-sm text-zinc-500">
                  {securityScore < 80
                    ? "Complete more security steps to improve your score."
                    : "Your account is well protected."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Two-Factor Authentication */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SecurityCard
            icon={Fingerprint}
            title="Two-Factor Authentication"
            description={
              user.twoFactor?.enabled
                ? "Your account is protected with 2FA."
                : "Add an extra layer of security to your account."
            }
            enabled={user.twoFactor?.enabled}
            badge={user.twoFactor?.enabled ? "Active" : undefined}
            action={user.twoFactor?.enabled ? "Disable" : "Enable"}
            onAction={handleToggle2FA}
            loading={isDisabling2FA}
          >
            {user.twoFactor?.enabled && (
              <div className="mt-4 pt-4 border-t border-zinc-800/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Method</span>
                  <span className="text-white font-medium">
                    {user.twoFactor.type === "TOTP"
                      ? "Authenticator App"
                      : user.twoFactor.type || "Authenticator App"}
                  </span>
                </div>
              </div>
            )}
          </SecurityCard>
        </motion.div>

        {/* Password */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SecurityCard
            icon={Lock}
            title="Password"
            description="Change your password regularly for better security."
            action="Reset Password"
            onAction={handlePasswordReset}
          >
            <div className="mt-4 pt-4 border-t border-zinc-800/50">
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>You&apos;ll be logged out to reset your password.</span>
              </div>
            </div>
          </SecurityCard>
        </motion.div>
      </div>

      {/* Active Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <Monitor className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Active Sessions</h3>
                <p className="text-sm text-zinc-500">
                  Devices currently logged into your account
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out All
            </Button>
          </div>
        </div>
        <div className="px-6">
          {sessions.map((session, index) => (
            <SessionItem key={index} {...session} />
          ))}
        </div>
      </motion.div>

      {/* Security Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 p-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 flex-shrink-0">
            <Shield className="h-6 w-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Security Recommendations
            </h3>
            <ul className="space-y-3">
              {!user.twoFactor?.enabled && (
                <li className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-white font-medium">
                      Enable Two-Factor Authentication
                    </p>
                    <p className="text-xs text-zinc-500">
                      Protect your account with an additional verification step.
                    </p>
                  </div>
                </li>
              )}
              {!user.phoneVerified && (
                <li className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-white font-medium">
                      Verify Your Phone Number
                    </p>
                    <p className="text-xs text-zinc-500">
                      Add phone verification for account recovery options.
                    </p>
                  </div>
                </li>
              )}
              {user.twoFactor?.enabled && user.emailVerified && user.phoneVerified && (
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-white font-medium">
                      Excellent Security!
                    </p>
                    <p className="text-xs text-zinc-500">
                      You&apos;ve enabled all recommended security features.
                    </p>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

export default SecurityTab;
