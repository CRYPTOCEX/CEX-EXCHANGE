"use client";

import React, { useState, useMemo } from "react";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bot,
  Zap,
  Waves,
  TrendingUp,
  TrendingDown,
  Scale,
  Play,
  Pause,
  Timer,
  Settings,
  ChevronDown,
  ChevronUp,
  Activity,
  Target,
  Clock,
  Hash,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  X,
  Loader2,
  BotOff,
  PlayCircle,
  BarChart3,
  Radio,
  ArrowLeftRight,
  ShoppingCart,
  Eye,
  Coffee,
  History,
} from "lucide-react";
import { useTranslations } from "next-intl";

// Live event types - exported for use in page.tsx
export interface LiveEvent {
  type: "TRADE" | "ORDER" | "STATUS_CHANGE" | "BOT_UPDATE" | "POOL_UPDATE" | "BOT_ACTIVITY" | "ERROR";
  data: any;
  timestamp: string;
  marketMakerId: string;
}

// Bot activity types
type BotActivityAction = "AI_TRADE" | "REAL_ORDER_PLACED" | "ORDER_CANCELLED" | "ANALYZING" | "WAITING" | "COOLDOWN";

interface BotActivity {
  botId: string;
  botName: string;
  action: BotActivityAction;
  details: {
    side?: "BUY" | "SELL";
    price?: number;
    amount?: number;
    counterpartyBotId?: string;
    counterpartyBotName?: string;
    reason?: string;
  };
}

interface BotManagementProps {
  marketId: string;
  bots: any[];
  onRefresh: () => void;
  quoteCurrency?: string;
  liveEvents?: LiveEvent[];
}

// Bot type configuration with icons and colors
const botTypeConfig: Record<string, { icon: React.ElementType; gradient: string; label: string }> = {
  SCALPER: { icon: Zap, gradient: "from-yellow-500 to-amber-500", label: "Scalper" },
  SWING: { icon: Waves, gradient: "from-purple-500 to-violet-500", label: "Swing Trader" },
  ACCUMULATOR: { icon: TrendingUp, gradient: "from-green-500 to-emerald-500", label: "Accumulator" },
  DISTRIBUTOR: { icon: TrendingDown, gradient: "from-red-500 to-rose-500", label: "Distributor" },
  MARKET_MAKER: { icon: Scale, gradient: "from-purple-500 to-violet-500", label: "Market Maker" },
};

// Status configuration
const statusConfig: Record<string, { color: string; bg: string; pulse: boolean }> = {
  ACTIVE: { color: "text-green-500", bg: "bg-green-500/20", pulse: true },
  PAUSED: { color: "text-amber-500", bg: "bg-amber-500/20", pulse: false },
  COOLDOWN: { color: "text-blue-500", bg: "bg-blue-500/20", pulse: true },
  INACTIVE: { color: "text-gray-500", bg: "bg-gray-500/20", pulse: false },
};

// Activity action configuration
const activityConfig: Record<BotActivityAction, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  AI_TRADE: { icon: ArrowLeftRight, label: "AI Trade", color: "text-purple-500", bg: "bg-purple-500/20" },
  REAL_ORDER_PLACED: { icon: ShoppingCart, label: "Real Order", color: "text-green-500", bg: "bg-green-500/20" },
  ORDER_CANCELLED: { icon: X, label: "Order Cancelled", color: "text-red-500", bg: "bg-red-500/20" },
  ANALYZING: { icon: Eye, label: "Analyzing", color: "text-blue-500", bg: "bg-blue-500/20" },
  WAITING: { icon: Clock, label: "Waiting", color: "text-gray-500", bg: "bg-gray-500/20" },
  COOLDOWN: { icon: Coffee, label: "Cooldown", color: "text-amber-500", bg: "bg-amber-500/20" },
};

// Format timestamp for display
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return time.toLocaleTimeString();
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.INACTIVE;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bg}`}>
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color.replace('text-', 'bg-')} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color.replace('text-', 'bg-')}`} />
        </span>
      )}
      <span className={`text-xs font-semibold ${config.color}`}>{status}</span>
    </div>
  );
}

interface BotCardProps {
  bot: any;
  marketId: string;
  onRefresh: () => void;
  quoteCurrency?: string;
  lastActivity?: { action: string; timestamp: string; details: any };
}

