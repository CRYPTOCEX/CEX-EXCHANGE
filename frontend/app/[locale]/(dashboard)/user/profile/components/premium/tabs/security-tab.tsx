"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { m } from "framer-motion";
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
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Loadable } from "@/components/ui/skeleton";
import { useUserStore } from "@/store/user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TwoFactorSetupFlow } from "../../two-factor-setup-flow";
import { ChangePasswordDialog } from "../change-password-dialog";
import {
  TransferPinDialog,
  type TransferPinStatus,
} from "../transfer-pin-dialog";
import { useToast } from "@/hooks/use-toast";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

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
    <div className="rounded-2xl bg-surface-2/50 border border-border/50 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex items-center justify-center h-12 w-12 rounded-xl flex-shrink-0",
              enabled
                ? "bg-success/10"
                : enabled === false
                ? "bg-destructive/10"
                : "bg-muted"
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6",
                enabled
                  ? "text-success"
                  : enabled === false
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              {badge && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    enabled
                      ? "bg-success/10 border-success/20 text-success-ink"
                      : "bg-muted border-border-strong text-muted-foreground"
                  )}
                >
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-subtle-foreground">{description}</p>
          </div>
          {action && (
            <Button
              onClick={onAction}
              loading={loading}
              className={cn(
                enabled
                  ? "bg-muted hover:bg-muted text-muted-foreground"
                  : "bg-warning hover:bg-warning/90 text-warning-foreground"
              )}
            >
              {action}
            </Button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
});

interface SessionData {
  id: string;
  current: boolean;
  browser: string;
  os: string;
  device: "desktop" | "mobile" | "tablet";
  ip: string | null;
  location: string | null;
  fingerprint: string | null;
  createdAt: string | null;
  lastActive: string | null;
}

