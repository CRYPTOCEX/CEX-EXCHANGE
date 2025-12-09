"use client";

import React, { useEffect, useState, use, useCallback, useRef } from "react";
import { $fetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@iconify/react";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PoolManagement } from "../../components/PoolManagement";
import { BotManagement, LiveEvent } from "../../components/BotManagement";
import { MarketConfig } from "../../components/MarketConfig";
import { MarketOverview } from "../../components/MarketOverview";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorBoundary from "@/components/error-boundary";
import WebSocketManager from "@/utils/ws";
import { useUserStore } from "@/store/user";
import {
  LayoutDashboard,
  Droplets,
  Bot,
  Settings,
  ArrowLeft,
  Play,
  Pause,
  Square,
  BarChart3,
  Target,
  Wallet,
  TrendingUp,
  Activity,
  Clock,
  Zap,
  Wifi,
  WifiOff,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface RecentTrade {
  id: string;
  price: string;
  amount: string;
  buyBotId: string;
  sellBotId: string;
  createdAt: string;
}

// LiveEvent type is imported from BotManagement

interface MarketMakerData {
  id: string;
  ecosystemMarketId: string;
  status: string;
  targetPrice: string;
  priceRangeLow: string;
  priceRangeHigh: string;
  aggressionLevel: string; // "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE"
  realLiquidityPercent: number;
  maxDailyVolume: string;
  currentDailyVolume: string;
  volatilityPauseEnabled: boolean;
  volatilityThreshold: number;
  market?: {
    symbol: string;
    currency: string;
    pair: string;
  };
  pool?: {
    id: string;
    baseBalance: string;
    quoteBalance: string;
    baseCurrencyBalance?: string;
    quoteCurrencyBalance?: string;
    totalValueLocked: string;
    realizedPnL: string;
    unrealizedPnL: string;
  };
  bots?: any[];
  recentActivity?: any[];
  recentTrades?: RecentTrade[];
}

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "pool", label: "Pool", icon: Droplets },
  { id: "bots", label: "Bots", icon: Bot },
  { id: "config", label: "Configuration", icon: Settings },
];

// Status configuration with colors and animations
const statusConfig: Record<string, { color: string; bg: string; border: string; pulse: boolean; icon: React.ElementType }> = {
  ACTIVE: { color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-500/20", border: "border-green-300 dark:border-green-500/30", pulse: true, icon: Zap },
  PAUSED: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/20", border: "border-amber-300 dark:border-amber-500/30", pulse: false, icon: Pause },
  STOPPED: { color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-500/20", border: "border-gray-300 dark:border-gray-500/30", pulse: false, icon: Square },
  INITIALIZING: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-500/20", border: "border-blue-300 dark:border-blue-500/30", pulse: true, icon: Clock },
  ERROR: { color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-500/20", border: "border-red-300 dark:border-red-500/30", pulse: true, icon: Activity },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.STOPPED;
  const StatusIcon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.border}`}>
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75`} style={{ color: 'inherit' }} />
          <span className={`relative inline-flex rounded-full h-2 w-2 bg-current`} />
        </span>
      )}
      <StatusIcon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>{status}</span>
    </div>
  );
}

interface QuickStatProps {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: number;
  gradient: string;
  currency?: string;
}

