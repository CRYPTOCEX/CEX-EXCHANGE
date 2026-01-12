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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

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
      toast.error("Failed to fetch chart data");
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

    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/admin/finance/exchange/chart/build`;

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
            toast.success("Chart build completed successfully");
            setBuildJobId(null);
            fetchData(); // Refresh stats on completion
          } else if (message.data.status === "failed") {
            toast.error(message.data.error || "Chart build failed");
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
      toast.error("WebSocket connection error");
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
      toast.error("Please select at least one market");
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
        toast.success(`Cleaned ${data.cleaned.files} files and ${data.cleaned.redis} Redis entries`);
        setCleanDialogOpen(false);
        setSelectedMarkets([]);
        setSelectedIntervals([]);
        fetchData();
      } else {
        toast.error(data?.errors?.[0] || error || "Failed to clean chart data");
      }
    } catch (error) {
      toast.error("Failed to clean chart data");
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
        toast.success(`Build started for ${data.markets} markets. Estimated time: ${data.estimatedTime}`);
        setBuildJobId(data.jobId);
        setBuildJob({ status: "running", progress: 0 });
        setBuildDialogOpen(false);
      } else {
        toast.error(error || "Failed to start chart build");
      }
    } catch (error) {
      toast.error("Failed to start chart build");
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
        },
      });

      if (!error) {
        if (data?.gapsFixed > 0) {
          toast.success(`Fixed ${data.gapsFixed} gaps, added ${data.candlesAdded} candles`);
        } else if (data?.gapsFound === 0) {
          toast.info("No gaps found in chart data");
        } else {
          toast.warning(`Found ${data?.gapsFound} gaps but could not fix any`);
        }
        fetchData();
      } else {
        toast.error("Failed to fix chart gaps");
      }
    } catch (error) {
      toast.error("Failed to fix chart gaps");
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
        toast.success("Settings saved successfully");
        setSettingsDialogOpen(false);
        fetchData();
      } else {
        toast.error(error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
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

  if (loading) {
    return (
      <div className={`container ${PAGE_PADDING} space-y-8`}>
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className={`container ${PAGE_PADDING} space-y-6`}>
      {/* Header */}
      <motion.div
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
            <h1 className="text-2xl font-bold">Chart Data Management</h1>
            <p className="text-muted-foreground">
              Manage historical chart data cache for all markets
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
      </motion.div>

      {/* Exchange Ban Alert */}
      {settings?.exchangeBanStatus?.isBanned && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Exchange API Rate Limited</AlertTitle>
          <AlertDescription>
            The exchange has temporarily banned API requests. Unblock in{" "}
            {Math.ceil(settings.exchangeBanStatus.remainingSeconds / 60)} minutes.
            Chart building and fixing operations will fail until the ban is lifted.
          </AlertDescription>
        </Alert>
      )}

      {/* Build Job Progress */}
      {buildJob && buildJob.status === "running" && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="font-medium">Building chart data...</span>
                    {buildJob.currentSymbol && (
                      <span className="text-xs text-muted-foreground">
                        Current: {buildJob.currentSymbol}:{buildJob.currentInterval}
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
                        toast.info("Stopped monitoring build job");
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
                <Progress value={buildJob.progress || 0} className="h-2" />
                {buildJob.errors && buildJob.errors.length > 0 && (
                  <p className="text-xs text-orange-500 mt-2">
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
          <AlertTitle>Build Failed</AlertTitle>
          <AlertDescription>
            {buildJob.error || "An error occurred during the build process."}
            {buildJob.errors && buildJob.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Errors:</p>
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Database className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Markets</p>
                <p className="text-2xl font-bold">{markets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <HardDrive className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cache Size</p>
                <p className="text-2xl font-bold">{formatBytes(totalCacheSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Intervals</p>
                <p className="text-2xl font-bold">{availableIntervals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cache Days</p>
                <p className="text-2xl font-bold">{settings?.cacheDays || 30}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setBuildDialogOpen(true)}
            disabled={settings?.exchangeBanStatus?.isBanned || buildJob?.status === "running"}
          >
            <Play className="h-4 w-4 mr-2" />
            Build Charts
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
      </motion.div>

      {/* Markets Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Market Chart Data
            </CardTitle>
            <CardDescription>
              Click on a market row to see interval details
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
                    />
                  </TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Intervals</TableHead>
                  <TableHead className="text-right">Candles</TableHead>
                  <TableHead className="text-right">Gaps</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">Date Range</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMarkets.map((market) => {
                  const stats = getMarketStats(market);
                  const isExpanded = expandedMarket === market.symbol;

                  return (
                    <React.Fragment key={market.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedMarket(isExpanded ? null : market.symbol)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedMarkets.includes(market.symbol)}
                            onCheckedChange={() => handleToggleMarket(market.symbol)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{market.symbol}</span>
                            {!stats.hasData && (
                              <Badge variant="outline" className="text-xs">No data</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{stats.intervalCount}</TableCell>
                        <TableCell className="text-right">
                          {stats.totalCandles.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {stats.totalGaps > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {stats.totalGaps}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                              0
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatBytes(stats.totalSize)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {stats.oldestDate ? (
                            <>
                              {formatDate(stats.oldestDate)} - {formatDate(stats.newestDate)}
                            </>
                          ) : (
                            "-"
                          )}
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
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="space-y-4">
                              <h4 className="font-medium text-sm">Interval Details</h4>
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
                                            ? "border-orange-500/20 bg-orange-500/5"
                                            : "border-green-500/20 bg-green-500/5"
                                          : "border-border bg-muted/30"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-sm">{interval}</span>
                                        {hasData && intervalData.gaps > 0 && (
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
                                            <span>Candles:</span>
                                            <span>{intervalData.candleCount.toLocaleString()}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Gaps:</span>
                                            <span className={intervalData.gaps > 0 ? "text-orange-500" : "text-green-500"}>
                                              {intervalData.gaps}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Size:</span>
                                            <span>{formatBytes(intervalData.fileSize)}</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">No data</p>
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

                {filteredMarkets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No markets found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Clean Dialog */}
      <Dialog open={cleanDialogOpen} onOpenChange={setCleanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clean Chart Data</DialogTitle>
            <DialogDescription>
              This will permanently delete cached chart data for the selected markets.
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
              <Label className="text-sm font-medium">Intervals to Clean</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Leave empty to clean all intervals
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
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Clean Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Build Dialog */}
      <Dialog open={buildDialogOpen} onOpenChange={setBuildDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Build Chart Data</DialogTitle>
            <DialogDescription>
              Fetch historical chart data from the exchange for selected markets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Markets</Label>
              <p className="text-xs text-muted-foreground">
                {selectedMarkets.length > 0
                  ? `Building for ${selectedMarkets.length} selected markets`
                  : `Building for all ${markets.length} enabled markets`}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Historical Days</Label>
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
                Delay between API requests to avoid rate limiting
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
            <Button onClick={handleBuild} disabled={actionLoading || buildForm.intervals.length === 0}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Start Build
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chart Cache Settings</DialogTitle>
            <DialogDescription>
              Configure how chart data is cached and updated.
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
              <Label className="text-sm font-medium">Default Intervals</Label>
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
                <Label className="text-sm font-medium">Auto Update</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically update chart data periodically
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
            <Button onClick={handleSaveSettings} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
