"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loadable } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Loader2,
  BarChart3,
  Trash2,
  Wrench,
  Download,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  HardDrive,
  Activity,
  Play,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/page-shell";

interface MarketChartStats {
  id: string;
  symbol: string;
  currency: string;
  pair: string;
  status: boolean;
  intervals: Record<string, {
    candleCount: number;
    fileSize: number;
    oldestCandle: number | null;
    newestCandle: number | null;
    gaps: number;
    error?: string;
  }>;
}

interface ChartSettings {
  cacheDays: number;
  rateLimit: number;
  intervals: string[];
  autoUpdate: boolean;
  exchangeBanStatus: {
    isBanned: boolean;
    unblockTime: number | null;
    remainingSeconds: number;
  };
}

interface BuildJob {
  status: "running" | "completed" | "failed";
  progress: number;
  completedTasks?: number;
  totalTasks?: number;
  errors?: string[];
  completedAt?: number;
  failedAt?: number;
  currentSymbol?: string;
  currentInterval?: string;
  error?: string;
}

const ALL_INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w"];
const DEFAULT_INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d"];

/**
 * Rows the markets table reserves while the stats request is in flight.
 *
 * A `null` row IS the pending row, so the one `.map()` below renders both
 * states out of the same `<TableRow>` — the eight columns, their alignment and
 * the expand chevron are identical in both, and there is no second copy of a
 * row to drift.
 */
