"use client";

/**
 * WHAT THE ENGINE IS DOING, AND WHAT IT HAS DONE.
 * ===========================================================================
 *
 * This panel used to be a read-only copy of the rest of the page: "Price
 * settings", "Trading config" and "Safety settings" restated the Configuration
 * tab, "Pool summary" and "P&L summary" restated the Pool tab, and "Volume
 * stats" restated the progress bar in the heading directly above it. Eight
 * cards, and every figure on them was editable somewhere else with nothing
 * saying where — so an operator who read a number here and wanted to change it
 * had to guess which of the other three tabs owned it.
 *
 * What is left is the part nothing else on the page can show, because it is not
 * configuration at all — it is what the price engine has decided on its own:
 *
 *   - the market CYCLE it is currently driving, and how far through it is
 *   - the momentum it has accumulated
 *   - the bias and price mode those are being steered by
 *   - the trades and the operator actions that actually happened
 *
 * Each read-out that has an editable counterpart carries ONE route to it —
 * `onConfigure` — instead of being silently duplicated. The price band, the
 * volume budget, the pool balances and the bot roster are not repeated here at
 * all; they are the masthead's, the Liquidity tab's and the Bots tab's.
 */

import React from "react";
import { useTranslations } from "next-intl";
import {
  Activity,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Clock,
  Compass,
  Droplets,
  Globe,
  Minus,
  Play,
  RefreshCw,
  Settings,
  Square,
  TrendingDown,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyFigure } from "@/components/ui/money-figure";
import type { LiveEvent } from "./BotManagement";

interface MarketOverviewProps {
  /**
   * The RESOLVED market-maker payload. Never null: the record page renders this
   * tab only once the fetch has landed. `any` used to sit here, and `any`
   * accepts `null` — which is why a pending payload could reach `data.pool` and
   * throw before anything rendered.
   */
  data: Record<string, any>;
  liveEvents?: LiveEvent[];
  /** Switch the page to the Configuration tab. The only route out of here. */
  onConfigure?: () => void;
}

/**
 * The market cycle, as non-colour information first.
 *
 * MARKUP and MARKDOWN take the price-direction tokens because that is literally
 * what they are; the two consolidation phases are not directional and must not
 * borrow a direction's colour. Every one of them renders its icon AND its label,
 * so the phase is legible without the tint.
 */
const PHASE_STYLE: Record<
  string,
  { icon: React.ElementType; ink: string; fill: string }
> = {
  ACCUMULATION: {
    icon: Waves,
    ink: "text-muted-foreground",
    fill: "bg-muted",
  },
  MARKUP: { icon: TrendingUp, ink: "text-up", fill: "bg-up/15" },
  DISTRIBUTION: { icon: Waves, ink: "text-warning", fill: "bg-warning/15" },
  MARKDOWN: { icon: TrendingDown, ink: "text-down", fill: "bg-down/15" },
};

/**
 * A clock, as state.
 *
 * Everything time-relative on this panel — "12s ago" on the feed, the phase
 * progress bar — used to read `Date.now()` during render, which meant it only
 * advanced when something ELSE re-rendered the component. A phase two days into
 * a five-day cycle sat at whatever percentage it happened to be at when the
 * fetch landed, and a quiet feed's timestamps froze at "just now". It is also an
 * impure read during render, which makes React Compiler skip the component.
 *
 * One interval per mount, and only while this tab is open.
 */
function useNow(intervalMs = 15_000): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function formatTimeAgo(timestamp: string, now: number): string {
  const diffSec = Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / 1000));
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return new Date(timestamp).toLocaleTimeString();
}