// Compact relative-time formatter for "last active" labels.
function formatRelativeTime(value?: string | null): string {
  if (!value) return "—";
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return "—";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Active now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

/**
 * How many pending session rows to paint while GET /api/user/session is out.
 *
 * A session list has no knowable length, so this reserves the CONTAINER and
 * accepts that the count settles. Three is measured against the row: a 40px
 * device tile inside `py-4` is 72px, so three rows is 216px — comfortably
 * inside the scroller's `max-h-[340px]` cap, which is what stops the pending
 * state from claiming a scrollbar that most accounts (1-3 live sessions) will
 * never have.
 */
const PENDING_SESSION_ROWS = 3;

const SessionItem = memo(function SessionItem({
  id,
  device,
  browser,
  location,
  ip,
  time,
  current,
  fingerprint,
  onRevoke,
  revoking,
  pending = false,
}: {
  id: string;
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  location: string;
  ip: string;
  time: string;
  current?: boolean;
  fingerprint?: string | null;
  onRevoke?: (id: string) => void;
  revoking?: boolean;
  /**
   * Renders the row's four values as placeholders. Every piece of chrome —
   * the device tile, the globe, the borders, the 4-unit gaps — renders exactly
   * the same in both states, which is the whole point: this is ONE row
   * component, not a row and a matching skeleton row that drift apart.
   */
  pending?: boolean;
}) {
  const t = useTranslations("dashboard_user");
  const DeviceIcon = device === "mobile" || device === "tablet" ? Smartphone : Monitor;

  return (
    <div
      className="flex items-center gap-4 py-4 border-b border-border/50 last:border-0"
      aria-busy={pending || undefined}
    >
      {/* The 40px tile is chrome and renders identically in both states; the
          GLYPH inside it is a claim — desktop versus phone — that nothing has
          made yet, so while pending the tile carries the pulse and the icon is
          laid out but hidden. One element, one root, exact box: the same
          mechanism `SkeletonText` uses on text, applied to a 20px glyph. */}
      <div
        className={cn(
          "p-2.5 rounded-xl bg-muted",
          pending && "animate-pulse"
        )}
      >
        <DeviceIcon
          className={cn(
            "h-5 w-5 text-muted-foreground",
            pending && "invisible"
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            <Loadable loading={pending} placeholder={t("chrome_on_windows")}>
              {browser}
            </Loadable>
          </p>
          {/* `current` is false while pending, so the badge is absent. It sits
              INSIDE this `items-center` row beside a `text-sm` line and is
              `text-xs`, so it cannot make the row taller — it only settles
              sideways. */}
          {current && (
            <Badge className="bg-success/10 text-success-ink border-0 text-xs">
              Current
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-subtle-foreground">
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            <Loadable loading={pending} placeholder={t("london_united_kingdom")}>
              {location}
            </Loadable>
          </span>
          <span>
            <Loadable loading={pending} placeholder="192.168.100.100">
              {ip}
            </Loadable>
          </span>
          {/* Genuinely optional on a real session, so reserving it would claim a
              fingerprint the server may never send. Same line, same height. */}
          {fingerprint && (
            <span className="flex items-center gap-1" title={t("device_fingerprint")}>
              <Fingerprint className="h-3 w-3" />
              {fingerprint.slice(0, 8)}
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-subtle-foreground">
          <Loadable loading={pending} placeholder="2 hours ago">
            {time}
          </Loadable>
        </p>
        {/* No `onRevoke` is passed while pending, so this is absent — and it has
            to be: a revoke button for a session nobody has named yet would be
            an action against `id=""`. It costs no height. The right column is
            16px + 4px + 16px = 36px with the button and 16px without, against a
            40px device tile on the left, so the row is 40px + `py-4` = 72px in
            BOTH states either way. */}
        {!current && onRevoke && (
          <button
            onClick={() => onRevoke(id)}
            disabled={revoking}
            className="text-xs text-destructive hover:text-destructive mt-1 disabled:opacity-50"
          >
            {revoking ? `${t("revoking")}…` : t("revoke")}
          </button>
        )}
      </div>
    </div>
  );
});

export const SecurityTab = memo(function SecurityTab({
  startTwoFactorSetup,
}: SecurityTabProps) {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const { user, securityScore, setUser, setShowTwoFactorSetup } =
    useUserStore();
  const { toast } = useToast();
  const [showTwoFactorSetupLocal, setShowTwoFactorSetupLocal] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [show2FADisablePrompt, setShow2FADisablePrompt] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState("");
  // Either proof disables 2FA. The code is the only one a passwordless
  // (Google / wallet) account can give.
  const [disable2FACode, setDisable2FACode] = useState("");
  const [sessions, setSessions] = useState<SessionData[] | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [showTransferPinDialog, setShowTransferPinDialog] = useState(false);
  const [transferPin, setTransferPin] = useState<TransferPinStatus | null>(null);

  const fetchTransferPin = useCallback(async () => {
    const { data, error } = await $fetch({
      url: "/api/user/profile/transfer-pin",
      silent: true,
    });
    if (!error && data) setTransferPin(data as TransferPinStatus);
  }, []);

  useEffect(() => {
    void fetchTransferPin();
  }, [fetchTransferPin]);

  const fetchSessions = useCallback(async () => {
    const { data, error } = await $fetch({
      url: "/api/user/session",
      silent: true,
    });
    if (!error && data?.sessions) {
      setSessions(data.sessions as SessionData[]);
    } else {
      setSessions([]);
    }
    setLoadingSessions(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  /**
   * "No active sessions found" is a RESULT, and a result needs a finished
   * request. `sessions` is `null` until the response lands, so without the
   * `!loadingSessions` half this sentence would greet every visit to the
   * Security tab — telling someone who is, by definition, signed in that they
   * have no sessions. The spinner branch used to make that unreachable; the
   * name makes it explicit instead.
   */
  const showNoSessions =
    !loadingSessions && (!sessions || sessions.length === 0);

  if (!user) return null;

  const getSecurityLevel = () => {
    if (securityScore >= 80)
      return { label: tCommon("excellent"), color: "emerald", icon: ShieldCheck };
    if (securityScore >= 60)
      return { label: tCommon("good"), color: "amber", icon: Shield };
    if (securityScore >= 40)
      return { label: tCommon("fair"), color: "amber", icon: ShieldAlert };
    return { label: tCommon("at_risk"), color: "red", icon: ShieldOff };
  };

  const securityLevel = getSecurityLevel();
  const SecurityLevelIcon = securityLevel.icon;

  const handleToggle2FA = async () => {
    if (!user.twoFactor?.enabled) {
      setShowTwoFactorSetupLocal(true);
      setShowTwoFactorSetup(true);
      return;
    }
    // Disabling 2FA is server-gated on the account password (a stolen session
    // alone must not be able to strip the second factor), so collect it first.
    setDisable2FAPassword("");
    setDisable2FACode("");
    setShow2FADisablePrompt(true);
  };

  const confirmDisable2FA = async () => {
    /*
      EITHER proof, because either is enough server-side and each covers what
      the other cannot: an account created through Google or a wallet has NO
      password, and used to be unable to disable 2FA at all from here — the
      door took a password only, and refused the empty one it was given. A user
      who has lost their authenticator still has their password.
    */
    const code = disable2FACode.trim();
    if (!disable2FAPassword && !code) {
      toast({
        title: t("password_required"),
        description: t("enter_your_password_or_a_current_code"),
        variant: "destructive",
      });
      return;
    }
    setIsDisabling2FA(true);
    try {
      const { error } = await $fetch({
        url: "/api/user/profile/otp/status",
        method: "POST",
        // The server tries `otp` first and never falls back to the password
        // once one is supplied, so send only what was actually filled in.
        body: code
          ? { status: false, otp: code }
          : { status: false, password: disable2FAPassword },
        silent: true,
      });

      if (error) throw new Error(error);

      setUser({
        ...user,
        twoFactor: { ...user.twoFactor, enabled: false },
      } as any);

      setShow2FADisablePrompt(false);
      setDisable2FAPassword("");
      setDisable2FACode("");
      toast({
        title: `2FA ${tCommon('disabled')}`,
        description: t("two_factor_authentication_has_been_disabled"),
      });
    } catch (err: any) {
      toast({
        title: tCommon("failed"),
        description:
          err?.message ||
          t("could_not_disable_2fa_check_your"),
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
      title: `2FA ${tCommon('enabled')}`,
      description: t("your_account_is_now_protected_with"),
    });
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      const { error } = await $fetch({
        url: `/api/user/session/${id}`,
        method: "DELETE",
      });
      if (error) throw new Error(error);
      toast({
        title: t("session_revoked"),
        description: t("that_device_has_been_signed_out"),
      });
      await fetchSessions();
    } catch {
      toast({
        title: tCommon("failed"),
        description: t("could_not_revoke_that_session_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setRevokingId(null);
    }
  };

  const handleSignOutAll = async () => {
    setSigningOutAll(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/user/session",
        method: "DELETE",
      });
      if (error) throw new Error(error);
      toast({
        title: t("other_devices_signed_out"),
        description: data?.message || t("all_other_sessions_have_been_signed_out"),
      });
      await fetchSessions();
    } catch {
      toast({
        title: tCommon("failed"),
        description: t("could_not_sign_out_other_sessions_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setSigningOutAll(false);
    }
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

  return (
    <div className="space-y-8">
      {/* In-session password change. Refreshes the session list on success, since
          the change signs every other device out. */}
      <ChangePasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        onChanged={() => void fetchSessions()}
      />

      <TransferPinDialog
        open={showTransferPinDialog}
        onOpenChange={setShowTransferPinDialog}
        status={transferPin}
        onSaved={() => void fetchTransferPin()}
      />

      {/* Disable-2FA password confirmation */}
      <Dialog open={show2FADisablePrompt} onOpenChange={setShow2FADisablePrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("disable_two_factor_authentication")}</DialogTitle>
            <DialogDescription>
              {t("enter_your_account_password_to_confirm")}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void confirmDisable2FA();
            }}
            className="space-y-4"
          >
            <Input
              type="password"
              autoFocus
              placeholder={t("account_password")}
              value={disable2FAPassword}
              onChange={(e) => setDisable2FAPassword(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">
                {tCommon("or")}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("current_two_factor_code")}
              value={disable2FACode}
              onChange={(e) =>
                setDisable2FACode(e.target.value.replace(/D/g, "").slice(0, 6))
              }
            />
            <p className="text-xs text-muted-foreground">
              {t("no_password_use_a_code_instead")}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShow2FADisablePrompt(false)}
                disabled={isDisabling2FA}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={
                  isDisabling2FA ||
                  (!disable2FAPassword && !disable2FACode.trim())
                }
              >
                {isDisabling2FA ? `${t("disabling")}…` : t("disable_2fa")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Header with Score */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl bg-linear-to-br from-surface-2 via-surface-2 to-muted border border-border/50 overflow-hidden"
      >

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left: Info */}
            <div className="space-y-4">
              <div>
                {/* `<h2>`, NOT `<h1>`. `ProfileHero` renders above this tab (it
                    is one of the three views that show it) and owns the page's
                    `<h1>`; this names the section. Same classes. */}
                <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                  {t("security_center")}
                </h2>
                <p className="text-subtle-foreground mt-1">
                  {t("manage_your_account_security_and_authentication")}
                </p>
              </div>

              {/* Security Status Pills */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "px-3 py-1",
                    user.twoFactor?.enabled
                      ? "bg-success/10 border-success/20 text-success-ink"
                      : "bg-destructive/10 border-destructive/20 text-destructive-ink"
                  )}
                >
                  <Fingerprint className="h-3 w-3 mr-1.5" />
                  {user.twoFactor?.enabled ? `2FA ${tCommon('active')}` : `2FA ${tCommon('inactive')}`}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "px-3 py-1",
                    user.emailVerified
                      ? "bg-success/10 border-success/20 text-success-ink"
                      : "bg-muted border-border-strong text-muted-foreground"
                  )}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1.5" />
                  Email {user.emailVerified ? tCommon("verified") : tCommon("unverified")}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "px-3 py-1",
                    user.phoneVerified
                      ? "bg-success/10 border-success/20 text-success-ink"
                      : "bg-muted border-border-strong text-muted-foreground"
                  )}
                >
                  <Smartphone className="h-3 w-3 mr-1.5" />
                  Phone {user.phoneVerified ? tCommon("verified") : tCommon("unverified")}
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
                    className="text-foreground"
                  />
                  <m.circle
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
                      <stop offset="0%" stopColor="hsl(var(--warning))" />
                      <stop offset="100%" stopColor="hsl(var(--warning) / 0.7)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">{securityScore}</span>
                  <span className="text-xs text-subtle-foreground">Score</span>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="flex items-center gap-2 mb-1">
                  <SecurityLevelIcon
                    className={cn(
                      "h-5 w-5",
                      securityLevel.color === "emerald"
                        ? "text-success"
                        : securityLevel.color === "amber"
                        ? "text-warning"
                        : "text-destructive"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xl font-bold",
                      securityLevel.color === "emerald"
                        ? "text-success"
                        : securityLevel.color === "amber"
                        ? "text-warning"
                        : "text-destructive"
                    )}
                  >
                    {securityLevel.label}
                  </span>
                </div>
                <p className="text-sm text-subtle-foreground">
                  {securityScore < 80
                    ? t("complete_more_security_steps_to_improve_your_score")
                    : t("your_account_is_well_protected")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </m.div>

      {/* Security Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Two-Factor Authentication */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-tour="profile-2fa"
        >
          <SecurityCard
            icon={Fingerprint}
            title={tCommon("two_factor_authentication")}
            description={
              user.twoFactor?.enabled
                ? t("your_account_is_protected_with_2fa")
                : t("add_an_extra_layer_of_security_to_your_account")
            }
            enabled={user.twoFactor?.enabled}
            badge={user.twoFactor?.enabled ? "Active" : undefined}
            action={user.twoFactor?.enabled ? "Disable" : "Enable"}
            onAction={handleToggle2FA}
            loading={isDisabling2FA}
          >
            {user.twoFactor?.enabled && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-subtle-foreground">Method</span>
                  <span className="text-foreground font-medium">
                    {user.twoFactor.type === "TOTP"
                      ? t("authenticator_app")
                      : user.twoFactor.type || t("authenticator_app")}
                  </span>
                </div>
              </div>
            )}
          </SecurityCard>
        </m.div>

        {/* Password */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SecurityCard
            icon={Lock}
            title="Password"
            description={t("change_your_password_regularly_for_better_security")}
            action="Change Password"
            onAction={() => setShowPasswordDialog(true)}
          >
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-subtle-foreground">
                <LogOut className="h-4 w-4" />
                {/* A password change is the remedy for "someone else may be in my
                    account", so the server revokes every other session — say so,
                    because it is a visible consequence the user should expect. */}
                <span>
                  {t("youll_stay_signed_in_here_other")}
                </span>
              </div>
            </div>
          </SecurityCard>
        </m.div>

        {/* Transfer PIN */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <SecurityCard
            icon={KeyRound}
            title={t("transfer_pin")}
            description={
              transferPin?.hasPin
                ? t("your_transfers_are_confirmed_with_a_pin")
                : t("set_a_pin_to_confirm_wallet_transfers")
            }
            enabled={transferPin?.hasPin}
            badge={transferPin?.hasPin ? "Active" : undefined}
            action={transferPin?.hasPin ? t("change_pin") : t("set_pin")}
            onAction={() => setShowTransferPinDialog(true)}
          >
            {/* The operator demands a PIN and this user has none: that is a
                blocked transfer waiting to happen, so say it here rather than
                letting them find out with an amount typed in. */}
            {transferPin?.requiredForTransfers && !transferPin?.hasPin && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-start gap-2 text-sm text-warning-ink">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t("transfers_are_unavailable_until_you_set_a_pin")}</span>
                </div>
              </div>
            )}
            {transferPin?.lockedUntil && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-start gap-2 text-sm text-destructive-ink">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t("your_pin_is_locked_after_too_many_attempts")}</span>
                </div>
              </div>
            )}
          </SecurityCard>
        </m.div>
      </div>

      {/* Active Sessions */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-surface-2/50 border border-border/50 overflow-hidden"
      >
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                {/* `bg-surface-2/50` card, not a `bg-primary` fill. */}
                <h3 className="text-lg font-semibold text-foreground">{tCommon("active_sessions")}</h3>
                <p className="text-sm text-subtle-foreground">
                  {t("devices_currently_logged_into_your_account")}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOutAll}
              loading={signingOutAll}
              disabled={
                !sessions || sessions.filter((s) => !s.current).length === 0
              }
              className="bg-muted border-border-strong text-muted-foreground hover:bg-muted"
            >
              {!signingOutAll && <LogOut className="h-4 w-4 mr-2" />}
              {t("sign_out_all")}
            </Button>
          </div>
        </div>
        {/* Bounded list. Sessions have a 14-day TTL and the server deliberately
            returns ALL of them (truncating would hide a session the user then
            could not revoke), so the height has to be capped here. A plain
            overflow container, NOT `<ScrollArea>`: Radix's Root sets only
            `position: relative`, and its Viewport is `height: 100%` — a
            percentage against an auto-height parent resolves to auto, so a
            `max-h-*` ScrollArea never scrolls and this card's `overflow-hidden`
            would silently clip every row past the cap. `max-h` rather than `h`
            so the common 1-3 session case still renders at its natural height
            with no dead space. 340px shows four full rows plus a sliver of the
            fifth, which is the "more below" cue. */}
        <div className="max-h-[340px] overflow-y-auto overscroll-contain px-6 scrollbar-thin">
          {/* Three states, and only the first two used to be distinguishable.
              The spinner this replaced was a 68px `py-8` row that the real list
              (72px per session) grew straight past, so the card jumped by at
              least 76px on every visit to this tab — more with two or three
              devices signed in. */}
          {loadingSessions ? (
            Array.from({ length: PENDING_SESSION_ROWS }, (_, index) => (
              <SessionItem
                key={`pending-${index}`}
                pending
                /* Deliberately inert: no id to revoke, no handler to revoke
                   with. `device` has to be one of the three, and the value is
                   unused because `pending` skeletons the glyph. */
                id=""
                device="desktop"
                browser=""
                location=""
                ip=""
                time=""
              />
            ))
          ) : showNoSessions ? (
            <div className="py-8 text-center text-sm text-subtle-foreground">
              {t("no_active_sessions_found")}
            </div>
          ) : (
            (sessions ?? []).map((session) => (
              <SessionItem
                key={session.id}
                id={session.id}
                device={session.device}
                browser={`${session.browser} on ${session.os}`}
                location={
                  session.location ||
                  (session.ip ? "Unknown location" : "Unknown")
                }
                ip={session.ip || "—"}
                time={
                  session.current
                    ? "Active now"
                    : formatRelativeTime(session.lastActive)
                }
                current={session.current}
                fingerprint={session.fingerprint}
                onRevoke={handleRevokeSession}
                revoking={revokingId === session.id}
              />
            ))
          )}
        </div>
      </m.div>

      {/* Security Recommendations */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-warning/5 border border-warning/10 p-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-warning/10 flex-shrink-0">
            <Shield className="h-6 w-6 text-warning" />
          </div>
          <div className="flex-1">
            {/* On a `warning/5` TINT, not a `bg-warning` fill — so the ink is
                the derived on-tint `--warning-ink`, never --warning-foreground
                (white in light mode, i.e. an invisible heading). */}
            <h3 className="text-lg font-semibold text-warning-ink mb-2">
              {t("security_recommendations")}
            </h3>
            <ul className="space-y-3">
              {!user.twoFactor?.enabled && (
                <li className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-foreground font-medium">
                      {t("enable_two_factor_authentication")}
                    </p>
                    <p className="text-xs text-subtle-foreground">
                      {t("protect_your_account_with_an_additional")}
                    </p>
                  </div>
                </li>
              )}
              {!user.phoneVerified && (
                <li className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-foreground font-medium">
                      {t("verify_your_phone_number")}
                    </p>
                    <p className="text-xs text-subtle-foreground">
                      {t("add_phone_verification_for_account_recovery")}
                    </p>
                  </div>
                </li>
              )}
              {user.twoFactor?.enabled && user.emailVerified && user.phoneVerified && (
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-foreground font-medium">
                      {t("excellent_security")}
                    </p>
                    <p className="text-xs text-subtle-foreground">
                      {t("youve_enabled_all_recommended_security_features")}
                    </p>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </m.div>
    </div>
  );
});

export default SecurityTab;
