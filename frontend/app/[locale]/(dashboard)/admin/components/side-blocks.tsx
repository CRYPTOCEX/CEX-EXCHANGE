"use client";

import { useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  MessageCircle,
  Package,
  RefreshCw,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonText } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { checkPermission } from "@/components/blocks/data-table/utils/permissions";
import { useUserStore } from "@/store/user";
import { cn } from "@/lib/utils";

import { PRODUCTS, productDetailHref } from "./product-catalog";
import type { UpdateInfo } from "./types";
import { useTranslations } from "next-intl";

/* ────────────────────────────── Updates ─────────────────────────────── */

export function UpdatesWidget({
  updates,
  loading,
  onRefresh,
}: {
  updates: UpdateInfo[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const available = updates.filter((u) => u.hasUpdate);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="grid h-7 w-7 place-items-center rounded-sm bg-chart-2/15 text-chart-2">
              <Download className="h-3.5 w-3.5" />
            </span>
            Updates
            {available.length > 0 && (
              <Badge tone="warning" appearance="soft" className="tabular-nums">
                {available.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRefresh}
            disabled={loading}
            aria-label={tCommon("check_for_updates")}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/*
          The pending rows are the REAL row, values withheld.

          Two `h-11 rounded-lg` boxes was a guess at a row whose height comes
          from a 28px icon tile against two stacked lines of `text-xs` and
          `text-[10px]` inside `p-2` - i.e. from three separate type decisions,
          none of which `h-11` can follow. Keeping the row and skeletoning the
          product name and the version pair means the height is produced by the
          same layout in both states, and the icon tile - which is knowable, it
          is always the same Package glyph - stays put.
        */}
        {loading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg bg-surface-2 p-2"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning-ink">
                  <Package className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    <SkeletonText placeholder={t("product_name")} />
                  </span>
                  <span className="block font-mono text-[10px] tabular-nums text-muted-foreground">
                    <SkeletonText placeholder="0.0.0 → 0.0.0" />
                  </span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
              </div>
            ))}
          </div>
        ) : available.length > 0 ? (
          <div className="space-y-2">
            {available.slice(0, 4).map((update) => (
              <Link
                key={update.productId}
                href={
                  update.type === "core"
                    ? "/admin/system/update"
                    : productDetailHref(update.productId)
                }
                className="flex items-center gap-3 rounded-lg bg-surface-2 p-2 transition-colors hover:bg-surface-3 focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning-ink">
                  <Package className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {update.title}
                  </span>
                  <span className="block font-mono text-[10px] tabular-nums text-muted-foreground">
                    {update.currentVersion} → {update.latestVersion}
                  </span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
              </Link>
            ))}
            {available.length > 4 && (
              <p className="text-center text-[11px] text-muted-foreground">
                +{available.length - 4} more
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <p className="text-xs text-muted-foreground">{t("everything_is_up_to_date")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────── Quick access ──────────────────────────── */

/**
 * Eight destinations, permission-gated.
 *
 * These were an ungated grid before, so an operator whose role cannot open
 * Platform Settings still got a Settings button that took them to a 403. The
 * permission strings are the seeded keys, matching what the nav gates on.
 */
const QUICK_ACTIONS = [
  { icon: Users, label: "Users", href: "/admin/crm/user", permission: "access.user" },
  {
    icon: Shield,
    label: "KYC",
    href: "/admin/crm/kyc/application",
    permission: "access.kyc.application",
  },
  {
    icon: Wallet,
    label: "Deposits",
    href: "/admin/finance/deposit/log",
    permission: "access.deposit",
  },
  {
    icon: CreditCard,
    label: "Withdrawals",
    href: "/admin/finance/withdraw/log",
    permission: "access.withdraw",
  },
  {
    icon: BarChart3,
    label: "Markets",
    href: "/admin/finance/exchange/market",
    permission: "access.exchange.market",
  },
  {
    icon: MessageCircle,
    label: "Support",
    href: "/admin/crm/support",
    permission: "access.support.ticket",
  },
  {
    icon: Settings,
    label: "Settings",
    href: "/admin/system/settings",
    permission: "access.settings",
  },
  {
    icon: Package,
    label: "Extensions",
    href: "/admin/system/extension",
    permission: "access.extension",
  },
];

export function QuickActions() {
  const tCommon = useTranslations("common");
  const user = useUserStore((s) => s.user);
  const actions = QUICK_ACTIONS.filter((a) => checkPermission(user, a.permission));

  if (actions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="grid h-7 w-7 place-items-center rounded-sm bg-primary/15 text-primary">
            <Zap className="h-3.5 w-3.5" />
          </span>
          {tCommon("quick_access")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-1.5">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-1.5 rounded-lg p-2.5 transition-colors hover:bg-surface-2 focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <action.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-center text-[10px] font-medium leading-tight text-muted-foreground">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Growth / upsell ────────────────────────── */

/**
 * Products this platform does NOT have yet.
 *
 * Deliberately demoted from where it used to be. The old page put this block —
 * fifteen hardcoded upsells with invented urgency ("~12 daily trades detected,
 * Futures can 10x your volume") — in the main column above the fold, on the
 * page an operator opens to approve withdrawals. An advert is not operations.
 *
 * It is still here because knowing what the platform could do is genuinely part
 * of running it; it is just below the work, and it no longer fabricates a
 * business case from three metrics. It states what the product is and lets the
 * owner decide.
 */
export function GrowthPanel({ activeExtensions }: { activeExtensions: string[] }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const user = useUserStore((s) => s.user);
  const active = new Set(activeExtensions);
  const available = PRODUCTS.filter((p) => !active.has(p.name)).slice(0, 6);

  // The extension manager is where these lead, so hide the block entirely from
  // a role that cannot open it rather than offering six dead ends.
  if (!checkPermission(user, "access.extension") || available.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="grid h-7 w-7 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            {tCommon("not_installed")}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
            <Link href="/admin/system/extension">
              {t("all_extensions")}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((product) => (
            <Link
              key={product.name}
              href={productDetailHref(product.productId)}
              className="group flex items-start gap-3 rounded-lg border border-dashed border-border-strong bg-transparent p-3 transition-colors hover:bg-surface-2 focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-surface-3 text-subtle-foreground">
                <product.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{product.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {product.pitch}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────── Notices ─────────────────────────────── */

const NOTICE_KEY = "security-notice-dismissed";
const NOTICE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The dismissal is EXTERNAL STATE (it lives in localStorage), so it is read
 * with the hook built for external state rather than copied into React state
 * from an effect. That satisfies `react-hooks/set-state-in-effect`, and it is
 * still the right hook.
 *
 * WHAT THE SERVER SNAPSHOT MUST BE, AND WHY IT IS NOT "unknown"
 * =============================================================
 * `useSyncExternalStore`'s third argument is used for the server render AND for
 * the client's HYDRATION render — that is the whole point of it, and it is what
 * makes this component hydration-safe either way. So whatever it returns is the
 * tree that exists until hydration finishes.
 *
 * It used to return `"unknown"`, and `state !== "show"` returned `null` for it.
 * The notice was therefore absent from the server HTML and from the client's
 * first render, and appeared only once the real snapshot was read. Measured on
 * `/en/admin`: the page is 1979px until hydration completes and 2065px
 * immediately after — an 86px block INSERTED third from the top, which pushes
 * the KPI row, the charts, the product grid and the footer down by 86px each.
 * It scored 0.0483 CLS on its own, and it is the same defect
 * `plans/SKELETONS.md` records for the site header and `/en/p2p`: a render
 * decision that depends on state only the browser has, whose server-side
 * fallback is "nothing".
 *
 * `"show"` is the honest default. The server cannot read the dismissal, and
 * NOT having dismissed it is the state of every operator who has not clicked
 * the X — plus everyone whose 30-day TTL has lapsed, which is everyone
 * eventually. So the common case now renders identically on both sides and
 * never moves.
 *
 * THE DELIBERATE TRADE — this is the footer's trade, made the same way
 * --------------------------------------------------------------------
 * An operator who HAS dismissed it now sees it for the frames between paint and
 * hydration, then it is removed. That is one shift for the minority who asked
 * for no notice, instead of a guaranteed 86px shift for everyone on every load
 * of the admin landing page. `components/partials/footer/index.tsx` documents
 * the identical decision for `footerType: "hidden"` and resolves it the same
 * way; the previous version of this comment optimised the minority case without
 * costing the majority case out.
 */
type NoticeState = "dismissed" | "show";

function subscribeToNotice(onStoreChange: () => void) {
  // The `storage` event only fires in OTHER tabs, which is exactly right here:
  // this tab's own dismissal re-renders through `dismissedHere` below.
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

/**
 * Module scope rather than the component body, and the placement is the point:
 * the TTL test needs `Date.now()`, and a clock read during render is an impure
 * call (`react-hooks/purity`) — the same component can render twice and get two
 * answers. Here it is part of the external snapshot, which is where a reading of
 * the outside world belongs.
 *
 * The result is stable in the way `useSyncExternalStore` requires: it can only
 * change when the stored value changes, or once, thirty days after a dismissal.
 */
function readNotice(): NoticeState {
  const stored = localStorage.getItem(NOTICE_KEY);
  if (!stored) return "show";
  const at = parseInt(stored, 10);
  // An expired dismissal reads exactly like never having dismissed it.
  return Number.isFinite(at) && Date.now() - at < NOTICE_TTL_MS
    ? "dismissed"
    : "show";
}

export function SecurityNotice() {
  const t = useTranslations("dashboard_admin");
  const [dismissedHere, setDismissedHere] = useState(false);

  const state = useSyncExternalStore<NoticeState>(
    subscribeToNotice,
    readNotice,
    /* Server + hydration render. See the note above `NoticeState`: this must be
       the majority state, not a third "we do not know yet" state, or the notice
       is missing from the first paint and lands as an 86px insert. */
    () => "show"
  );

  if (state !== "show" || dismissedHere) return null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-warning/15 text-warning-ink">
          <ShieldAlert className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t("buy_only_from_our_official_stores")}
          </p>
          <p className="text-xs text-muted-foreground">
            We sell exclusively on{" "}
            <a
              href="https://mashdiv.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              mashdiv.com
            </a>{" "}
            and Envato. Copies from anywhere else are unofficial, unsupported,
            and may be tampered with.
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        aria-label={t("dismiss_notice")}
        onClick={() => {
          localStorage.setItem(NOTICE_KEY, Date.now().toString());
          setDismissedHere(true);
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function SupportBanner() {
  const t = useTranslations("dashboard_admin");
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-success/15 text-success-ink">
          <BadgeCheck className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium">{t("official_support_portal")}</p>
          <p className="text-xs text-muted-foreground">
            {t("get_help_from_the_verified_team_at_mashdiv_com")}
          </p>
        </div>
      </div>
      <Button size="sm" className="gap-2" asChild>
        <a href="https://mashdiv.com/" target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-4 w-4" />
          {t("get_support")}
          <ExternalLink className="h-3 w-3" />
        </a>
      </Button>
    </div>
  );
}
