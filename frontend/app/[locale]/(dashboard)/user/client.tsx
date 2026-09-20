"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Bell,
  Clock,
  History,
  KeyRound,
  LifeBuoy,
  Lock,
  Shield,
  ShieldCheck,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { SkeletonText } from "@/components/ui/skeleton";
import { Link, usePathname } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/status-tone";
import { loginHref } from "@/lib/login-href";
import { formatRelativeTime } from "@/i18n/utils";
import { useUserStore, calculateSecurityScoreImpl } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { useWalletStore } from "@/store/finance/wallet-store";
import { isKycEnabled } from "@/utils/kyc";

/**
 * THE SIGNED-IN LANDING.
 * ===========================================================================
 *
 * WHAT IT IS ALLOWED TO SAY. Everything on this page is something the platform
 * ALREADY holds and already serves:
 *
 *   money         `useWalletStore` -> GET /api/finance/wallet/stats
 *   activity      GET /api/user/activity?limit=5
 *   verification  `user.kyc` off the session profile, gated on `kycStatus`
 *   destinations  account routes, each one checked to have a page file
 *
 * No route was added for it and no figure is derived from anything the backend
 * does not send. A tile whose data does not exist is not drawn — which is why
 * there is no portfolio chart and no referral tile here.
 *
 * THE ONE ROUTE THAT DOES NOT EXIST, and the reason every link below was
 * checked: `components/partials/header/profile-menu.tsx:216` points its Support
 * quick link at `/support/ticket`, and `app/[locale]/support/ticket/` holds
 * only `[id]/` and `components/` — there is no page there. This page links
 * `/support`, which is real. (The header's link is not this lane's to change.)
 *
 * THE FRAME is `PageShell`, which owns the ground, the container and — the part
 * that matters here — the clearance under the `fixed top-0` SiteHeader. See
 * `components/layout/page-shell.tsx`.
 */

/** The activity row, exactly as `api/user/activity/index.get.ts` returns it. */
interface ActivityRow {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  severity: "success" | "warning" | "info";
  createdAt: string | Date;
}

