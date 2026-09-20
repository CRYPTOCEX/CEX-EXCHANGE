"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Bell,
  Check,
  ChevronRight,
  Copy,
  Fingerprint,
  History,
  KeyRound,
  LifeBuoy,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Shield,
  Smartphone,
  Sun,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { cn, formatCurrency } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loadable } from "@/components/ui/skeleton";
import {
  useUserStore,
  calculateSecurityScoreImpl,
  calculateProfileCompletionImpl,
} from "@/store/user";
import { useConfigStore } from "@/store/config";
import { useWalletStore } from "@/store/finance/wallet-store";
import { useNotificationsStore } from "@/store/notification-store";
import { isKycEnabled } from "@/utils/kyc";
import { useMounted } from "@/hooks/use-mounted";

/**
 * THE PROFILE PANEL, AND WHY IT IS ONE COMPONENT.
 * ===========================================================================
 *
 * There were TWO signed-in profile dropdowns, and neither said anything. The
 * Radix one in `profile-info.tsx` (binary, /dex/swap, /trade/pro, the
 * notifications header) and the hand-rolled one inside `site-header.tsx`
 * `ProfileButton` (every core route) had independently converged on the same
 * four lines - name, email, "Profile", "API Management", "Logout" - so the
 * control that carries the user's ENTIRE account context was worth less than
 * the bell beside it, twice over.
 *
 * This file is the panel body only: no width, no border, no shadow, no
 * positioning. The two call sites own the frame because they open it
 * differently - one through a Radix portal (which is what keeps it out of the
 * terminal headers' `overflow-hidden` ancestors), one through an absolutely
 * positioned `m.div` in the header itself.
 *
 * WHAT IT ANSWERS, in the order a signed-in person asks it:
 *   who am I here      identity, public handle, role, account id, joined
 *   what do I have     total balance, 24h move, unconfirmed deposits
 *                      — CONDITIONAL, see THE BALANCE RULE below
 *   am I safe          security score, 2FA / email / phone / KYC, last login
 *   where do I go      the destinations that are not in the nav
 *   how do I leave     appearance, sign out
 *
 * THE BALANCE RULE: this panel carries balances only where NOTHING ELSE IN THE
 * BAR ALREADY DOES. It is a property of the header, not of the route, so each
 * header answers it with `showBalance`:
 *
 *   site header, user   FALSE — the wallet button sits two controls away and
 *                       its popover says strictly more (total, 24h, per-type
 *                       counts). Two readouts a thumb's width apart that
 *                       disagree while one fetch is still in flight is worse
 *                       than one.
 *   site header, admin  FALSE — that bar drops the wallet button on the rule
 *                       that an operator's own balances are not an admin
 *                       concern. A block smuggled in here would reintroduce
 *                       exactly what that removed.
 *   every terminal      TRUE — binary, forex, /trade/pro and /dex/swap mount
 *                       no wallet control at all, so this panel is the only
 *                       place those figures exist on the route.
 *
 * `/dex/swap` is true AND overrides the block itself via `balanceSlot`, because
 * its money is on-chain rather than custodial. See that prop.
 *
 * The default is TRUE: a header added later is far more likely to be another
 * chromeless terminal than a second copy of the site bar, and a duplicated
 * balance is a visible mistake while a missing one is a silent one.
 */