/** A labelled read-out. Not a card — these sit several to a panel. */
function Readout({
  label,
  children,
  hint,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
        {label}
      </p>
      <div className="text-base font-semibold text-foreground">{children}</div>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({
  data,
  liveEvents = [],
  onConfigure,
}) => {
  const t = useTranslations("ext_admin_ai_market-maker");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  const now = useNow();

  const quote = data.market?.pair || "";
  const base = data.market?.currency || "";

  const phase: string | undefined = data.currentPhase;
  const phaseStyle = (phase && PHASE_STYLE[phase]) || PHASE_STYLE.ACCUMULATION;
  const PhaseIcon = phaseStyle.icon;

  /**
   * ENUM LABELS ARE LOOKED UP STATICALLY, NEVER BUILT FROM THE VALUE.
   *
   * `` t(`phase_${x}`) `` reads to the key extractor as no key at all, so the
   * entry never reaches the bundle — and the namespace optimizer, which dedupes
   * on the English string and can only see LITERAL call sites, deleted
   * `phase_distribution` from all 90 locales as an unreferenced duplicate of
   * `ext_admin.distribution` while every other phase survived. One enum value in
   * four then rendered its raw key path.
   */
  const PHASE_LABEL: Record<string, string> = {
    ACCUMULATION: t("phase_accumulation"),
    MARKUP: t("phase_markup"),
    DISTRIBUTION: tExt("distribution"),
    MARKDOWN: t("phase_markdown"),
  };
  const BIAS_LABEL: Record<string, string> = {
    BULLISH: tCommon("bullish"),
    NEUTRAL: tCommon("neutral"),
    BEARISH: tCommon("bearish"),
  };
  const PRICE_MODE_LABEL: Record<string, string> = {
    AUTONOMOUS: t("price_mode_autonomous"),
    HYBRID: t("price_mode_hybrid"),
    FOLLOW_EXTERNAL: t("price_mode_follow_external"),
  };

  const phaseLabel = (phase && PHASE_LABEL[phase]) || t("phase_unknown");

  /**
   * How far through the current cycle the engine is.
   *
   * `null` when either end is missing rather than 0: a market whose phase has
   * never been scheduled has no progress, and a bar parked at the left is a
   * claim that it just started. A cycle whose end time has passed reads 100%
   * and says so — the phase cron may not have run.
   */
  const phaseProgress = (() => {
    if (!data.phaseStartedAt || !data.nextPhaseChangeAt) return null;
    const start = new Date(data.phaseStartedAt).getTime();
    const end = new Date(data.nextPhaseChangeAt).getTime();
    if (!(end > start)) return null;
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  })();
  const phaseOverdue =
    Boolean(data.nextPhaseChangeAt) &&
    new Date(data.nextPhaseChangeAt).getTime() < now;

  const momentum = Number(data.trendMomentum ?? 0);
  const bias: string = data.marketBias || "NEUTRAL";
  const biasStrength = Number(data.biasStrength ?? 0);
  const priceMode: string = data.priceMode || "AUTONOMOUS";

  const recentActivity: any[] = Array.isArray(data.recentActivity)
    ? data.recentActivity
    : [];

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* ENGINE STATE                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader
          padding="md"
          className="flex-row items-center justify-between space-y-0"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                {t("engine_state")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("engine_state_hint")}
              </p>
            </div>
          </div>
          {onConfigure ? (
            <Button variant="outline" size="sm" onClick={onConfigure}>
              <Settings className="h-4 w-4" />
              {tCommon("configure")}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent padding="md" className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* PHASE ---------------------------------------------------- */}
            <Readout
              label={t("market_phase")}
              hint={
                data.nextPhaseChangeAt
                  ? phaseOverdue
                    ? t("phase_overdue")
                    : t("phase_ends_at", {
                        at: new Date(data.nextPhaseChangeAt).toLocaleString(),
                      })
                  : undefined
              }
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-sm",
                    phaseStyle.fill,
                    phaseStyle.ink
                  )}
                >
                  <PhaseIcon className="h-3.5 w-3.5" />
                </span>
                {phaseLabel}
              </span>
            </Readout>

            {/* MOMENTUM ------------------------------------------------- */}
            <Readout
              label={t("momentum")}
              hint={momentum === 0 ? t("momentum_flat") : t("momentum_hint")}
            >
              <span
                className={cn(
                  "font-mono tabular-nums",
                  momentum > 0
                    ? "text-up"
                    : momentum < 0
                      ? "text-down"
                      : "text-foreground"
                )}
              >
                {momentum > 0 ? "+" : ""}
                {(momentum * 100).toFixed(2)}%
              </span>
            </Readout>

            {/* BIAS ----------------------------------------------------- */}
            <Readout
              label={t("market_bias")}
              hint={
                bias === "NEUTRAL"
                  ? undefined
                  : t("bias_strength_pct", { pct: biasStrength.toFixed(0) })
              }
            >
              <span className="flex items-center gap-2">
                {bias === "BULLISH" ? (
                  <ArrowUpRight className="h-4 w-4 text-up" />
                ) : bias === "BEARISH" ? (
                  <ArrowDownRight className="h-4 w-4 text-down" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
                {BIAS_LABEL[bias] ?? bias}
              </span>
            </Readout>

            {/* PRICE MODE ------------------------------------------------ */}
            <Readout
              label={tExtAdmin("price_mode")}
              hint={
                priceMode === "AUTONOMOUS"
                  ? t("price_mode_autonomous_hint")
                  : data.externalSymbol
                    ? t("price_mode_follows", {
                        symbol: data.externalSymbol,
                        pct: Number(data.correlationStrength ?? 0).toFixed(0),
                      })
                    : t("price_mode_no_symbol")
              }
            >
              <span className="flex items-center gap-2">
                {priceMode === "AUTONOMOUS" ? (
                  <Compass className="h-4 w-4 text-primary" />
                ) : (
                  <Globe className="h-4 w-4 text-primary" />
                )}
                {PRICE_MODE_LABEL[priceMode] ?? priceMode}
              </span>
            </Readout>
          </div>

          {/* Cycle progress. Drawn only when the engine has actually scheduled
              a transition — see `phaseProgress`. */}
          {phaseProgress !== null ? (
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                  {t("phase_progress")}
                </p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  {phaseProgress.toFixed(0)}%
                  {data.phaseTargetPrice ? (
                    <>
                      <span aria-hidden className="mx-1.5 text-border">
                        ·
                      </span>
                      {t("phase_target")}{" "}
                      <span className="text-foreground">
                        {Number(data.phaseTargetPrice).toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })}{" "}
                        {quote}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
                <div
                  className={cn(
                    "h-full rounded-full",
                    phaseOverdue ? "bg-warning" : "bg-primary"
                  )}
                  style={{ width: `${phaseProgress}%` }}
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* LIVE EVENTS — the page's only live feed                             */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader
          padding="md"
          className="flex-row items-center justify-between space-y-0"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                {tExtAdmin("live_events")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {tCommon("real_time_bot_actions_and_trades")}
              </p>
            </div>
          </div>
          {liveEvents.length > 0 ? (
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success-ink">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              {tCommon("live")}
            </span>
          ) : null}
        </CardHeader>
        <CardContent padding="none">
          {liveEvents.length > 0 ? (
            <div className="max-h-80 divide-y divide-border overflow-y-auto">
              {liveEvents.slice(0, 20).map((event, index) => (
                <EventRow
                  key={`${event.timestamp}-${index}`}
                  event={event}
                  base={base}
                  quote={quote}
                  now={now}
                />
              ))}
            </div>
          ) : (
            <EmptyRow
              icon={Activity}
              title={tExt("no_activity_yet")}
              detail={tExt("bot_activities_will_appear_here_in")}
            />
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* HISTORY                                                             */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader padding="md">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
              <Clock className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                {tCommon("recent_activity")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("history_hint")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent padding="none">
          {recentActivity.length > 0 ? (
            <div className="divide-y divide-border">
              {recentActivity.slice(0, 12).map((activity: any, index: number) => (
                <HistoryRow
                  key={activity.id ?? index}
                  activity={activity}
                  base={base}
                  quote={quote}
                />
              ))}
            </div>
          ) : (
            <EmptyRow
              icon={Clock}
              title={tExt("no_recent_activity")}
              detail={tExtAdmin("activity_will_appear_here_once_the")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

const EVENT_STYLE: Record<
  string,
  { icon: React.ElementType; ink: string; fill: string }
> = {
  TRADE: { icon: ArrowLeftRight, ink: "text-primary", fill: "bg-primary/10" },
  ORDER: { icon: Zap, ink: "text-primary", fill: "bg-primary/10" },
  STATUS_CHANGE: { icon: Activity, ink: "text-warning", fill: "bg-warning/10" },
  BOT_UPDATE: { icon: Activity, ink: "text-primary", fill: "bg-primary/10" },
  BOT_ACTIVITY: { icon: Activity, ink: "text-primary", fill: "bg-primary/10" },
  POOL_UPDATE: { icon: Droplets, ink: "text-primary", fill: "bg-primary/10" },
  ERROR: { icon: Activity, ink: "text-destructive", fill: "bg-destructive/10" },
};

function EventRow({
  event,
  base,
  quote,
  now,
}: {
  event: LiveEvent;
  base: string;
  quote: string;
  /** The panel's clock, so every row's "ago" advances together. */
  now: number;
}) {
  const style = EVENT_STYLE[event.type] ?? EVENT_STYLE.TRADE;
  const EventIcon = style.icon;
  const detail = describeEvent(event, base, quote);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-sm",
            style.fill,
            style.ink
          )}
        >
          <EventIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {detail.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">{detail.body}</p>
        </div>
      </div>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-subtle-foreground">
        {formatTimeAgo(event.timestamp, now)}
      </span>
    </div>
  );
}

function describeEvent(
  event: LiveEvent,
  base: string,
  quote: string
): { title: string; body: string } {
  const d = event.data ?? {};
  const amount = d.amount !== undefined ? Number(d.amount) : null;
  const price = d.price !== undefined ? Number(d.price) : null;

  if (event.type === "TRADE") {
    return {
      title: `${d.buyBotName ?? "—"} ← ${d.sellBotName ?? "—"}`,
      body:
        amount !== null && price !== null
          ? `${amount.toFixed(4)} ${base} @ ${price.toFixed(6)} ${quote}`
          : "",
    };
  }
  if (event.type === "ORDER") {
    return {
      title: `${d.botName ?? ""} ${d.side ?? ""}`.trim(),
      body:
        amount !== null && price !== null
          ? `${amount.toFixed(4)} ${base} @ ${price.toFixed(6)} ${quote}`
          : (d.orderType ?? ""),
    };
  }
  if (event.type === "STATUS_CHANGE") {
    return {
      title: String(d.newStatus ?? d.status ?? ""),
      body: d.previousStatus ? `from ${d.previousStatus}` : "",
    };
  }
  if (event.type === "BOT_ACTIVITY" || event.type === "BOT_UPDATE") {
    return {
      title: String(d.botName ?? ""),
      body: String(d.action ?? d.details?.reason ?? ""),
    };
  }
  return {
    title: event.type,
    body: String(d.message ?? d.error ?? ""),
  };
}

const HISTORY_STYLE: Record<
  string,
  { icon: React.ElementType; ink: string; fill: string }
> = {
  TRADE: { icon: RefreshCw, ink: "text-primary", fill: "bg-primary/10" },
  START: { icon: Play, ink: "text-success", fill: "bg-success/10" },
  RESUME: { icon: Play, ink: "text-success", fill: "bg-success/10" },
  STOP: { icon: Square, ink: "text-destructive", fill: "bg-destructive/10" },
  PAUSE: { icon: Clock, ink: "text-warning", fill: "bg-warning/10" },
  AUTO_PAUSE: { icon: Clock, ink: "text-warning", fill: "bg-warning/10" },
  EMERGENCY_STOP: {
    icon: Square,
    ink: "text-destructive",
    fill: "bg-destructive/10",
  },
  DEPOSIT: { icon: ArrowUpRight, ink: "text-success", fill: "bg-success/10" },
  WITHDRAW: { icon: ArrowDownRight, ink: "text-warning", fill: "bg-warning/10" },
  REBALANCE: { icon: RefreshCw, ink: "text-primary", fill: "bg-primary/10" },
  PHASE_CHANGE: { icon: Waves, ink: "text-primary", fill: "bg-primary/10" },
  BIAS_CHANGE: { icon: Compass, ink: "text-primary", fill: "bg-primary/10" },
};

function HistoryRow({
  activity,
  base,
  quote,
}: {
  activity: any;
  base: string;
  quote: string;
}) {
  const style = HISTORY_STYLE[activity.action] ?? {
    icon: Settings,
    ink: "text-muted-foreground",
    fill: "bg-surface-3",
  };
  const ActionIcon = style.icon;

  /* DEPOSIT and WITHDRAW carry their own amount and currency; everything else
     is stamped with the price at the time it happened. Printing the price for a
     deposit — which is what this row used to do — labelled a 500 USDT top-up
     with the market's price. */
  const isTransfer = activity.action === "DEPOSIT" || activity.action === "WITHDRAW";
  const transferCurrency =
    activity.details?.currencySymbol ??
    (activity.details?.currency === "BASE" ? base : quote);
  const value = isTransfer
    ? activity.details?.amount !== undefined
      ? `${Number(activity.details.amount).toFixed(6)} ${transferCurrency}`
      : null
    : activity.priceAtAction !== undefined && activity.priceAtAction !== null
      ? `${Number(activity.priceAtAction).toFixed(6)} ${quote}`
      : null;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-sm",
            style.fill,
            style.ink
          )}
        >
          <ActionIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {String(activity.action ?? "").replace(/_/g, " ")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {activity.details?.note ??
              activity.details?.reason ??
              activity.details?.field ??
              ""}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        {value ? (
          <p className="text-sm font-medium text-foreground">
            <MoneyFigure value={value} />
          </p>
        ) : null}
        <p className="font-mono text-[11px] tabular-nums text-subtle-foreground">
          {activity.createdAt
            ? new Date(activity.createdAt).toLocaleString()
            : ""}
        </p>
      </div>
    </div>
  );
}

function EmptyRow({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ElementType;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-3 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export default MarketOverview;