const BotCard: React.FC<BotCardProps> = ({ bot, marketId, onRefresh, quoteCurrency = "", lastActivity }) => {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [config, setConfig] = useState({
    riskTolerance: [bot.riskTolerance || 5],
    tradingFrequency: bot.tradingFrequency || "MEDIUM",
    minOrderSize: bot.minOrderSize || 10,
    maxOrderSize: bot.maxOrderSize || 1000,
    maxDailyTrades: bot.maxDailyTrades || 100,
  });

  const handleStatusChange = async (status: "ACTIVE" | "PAUSED" | "COOLDOWN") => {
    try {
      setLoading("status");
      const response = await $fetch({
        url: `/api/admin/ai/market-maker/bot/${marketId}/${bot.id}/status`,
        method: "PUT",
        body: { status },
        silent: true,
      });
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success(`Bot ${status.toLowerCase()}`);
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update bot status");
    } finally {
      setLoading(null);
    }
  };

  const handleConfigSave = async () => {
    try {
      setLoading("config");
      const response = await $fetch({
        url: `/api/admin/ai/market-maker/bot/${marketId}/${bot.id}/config`,
        method: "PUT",
        body: {
          ...config,
          riskTolerance: config.riskTolerance[0],
        },
        silent: true,
      });
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success("Bot configuration updated");
        setEditMode(false);
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update bot configuration");
    } finally {
      setLoading(null);
    }
  };

  // Use daily trade count for all bot trades (AI-to-AI + real)
  // Note: realTradesExecuted only counts trades with real users
  const totalTrades = bot.dailyTradeCount || 0;
  const realTrades = bot.realTradesExecuted || 0;
  const profitableTrades = bot.profitableTrades || 0;
  const winRate = realTrades > 0 ? (profitableTrades / realTrades) * 100 : 0;
  const totalPnL = Number(bot.totalRealizedPnL || 0);
  const totalVolume = Number(bot.totalVolume || 0);

  const typeConfig = botTypeConfig[bot.botType] || { icon: Bot, gradient: "from-gray-500 to-gray-600", label: bot.botType };
  const TypeIcon = typeConfig.icon;

  return (
    <Card className="border-0 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 dark:border dark:border-slate-700">
      {/* Colored top border */}
      <div className={`h-1 bg-gradient-to-r ${typeConfig.gradient}`} />

      {/* Header - Always visible */}
      <div
        className="p-5 cursor-pointer hover:bg-secondary/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${typeConfig.gradient} shadow-lg`}>
              <TypeIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h4 className="font-bold text-lg text-foreground">
                  {bot.name}
                </h4>
                <StatusBadge status={bot.status} />
                {/* Live Activity Indicator */}
                {lastActivity && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-xs">
                    <Radio className="w-3 h-3 animate-pulse" />
                    <span>{formatTimeAgo(lastActivity.timestamp)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{typeConfig.label}</p>
                {/* Last action description */}
                {lastActivity && (
                  <span className="text-xs text-muted-foreground">
                    {tCommon("last")} {activityConfig[lastActivity.action as BotActivityAction]?.label || lastActivity.action}
                    {lastActivity.details?.side && (
                      <span className={lastActivity.details.side === "BUY" ? "text-green-500 ml-1" : "text-red-500 ml-1"}>
                        ({lastActivity.details.side})
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Quick Stats - Desktop */}
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{totalTrades}</p>
                <p className="text-xs text-muted-foreground">Trades</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{winRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{tCommon("win_rate")}</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {totalPnL >= 0 ? "+" : ""}{Math.abs(totalPnL).toFixed(2)} {quoteCurrency}
                </p>
                <p className="text-xs text-muted-foreground">P&L</p>
              </div>
            </div>

            <div className={`p-2 rounded-lg transition-colors ${expanded ? "bg-primary/10" : "bg-secondary"}`}>
              {expanded ? (
                <ChevronUp className={`w-5 h-5 ${expanded ? "text-primary" : "text-muted-foreground"}`} />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-border">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-gradient-to-r from-secondary/50 to-secondary">
            <div className="p-4 bg-background rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{tExt("total_trades")}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{totalTrades}</p>
            </div>
            <div className="p-4 bg-background rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{tCommon("win_rate")}</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-foreground">{winRate.toFixed(1)}%</p>
                {/* Mini Win Rate Bar */}
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                    style={{ width: `${winRate}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-background rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{tExt("total_volume")}</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })} {quoteCurrency}
              </p>
            </div>
            <div className={`p-4 rounded-xl shadow-sm ${totalPnL >= 0 ? "bg-green-500/10 dark:bg-green-500/20" : "bg-red-500/10 dark:bg-red-500/20"}`}>
              <div className="flex items-center gap-2 mb-2">
                {totalPnL >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{tCommon("total_p_l")}</span>
              </div>
              <p className={`text-xl font-bold ${totalPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {totalPnL >= 0 ? "+" : ""}{Math.abs(totalPnL).toFixed(2)} {quoteCurrency}
              </p>
            </div>
          </div>

          {/* Actions & Config */}
          <div className="p-5 space-y-5">
            {/* Status Actions */}
            <div className="flex flex-wrap gap-3">
              {bot.status !== "ACTIVE" && (
                <Button
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md"
                  onClick={() => handleStatusChange("ACTIVE")}
                  disabled={loading === "status"}
                >
                  {loading === "status" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Activate
                </Button>
              )}
              {bot.status === "ACTIVE" && (
                <Button
                  variant="outline"
                  className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                  onClick={() => handleStatusChange("PAUSED")}
                  disabled={loading === "status"}
                >
                  {loading === "status" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Pause className="w-4 h-4 mr-2" />
                  )}
                  Pause
                </Button>
              )}
              {bot.status !== "COOLDOWN" && (
                <Button
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                  onClick={() => handleStatusChange("COOLDOWN")}
                  disabled={loading === "status"}
                >
                  {loading === "status" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Timer className="w-4 h-4 mr-2" />
                  )}
                  Cooldown
                </Button>
              )}
              <Button
                variant={editMode ? "default" : "outline"}
                onClick={() => setEditMode(!editMode)}
                className={editMode ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground" : ""}
              >
                <Settings className="w-4 h-4 mr-2" />
                {editMode ? "Editing..." : "Configure"}
              </Button>
            </div>

            {/* Config Form */}
            {editMode && (
              <Card className="border border-primary/20 bg-primary/5">
                <CardContent className="p-5 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Risk Tolerance */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted-foreground">
                          {tCommon("risk_tolerance")}
                        </label>
                        <span className="text-sm font-bold text-primary">
                          {config.riskTolerance[0]}/10
                        </span>
                      </div>
                      <Slider
                        value={config.riskTolerance}
                        onValueChange={(value) => setConfig({ ...config, riskTolerance: value })}
                        min={1}
                        max={10}
                        step={1}
                        className="cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Conservative</span>
                        <span>Aggressive</span>
                      </div>
                    </div>

                    {/* Trading Frequency */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground">
                        {tCommon("trading_frequency")}
                      </label>
                      <Select
                        value={config.tradingFrequency}
                        onValueChange={(value) => setConfig({ ...config, tradingFrequency: value })}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder={tCommon("select_frequency")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">{tCommon("low_few_trades_per_day")}</SelectItem>
                          <SelectItem value="MEDIUM">{tCommon("medium_regular_trading")}</SelectItem>
                          <SelectItem value="HIGH">{tCommon("high_aggressive_trading")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Min Order Size */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground">
                        {tCommon("min_order_size")}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {quoteCurrency || "$"}
                        </span>
                        <Input
                          type="number"
                          value={config.minOrderSize}
                          onChange={(e) => setConfig({ ...config, minOrderSize: Number(e.target.value) })}
                          className="h-12 pl-14"
                        />
                      </div>
                    </div>

                    {/* Max Order Size */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground">
                        {tCommon("max_order_size")}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {quoteCurrency || "$"}
                        </span>
                        <Input
                          type="number"
                          value={config.maxOrderSize}
                          onChange={(e) => setConfig({ ...config, maxOrderSize: Number(e.target.value) })}
                          className="h-12 pl-14"
                        />
                      </div>
                    </div>

                    {/* Max Daily Trades */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground">
                        {tCommon("max_daily_trades")}
                      </label>
                      <Input
                        type="number"
                        value={config.maxDailyTrades}
                        onChange={(e) => setConfig({ ...config, maxDailyTrades: Number(e.target.value) })}
                        className="h-12"
                        min={1}
                        max={10000}
                      />
                      <p className="text-xs text-muted-foreground">
                        {tExt("maximum_number_of_trades_this_bot")} ({tExt("resets_at_midnight")})
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md"
                      onClick={handleConfigSave}
                      disabled={loading === "config"}
                    >
                      {loading === "config" ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      {tCommon("save_configuration")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(false)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bot Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{tCommon("last_trade")}</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {bot.lastTradeAt ? new Date(bot.lastTradeAt).toLocaleString() : "Never"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{tCommon("next_scheduled")}</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {bot.nextScheduledAt ? new Date(bot.nextScheduledAt).toLocaleString() : "N/A"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{tCommon("behavior_seed")}</span>
                </div>
                <p className="text-sm font-medium font-mono text-foreground truncate">
                  {bot.behaviorSeed || "N/A"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Position</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {Number(bot.currentPosition || 0).toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  highlight?: "success" | "danger";
  currency?: string;
}

function SummaryCard({ label, value, icon: IconComponent, gradient, highlight, currency }: SummaryCardProps) {
  // Cards with gradient backgrounds don't need borders as they are visually distinct
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1 mr-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className={`text-2xl font-bold truncate ${
              highlight === "success" ? "text-green-600 dark:text-green-400" :
              highlight === "danger" ? "text-red-600 dark:text-red-400" :
              "text-foreground"
            }`}>
              {value}
            </p>
            {currency && (
              <p className="text-xs text-muted-foreground">{currency}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg shrink-0`}>
            <IconComponent className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const BotManagement: React.FC<BotManagementProps> = ({
  marketId,
  bots,
  onRefresh,
  quoteCurrency = "",
  liveEvents = [],
}) => {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [filter, setFilter] = useState<string>("ALL");
  const [showActivityLog, setShowActivityLog] = useState(true);

  // Get filtered bot IDs for filtering live events
  const filteredBotIds = useMemo(() => {
    const filtered = bots.filter((bot) => {
      if (filter === "ALL") return true;
      if (filter === "ACTIVE") return bot.status === "ACTIVE";
      if (filter === "INACTIVE") return bot.status !== "ACTIVE";
      return bot.botType === filter;
    });
    return new Set(filtered.map(b => b.id));
  }, [bots, filter]);

  // Extract bot activities and trades from live events, filtered by selected filter
  const botActivities = useMemo(() => {
    return liveEvents
      .filter(e => {
        if (e.type !== "BOT_ACTIVITY" && e.type !== "TRADE" && e.type !== "ORDER") {
          return false;
        }
        // If filter is ALL, show everything
        if (filter === "ALL") return true;

        // Filter based on bot involvement
        if (e.type === "BOT_ACTIVITY" || e.type === "ORDER") {
          return filteredBotIds.has(e.data?.botId);
        }
        if (e.type === "TRADE") {
          // Show trade if either buy or sell bot is in filtered set
          return filteredBotIds.has(e.data?.buyBotId) || filteredBotIds.has(e.data?.sellBotId);
        }
        return true;
      })
      .slice(0, 30); // Keep last 30 activities
  }, [liveEvents, filter, filteredBotIds]);

  // Get last activity for each bot (for status indicator)
  const lastBotActivity = useMemo(() => {
    const activities: Record<string, { action: string; timestamp: string; details: any }> = {};
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
        // For trades, both buy and sell bots were active
        const { buyBotId, sellBotId } = event.data;
        if (buyBotId && !activities[buyBotId]) {
          activities[buyBotId] = { action: "AI_TRADE", timestamp: event.timestamp, details: { side: "BUY" } };
        }
        if (sellBotId && !activities[sellBotId]) {
          activities[sellBotId] = { action: "AI_TRADE", timestamp: event.timestamp, details: { side: "SELL" } };
        }
      }
    }
    return activities;
  }, [liveEvents]);

  const filteredBots = bots.filter((bot) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return bot.status === "ACTIVE";
    if (filter === "INACTIVE") return bot.status !== "ACTIVE";
    return bot.botType === filter;
  });

  const activeBots = bots.filter((b) => b.status === "ACTIVE").length;
  // Use daily trade count for total trades (includes AI-to-AI trades)
  const totalTrades = bots.reduce((sum, b) => sum + Number(b.dailyTradeCount || 0), 0);
  // Win rate is based on real trades only (trades with actual users)
  const totalRealTrades = bots.reduce((sum, b) => sum + Number(b.realTradesExecuted || 0), 0);
  const totalProfitableTrades = bots.reduce((sum, b) => sum + Number(b.profitableTrades || 0), 0);
  const avgWinRate = totalRealTrades > 0 ? (totalProfitableTrades / totalRealTrades) * 100 : 0;

  const filterOptions = [
    { value: "ALL", label: "All Bots" },
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "SCALPER", label: "Scalper" },
    { value: "SWING", label: "Swing" },
    { value: "ACCUMULATOR", label: "Accumulator" },
    { value: "DISTRIBUTOR", label: "Distributor" },
    { value: "MARKET_MAKER", label: "Market Maker" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label={tCommon("total_bots")}
          value={bots.length}
          icon={Bot}
          gradient="from-purple-500 to-purple-600"
        />
        <SummaryCard
          label={tCommon("active_bots")}
          value={activeBots}
          icon={PlayCircle}
          gradient="from-green-500 to-green-600"
        />
        <SummaryCard
          label={t("total_trades")}
          value={totalTrades.toLocaleString()}
          icon={Activity}
          gradient="from-purple-500 to-purple-600"
        />
        <SummaryCard
          label={tCommon("avg_win_rate")}
          value={`${avgWinRate.toFixed(1)}%`}
          icon={TrendingUp}
          gradient="from-cyan-500 to-cyan-600"
        />
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg dark:border dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            {filterOptions.map((option) => {
              const isActive = filter === option.value;
              const typeConfig = botTypeConfig[option.value];

              return (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? typeConfig
                        ? `bg-gradient-to-r ${typeConfig.gradient} text-white shadow-md`
                        : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Live Activity Log */}
      <Card className="border-0 shadow-lg dark:border dark:border-slate-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">{t("live_activity")}</CardTitle>
                <p className="text-sm text-muted-foreground">{tCommon("real_time_bot_actions_and_trades")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {botActivities.length > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Live
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActivityLog(!showActivityLog)}
              >
                {showActivityLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showActivityLog && (
          <CardContent>
            {botActivities.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {botActivities.map((event, index) => {
                  if (event.type === "BOT_ACTIVITY") {
                    const activity = event.data as BotActivity;
                    const config = activityConfig[activity.action] || activityConfig.WAITING;
                    const ActivityIcon = config.icon;

                    return (
                      <div key={`${event.timestamp}-${index}`} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <ActivityIcon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">{activity.botName}</span>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>{config.label}</span>
                            {activity.details?.side && (
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${activity.details.side === "BUY" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                                {activity.details.side}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {activity.details?.amount && activity.details?.price && (
                              <span>
                                {Number(activity.details.amount).toFixed(4)} @ {Number(activity.details.price).toFixed(6)}
                              </span>
                            )}
                            {activity.details?.counterpartyBotName && (
                              <span>
                                {activity.details?.amount ? " • " : ""}
                                with <span className={activity.details.side === "BUY" ? "text-red-500" : "text-green-500"}>{activity.details.counterpartyBotName}</span>
                              </span>
                            )}
                            {activity.details?.reason && !activity.details?.amount && (
                              <span className="text-muted-foreground">{activity.details.reason}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatTimeAgo(event.timestamp)}
                        </span>
                      </div>
                    );
                  } else if (event.type === "TRADE") {
                    const { side, price, amount, buyBotName, sellBotName, symbol } = event.data;
                    const [baseCurrency, quoteCurrency] = (symbol || "").split("/");
                    const tradeValue = Number(amount) * Number(price);
                    return (
                      <div key={`${event.timestamp}-${index}`} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                          <ArrowLeftRight className="w-4 h-4 text-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">AI Trade</span>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${side === "BUY" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                              {side}
                            </span>
                            <span className="text-xs font-medium text-purple-500">
                              {Number(amount).toFixed(4)} {baseCurrency || ""}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-green-600 dark:text-green-400">{buyBotName}</span>
                            <span className="mx-1.5 text-muted-foreground/50">{tCommon("bought_from")}</span>
                            <span className="text-red-600 dark:text-red-400">{sellBotName}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span>{tCommon("price")} {Number(price).toFixed(6)} {quoteCurrency || ""}</span>
                            <span className="mx-1.5">•</span>
                            <span>{tCommon("value")} {tradeValue.toFixed(4)} {quoteCurrency || ""}</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatTimeAgo(event.timestamp)}
                        </span>
                      </div>
                    );
                  } else if (event.type === "ORDER") {
                    const { side, price, amount, botName, orderType, symbol } = event.data;
                    const [baseCurrency, quoteCurrency] = (symbol || "").split("/");
                    return (
                      <div key={`${event.timestamp}-${index}`} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                          <ShoppingCart className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">{botName}</span>
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500">{tCommon("real_order")}</span>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${side === "BUY" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                              {side}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            <span>{Number(amount).toFixed(4)} {baseCurrency || ""} @ {Number(price).toFixed(6)} {quoteCurrency || ""}</span>
                            {orderType && <span className="ml-1.5 text-muted-foreground/70">({orderType})</span>}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatTimeAgo(event.timestamp)}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-4 rounded-full bg-secondary mb-4">
                  <Activity className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">{t("no_activity_yet")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("bot_activities_will_appear_here_in")}
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Bot List */}
      <div className="space-y-4">
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
          <Card className="border-0 shadow-lg dark:border dark:border-slate-700">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-6 rounded-full bg-secondary mb-6">
                <BotOff className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {tCommon("no_bots_found")}
              </h3>
              <p className="text-muted-foreground text-center max-w-md">
                {filter !== "ALL"
                  ? "No bots match the current filter. Try selecting a different filter."
                  : "This market has no bots configured. Bots are automatically created when the market maker is started."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BotManagement;