export interface ProfileMenuPanelProps {
  /** Close the surrounding popover. Every link and action calls it. */
  onNavigate?: () => void;
  /** See THE BALANCE RULE above. False in BOTH site-header clusters. */
  showBalance?: boolean;
  /**
   * Replaces the custodial balance block with money that belongs to THIS
   * surface. `/dex/swap` passes its on-chain wallet block: the DEX terminal
   * never touches the custodial ledger, so a FIAT/SPOT/ECO/FUTURES total is
   * not merely irrelevant there, it is a different pot of money presented as
   * if it were the one the user is about to swap.
   *
   * A rendered node rather than a mode flag, because the caller owns the data:
   * the DEX balances live behind `useDexTerminal()`, which throws outside the
   * terminal's provider and whose wagmi imports are eslint-banned outside
   * `(ext)/dex/swap/components/wallet/**`. A header component in
   * `components/partials/**` reaching into route code would invert the
   * layering; a slot lets the route hand DOWN what only it can build.
   *
   * The custodial block is a separate component below precisely so that
   * supplying a slot means it never MOUNTS - which is also what stops
   * `/api/finance/wallet/stats` being requested at all on a route that has no
   * business asking for it.
   *
   * A FUNCTION, not a node, so the slot receives `onNavigate`. Its contents are
   * as clickable as the rest of the panel - "view all balances" switches the
   * dock behind it, "disconnect" changes what the whole terminal shows - and a
   * panel still sitting open over the thing it just changed is worse than no
   * action at all. Only the panel knows how to close itself.
   */
  balanceSlot?: (ctx: { onNavigate?: () => void }) => ReactNode;
  className?: string;
}

interface QuickLink {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Rendered as a count chip on the right. Omitted when 0. */
  badge?: number;
}