interface Destination {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * How many activity rows to ask for.
 *
 * The list holds a FIXED SMALL COUNT of placeholder rows while the request is
 * in flight rather than guessing the real length — a list has no knowable
 * length before it arrives. Same call `user/kyc/client.tsx` makes for its
 * pending levels.
 */
const ACTIVITY_LIMIT = 5;
const ACTIVITY_PENDING_ROWS = 3;

export function UserDashboardClient() {
  const t = useTranslations("common");
  const tUser = useTranslations("dashboard_user");
  const locale = useLocale();
  const pathname = usePathname();

  const user = useUserStore((s) => s.user);
  const authResolved = useUserStore((s) => s.authResolved);
  const hasPermission = useUserStore((s) => s.hasPermission);
  const settings = useConfigStore((s) => s.settings);
  const extensions = useConfigStore((s) => s.extensions);

  const {
    totalBalance,
    totalPending,
    totalWallets,
    activeWallets,
    isLoadingStats,
    fetchStats,
  } = useWalletStore();

  /**
   * `null` is "not asked yet", `[]` is "asked, and there is nothing".
   *
   * Collapsing the two would leave a brand-new account — the single most likely
   * visitor to this page — sitting under pulsing placeholders forever, and make
   * a failed request look identical to a spinner that never resolves. An error
   * is read as "nothing logged yet", for the same reason
   * `user/profile/components/premium/tabs/dashboard-tab.tsx` does it: the card
   * has no way to retry and nothing useful to say about the failure.
   */
  const [activity, setActivity] = useState<ActivityRow[] | null>(null);

  const signedIn = !!user?.id;

  useEffect(() => {
    if (!signedIn) return;
    fetchStats();
  }, [signedIn, fetchStats]);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await $fetch<{ activities: ActivityRow[] }>({
        url: `/api/user/activity?limit=${ACTIVITY_LIMIT}`,
        silent: true,
      });
      if (cancelled) return;
      setActivity(
        !error && Array.isArray(data?.activities) ? data.activities : []
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  /* The store's OWN formula, imported rather than re-derived. Nothing computes
     the score at sign-in, so reading `securityScore` off the store renders 0%
     for anyone who has not opened /user/profile this session — the same trap
     `profile-menu.tsx` documents. */
  const securityScore = useMemo(() => calculateSecurityScoreImpl(user), [user]);

  const kycOn = isKycEnabled(settings ?? {});
  const kycStatus = user?.kyc?.status || "";
  const kycLevel = user?.kyc?.level?.level ?? user?.kycLevel ?? 0;

  const destinations = useMemo<Destination[]>(() => {
    const list: Destination[] = [
      { key: "wallet", label: t("wallet"), href: "/finance/wallet", icon: Wallet },
      { key: "deposit", label: t("deposit"), href: "/finance/deposit", icon: ArrowDownToLine },
      { key: "withdraw", label: t("withdraw"), href: "/finance/withdraw", icon: ArrowUpFromLine },
      { key: "transfer", label: t("transfer"), href: "/finance/transfer", icon: ArrowLeftRight },
      { key: "history", label: t("history"), href: "/finance/history", icon: History },
      { key: "notifications", label: t("notifications"), href: "/user/notification", icon: Bell },
      { key: "profile", label: t("profile"), href: "/user/profile", icon: User },
      { key: "api", label: t("api_keys"), href: "/user/profile?tab=api", icon: KeyRound },
      { key: "support", label: t("support"), href: "/support", icon: LifeBuoy },
    ];
    /* Verification renders "KYC verification is disabled" and nothing else when
       the switch is off (`user/kyc/client.tsx`), so linking it unconditionally
       sends people to a dead end. Same gate the header's KYC chip uses. */
    if (kycOn) {
      list.splice(6, 0, {
        key: "kyc",
        label: t("kyc_verification"),
        href: "/user/kyc",
        icon: ShieldCheck,
      });
    }
    /* `mlm` is the extension behind `/affiliate` — the name does NOT match the
       URL segment. See the note in `config/menu.ts`. */
    if (Array.isArray(extensions) && extensions.includes("mlm")) {
      list.push({ key: "affiliate", label: t("affiliate"), href: "/affiliate", icon: Users });
    }
    if (hasPermission?.("access.admin")) {
      list.push({ key: "admin", label: t("admin"), href: "/admin", icon: Shield });
    }
    return list;
  }, [t, kycOn, extensions, hasPermission]);

  /*
    SIGNED OUT.

    Nothing above this route enforces a session — `(dashboard)/layout.tsx` only
    hydrates theme settings — and the PWA shortcut in `public/manifest.json`
    opens `/user` cold, which is exactly the case where there may be no session.
    Rendering the tiles anyway paints a $0.00 balance and an empty activity list
    at somebody who simply is not signed in.

    Gated on `authResolved`, not on `user` alone: `isLoading` also goes true
    while a sign-in request is running, so reading that would flash this panel
    over a session that is about to exist. `store/user.ts` documents the split.
  */
  if (authResolved && !signedIn) {
    return (
      <div className="relative min-h-screen text-foreground">
        <SiteHeader />
        <main>
          <PageShell width="narrow">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <CardTitle>{t("sign_in_to_continue")}</CardTitle>
                    <CardDescription>
                      {tUser("heres_an_overview_of_your_account")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {/* `loginHref` takes the locale-free path from
                    `@/i18n/routing`'s `usePathname`, so the return trip lands
                    back here rather than on the home page. */}
                <Button asChild>
                  <Link href={loginHref(pathname)}>{t("sign_in")}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">{t("back_to_home")}</Link>
                </Button>
              </CardContent>
            </Card>
          </PageShell>
        </main>
        <Footer />
      </div>
    );
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "";

  return (
    <div className="relative min-h-screen text-foreground">
      <SiteHeader />
      {/* A real `main` landmark, for the same reason `user/profile/layout.tsx`
          grew one: without it this route has no "skip to main content" target
          and any audit scoped to `main` falls back to the whole document. */}
      <main>
        <PageShell>
          <PageHeader
            title={
              displayName
                ? `${tUser("welcome_back")} ${displayName}`
                : t("welcome_back")
            }
            description={tUser("heres_an_overview_of_your_account")}
            actions={
              <>
                <Button asChild>
                  <Link href="/finance/deposit">{t("deposit")}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/finance/wallet">{t("your_wallets")}</Link>
                </Button>
              </>
            }
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              label={t("total_balance")}
              value={totalBalance || 0}
              isCurrency
              currency="USD"
              icon={Wallet}
              color={statsCardColors.blue.color}
              bgColor={statsCardColors.blue.bgColor}
              loading={isLoadingStats}
            />
            {/*
              PENDING DEPOSITS ARE NOT A BALANCE, and this tile exists so that
              saying so costs nothing. `api/finance/wallet/stats.get.ts` reports
              `totalPending` SEPARATELY and deliberately keeps it out of
              `totalBalance` — it is money the user has declared that no admin
              has approved yet. It is also the first number people go looking
              for when the total "looks wrong", so it is drawn only when there
              is something pending rather than as a permanent $0.00.
            */}
            {totalPending > 0 ? (
              <StatsCard
                label={t("pending_deposit_value")}
                value={totalPending}
                isCurrency
                currency="USD"
                icon={Clock}
                color={statsCardColors.amber.color}
                bgColor={statsCardColors.amber.bgColor}
                loading={isLoadingStats}
              />
            ) : (
              <StatsCard
                label={t("wallets")}
                /* Active over total, the same reading the header's balance
                   block gives: a wallet holding no settled funds is not
                   active (`stats.get.ts` counts `balance + inOrder > 0`). */
                value={`${activeWallets || 0} / ${totalWallets || 0}`}
                icon={Wallet}
                color={statsCardColors.green.color}
                bgColor={statsCardColors.green.bgColor}
                loading={isLoadingStats}
              />
            )}
            <StatsCard
              label={t("security_score")}
              value={`${securityScore}%`}
              icon={Shield}
              color={statsCardColors.purple.color}
              bgColor={statsCardColors.purple.bgColor}
              progress={securityScore}
            />
            <StatsCard
              label={t("two_factor_authentication")}
              value={user?.twoFactor?.enabled ? t("enabled") : t("disabled")}
              icon={KeyRound}
              color={statsCardColors.blue.color}
              bgColor={statsCardColors.blue.bgColor}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("recent_activity")}</CardTitle>
                <CardDescription>{t("account_security")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityList
                  rows={activity}
                  locale={locale}
                  empty={t("no_recent_activity_to_display")}
                />
              </CardContent>
            </Card>

            <div className="space-y-6">
              {kycOn ? (
                <VerificationCard
                  status={kycStatus}
                  level={kycLevel}
                  t={t}
                  tUser={tUser}
                />
              ) : null}

              {/*
                NO WALLETS AT ALL. The stats route answers `totalWallets: 0` for
                an account that has never funded anything, and four zeroed tiles
                say nothing about what to do next. Drawn only once the stats
                have actually landed — before that, zero is the store's initial
                value rather than an answer from the server.
              */}
              {!isLoadingStats && totalWallets === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("no_wallets_available")}</CardTitle>
                    <CardDescription>{t("get_started")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link href="/finance/deposit">{t("deposit")}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>{t("quick_actions")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {destinations.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                          <item.icon className="size-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </PageShell>
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ActivityList({
  rows,
  locale,
  empty,
}: {
  rows: ActivityRow[] | null;
  locale: string;
  empty: string;
}) {
  if (rows === null) {
    return (
      <ul className="divide-y divide-border/50">
        {Array.from({ length: ACTIVITY_PENDING_ROWS }, (_, i) => (
          <li key={`pending-${i}`} className="flex items-start gap-3 py-3">
            <span
              aria-hidden="true"
              className="mt-0.5 size-8 shrink-0 animate-pulse rounded-lg bg-muted"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium">
                <SkeletonText chars={18} />
              </p>
              <p className="text-xs">
                <SkeletonText chars={26} />
              </p>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
    );
  }

  return (
    <ul className="divide-y divide-border/50">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start gap-3 py-3">
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
              TONE_CHIP[statusTone(row.severity)]
            )}
          >
            <Clock className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{row.title}</p>
            {/* The route sends a null description as `null`, and an empty
                paragraph still costs ~18px inside a fixed list. */}
            {row.description ? (
              <p className="mt-0.5 text-xs text-subtle-foreground">
                {row.description}
              </p>
            ) : null}
          </div>
          {/* Never wraps: a wrapped "3 months ago" makes one row taller than
              its neighbours, which reads as a broken list rather than a long
              one. `formatRelativeTime` is the LOCALIZED one — date-fns'
              `formatDistanceToNow` prints English whatever the locale says. */}
          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
            {formatRelativeTime(row.createdAt, locale)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Verification, in the five states `user.kyc.status` can actually hold.
 *
 * The EMPTY STRING is one of them and it is the default: `store/user.ts`
 * `convertToKycUserType` writes `status: user.kyc.status || ''`, and an account
 * that has never applied carries no `kyc` object at all. It is the state most
 * of this page's visitors are in, so it gets a real call to action rather than
 * a dash.
 */
function VerificationCard({
  status,
  level,
  t,
  tUser,
}: {
  status: string;
  level: number;
  t: (key: string) => string;
  tUser: (key: string) => string;
}) {
  const view = ((): {
    tone: BadgeTone;
    label: string;
    line: string | null;
    cta: string;
  } => {
    switch (status) {
      case "APPROVED":
        return {
          tone: statusTone("APPROVED"),
          label: t("verified"),
          line:
            level > 0 ? `${t("level")} ${level}` : tUser("identity_verified"),
          cta: t("view_details"),
        };
      case "PENDING":
        return {
          tone: statusTone("PENDING"),
          label: t("pending_review"),
          line: tUser("most_applications_reviewed_within_24h"),
          cta: t("view_details"),
        };
      case "ADDITIONAL_INFO_REQUIRED":
        return {
          tone: "warning",
          label: tUser("additional_info_required"),
          line: tUser("your_application_needs_with_verification"),
          cta: t("continue"),
        };
      case "REJECTED":
        return {
          tone: statusTone("REJECTED"),
          label: t("kyc_rejected"),
          /* Nothing true and general can be said about WHY an application was
             turned down — the reason lives on the application itself — so this
             card says none of it and sends them to the page that knows. */
          line: null,
          cta: tUser("apply_again"),
        };
      default:
        return {
          tone: "neutral",
          label: t("not_verified"),
          line: tUser("start_verification_to_unlock_features"),
          cta: t("start_verification"),
        };
    }
  })();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{t("verification_status")}</CardTitle>
          <Badge tone={view.tone} appearance="soft">
            {view.label}
          </Badge>
        </div>
        {view.line ? <CardDescription>{view.line}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="w-full">
          <Link href="/user/kyc">{view.cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** Tonal ground + ink for the activity chip, which is not a pill. */
const TONE_CHIP: Record<BadgeTone, string> = {
  primary: "bg-primary/10 text-primary-ink",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-success/10 text-success-ink",
  warning: "bg-warning/10 text-warning-ink",
  destructive: "bg-destructive/10 text-destructive-ink",
  info: "bg-info/10 text-info-ink",
  neutral: "bg-muted text-muted-foreground",
};