const PENDING_ROWS: Array<MarketChartStats | null> = Array.from(
  { length: 6 },
  () => null
);

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(timestamp: number | null): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChartManagementPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<MarketChartStats[]>([]);
  const [settings, setSettings] = useState<ChartSettings | null>(null);
  const [totalCacheSize, setTotalCacheSize] = useState(0);
  const [availableIntervals, setAvailableIntervals] = useState<string[]>([]);

  // Selection state
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedIntervals, setSelectedIntervals] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);

  // Dialog states
  const [cleanDialogOpen, setCleanDialogOpen] = useState(false);
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);
  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [buildJob, setBuildJob] = useState<BuildJob | null>(null);
  const [buildJobId, setBuildJobId] = useState<string | null>(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    cacheDays: 30,
    rateLimit: 500,
    intervals: DEFAULT_INTERVALS,
    autoUpdate: false,
  });

  // Build form state
  const [buildForm, setBuildForm] = useState({
    days: 30,
    rateLimit: 500,
    intervals: DEFAULT_INTERVALS,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, settingsRes] = await Promise.all([
        $fetch({ url: "/api/admin/finance/exchange/chart", silent: true }),
        $fetch({ url: "/api/admin/finance/exchange/chart/settings", silent: true }),
      ]);

      if (!statsRes.error && statsRes.data) {
        setMarkets(statsRes.data.markets || []);
        setTotalCacheSize(statsRes.data.totalCacheSize || 0);
        setAvailableIntervals(statsRes.data.intervals || ALL_INTERVALS);
      }

      if (!settingsRes.error && settingsRes.data) {
        setSettings(settingsRes.data);
        setSettingsForm({
          cacheDays: settingsRes.data.cacheDays || 30,
          rateLimit: settingsRes.data.rateLimit || 500,
          intervals: settingsRes.data.intervals || DEFAULT_INTERVALS,
          autoUpdate: settingsRes.data.autoUpdate || false,
        });
      }
    } catch (error) {
      toast.error(t("failed_to_fetch_chart_data"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket for build job progress
  useEffect(() => {
    if (!buildJobId) {
      // Clean up WebSocket when no job
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // Create WebSocket connection - all backends now use /api/ prefix
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const isDev = process.env.NODE_ENV === "development";
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
    // In development, connect directly to backend (Next.js rewrites don't support WebSocket upgrades)
    const host = isDev ? `${window.location.hostname}:${backendPort}` : window.location.host;
    const wsUrl = `${protocol}//${host}/api/admin/finance/exchange/chart/build`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[Chart Build] WebSocket connected");
      // Subscribe to job updates
      ws.send(JSON.stringify({
        action: "SUBSCRIBE",
        payload: { jobId: buildJobId },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "progress" && message.jobId === buildJobId) {
          setBuildJob(message.data);

          if (message.data.status === "completed") {
            toast.success(t("chart_build_completed_successfully"));
            setBuildJobId(null);
            fetchData(); // Refresh stats on completion
          } else if (message.data.status === "failed") {
            toast.error(message.data.error || t("chart_build_failed"));
            setBuildJobId(null);
            fetchData(); // Refresh stats on failure
          }
        } else if (message.type === "subscription") {
          // Initial subscription response with current status
          if (message.data) {
            setBuildJob(message.data);
          }
        }
      } catch (e) {
        console.error("[Chart Build] WebSocket message parse error:", e);
      }
    };

    ws.onerror = (error) => {
      console.error("[Chart Build] WebSocket error:", error);
      toast.error(t("websocket_connection_error"));
    };

    ws.onclose = () => {
      console.log("[Chart Build] WebSocket disconnected");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          action: "UNSUBSCRIBE",
          payload: { jobId: buildJobId },
        }));
      }
      ws.close();
      wsRef.current = null;
    };
  }, [buildJobId, fetchData]);

  const handleSelectAllMarkets = () => {
    if (selectedMarkets.length === filteredMarkets.length) {
      setSelectedMarkets([]);
    } else {
      setSelectedMarkets(filteredMarkets.map((m) => m.symbol));
    }
  };

  const handleToggleMarket = (symbol: string) => {
    setSelectedMarkets((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol]
    );
  };

  const handleClean = async () => {
    if (selectedMarkets.length === 0) {
      toast.error(t("please_select_at_least_one_market"));
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/finance/exchange/chart/clean",
        method: "POST",
        body: {
          symbols: selectedMarkets,
          intervals: selectedIntervals.length > 0 ? selectedIntervals : undefined,
          cleanRedis: true,
          cleanFiles: true,
        },
      });

      if (!error && data?.cleaned) {
        toast.success(t("cleaned_files_and_redis_entries", { files: String(data.cleaned.files), redis: String(data.cleaned.redis) }));
        setCleanDialogOpen(false);
        setSelectedMarkets([]);
        setSelectedIntervals([]);
        fetchData();
      } else {
        toast.error(data?.errors?.[0] || error || t("failed_to_clean_chart_data"));
      }
    } catch (error) {
      toast.error(t("failed_to_clean_chart_data"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuild = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/finance/exchange/chart/build",
        method: "POST",
        body: {
          symbols: selectedMarkets.length > 0 ? selectedMarkets : undefined,
          intervals: buildForm.intervals,
          days: buildForm.days,
          rateLimit: buildForm.rateLimit,
        },
      });

      if (!error && data?.jobId) {
        toast.success(t("build_started_for_markets_estimated_time", { markets: String(data.markets), estimatedTime: String(data.estimatedTime) }));
        setBuildJobId(data.jobId);
        setBuildJob({ status: "running", progress: 0 });
        setBuildDialogOpen(false);
      } else {
        toast.error(error || t("failed_to_start_chart_build"));
      }
    } catch (error) {
      toast.error(t("failed_to_start_chart_build"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleFix = async (symbol: string, interval: string) => {
    setActionLoading(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/finance/exchange/chart/fix",
        method: "POST",
        body: {
          symbol,
          interval,
          rateLimit: settings?.rateLimit || 500,
          maxGaps: 10,
          /*
            REPAIR, NOT JUST BACKFILL.

            Gap detection only ever asks whether a timestamp EXISTS, so a bar
            that is present but wrong is invisible to it - and a bar captured
            part-way through its own minute by an older build is exactly that.
            Asking for repair as well makes the route also re-fetch bars whose
            close does not meet the next bar's open, which on a continuously
            traded market is the one thing that cannot happen honestly.
          */
          repair: true,
        },
      });

      if (!error) {
        if (data?.gapsFixed > 0) {
          toast.success(t("fixed_gaps_added_candles", { gapsFixed: String(data.gapsFixed), candlesAdded: String(data.candlesAdded) }));
        } else if (data?.barsRepaired > 0) {
          // A translated word and a number, deliberately: every message on
          // this page exists in all 90 catalogues, and a key added to en.json
          // alone renders as the raw key everywhere else.
          toast.success(`${tCommon("fixed")}: ${data.barsRepaired}`);
        } else if (data?.gapsFound === 0) {
          toast.info(t("no_gaps_found_in_chart_data"));
        } else {
          toast.warning(t("found_gaps_but_could_not_fix_any", { gapsFound: String(data?.gapsFound) }));
        }
        fetchData();
      } else {
        toast.error(t("failed_to_fix_chart_gaps"));
      }
    } catch (error) {
      toast.error(t("failed_to_fix_chart_gaps"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/finance/exchange/chart/settings",
        method: "PUT",
        body: settingsForm,
      });

      if (!error && data?.settings) {
        toast.success(tCommon("settings_saved_successfully"));
        setSettingsDialogOpen(false);
        fetchData();
      } else {
        toast.error(error || t("failed_to_save_settings"));
      }
    } catch (error) {
      toast.error(t("failed_to_save_settings"));
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMarkets = markets.filter(
    (m) =>
      m.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.currency.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMarketStats = (market: MarketChartStats) => {
    const intervals = Object.entries(market.intervals);
    const totalCandles = intervals.reduce((sum, [, data]) => sum + (data.candleCount || 0), 0);
    const totalGaps = intervals.reduce((sum, [, data]) => sum + (data.gaps || 0), 0);
    const totalSize = intervals.reduce((sum, [, data]) => sum + (data.fileSize || 0), 0);
    const hasData = intervals.length > 0;

    let oldestDate: number | null = null;
    let newestDate: number | null = null;

    for (const [, data] of intervals) {
      if (data.oldestCandle && (!oldestDate || data.oldestCandle < oldestDate)) {
        oldestDate = data.oldestCandle;
      }
      if (data.newestCandle && (!newestDate || data.newestCandle > newestDate)) {
        newestDate = data.newestCandle;
      }
    }

    return { totalCandles, totalGaps, totalSize, hasData, oldestDate, newestDate, intervalCount: intervals.length };
  };

  /**
   * THE SKELETON HAD ALREADY DRIFTED FROM THE PAGE IT IMITATED.
   * ==========================================================================
   *
   * `if (loading) return <PageShell rhythm="lg">` with six hand-sized boxes —
   * and note `rhythm="lg"` against the real page's `rhythm="md"`, so even the
   * GAPS between the blocks were wrong: 32px while pending, 24px after. Below
   * that, four `h-32` squares stood in for `StatsCard`s whose real content
   * height is 130.5px, and a single `h-96` rectangle stood in for the search
   * row, two action buttons, a card header, a table header and its rows. The
   * ban alert and the build-progress card had no representation at all.
   *
   * That is the failure mode a duplicate always has: nothing keeps it in sync,
   * so it decays silently while the page it copies is edited. There is no
   * duplicate now. `StatsCard` takes `loading` and reserves its own figure, and
   * the table renders `PENDING_ROWS` through the same row markup as real data.
   *
   * `showEmptyRow` splits the two states the table used to merge: "No markets
   * found" is a conclusion about markets we have looked for, and
   * `filteredMarkets.length === 0` is equally true before we have asked.
   */
  const showEmptyRow = !loading && filteredMarkets.length === 0;
  const rows: Array<MarketChartStats | null> = loading
    ? PENDING_ROWS
    : filteredMarkets;

  return (
    <PageShell rhythm="md">
      {/* Header */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <Link href="/admin/finance/exchange">
            <Button variant="ghost" size="icon" className="border border-border/40">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("chart_data_management")}</h1>
            <p className="text-muted-foreground">
              {t("manage_historical_chart_data_cache_for_all_markets")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsDialogOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </m.div>

      {/* Exchange Ban Alert */}
      {settings?.exchangeBanStatus?.isBanned && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("exchange_api_rate_limited")}</AlertTitle>
          <AlertDescription>
            The exchange has temporarily banned API requests. Unblock in{" "}
            {Math.ceil(settings.exchangeBanStatus.remainingSeconds / 60)} minutes.
            Chart building and fixing operations will fail until the ban is lifted.
          </AlertDescription>
        </Alert>
      )}

      {/* Build Job Progress */}
      {buildJob && buildJob.status === "running" && (
        <Card className="border-info/20 bg-info/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="font-medium">{t("building_chart_data")}…</span>
                    {buildJob.currentSymbol && (
                      <span className="text-xs text-muted-foreground">
                        {tCommon("current")}: {buildJob.currentSymbol}:{buildJob.currentInterval}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {buildJob.progress || 0}%
                      {buildJob.totalTasks ? ` (${buildJob.completedTasks || 0}/${buildJob.totalTasks})` : ""}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBuildJobId(null);
                        setBuildJob(null);
                        toast.info(t("stopped_monitoring_build_job"));
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
                <Progress value={buildJob.progress || 0} className="h-2" />
                {buildJob.errors && buildJob.errors.length > 0 && (
                  <p className="text-xs text-warning mt-2">
                    {buildJob.errors.length} error(s) so far
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Build Job Failed */}
      {buildJob && buildJob.status === "failed" && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{t("build_failed")}</AlertTitle>
          <AlertDescription>
            {buildJob.error || t("an_error_occurred_during_the_build_process")}
            {buildJob.errors && buildJob.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">{tCommon("errors")}:</p>
                <ul className="list-disc list-inside text-sm">
                  {buildJob.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {buildJob.errors.length > 5 && (
                    <li>...and {buildJob.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatsCard
          label={t("total_markets")}
          value={markets.length}
          icon={Database}
          {...statsCardColors.primary}
          loading={loading}
        />

        <StatsCard
          label={t("cache_size")}
          value={formatBytes(totalCacheSize)}
          icon={HardDrive}
          {...statsCardColors.success}
          loading={loading}
        />

        <StatsCard
          label="Intervals"
          value={availableIntervals.length}
          icon={BarChart3}
          {...statsCardColors.primary}
          loading={loading}
        />

        <StatsCard
          label={t("cache_days")}
          value={settings?.cacheDays || 30}
          icon={Clock}
          {...statsCardColors.warning}
          loading={loading}
        />
      </m.div>

      {/* Actions Bar */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${tCommon("search_markets")}…`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setBuildDialogOpen(true)}
            /* `settings` is null while pending, so the ban check reads as "not
               banned" and the button offered a build that would have been
               rejected by the exchange. */
            disabled={loading || settings?.exchangeBanStatus?.isBanned || buildJob?.status === "running"}
          >
            <Play className="h-4 w-4 mr-2" />
            {t("build_charts")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setCleanDialogOpen(true)}
            disabled={selectedMarkets.length === 0}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clean ({selectedMarkets.length})
          </Button>
        </div>
      </m.div>

      {/* Markets Table */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("market_chart_data")}
            </CardTitle>
            <CardDescription>
              {t("click_on_a_market_row_to_see_interval_details")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedMarkets.length === filteredMarkets.length && filteredMarkets.length > 0}
                      onCheckedChange={handleSelectAllMarkets}
                      disabled={loading}
                    />
                  </TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Intervals</TableHead>
                  <TableHead className="text-right">Candles</TableHead>
                  <TableHead className="text-right">Gaps</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">{tCommon("date_range")}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((market, rowIndex) => {
                  const stats = market ? getMarketStats(market) : null;
                  const isExpanded = market
                    ? expandedMarket === market.symbol
                    : false;

                  return (
                    <React.Fragment key={market ? market.id : `pending-${rowIndex}`}>
                      <TableRow
                        className={market ? "cursor-pointer hover:bg-muted/50" : undefined}
                        onClick={() => {
                          if (market) {
                            setExpandedMarket(isExpanded ? null : market.symbol);
                          }
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {/* The checkbox is chrome — the column exists either
                              way, and a row nobody has loaded yet simply cannot
                              be selected. */}
                          <Checkbox
                            checked={
                              market ? selectedMarkets.includes(market.symbol) : false
                            }
                            disabled={!market}
                            onCheckedChange={() => {
                              if (market) handleToggleMarket(market.symbol);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>
                              <Loadable loading={!market} placeholder="BTC/USDT">
                                {market?.symbol}
                              </Loadable>
                            </span>
                            {/* "No data" is a conclusion about a market whose
                                stats we have; a pending row has no claim to
                                make, so the badge waits rather than flashing on
                                every row and then clearing. */}
                            {stats && !stats.hasData && (
                              <Badge variant="outline" className="text-xs">{tCommon("no_data")}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Loadable loading={!stats} placeholder="12">
                            {stats?.intervalCount}
                          </Loadable>
                        </TableCell>
                        <TableCell className="text-right">
                          <Loadable loading={!stats} placeholder="123,456">
                            {stats ? stats.totalCandles.toLocaleString() : null}
                          </Loadable>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              !stats
                                ? "outline"
                                : stats.totalGaps > 0
                                  ? "destructive"
                                  : "outline"
                            }
                            className={
                              stats && stats.totalGaps === 0
                                ? "text-xs bg-success/10 text-success-ink border-success/20"
                                : "text-xs"
                            }
                          >
                            <Loadable loading={!stats} placeholder="0">
                              {stats?.totalGaps}
                            </Loadable>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Loadable loading={!stats} placeholder="12.34 MB">
                            {stats ? formatBytes(stats.totalSize) : null}
                          </Loadable>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          <Loadable
                            loading={!stats}
                            placeholder={t("jan_1_2024_jan_31") + " 2024"}
                          >
                            {stats
                              ? stats.oldestDate
                                ? `${formatDate(stats.oldestDate)} - ${formatDate(stats.newestDate)}`
                                : "-"
                              : null}
                          </Loadable>
                        </TableCell>
                        <TableCell>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Row - Interval Details */}
                      {isExpanded && market && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="space-y-4">
                              <h4 className="font-medium text-sm">{t("interval_details")}</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {availableIntervals.map((interval) => {
                                  const intervalData = market.intervals[interval];
                                  const hasData = intervalData && intervalData.candleCount > 0;

                                  return (
                                    <div
                                      key={interval}
                                      className={`p-3 rounded-lg border ${
                                        hasData
                                          ? intervalData.gaps > 0
                                            ? "border-warning/20 bg-warning/5"
                                            : "border-success/20 bg-success/5"
                                          : "border-border bg-muted/30"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-sm">{interval}</span>
                                        {/*
                                          Offered whenever there is data, not
                                          only when the gap count is non-zero.
                                          A series can be gapless and still
                                          hold bars that are wrong - the gap
                                          count cannot see those - so hiding
                                          the control behind `gaps > 0` made
                                          the only repair path unreachable for
                                          exactly the series that needed it.
                                        */}
                                        {hasData && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleFix(market.symbol, interval);
                                            }}
                                            disabled={actionLoading || settings?.exchangeBanStatus?.isBanned}
                                          >
                                            <Wrench className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                      {hasData ? (
                                        <div className="space-y-1 text-xs text-muted-foreground">
                                          <div className="flex justify-between">
                                            <span>{t("candles")}:</span>
                                            <span>{intervalData.candleCount.toLocaleString()}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>{tCommon("gaps")}:</span>
                                            <span className={intervalData.gaps > 0 ? "text-warning" : "text-success"}>
                                              {intervalData.gaps}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>{tCommon("size")}:</span>
                                            <span>{formatBytes(intervalData.fileSize)}</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">{tCommon("no_data")}</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}

                {showEmptyRow && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {tCommon("no_markets_found")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </m.div>

      {/* Clean Dialog */}
      <Dialog open={cleanDialogOpen} onOpenChange={setCleanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clean_chart_data")}</DialogTitle>
            <DialogDescription>
              {t("this_will_permanently_delete_cached_chart")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Selected Markets ({selectedMarkets.length})</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedMarkets.slice(0, 5).map((symbol) => (
                  <Badge key={symbol} variant="secondary">{symbol}</Badge>
                ))}
                {selectedMarkets.length > 5 && (
                  <Badge variant="outline">+{selectedMarkets.length - 5} more</Badge>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">{t("intervals_to_clean")}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t("leave_empty_to_clean_all_intervals")}
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_INTERVALS.map((interval) => (
                  <Badge
                    key={interval}
                    variant={selectedIntervals.includes(interval) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedIntervals((prev) =>
                        prev.includes(interval)
                          ? prev.filter((i) => i !== interval)
                          : [...prev, interval]
                      );
                    }}
                  >
                    {interval}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCleanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClean}
              loading={actionLoading}
            >
              {t("clean_data")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Build Dialog */}
      <Dialog open={buildDialogOpen} onOpenChange={setBuildDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("build_chart_data")}</DialogTitle>
            <DialogDescription>
              {t("fetch_historical_chart_data_from_the")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Markets</Label>
              <p className="text-xs text-muted-foreground">
                {selectedMarkets.length > 0
                  ? t("building_for_selected_markets", { length: selectedMarkets.length })
                  : t("building_for_all_enabled_markets", { length: markets.length })}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">{t("historical_days")}</Label>
              <Input
                type="number"
                value={buildForm.days}
                onChange={(e) => setBuildForm((prev) => ({ ...prev, days: parseInt(e.target.value) || 30 }))}
                min={1}
                max={365}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Rate Limit (ms)</Label>
              <Input
                type="number"
                value={buildForm.rateLimit}
                onChange={(e) => setBuildForm((prev) => ({ ...prev, rateLimit: parseInt(e.target.value) || 500 }))}
                min={100}
                max={10000}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("delay_between_api_requests_to_avoid_rate_limiting")}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Intervals</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ALL_INTERVALS.map((interval) => (
                  <Badge
                    key={interval}
                    variant={buildForm.intervals.includes(interval) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setBuildForm((prev) => ({
                        ...prev,
                        intervals: prev.intervals.includes(interval)
                          ? prev.intervals.filter((i) => i !== interval)
                          : [...prev.intervals, interval],
                      }));
                    }}
                  >
                    {interval}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuildDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBuild} loading={actionLoading} disabled={buildForm.intervals.length === 0}>
              {t("start_build")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("chart_cache_settings")}</DialogTitle>
            <DialogDescription>
              {t("configure_how_chart_data_is_cached_and_updated")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Cache Duration (days)</Label>
              <Input
                type="number"
                value={settingsForm.cacheDays}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, cacheDays: parseInt(e.target.value) || 30 }))}
                min={1}
                max={365}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Rate Limit (ms)</Label>
              <Input
                type="number"
                value={settingsForm.rateLimit}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, rateLimit: parseInt(e.target.value) || 500 }))}
                min={100}
                max={10000}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{t("default_intervals")}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ALL_INTERVALS.map((interval) => (
                  <Badge
                    key={interval}
                    variant={settingsForm.intervals.includes(interval) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSettingsForm((prev) => ({
                        ...prev,
                        intervals: prev.intervals.includes(interval)
                          ? prev.intervals.filter((i) => i !== interval)
                          : [...prev.intervals, interval],
                      }));
                    }}
                  >
                    {interval}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{t("auto_update")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("automatically_update_chart_data_periodically")}
                </p>
              </div>
              <Switch
                checked={settingsForm.autoUpdate}
                onCheckedChange={(checked) => setSettingsForm((prev) => ({ ...prev, autoUpdate: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} loading={actionLoading}>
              {tCommon("save_settings")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
