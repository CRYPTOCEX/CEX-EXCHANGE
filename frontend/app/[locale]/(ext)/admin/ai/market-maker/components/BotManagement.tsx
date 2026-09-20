"use client";

/**
 * THE BOT ROSTER.
 * ===========================================================================
 *
 * Two things left this tab, and both were duplicates rather than content:
 *
 *  - **Its own four `StatsCard`s.** Total bots, active bots, total trades and
 *    average win rate, directly under the page's KPI row which already carried
 *    an "Active bots" tile. R3 allows one KPI row per page. What survives is a
 *    single line of figures inside the roster's own header, where it belongs to
 *    the list it describes.
 *  - **Its own live feed.** "Live Activity" here and "Live Events" on Overview
 *    were the same socket stream rendered twice, in two layouts, one of which
 *    the operator could not see while looking at the other. Overview owns the
 *    feed. What stays here is the PER-BOT last action — a chip on the row it
 *    belongs to, which is context the feed cannot give.
 *
 * The bot count matters beyond bookkeeping: `MarketInstance.passesTradeGates()`
 * refuses to trade a market with fewer than TWO ACTIVE bots, so this roster is
 * where that gate is opened or closed.
 */

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Activity,
  Bot,
  BotOff,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Play,
  Pause,
  Radio,
  Scale,
  Settings,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Waves,
  X,
  Zap,
} from "lucide-react";

import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { MoneyFigure } from "@/components/ui/money-figure";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
// The Bot / BotConfigUpdate shapes already existed in ../types and were used by
// nothing. That is exactly how this component drifted: it typed every bot as
// `any`, so the form could post `tradingFrequency`/`minOrderSize`/`maxOrderSize`
// — none of which are fields — and nothing complained. Adopting them makes the
// next drift a compile error. Aliased: `Bot` is the lucide icon of that name.
import type { Bot as BotModel, BotTradeFrequency } from "../types";

// Live event types — exported for use by the page and by MarketOverview.
export interface LiveEvent {
  type:
    | "TRADE"
    | "ORDER"
    | "STATUS_CHANGE"
    | "BOT_UPDATE"
    | "POOL_UPDATE"
    | "BOT_ACTIVITY"
    | "ERROR";
  data: any;
  timestamp: string;
  marketMakerId: string;
}

interface BotManagementProps {
  marketId: string;
  bots: BotModel[];
  onRefresh: () => void;
  quoteCurrency?: string;
  liveEvents?: LiveEvent[];
}

/**
 * The five personalities, as icon + label.
 *
 * The tint used to be a solid fill per personality — five brand-weight colours
 * on a list of five rows, which is R8's categorical axis spent on a label the
 * row already carries in words. The icon distinguishes them; the surface stays
 * the card's.
 */
const PERSONALITY: Record<string, { icon: React.ElementType; label: string }> = {
  SCALPER: { icon: Zap, label: "Scalper" },
  SWING: { icon: Waves, label: "Swing trader" },
  ACCUMULATOR: { icon: TrendingUp, label: "Accumulator" },
  DISTRIBUTOR: { icon: TrendingDown, label: "Distributor" },
  MARKET_MAKER: { icon: Scale, label: "Market maker" },
};

function formatTimeAgo(timestamp: string): string {
  const diffSec = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return new Date(timestamp).toLocaleTimeString();
}