function QuickStat({ label, value, icon: IconComponent, trend, gradient, currency }: QuickStatProps) {
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
            <p className="text-2xl font-bold text-foreground truncate">
              {value}
            </p>
            {currency && (
              <p className="text-xs text-muted-foreground">{currency}</p>
            )}
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-green-500" : "text-red-500"}`}>
                <TrendingUp className={`w-3 h-3 ${trend < 0 ? "rotate-180" : ""}`} />
                {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
              </div>
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

export default function MarketDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("ext");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MarketMakerData | null>(null);
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "overview"
  );
  const [wsConnected, setWsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const wsManagerRef = useRef<WebSocketManager | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    title: string;
    description: string;
    variant: "default" | "destructive";
  }>({
    open: false,
    action: "",
    title: "",
    description: "",
    variant: "default",
  });
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Track seen event keys to deduplicate
  const seenEventKeys = useRef<Set<string>>(new Set());

  // Use ref for message handler to avoid WebSocket reconnection on every render
  const handleWsMessageRef = useRef<(message: any) => void>();

  // Update the handler ref whenever dependencies change (but don't trigger effect)
  useEffect(() => {
    handleWsMessageRef.current = (message: any) => {
      if (process.env.NODE_ENV === "development") {
        console.debug("[AI Market Maker WS] Received message:", message.stream, message.data?.type);
      }

      if (message.stream === "ai-market-maker-data" && message.data) {
        // Full data update from initial subscription
        setData(prevData => {
          if (!prevData) return message.data;
          return {
            ...prevData,
            ...message.data,
            // Preserve some local state that shouldn't be overwritten
            market: message.data.market || prevData.market,
          };
        });
      } else if (message.stream === "ai-market-maker-event" && message.data) {
        // Real-time event (trade, order, etc.)
        const event = message.data as LiveEvent;

        // Generate unique key for deduplication
        const dataId = event.data?.tradeId || event.data?.orderId || event.data?.id || '';
        const eventKey = `${event.timestamp}-${event.type}-${dataId}`;

        // Skip duplicate events
        if (seenEventKeys.current.has(eventKey)) {
          return;
        }

        // Add to seen keys (limit size to prevent memory leak)
        seenEventKeys.current.add(eventKey);
        if (seenEventKeys.current.size > 200) {
          // Remove oldest entries by converting to array and slicing
          const keysArray = Array.from(seenEventKeys.current);
          seenEventKeys.current = new Set(keysArray.slice(-100));
        }

        setLiveEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events

        // Update local state from live events (so UI updates without refresh)
        if (event.type === "TRADE") {
          const { amount, price, buyBotId, sellBotId } = event.data;
          const tradeValue = Number(amount) * Number(price);

          // Update bot stats and market maker volume in local state
          setData(prevData => {
            if (!prevData) return prevData;

            // Update bots' dailyTradeCount and totalVolume
            const updatedBots = prevData.bots?.map(bot => {
              if (bot.id === buyBotId || bot.id === sellBotId) {
                return {
                  ...bot,
                  dailyTradeCount: (bot.dailyTradeCount || 0) + 1,
                  totalVolume: (Number(bot.totalVolume) || 0) + tradeValue,
                };
              }
              return bot;
            });

            // Update market maker currentDailyVolume
            const newDailyVolume = (Number(prevData.currentDailyVolume) || 0) + Number(amount);

            return {
              ...prevData,
              bots: updatedBots,
              currentDailyVolume: newDailyVolume.toString(),
            };
          });
        } else if (event.type === "STATUS_CHANGE") {
          // Only show toast for status changes (important user-initiated actions)
          toast.info(`Status changed to ${event.data.newStatus}`);
        }
      }
    };
  }); // No deps - always update ref with latest closure

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const response = await $fetch({
        url: `/api/admin/ai/market-maker/market/${id}`,
        silent: true,
      });
      if (response.data) {
        setData(response.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load market data");
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchMarketData();
  }, [id]);

  // WebSocket connection - stable effect that doesn't reconnect on handler changes
  useEffect(() => {
    if (!user?.id) return; // Wait for user to be loaded

    // Initialize WebSocket connection with userId query parameter
    const wsPath = `/api/admin/ai/market-maker/market?userId=${user.id}`;
    const wsManager = new WebSocketManager(wsPath);
    wsManagerRef.current = wsManager;

    wsManager.on("open", () => {
      setWsConnected(true);
      // Subscribe to this market maker's updates
      wsManager.send({
        action: "SUBSCRIBE",
        payload: { marketMakerId: id },
      });
    });

    wsManager.on("close", () => {
      setWsConnected(false);
    });

    // Use wrapper that calls the ref - this allows handler to update without reconnecting
    wsManager.on("message", (message: any) => {
      handleWsMessageRef.current?.(message);
    });

    wsManager.connect();

    // Cleanup on unmount or id change
    return () => {
      // Set manualDisconnect flag first to suppress error logs
      wsManager.manualDisconnect = true;
      // Unsubscribe before disconnecting (only if connected)
      if (wsManager.isConnected()) {
        try {
          wsManager.send({
            action: "UNSUBSCRIBE",
            payload: { marketMakerId: id },
          });
        } catch (e) {
          // Ignore send errors during cleanup
        }
      }
      wsManager.disconnect();
      wsManagerRef.current = null;
    };
  }, [id, user?.id]); // Removed handleWsMessage - now uses ref

  // Dialog configuration for each action
  const dialogConfig: Record<string, { title: string; description: string; variant: "default" | "destructive" }> = {
    START: {
      title: "Start Market Maker",
      description: "Are you sure you want to start this market maker? The AI bots will begin executing trades based on your configuration.",
      variant: "default",
    },
    PAUSE: {
      title: "Pause Market Maker",
      description: "Are you sure you want to pause this market maker? Trading will be temporarily suspended but can be resumed later.",
      variant: "default",
    },
    STOP: {
      title: "Stop Market Maker",
      description: "Are you sure you want to stop this market maker? All active orders will be cancelled and trading will cease completely.",
      variant: "destructive",
    },
    RESUME: {
      title: "Resume Market Maker",
      description: "Are you sure you want to resume this market maker? Trading will continue from where it was paused.",
      variant: "default",
    },
  };

  // Open confirmation dialog
  const handleStatusChange = (action: string) => {
    const config = dialogConfig[action];
    if (!config) return;

    setConfirmDialog({
      open: true,
      action,
      title: config.title,
      description: config.description,
      variant: config.variant,
    });
  };

  // Execute the confirmed action
  const executeStatusChange = async () => {
    const action = confirmDialog.action;
    setIsActionLoading(true);

    try {
      const response = await $fetch({
        url: `/api/admin/ai/market-maker/market/${id}/status`,
        method: "PUT",
        body: { action },
        silent: true,
      });
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success(`Market maker ${action.toLowerCase()}ed successfully`);
        fetchMarketData();
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action.toLowerCase()} market maker`);
    } finally {
      setIsActionLoading(false);
      setConfirmDialog(prev => ({ ...prev, open: false }));
    }
  };

  // Check if requirements are met for starting
  const canStart = () => {
    if (!data) return false;
    const hasLiquidity = data.pool && Number(data.pool.totalValueLocked) > 0;
    const hasBots = data.bots && data.bots.length > 0;
    return hasLiquidity && hasBots;
  };

  const getStartRequirements = (): string[] => {
    if (!data) return [];
    const requirements: string[] = [];
    if (!data.pool || Number(data.pool.totalValueLocked) <= 0) {
      requirements.push("Deposit liquidity to the pool");
    }
    if (!data.bots || data.bots.length === 0) {
      requirements.push("Configure at least one bot");
    }
    return requirements;
  };

  const getStatusActions = () => {
    if (!data) return [];
    switch (data.status) {
      case "INITIALIZING":
      case "STOPPED":
        return [{ action: "START", label: "Start", icon: Play, variant: "default" as const, disabled: !canStart() }];
      case "ACTIVE":
        return [
          { action: "PAUSE", label: "Pause", icon: Pause, variant: "outline" as const, disabled: false },
          { action: "STOP", label: "Stop", icon: Square, variant: "destructive" as const, disabled: false },
        ];
      case "PAUSED":
        return [
          { action: "RESUME", label: "Resume", icon: Play, variant: "default" as const, disabled: false },
          { action: "STOP", label: "Stop", icon: Square, variant: "destructive" as const, disabled: false },
        ];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <>
        {/* Loading Hero - matches actual hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-slate-900 dark:via-slate-950 dark:to-black shadow-xl">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl bg-white/20" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48 bg-white/20" />
                  <Skeleton className="h-4 w-32 bg-white/20" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-24 rounded-lg bg-white/20" />
                <Skeleton className="h-10 w-28 rounded-lg bg-white/20" />
              </div>
            </div>
            {/* Volume Progress Bar skeleton */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-32 bg-white/20" />
                <Skeleton className="h-4 w-40 bg-white/20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full bg-white/20" />
            </div>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Loading Stats - matches QuickStat cards (border-0 shadow-lg) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              "from-blue-500 to-blue-600",
              "from-blue-500 to-blue-600",
              "from-purple-500 to-purple-600",
              "from-green-500 to-green-600",
            ].map((gradient, i) => (
              <Card key={i} className="relative overflow-hidden border-0 shadow-lg">
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1 mr-3">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-7 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className={`w-11 h-11 rounded-xl`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Loading Tabs - matches actual tab card */}
          <Card className="border-0 shadow-lg overflow-hidden dark:border dark:border-slate-700">
            <div className="flex gap-1 p-2 bg-secondary/50">
              {tabs.map((tab) => (
                <Skeleton key={tab.id} className="h-11 w-28 rounded-lg" />
              ))}
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="p-6 rounded-full bg-red-500/10 dark:bg-red-500/20 mb-6">
          <Icon icon="mdi:alert-circle" className="w-16 h-16 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {t("market_maker_not_found")}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t("the_requested_market_maker_could_not_be_found")}
        </p>
        <Button onClick={() => router.push("/admin/ai/market-maker/market")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("back_to_markets")}
        </Button>
      </div>
    );
  }

  const totalPnL = Number(data.pool?.realizedPnL || 0) + Number(data.pool?.unrealizedPnL || 0);

  // Check if all bots have reached their daily trade limit
  const allBotsAtLimit = data.bots && data.bots.length > 0 &&
    data.bots.every((bot: any) => bot.dailyTradeCount >= bot.maxDailyTrades);
  const botsAtLimitCount = data.bots?.filter((bot: any) => bot.dailyTradeCount >= bot.maxDailyTrades).length || 0;
  const totalBotsCount = data.bots?.length || 0;
  const volumePercent = data.maxDailyVolume && Number(data.maxDailyVolume) > 0
    ? (Number(data.currentDailyVolume || 0) / Number(data.maxDailyVolume)) * 100
    : 0;

  return (
    <>
      {/* Hero Header - Full width */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-slate-900 dark:via-slate-950 dark:to-black shadow-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/admin/ai/market-maker/market")}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>

              <div>
                <div className="flex items-center gap-4 mb-2 flex-wrap">
                  <h1 className="text-3xl font-bold text-white">
                    {data.market?.currency && data.market?.pair
                      ? `${data.market.currency}/${data.market.pair}`
                      : "Unknown Market"}
                  </h1>
                  <StatusBadge status={data.status} />
                  {/* Daily Limit Indicator - Shows when bots are at limit */}
                  {data.status === "ACTIVE" && allBotsAtLimit && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">{t("idle_daily_limit")}</span>
                    </div>
                  )}
                  {data.status === "ACTIVE" && !allBotsAtLimit && botsAtLimitCount > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{botsAtLimitCount}/{totalBotsCount} {t("at_limit")}</span>
                    </div>
                  )}
                  {/* WebSocket Connection Indicator */}
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                    wsConnected
                      ? "bg-green-500/20 text-green-300 border border-green-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}>
                    {wsConnected ? (
                      <>
                        <Wifi className="w-3 h-3" />
                        Live
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3" />
                        Offline
                      </>
                    )}
                  </div>
                </div>
                <p className="text-white/70 text-lg">
                  AI Market Maker
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {getStatusActions().map((action) => {
                const ActionIcon = action.icon;
                const requirements = action.action === "START" && action.disabled ? getStartRequirements() : [];
                return (
                  <div key={action.action} className="relative group">
                    <Button
                      variant={action.variant}
                      size="lg"
                      onClick={() => handleStatusChange(action.action)}
                      disabled={action.disabled}
                      className={`${action.variant === "default" && !action.disabled ? "bg-white text-slate-900 hover:bg-white/90 font-semibold" : ""} ${action.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <ActionIcon className="w-5 h-5 mr-2" />
                      {action.label}
                    </Button>
                    {requirements.length > 0 && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-50">
                        <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
                          <p className="font-semibold mb-1">{t("requirements_not_met")}</p>
                          <ul className="list-disc list-inside">
                            {requirements.map((req, i) => (
                              <li key={i}>{req}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push(`/admin/ai/market-maker/analytics?market=${id}`)}
                className="border-white/30 text-white hover:bg-white/10"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Analytics
              </Button>
            </div>
          </div>

          {/* Volume Progress Bar */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">{t("daily_volume_usage")}</span>
              <span className={`text-sm font-medium ${volumePercent > 100 ? "text-red-300" : "text-white"}`}>
                {Number(data.currentDailyVolume || 0).toLocaleString()} / {Number(data.maxDailyVolume || 0).toLocaleString()} {data.market?.pair || ""}
              </span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  volumePercent > 100
                    ? "bg-red-500"
                    : volumePercent > 80
                      ? "bg-amber-400"
                      : "bg-green-400"
                }`}
                style={{ width: `${Math.min(volumePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Daily Limit Alert Banner */}
        {data.status === "ACTIVE" && allBotsAtLimit && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 dark:bg-amber-500/5">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-600 dark:text-amber-400">{t("trading_idle_daily_limit_reached")}</h4>
              <p className="text-sm text-muted-foreground">
                All {totalBotsCount} {t("bots_have_reached_their_daily_trade_limit")} {t("trading_will_automatically_resume_at_midnight")} {t("you_can_also_increase_the_max")}
              </p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat
          label={t("target_price")}
          value={Number(data.targetPrice || 0).toFixed(6)}
          icon={Target}
          gradient="from-blue-500 to-blue-600"
          currency={data.market?.pair}
        />
        <QuickStat
          label={t("total_value_locked")}
          value={Number(data.pool?.totalValueLocked || 0).toLocaleString()}
          icon={Wallet}
          gradient="from-blue-500 to-blue-600"
          currency={data.market?.pair}
        />
        <QuickStat
          label={t("_24h_volume")}
          value={Number(data.currentDailyVolume || 0).toLocaleString()}
          icon={Activity}
          gradient="from-purple-500 to-purple-600"
          currency={data.market?.pair}
        />
        <QuickStat
          label={t("total_p_l")}
          value={`${totalPnL >= 0 ? "+" : ""}${Math.abs(totalPnL).toFixed(2)}`}
          icon={TrendingUp}
          trend={totalPnL}
          gradient={totalPnL >= 0 ? "from-green-500 to-green-600" : "from-red-500 to-red-600"}
          currency={data.market?.pair}
        />
      </div>

      {/* Tabs */}
      <Card className="border-0 shadow-lg overflow-hidden dark:border dark:border-slate-700">
        <div className="flex gap-1 p-2 bg-secondary/50">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-background/50"
                }`}
              >
                <TabIcon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "overview" && (
            <ErrorBoundary resetKeys={[id, "overview"]} showDetails>
              <MarketOverview data={data} onRefresh={fetchMarketData} liveEvents={liveEvents} />
            </ErrorBoundary>
          )}
          {activeTab === "pool" && (
            <ErrorBoundary resetKeys={[id, "pool"]} showDetails>
              <PoolManagement marketId={id} pool={data.pool} onRefresh={fetchMarketData} quoteCurrency={data.market?.pair || ""} baseCurrency={data.market?.currency || ""} />
            </ErrorBoundary>
          )}
          {activeTab === "bots" && (
            <ErrorBoundary resetKeys={[id, "bots"]} showDetails>
              <BotManagement marketId={id} bots={data.bots || []} onRefresh={fetchMarketData} quoteCurrency={data.market?.pair || ""} liveEvents={liveEvents} />
            </ErrorBoundary>
          )}
          {activeTab === "config" && (
            <ErrorBoundary resetKeys={[id, "config"]} showDetails>
              <MarketConfig data={data} onRefresh={fetchMarketData} />
            </ErrorBoundary>
          )}
        </div>
      </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent size="sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {confirmDialog.variant === "destructive" ? (
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-500/20">
                  <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              )}
              <DialogTitle>{confirmDialog.title}</DialogTitle>
            </div>
            <DialogDescription className="mt-3">
              {confirmDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
              disabled={isActionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.variant === "destructive" ? "destructive" : "default"}
              onClick={executeStatusChange}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("processing_ellipsis")}
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
