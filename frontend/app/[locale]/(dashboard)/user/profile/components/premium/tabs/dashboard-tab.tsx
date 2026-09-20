"use client";

import { memo, useEffect, useState } from "react";
import { m } from "framer-motion";
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
  Smartphone,
  ArrowUpRight,
  Zap,
  AlertTriangle,
  Mail,
  UserCheck,
  LogIn,
  KeyRound,
  RefreshCw,
  FileCheck,
  Settings,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { statusTone } from "@/lib/status-tone";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { useTranslations } from "next-intl";

interface DashboardTabProps {
  onTabChange: (tab: string) => void;
}

/** Tonal ground + ink for the activity icon chip, which is not a pill. */
const TONE_CHIP: Record<BadgeTone, string> = {
  primary: "bg-primary/10 text-primary-ink",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-success/10 text-success-ink",
  warning: "bg-warning/10 text-warning-ink",
  destructive: "bg-destructive/10 text-destructive-ink",
  info: "bg-info/10 text-info-ink",
  neutral: "bg-muted text-muted-foreground",
};

/**
 * The five tile hues this tab used, mapped onto the shared card's colour slots.
 * `emerald` is the shared component's `green`; the rest keep their names.
 */
const STAT_TONE = {
  amber: statsCardColors.amber,
  emerald: statsCardColors.green,
  blue: statsCardColors.blue,
  purple: statsCardColors.purple,
  red: statsCardColors.red,
};

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
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-lg",
            enabled ? "bg-success/10" : "bg-muted"
          )}
        >
          {enabled ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <span className={cn("text-sm", enabled ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </span>
      </div>
      {!enabled && action && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAction}
          className="h-8 text-warning hover:text-warning hover:bg-warning/10"
        >
          {action}
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      )}
      {enabled && (
        <Badge tone={statusTone("ACTIVE")} className="text-xs">
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
  return (
    <div className="flex items-start gap-4 py-4 border-b border-border/50 last:border-0">
      <div
        className={cn(
          "p-2.5 rounded-xl flex-shrink-0",
          TONE_CHIP[statusTone(status)]
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {/* Server rows coerce a null description to "", and an empty paragraph
            still costs ~18px — real height inside a list that has to fit a
            fixed window. Render the line only when there is something to say. */}
        {description ? (
          <p className="text-xs text-subtle-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
      {/* The relative timestamp must never wrap: a scrollbar takes width off
          this row, and a wrapped "3mo ago" makes one row taller than its
          neighbours, which reads as a broken list rather than a long one. */}
      <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {time}
      </div>
    </div>
  );
});

export const DashboardTab = memo(function DashboardTab({
  onTabChange,
}: DashboardTabProps) {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const router = useRouter();
  const { user, securityScore } = useUserStore();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  // Real activity feed loaded from the backend. `null` means "still loading
  // / not fetched yet" so we can decide whether to fall back to derived state
  // for brand-new accounts.
  type ActivityRow = {
    id: string;
    type: string;
    title: string;
    description?: string | null;
    severity: "success" | "warning" | "info";
    createdAt: string | Date;
  };
  const [activityRows, setActivityRows] = useState<ActivityRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await $fetch<{ activities: ActivityRow[] }>({
        url: "/api/user/activity?limit=10",
        silent: true,
      });
      if (cancelled) return;
      if (!error && data?.activities) {
        setActivityRows(data.activities);
      } else {
        // Treat an error as "nothing logged yet" rather than spinning forever.
        setActivityRows([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Check if KYC is enabled in settings
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";

  if (!user) return null;

  /*
    TWO TOASTS, AND THE ONE THAT SURVIVED READING WAS THE ONE THAT KNEW NOTHING.

    This used to be `if (error) throw new Error(error)` wrapped in a try/catch
    that toasted "Failed to Send Email / Please try again later". `$fetch` does
    not throw — it returns an envelope — but it does toast, and it toasts the
    ACTUAL message from the body. So a single click produced both:

        "Email verification is not enabled on this platform"   <- $fetch, true
        "Failed to Send Email / Please try again later"        <- here, generic

    and the second one is the one an operator repeats to support. A customer
    reported an SMTP problem, their host went through the mail configuration, and
    the real answer — a settings switch — had been on screen the whole time,
    underneath a sentence about trying again later. A generic error stacked on
    top of a specific one does not add reassurance; it buries the diagnosis.

    `$fetch` owns the failure path now, because it is the only one of the two
    that can name the reason. `silentSuccess` suppresses only its success toast,
    so the localized confirmation below is not doubled either.
  */
  const handleVerifyEmail = async () => {
    setIsVerifyingEmail(true);
    const { error } = await $fetch({
      url: "/api/user/profile/verify-email",
      method: "POST",
      silentSuccess: true,
    });
    if (!error) {
      toast({
        title: tCommon("verification_email_sent"),
        description: t("please_check_your_inbox"),
      });
    }
    setIsVerifyingEmail(false);
  };

  const accountAge = Math.floor(
    (Date.now() - new Date(user.createdAt || Date.now()).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const getSecurityLevel = () => {
    if (securityScore >= 80) return { label: tCommon("excellent"), color: "emerald" };
    if (securityScore >= 60) return { label: tCommon("good"), color: "amber" };
    if (securityScore >= 40) return { label: tCommon("fair"), color: "amber" };
    return { label: tCommon("needs_attention"), color: "red" };
  };

  const securityLevel = getSecurityLevel();

  // Real account activity is fetched from /api/user/activity. Each entry in
  // the userActivity table corresponds to something the user actually did
  // (signed in, enabled 2FA, created an API key, submitted KYC, etc.). For
  // brand-new accounts with no logged events yet, we fall back to deriving a
  // short list from observable profile state so the card isn't blank.
  const formatRelative = (value?: Date | string | null): string | null => {
    if (!value) return null;
    const ts = new Date(value).getTime();
    if (!Number.isFinite(ts) || ts <= 0) return null;
    const diffMs = Date.now() - ts;
    if (diffMs < 0) return "just now";
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}d ago`;
    const mo = Math.floor(day / 30);
    if (mo < 12) return `${mo}mo ago`;
    return `${Math.floor(mo / 12)}y ago`;
  };

  type ActivityEntry = {
    icon: React.ElementType;
    title: string;
    description: string;
    time: string;
    status: "success" | "warning" | "info";
    sortKey: number;
  };

  const activityEntries: ActivityEntry[] = [];

  // Account created
  if (user.createdAt) {
    const rel = formatRelative(user.createdAt);
    if (rel) {
      activityEntries.push({
        icon: UserCheck,
        title: tDashboard("account_created"),
        description: new Date(user.createdAt).toLocaleDateString(),
        time: rel,
        status: "info",
        sortKey: new Date(user.createdAt).getTime(),
      });
    }
  }

  // Last login — only if it's actually different from account-creation time
  const lastLoginValue: any = (user as any).lastLogin;
  if (lastLoginValue) {
    const loginTs = new Date(lastLoginValue).getTime();
    const createdTs = user.createdAt ? new Date(user.createdAt).getTime() : 0;
    if (Number.isFinite(loginTs) && Math.abs(loginTs - createdTs) > 60_000) {
      const rel = formatRelative(lastLoginValue);
      if (rel) {
        activityEntries.push({
          icon: LogIn,
          title: t("signed_in"),
          description: t("most_recent_session"),
          time: rel,
          status: "info",
          sortKey: loginTs,
        });
      }
    }
  }

  // Email verified
  if (user.emailVerified) {
    activityEntries.push({
      icon: Mail,
      title: tCommon("email_verified"),
      description: user.email || tCommon("verified"),
      time: "Active",
      status: "success",
      sortKey: 0,
    });
  }

  // Phone verified
  if (user.phoneVerified) {
    activityEntries.push({
      icon: Smartphone,
      title: tCommon("phone_verified"),
      description: user.phone || tCommon("verified"),
      time: "Active",
      status: "success",
      sortKey: 0,
    });
  }

  // 2FA enabled — only if the user actually turned it on
  if (user.twoFactor?.enabled) {
    const twoFaCreated = (user.twoFactor as any)?.createdAt;
    const rel = formatRelative(twoFaCreated);
    activityEntries.push({
      icon: Shield,
      title: `2FA ${tCommon('enabled')}`,
      description: user.twoFactor.type
        ? t("authentication", { type: String(user.twoFactor.type) })
        : tCommon("two_factor_authentication"),
      time: rel || "Active",
      status: "success",
      sortKey: twoFaCreated ? new Date(twoFaCreated).getTime() : 0,
    });
  }

  // KYC approved
  if (user.kyc?.status === "APPROVED") {
    activityEntries.push({
      icon: CheckCircle2,
      title: t("kyc_verified"),
      description: user.kyc.level?.name
        ? t("approved", { name: String(user.kyc.level.name) })
        : t("identity_verified"),
      time: "Active",
      status: "success",
      sortKey: 0,
    });
  }

  // External wallet connected
  if (user.walletAddress) {
    activityEntries.push({
      icon: Wallet,
      title: tCommon("wallet_connected"),
      description: `${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}`,
      time: "Active",
      status: "success",
      sortKey: 0,
    });
  }

  // Map a server-side activity type to the right lucide icon. Keep in sync
  // with UserActivityType in backend/models/system/userActivity.ts.
  const iconForType = (type: string): React.ElementType => {
    switch (type) {
      case "auth.login":
        return LogIn;
      case "auth.login_failed":
        return AlertTriangle;
      case "auth.logout":
        return LogIn;
      case "security.2fa_enabled":
      case "security.2fa_disabled":
        return Shield;
      case "security.password_reset":
      case "security.password_changed":
        return KeyRound;
      case "security.email_verified":
        return Mail;
      case "security.phone_verified":
        return Smartphone;
      case "api_key.created":
      case "api_key.updated":
      case "api_key.deleted":
        return Key;
      case "kyc.submitted":
      case "kyc.updated":
        return FileCheck;
      case "kyc.approved":
        return CheckCircle2;
      case "kyc.rejected":
        return XCircle;
      case "profile.updated":
        return Settings;
      case "wallet.connected":
      case "wallet.disconnected":
        return LinkIcon;
      default:
        return Activity;
    }
  };

  // Real entries from the backend take priority. If the user has no logged
  // events yet (brand-new account, or table just created and hasn't picked
  // up traffic), fall back to derived profile state so the card still has
  // something meaningful.
  //
  // Both shapes carry a stable `id` so the rendered list is keyed by identity.
  // The two sources swap under one another (derived profile state first, then
  // the server feed once it lands), and an index key makes React reuse row 0's
  // memo'd output for a completely different event.
  const recentActivity =
    activityRows && activityRows.length > 0
      ? activityRows.map((row) => ({
          id: row.id,
          icon: iconForType(row.type),
          title: row.title,
          description: row.description || "",
          time: formatRelative(row.createdAt) || "just now",
          status: row.severity,
        }))
      : activityEntries
          .sort((a, b) => b.sortKey - a.sortKey)
          .slice(0, 5)
          .map(({ sortKey, ...rest }) => ({
            id: `derived:${rest.title}:${sortKey}`,
            ...rest,
          }));

  const activityIsLoading = activityRows === null;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          {/* `<h2>`, NOT `<h1>`. `ProfileHero` sits directly above this tab on
              the dashboard, personal and security views and draws the account's
              name as the page's `<h1>`; this greeting opens the overview
              SECTION under it. As an `<h1>` it was the third page title the
              browser measured on /en/user/profile. Same classes — the greeting
              looks identical. */}
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {t("welcome_back")} {user.firstName}
          </h2>
          <p className="text-subtle-foreground mt-1">
            {t("heres_an_overview_of_your_account")}
          </p>
        </div>
{kycEnabled && (
          <Link href="/user/kyc">
            {/* `hover:from-*`/`hover:to-*` without any `bg-gradient-*` are dead
                classes — the hover state did nothing at all. */}
            <Button className="bg-warning hover:bg-warning/90 text-warning-foreground shadow-lg shadow-warning/20">
              <Zap className="h-4 w-4 mr-2" />
              {t("upgrade_kyc")}
            </Button>
          </Link>
        )}
      </m.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label={tCommon("security_score")}
          value={`${securityScore}/100`}
          description={securityLevel.label}
          icon={Shield}
          index={0}
          {...STAT_TONE[securityLevel.color as keyof typeof STAT_TONE]}
        />
        <StatsCard
          label={tCommon("account_age")}
          value={`${accountAge} days`}
          description={tCommon("member_since")}
          icon={Calendar}
          index={1}
          {...STAT_TONE.blue}
        />
{kycEnabled && (
          <StatsCard
            label={tCommon("kyc_level")}
            value={user.kycLevel || 0}
            description={
              (user.kycLevel || 0) >= 2
                ? t("advanced_verified")
                : t("basic_verified")
            }
            icon={Users}
            index={2}
            {...STAT_TONE.purple}
          />
        )}
        <StatsCard
          label={tCommon("api_keys")}
          value={user.apiKeys?.length || 0}
          description={tCommon("active_keys")}
          icon={Key}
          index={3}
          {...STAT_TONE.amber}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Checklist */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-surface-2/50 border border-border/50 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-warning/10">
                  <Shield className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{t("security_checklist")}</h3>
                  <p className="text-xs text-subtle-foreground">{t("protect_your_account")}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTabChange("security")}
                className="text-muted-foreground hover:text-foreground"
              >
                {tCommon("view_all")}
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
          <div className="px-6 py-2">
            <SecurityCheckItem
              label={tCommon("two_factor_authentication")}
              enabled={user.twoFactor?.enabled || false}
              action="Enable"
              onAction={() => onTabChange("security")}
            />
            <SecurityCheckItem
              label={tCommon("email_verified")}
              enabled={user.emailVerified}
              action={isVerifyingEmail ? "Sending..." : "Verify"}
              onAction={handleVerifyEmail}
            />
            <SecurityCheckItem
              label={tCommon("phone_verified")}
              enabled={user.phoneVerified || false}
              action="Verify"
              onAction={() => onTabChange("phone-verification")}
            />
            {kycEnabled && (
              <SecurityCheckItem
                label={tCommon("kyc_verification")}
                enabled={(user.kycLevel || 0) > 0}
                action="Complete"
                onAction={() => router.push("/user/kyc")}
              />
            )}
          </div>

          {/* Security Score Ring */}
          <div className="px-6 py-5 bg-surface-2/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("your_security_level")}</p>
                <p className={cn(
                  "text-2xl font-bold mt-1",
                  securityScore >= 80 ? "text-success" :
                  securityScore >= 50 ? "text-warning" : "text-destructive"
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
                    className="text-foreground"
                  />
                  <m.circle
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
                      <stop offset="0%" stopColor="hsl(var(--warning))" />
                      <stop offset="100%" stopColor="hsl(var(--warning) / 0.7)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-foreground">{securityScore}</span>
                </div>
              </div>
            </div>
          </div>
        </m.div>

        {/* Recent Activity */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl bg-surface-2/50 border border-border/50 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{tCommon("recent_activity")}</h3>
                  <p className="text-xs text-subtle-foreground">{t("your_account_activity")}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6">
            {activityIsLoading ? (
              <div className="py-8 flex items-center justify-center text-sm text-subtle-foreground gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                {tCommon("loading_activity")}…
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="py-8 text-center text-sm text-subtle-foreground">
                {t("no_account_activity_yet")}
              </div>
            ) : (
              /* The list scrolls inside a fixed window because nothing else in
                 the chain bounds it: the card's `overflow-hidden` clips but
                 never scrolls, so every row the feed returns turns straight
                 into card height, and ten of them carry this card past 800px.
                 The two-column grid above stretches its items, so that height
                 is then forced onto the Security Checklist card next door,
                 which ends in a several-hundred-pixel dead band below its score
                 ring. 16rem is measured against that sibling: it lands within
                 ~30px of the checklist card whether or not the KYC row is
                 present. The window cuts through a row rather than between two
                 on purpose — a partial row plus a visible thumb is the only
                 thing telling you there is more underneath. */
              <div
                role="region"
                aria-label={tCommon("recent_activity")}
                tabIndex={0}
                className="max-h-64 overflow-y-auto pe-2 scrollbar-thin outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {recentActivity.map(({ id, ...activity }) => (
                  <ActivityItem key={id} {...activity} />
                ))}
              </div>
            )}
          </div>

          {/* Wallet Status */}
          <div className="px-6 py-5 bg-surface-2/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl",
                  user.walletAddress ? "bg-success/10" : "bg-muted"
                )}>
                  <Wallet className={cn(
                    "h-5 w-5",
                    user.walletAddress ? "text-success" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{tCommon("wallet_status")}</p>
                  <p className="text-xs text-subtle-foreground">
                    {user.walletAddress
                      ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                      : t("no_wallet_connected")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTabChange("wallet")}
                className={cn(
                  user.walletAddress
                    ? "text-success hover:text-success hover:bg-success/10"
                    : "text-warning hover:text-warning hover:bg-warning/10"
                )}
              >
                {user.walletAddress ? tCommon("manage") : tCommon("connect")}
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </m.div>
      </div>

      {/* Quick Actions */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-2xl bg-surface-2/50 border border-border/50 p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">{tCommon("quick_actions")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            onClick={() => onTabChange("personal")}
            className="h-auto py-4 flex-col gap-2 bg-muted/50 border-border-strong hover:bg-muted hover:border-border-strong text-foreground"
          >
            <Users className="h-5 w-5 text-warning" />
            <span className="text-sm">{tCommon("edit_profile")}</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onTabChange("security")}
            className="h-auto py-4 flex-col gap-2 bg-muted/50 border-border-strong hover:bg-muted hover:border-border-strong text-foreground"
          >
            <Shield className="h-5 w-5 text-success" />
            <span className="text-sm">Security</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onTabChange("api")}
            className="h-auto py-4 flex-col gap-2 bg-muted/50 border-border-strong hover:bg-muted hover:border-border-strong text-foreground"
          >
            <Key className="h-5 w-5 text-primary" />
            <span className="text-sm">{tCommon("api_keys")}</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onTabChange("notifications")}
            className="h-auto py-4 flex-col gap-2 bg-muted/50 border-border-strong hover:bg-muted hover:border-border-strong text-foreground"
          >
            <Activity className="h-5 w-5 text-primary" />
            <span className="text-sm">Notifications</span>
          </Button>
        </div>
      </m.div>
    </div>
  );
});

export default DashboardTab;