function Figure({
  label,
  value,
  ink,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  ink?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
        {label}
      </p>
      <p className={cn("mt-0.5 text-sm font-semibold text-foreground", ink)}>
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One bot
// ---------------------------------------------------------------------------

interface BotCardProps {
  bot: BotModel;
  marketId: string;
  onRefresh: () => void;
  quoteCurrency?: string;
  lastActivity?: { action: string; timestamp: string; details: any };
}

const BotCard: React.FC<BotCardProps> = ({
  bot,
  marketId,
  onRefresh,
  quoteCurrency = "",
  lastActivity,
}) => {
  const t = useTranslations("ext_admin_ai_market-maker");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");

  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Field names here MUST match what the API actually reads.
  //
  // This form previously held `tradingFrequency`, `minOrderSize` and
  // `maxOrderSize`, none of which exist on the bot model or in the route's
  // destructure — the route reads `tradeFrequency`, `avgOrderSize` and
  // `orderSizeVariance`. All three were silently dropped on every save, with a
  // 200 and a success toast. `riskTolerance` was worse: the slider ran 1..10
  // while the API accepts 0.1..1, so nine of its ten positions returned a 400
  // that also took the one genuinely working field (maxDailyTrades) down.
  const [config, setConfig] = useState({
    riskTolerance: [Number(bot.riskTolerance) || 0.5],
    tradeFrequency: (bot.tradeFrequency || "MEDIUM") as BotTradeFrequency,
    avgOrderSize: Number(bot.avgOrderSize) || 100,
    orderSizeVariance: [Number(bot.orderSizeVariance) || 0.2],
    preferredSpread: Number(bot.preferredSpread) || 0.001,
    maxDailyTrades: bot.maxDailyTrades || 2000,
  });

  const handleStatusChange = async (status: "ACTIVE" | "PAUSED" | "COOLDOWN") => {
    setLoading("status");
    const { error } = await $fetch({
      url: `/api/admin/ai/market-maker/bot/${marketId}/${bot.id}/status`,
      method: "PUT",
      body: { status },
      silent: true,
    });
    setLoading(null);
    if (error) {
      toast.error(typeof error === "string" ? error : t("bot_status_failed"));
      return;
    }
    toast.success(t("bot_status_done"));
    onRefresh();
  };

  const handleConfigSave = async () => {
    setLoading("config");
    const { error } = await $fetch({
      url: `/api/admin/ai/market-maker/bot/${marketId}/${bot.id}/config`,
      method: "PUT",
      body: {
        ...config,
        riskTolerance: config.riskTolerance[0],
        orderSizeVariance: config.orderSizeVariance[0],
      },
      silent: true,
    });
    setLoading(null);
    if (error) {
      toast.error(typeof error === "string" ? error : t("bot_config_failed"));
      return;
    }
    toast.success(t("bot_config_done"));
    setEditMode(false);
    onRefresh();
  };

  // Daily trade count covers every trade the bot made (AI-to-AI and real);
  // `realTradesExecuted` counts only those against actual users, which is the
  // only population a win rate can be computed over.
  const totalTrades = bot.dailyTradeCount || 0;
  const realTrades = bot.realTradesExecuted || 0;
  const winRate = realTrades > 0 ? ((bot.profitableTrades || 0) / realTrades) * 100 : 0;
  const totalPnL = Number(bot.totalRealizedPnL || 0);
  const totalVolume = Number(bot.totalVolume || 0);
  const budgetUsed = bot.maxDailyTrades
    ? Math.min(100, (totalTrades / bot.maxDailyTrades) * 100)
    : 0;
  const atLimit = Boolean(bot.maxDailyTrades) && totalTrades >= (bot.maxDailyTrades || 0);

  const personality = PERSONALITY[bot.personality] ?? {
    icon: Bot,
    label: bot.personality,
  };
  const PersonalityIcon = personality.icon;

  return (
    <Card className={cn("overflow-hidden", expanded && "ring-1 ring-primary/20")}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left outline-hidden transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary">
            <PersonalityIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold text-foreground">
                {bot.name}
              </span>
              <StatusBadge status={bot.status} className="text-[11px]" />
              {atLimit ? (
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning-ink">
                  {t("bot_at_daily_limit")}
                </span>
              ) : null}
              {lastActivity ? (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary-ink">
                  <Radio className="h-3 w-3" />
                  {formatTimeAgo(lastActivity.timestamp)}
                </span>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {personality.label}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-6">
          <div className="hidden items-center gap-6 md:flex">
            <div className="text-right">
              <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {totalTrades.toLocaleString()}
              </p>
              <p className="text-[11px] text-subtle-foreground">
                {tCommon("total_trades")}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {winRate.toFixed(1)}%
              </p>
              <p className="text-[11px] text-subtle-foreground">
                {tCommon("win_rate")}
              </p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "text-sm font-semibold",
                  totalPnL >= 0 ? "text-up" : "text-down"
                )}
              >
                <MoneyFigure
                  value={`${totalPnL >= 0 ? "+" : "-"}${Math.abs(totalPnL).toFixed(2)} ${quoteCurrency}`}
                />
              </p>
              <p className="text-[11px] text-subtle-foreground">
                {tCommon("total_p_l")}
              </p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-border">
          <div className="grid gap-5 border-b border-border bg-muted/40 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <Figure
              label={tCommon("total_volume")}
              value={
                <MoneyFigure
                  value={`${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${quoteCurrency}`}
                />
              }
            />
            <Figure
              label={tCommon("last_trade")}
              value={
                bot.lastTradeAt
                  ? new Date(bot.lastTradeAt).toLocaleString()
                  : t("never_traded")
              }
            />
            <Figure
              label={tCommon("position")}
              value={
                <span className="font-mono tabular-nums">
                  {Number(bot.currentPosition || 0).toFixed(4)}
                </span>
              }
            />
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                {t("daily_budget")}
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
                {totalTrades.toLocaleString()} / {(bot.maxDailyTrades ?? 0).toLocaleString()}
              </p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                <div
                  className={cn(
                    "h-full rounded-full",
                    atLimit ? "bg-warning" : "bg-primary"
                  )}
                  style={{ width: `${budgetUsed}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-5 px-4 py-4">
            <div className="flex flex-wrap gap-2">
              {bot.status !== "ACTIVE" ? (
                <Button
                  size="sm"
                  tone="success"
                  onClick={() => handleStatusChange("ACTIVE")}
                  loading={loading === "status"}
                >
                  {loading !== "status" ? <Play className="h-4 w-4" /> : null}
                  {tCommon("activate")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  tone="warning"
                  onClick={() => handleStatusChange("PAUSED")}
                  loading={loading === "status"}
                >
                  {loading !== "status" ? <Pause className="h-4 w-4" /> : null}
                  {tCommon("pause")}
                </Button>
              )}
              {bot.status !== "COOLDOWN" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("COOLDOWN")}
                  loading={loading === "status"}
                >
                  {loading !== "status" ? <Timer className="h-4 w-4" /> : null}
                  {tExtAdmin("cooldown")}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant={editMode ? "default" : "outline"}
                onClick={() => setEditMode(!editMode)}
              >
                <Settings className="h-4 w-4" />
                {tCommon("configure")}
              </Button>
            </div>

            {editMode ? (
              <div className="space-y-5 rounded-md border border-border bg-surface-2 p-4">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-muted-foreground">
                        {tCommon("risk_tolerance")}
                      </label>
                      <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                        {Math.round(config.riskTolerance[0] * 100)}%
                      </span>
                    </div>
                    {/* 0.1..1.0 — the range the model and the API both enforce. */}
                    <Slider
                      value={config.riskTolerance}
                      onValueChange={(value) =>
                        setConfig({ ...config, riskTolerance: value })
                      }
                      min={0.1}
                      max={1}
                      step={0.1}
                      aria-label={tCommon("risk_tolerance")}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      {tCommon("trading_frequency")}
                    </label>
                    <Select
                      value={config.tradeFrequency}
                      onValueChange={(value) =>
                        setConfig({
                          ...config,
                          tradeFrequency: value as BotTradeFrequency,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={tCommon("select_frequency")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">
                          {tCommon("low_few_trades_per_day")}
                        </SelectItem>
                        <SelectItem value="MEDIUM">
                          {tCommon("medium_regular_trading")}
                        </SelectItem>
                        <SelectItem value="HIGH">
                          {tCommon("high_aggressive_trading")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("avg_order_size")}
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={config.avgOrderSize}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            avgOrderSize: Number(e.target.value),
                          })
                        }
                        min={0}
                        step="any"
                        className="pr-16"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {quoteCurrency}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("avg_order_size_hint")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("order_size_variance")}
                      </label>
                      <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                        {Math.round(config.orderSizeVariance[0] * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={config.orderSizeVariance}
                      onValueChange={(value) =>
                        setConfig({ ...config, orderSizeVariance: value })
                      }
                      min={0.1}
                      max={0.5}
                      step={0.05}
                      aria-label={t("order_size_variance")}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("order_size_variance_hint")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("preferred_spread")}
                      </label>
                      <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                        {(config.preferredSpread * 100).toFixed(2)}%
                      </span>
                    </div>
                    <Input
                      type="number"
                      value={config.preferredSpread}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          preferredSpread: Number(e.target.value),
                        })
                      }
                      min={0.0001}
                      max={0.02}
                      step={0.0001}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("how_far_from_mid_this_bot")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      {tCommon("max_daily_trades")}
                    </label>
                    <Input
                      type="number"
                      value={config.maxDailyTrades}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          maxDailyTrades: Number(e.target.value),
                        })
                      }
                      min={1}
                      max={10000}
                    />
                    <p className="text-xs text-muted-foreground">
                      {tExt("maximum_number_of_trades_this_bot")} (
                      {tExt("resets_at_midnight")})
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleConfigSave} loading={loading === "config"}>
                    {loading !== "config" ? <Check className="h-4 w-4" /> : null}
                    {tCommon("save_configuration")}
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    <X className="h-4 w-4" />
                    {tCommon("cancel")}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// The roster
// ---------------------------------------------------------------------------

export const BotManagement: React.FC<BotManagementProps> = ({
  marketId,
  bots,
  onRefresh,
  quoteCurrency = "",
  liveEvents = [],
}) => {
  const t = useTranslations("ext_admin_ai_market-maker");
  const tCommon = useTranslations("common");
  const [filter, setFilter] = useState<string>("ALL");

  /** The most recent action per bot, so a row can show what it just did. */
  const lastBotActivity = useMemo(() => {
    const activities: Record<
      string,
      { action: string; timestamp: string; details: any }
    > = {};
    for (const event of liveEvents) {
      if (event.type === "BOT_ACTIVITY" && event.data?.botId) {
        if (!activities[event.data.botId]) {
          activities[event.data.botId] = {
            action: event.data.action,
            timestamp: event.timestamp,
            details: event.data.details,
          };
        }
      } else if (event.type === "TRADE") {
        const { buyBotId, sellBotId } = event.data ?? {};
        if (buyBotId && !activities[buyBotId]) {
          activities[buyBotId] = {
            action: "AI_TRADE",
            timestamp: event.timestamp,
            details: { side: "BUY" },
          };
        }
        if (sellBotId && !activities[sellBotId]) {
          activities[sellBotId] = {
            action: "AI_TRADE",
            timestamp: event.timestamp,
            details: { side: "SELL" },
          };
        }
      }
    }
    return activities;
  }, [liveEvents]);

  const activeBots = bots.filter((bot) => bot.status === "ACTIVE").length;
  const totalTrades = bots.reduce(
    (sum, bot) => sum + Number(bot.dailyTradeCount || 0),
    0
  );
  const totalRealTrades = bots.reduce(
    (sum, bot) => sum + Number(bot.realTradesExecuted || 0),
    0
  );
  const totalProfitable = bots.reduce(
    (sum, bot) => sum + Number(bot.profitableTrades || 0),
    0
  );
  const avgWinRate =
    totalRealTrades > 0 ? (totalProfitable / totalRealTrades) * 100 : 0;

  const filters = useMemo(
    () => [
      { value: "ALL", label: tCommon("all"), count: bots.length },
      {
        value: "ACTIVE",
        label: tCommon("active"),
        count: bots.filter((b) => b.status === "ACTIVE").length,
      },
      {
        value: "INACTIVE",
        label: tCommon("inactive"),
        count: bots.filter((b) => b.status !== "ACTIVE").length,
      },
      ...Object.keys(PERSONALITY).map((key) => ({
        value: key,
        label: PERSONALITY[key].label,
        count: bots.filter((b) => b.personality === key).length,
      })),
    ],
    // A personality with no bots is not offered: an empty filter that yields an
    // empty list reads as a fault rather than as a filter.
    [bots, t, tCommon]
  ).filter((option) => option.count > 0 || option.value === "ALL");

  const filteredBots = bots.filter((bot) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return bot.status === "ACTIVE";
    if (filter === "INACTIVE") return bot.status !== "ACTIVE";
    return bot.personality === filter;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader padding="md" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  {tCommon("bots")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t("roster_hint")}
                </p>
              </div>
            </div>

            {/* The roster's own figures — one line, inside the panel they
                describe, rather than four KPI cards under the page's four. */}
            <dl className="flex flex-wrap gap-x-8 gap-y-2">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                  {tCommon("active_bots")}
                </dt>
                <dd
                  className={cn(
                    "font-mono text-sm font-semibold tabular-nums",
                    activeBots >= 2 ? "text-foreground" : "text-warning-ink"
                  )}
                >
                  {activeBots} / {bots.length}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                  {tCommon("total_trades")}
                </dt>
                <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {totalTrades.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                  {tCommon("avg_win_rate")}
                </dt>
                <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {/* Over REAL trades only — the AI-to-AI population has no
                      counterparty to win against. */}
                  {totalRealTrades > 0 ? `${avgWinRate.toFixed(1)}%` : "—"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Fewer than two ACTIVE bots is a closed trade gate, and the roster
              is where it is opened. Said here as well as in the page banner,
              because this is the screen an operator is on when they fix it. */}
          {activeBots < 2 ? (
            <p className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning-ink">
              {t("needs_two_active_bots_detail")}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            {filters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium outline-hidden transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  filter === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
                <span className="ml-1.5 font-mono tabular-nums opacity-70">
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {filteredBots.length > 0 ? (
          filteredBots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              marketId={marketId}
              onRefresh={onRefresh}
              quoteCurrency={quoteCurrency}
              lastActivity={lastBotActivity[bot.id]}
            />
          ))
        ) : (
          <Card>
            <CardContent
              padding="md"
              className="flex flex-col items-center justify-center gap-2 py-16 text-center"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-3 text-muted-foreground">
                <BotOff className="h-6 w-6" />
              </span>
              <p className="text-sm font-medium text-foreground">
                {tCommon("no_bots_found")}
              </p>
              <p className="max-w-md text-xs text-muted-foreground">
                {filter !== "ALL" ? t("no_bots_for_filter") : t("no_bots_yet")}
              </p>
              {filter !== "ALL" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setFilter("ALL")}
                >
                  <Activity className="h-4 w-4" />
                  {tCommon("clear_filters")}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BotManagement;