export function ProfileMenuPanel({
  onNavigate,
  showBalance = true,
  balanceSlot,
  className,
}: ProfileMenuPanelProps) {
  const t = useTranslations("common");
  const tc = useTranslations("components");
  const router = useRouter();

  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const hasPermission = useUserStore((s) => s.hasPermission);

  const settings = useConfigStore((s) => s.settings);
  const extensions = useConfigStore((s) => s.extensions);
  const unread = useNotificationsStore((s) => s.stats.unread);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  /* The store's OWN formulas, imported rather than re-derived here. The score
     is also written into the store by the profile page, but nothing computes
     it at sign-in - reading `securityScore` off the store would render 0% for
     anyone who has not visited /user/profile this session. */
  const securityScore = useMemo(() => calculateSecurityScoreImpl(user), [user]);
  const profileCompletion = useMemo(
    () => calculateProfileCompletionImpl(user),
    [user]
  );

  if (!user) return null;

  const initials = getUserInitials(user);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const displayName = fullName || user.username || user.email || t("account");
  /* `username` is the only name other users ever see, so it is the handle
     shown here; the email is the fallback for accounts that predate it. */
  const handle = user.username ? `@${user.username}` : user.email || "";

  const roleName = user.role?.name;
  const showRole = !!roleName && roleName.toLowerCase() !== "user";

  const kycOn = isKycEnabled(settings);
  const kycStatus = user.kyc?.status;
  const kycLevel = user.kyc?.level?.level ?? user.kycLevel ?? 0;

  const quickLinks: QuickLink[] = [
    {
      key: "wallet",
      label: t("wallet"),
      href: "/finance/wallet",
      icon: Wallet,
    },
    {
      key: "history",
      label: t("history"),
      href: "/finance/history",
      icon: History,
    },
    {
      key: "notifications",
      label: t("notifications"),
      href: "/user/notification",
      icon: Bell,
      badge: unread,
    },
    {
      key: "support",
      label: t("support"),
      href: "/support/ticket",
      icon: LifeBuoy,
    },
    {
      key: "api",
      label: t("api_keys"),
      href: "/user/profile?tab=api",
      icon: KeyRound,
    },
  ];
  if (Array.isArray(extensions) && extensions.includes("mlm")) {
    quickLinks.push({
      key: "affiliate",
      label: t("affiliate"),
      href: "/affiliate",
      icon: Users,
    });
  }
  if (hasPermission("access.admin")) {
    quickLinks.push({
      key: "admin",
      label: t("admin"),
      href: "/admin",
      icon: Shield,
    });
  }

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
    } catch {
      /* Clipboard is permission-gated and unavailable over plain http. There
         is nothing useful to say about it, and a failed copy must not look
         like a successful one - so the chip simply does not flip. */
    }
  };

  const handleSignOut = async () => {
    onNavigate?.();
    const success = await logout();
    if (success) router.push("/");
  };

  return (
    <div data-slot="profile-menu" className={cn("flex flex-col", className)}>
      {/* -- Identity ---------------------------------------------- */}
      <div className="bg-surface-2 border-b border-border">
        <Link
          href="/user/profile"
          onClick={onNavigate}
          className="group flex items-center gap-3 px-4 pt-3.5 pb-3 transition-colors hover:bg-surface-3"
        >
          <div className="relative shrink-0">
            <Avatar className="h-11 w-11 rounded-xl ring-1 ring-border-strong">
              {user.avatar ? (
                <AvatarImage
                  src={user.avatar}
                  alt={displayName}
                  className="rounded-xl object-cover"
                />
              ) : null}
              <AvatarFallback className="rounded-xl bg-primary/15 text-primary-ink text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* Presence dot. `ring-surface-2` cuts it out of the header
                ground rather than drawing a white halo over it. */}
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-surface-2"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-foreground">
                {displayName}
              </p>
              {showRole && (
                <span className="shrink-0 rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary-ink">
                  {roleName}
                </span>
              )}
            </div>
            {handle && (
              <p className="truncate text-xs text-subtle-foreground">
                {handle}
              </p>
            )}
            {user.createdAt && (
              <p className="mt-0.5 truncate text-[10px] text-subtle-foreground">
                {t("member_since")} {safeFormat(user.createdAt, "MMM yyyy")}
              </p>
            )}
          </div>

          <ChevronRight className="h-4 w-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>

        {/* Account id. Support asks for this on every ticket, and it is
            currently only findable in a URL. Its own row because a copy
            button inside the profile link would be a button inside a link. */}
        <div className="flex items-center gap-2 border-t border-border px-4 py-1.5">
          <span className="text-[10px] uppercase tracking-wider text-subtle-foreground">
            {t("id")}
          </span>
          <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
            {user.id}
          </code>
          <button
            type="button"
            onClick={handleCopyId}
            title={t("user_id")}
            aria-label={copied ? t("copied") : t("copy")}
            className="shrink-0 cursor-pointer rounded-md p-1 text-subtle-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* -- Balance ----------------------------------------------- */}
      {showBalance &&
        (balanceSlot ? (
          balanceSlot({ onNavigate })
        ) : (
          <PlatformBalanceBlock onNavigate={onNavigate} />
        ))}

      {/* -- Security ---------------------------------------------- */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-subtle-foreground">
            <Shield className="h-3 w-3" />
            {t("security_score")}
          </span>
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {securityScore}%
          </span>
        </div>

        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              scoreTone(securityScore)
            )}
            style={{ width: `${securityScore}%` }}
            role="progressbar"
            aria-valuenow={securityScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("security_score")}
          />
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          <StatusChip
            icon={Fingerprint}
            label="2FA"
            value={user.twoFactor?.enabled ? t("enabled") : t("disabled")}
            ok={!!user.twoFactor?.enabled}
            href="/user/profile?tab=security"
            onNavigate={onNavigate}
          />
          {kycOn && (
            <StatusChip
              icon={Shield}
              label="KYC"
              value={kycChipValue(kycStatus, kycLevel, t)}
              ok={kycStatus === "APPROVED"}
              pending={
                kycStatus === "PENDING" ||
                kycStatus === "ADDITIONAL_INFO_REQUIRED"
              }
              href="/user/kyc"
              onNavigate={onNavigate}
            />
          )}
          <StatusChip
            icon={Mail}
            label={t("email")}
            value={user.emailVerified ? t("verified") : t("not_verified")}
            ok={!!user.emailVerified}
            href="/user/profile?tab=security"
            onNavigate={onNavigate}
          />
          <StatusChip
            icon={Smartphone}
            label={t("phone")}
            value={user.phoneVerified ? t("verified") : t("verify")}
            ok={!!user.phoneVerified}
            href="/user/profile?tab=phone-verification"
            onNavigate={onNavigate}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-subtle-foreground">
          <span className="shrink-0">
            {t("profile")} · {profileCompletion}%
          </span>
          {user.lastLogin && (
            <span className="truncate">
              {t("last_login")} {safeDistance(user.lastLogin)}
            </span>
          )}
        </div>
      </div>

      {/* -- Destinations ------------------------------------------ */}
      <div className="px-2 py-2">
        <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-subtle-foreground">
          {t("quick_actions")}
        </p>
        <div className="grid grid-cols-2 gap-0.5">
          {quickLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              onClick={onNavigate}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                <link.icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate">{link.label}</span>
              {!!link.badge && link.badge > 0 && (
                <Badge
                  tone="primary"
                  appearance="solid"
                  size="xs"
                  /* A count pill: `rounded-full` and tabular figures are the
                     shape, the tone and the size come from the primitive. */
                  className="shrink-0 rounded-full leading-none tabular-nums"
                >
                  {link.badge > 99 ? "99+" : link.badge}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* -- Appearance -------------------------------------------- */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-subtle-foreground">
          {t("appearance")}
        </span>
        <ThemeSegments />
      </div>

      {/* -- Sign out ---------------------------------------------- */}
      <button
        type="button"
        onClick={handleSignOut}
        className="flex w-full cursor-pointer items-center gap-2 border-t border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive-ink"
      >
        <LogOut className="h-4 w-4" />
        {t("sign_out")}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * The custodial balance block - FIAT / SPOT / ECO / FUTURES, the platform's own
 * ledger.
 *
 * It is a component rather than markup inside the panel for one structural
 * reason: it owns the `useWalletStore` read AND the `/api/finance/wallet/stats`
 * fetch, so a surface that supplies its own `balanceSlot` does not merely hide
 * this - it never mounts it, and therefore never asks the custodial API a
 * question it has no business asking. See `balanceSlot` on the props above.
 */
function PlatformBalanceBlock({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("common");
  const {
    totalBalance,
    totalPending,
    totalChangePercent,
    totalWallets,
    activeWallets,
    isLoadingStats,
    fetchStats,
  } = useWalletStore();

  /* This block only ever mounts while the panel is open, so this is "on open"
     without a second piece of state. `fetchStats` latches on
     `hasFetchedStats`, so reopening the panel costs nothing. */
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const isPositive = (totalChangePercent ?? 0) >= 0;
  const hasChange = isLoadingStats || (totalChangePercent ?? 0) !== 0;

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-subtle-foreground">
          {t("total_balance")}
        </span>
        {hasChange && (
          <span className="flex items-center gap-0.5">
            {/* No direction exists while pending - `totalChangePercent`
                      is 0, and painting that as a gain is a claim. */}
            {isLoadingStats ? (
              <span
                aria-hidden="true"
                className="h-3 w-3 animate-pulse rounded-xs bg-muted"
              />
            ) : isPositive ? (
              <TrendingUp className="h-3 w-3 text-up" />
            ) : (
              <TrendingDown className="h-3 w-3 text-down" />
            )}
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                isLoadingStats
                  ? "text-muted-foreground"
                  : isPositive
                    ? "text-up"
                    : "text-down"
              )}
            >
              <Loadable loading={isLoadingStats} placeholder="+0.00%">
                {`${isPositive ? "+" : ""}${(totalChangePercent ?? 0).toFixed(2)}%`}
              </Loadable>
            </span>
          </span>
        )}
      </div>

      <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
        <Loadable loading={isLoadingStats} placeholder="$12,345.67">
          {formatCurrency(totalBalance || 0, "USD")}
        </Loadable>
      </p>

      {/* ONE caption line that always exists, because the thing it says
                is conditional but its HEIGHT must not be.

                Unconfirmed deposits are money the user has SENT that nobody has
                approved yet - deliberately not part of the total (see the wallet
                stats route), and the first number people go looking for when the
                total looks wrong. It is also the minority case, so gating the
                line on it would have grown the panel by 16px under the cursor
                the moment the fetch landed, and reserving a blank line for
                everyone else is just the same 16px spent permanently. The line
                carries the wallet spread instead when there is nothing pending. */}
      <p
        className={cn(
          "mt-0.5 text-[11px]",
          !isLoadingStats && totalPending > 0
            ? "text-warning-ink"
            : "text-subtle-foreground"
        )}
      >
        <Loadable loading={isLoadingStats} placeholder="3 / 4 wallets">
          {totalPending > 0
            ? `${t("pending")} ${formatCurrency(totalPending, "USD")}`
            : `${activeWallets || 0} / ${totalWallets || 0} ${t("wallets")}`}
        </Loadable>
      </p>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <MoneyAction
          href="/finance/deposit"
          icon={ArrowDownToLine}
          label={t("deposit")}
          onNavigate={onNavigate}
          primary
        />
        <MoneyAction
          href="/finance/withdraw"
          icon={ArrowUpFromLine}
          label={t("withdraw")}
          onNavigate={onNavigate}
        />
        <MoneyAction
          href="/finance/transfer"
          icon={ArrowLeftRight}
          label={t("transfer")}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

function MoneyAction({
  href,
  icon: Icon,
  label,
  onNavigate,
  primary = false,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  onNavigate?: () => void;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-medium transition-colors",
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-muted text-muted-foreground hover:bg-surface-3 hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/**
 * A verification fact, and the place to go and fix it.
 *
 * Three tones, not two, and the axis is WHOSE MOVE IT IS rather than
 * good/bad: green = done, amber = your move, grey = ours. A submitted KYC
 * application painted the same as one that was never started tells the user to
 * redo work they have already done.
 */
function StatusChip({
  icon: Icon,
  label,
  value,
  ok,
  pending = false,
  href,
  onNavigate,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  ok: boolean;
  pending?: boolean;
  href: string;
  onNavigate?: () => void;
}) {
  /* Amber means DO SOMETHING, so it belongs on the item nobody has done - not
     on the one already submitted and waiting on us. A pending KYC application
     is grey for the same reason a finished one is green: there is no action
     left for the user in either. */
  const tone = ok
    ? "border-success/20 bg-success/10 text-success-ink"
    : pending
      ? "border-border bg-muted text-muted-foreground"
      : "border-warning/25 bg-warning/10 text-warning-ink";

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-opacity hover:opacity-80",
        tone
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[10px] font-medium uppercase tracking-wide opacity-70">
          {label}
        </span>
        <span className="block truncate text-[11px] font-semibold">
          {value}
        </span>
      </span>
    </Link>
  );
}

/**
 * Light / dark / system, as a segmented control.
 *
 * `useTheme()` cannot know the answer during SSR or the hydration render, so
 * `theme` is undefined there and marking a segment active would produce a
 * mismatch. Until `mounted`, NO segment is active - which is honest, and is
 * the state that hydrates identically on both sides.
 */
function ThemeSegments() {
  const t = useTranslations("common");
  const tc = useTranslations("components");
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const options: { key: string; icon: LucideIcon; label: string }[] = [
    { key: "light", icon: Sun, label: tc("light") },
    { key: "dark", icon: Moon, label: tc("dark") },
    { key: "system", icon: Monitor, label: t("system") },
  ];

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map((option) => {
        const active = mounted && theme === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => setTheme(option.key)}
            title={option.label}
            aria-label={option.label}
            aria-pressed={active}
            className={cn(
              "flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors",
              active
                ? "bg-surface-2 text-foreground"
                : "text-subtle-foreground hover:text-foreground"
            )}
          >
            <option.icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function getUserInitials(user: User | null): string {
  if (user?.firstName && user?.lastName) {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }
  if (user?.firstName) return user.firstName.charAt(0).toUpperCase();
  if (user?.username) return user.username.charAt(0).toUpperCase();
  if (user?.email) return user.email.charAt(0).toUpperCase();
  return "U";
}

function scoreTone(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

function kycChipValue(
  status: string | undefined,
  level: number,
  t: (key: string) => string
): string {
  if (status === "APPROVED") return `${t("level")} ${level}`;
  if (status === "PENDING" || status === "ADDITIONAL_INFO_REQUIRED") {
    return t("pending");
  }
  if (status === "REJECTED") return t("rejected");
  return t("verify");
}

/* The API hands these back as strings; `new Date(undefined)` is an Invalid
   Date and date-fns THROWS on one, which would take the whole header down. */
function safeFormat(value: Date | string, pattern: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, pattern);
}

function safeDistance(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}
