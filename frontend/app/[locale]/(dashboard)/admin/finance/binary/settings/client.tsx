"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import {
  Save,
  RotateCcw,
  AlertCircle,
  Loader2,
  Power,
  TrendingUp,
  Clock,
  Shield,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Play,
  Zap,
  Target,
  BarChart3,
  LineChart,
  Layers,
  Settings,
  XCircle,
  Calculator,
  Bookmark,
  Check,
  Star,
  Lock,
  Unlock,
  Activity,
  Eye,
  ArrowRight,
  Gift,
  ArrowLeft,
  Brush,
  MousePointer2,
  Gauge,
  TrendingDown,
  Cpu,
  AlertTriangle,
  Info,
  Lightbulb,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";

import type {
  BinarySettings,
  BinarySettingsResponse,
  PresetsResponse,
  PresetInfo,
  ValidationResult,
} from "./types";
import {
  ORDER_TYPE_ICONS,
  DEFAULT_BINARY_SETTINGS,
  cloneSettings,
  settingsChanged,
} from "./settings";
import { ORDER_TYPE_LABELS, ORDER_TYPE_DESCRIPTIONS } from "./types";

// Import custom components
import { BarrierLevelsEditor } from "./components/BarrierLevelsEditor";
import { DurationManager } from "./components/DurationManager";
import { PresetSelector } from "./components/PresetSelector";
import { OrderTypeCard } from "./components/OrderTypeCard";
import { PayoutOptimizer } from "./components/PayoutOptimizer";
import type { Warning } from "./types";
import { useTranslations } from "next-intl";

// ============================================================================
// SECTION DEFINITIONS
// ============================================================================

type SectionId = "overview" | "orderTypes" | "barriers" | "durations" | "cancellation" | "risk" | "optimizer" | "presets";

interface Section {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  bgColor: string;
}

const SECTIONS: Section[] = [
  { id: "overview", label: "Overview", icon: BarChart3, description: "Dashboard & quick settings", color: "text-blue-500", bgColor: "bg-blue-500/10" },
  { id: "orderTypes", label: "Order Types", icon: Layers, description: "Configure trading types", color: "text-purple-500", bgColor: "bg-purple-500/10" },
  { id: "barriers", label: "Barriers & Strikes", icon: Target, description: "Price levels & profits", color: "text-amber-500", bgColor: "bg-amber-500/10" },
  { id: "durations", label: "Durations", icon: Clock, description: "Expiry time options", color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
  { id: "cancellation", label: "Cancellation", icon: XCircle, description: "Early exit rules", color: "text-orange-500", bgColor: "bg-orange-500/10" },
  { id: "risk", label: "Risk Controls", icon: Shield, description: "Limits & alerts", color: "text-red-500", bgColor: "bg-red-500/10" },
  { id: "optimizer", label: "Optimizer", icon: Calculator, description: "Payout analysis", color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  { id: "presets", label: "Presets", icon: Bookmark, description: "Quick templates", color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
];

// ============================================================================
// CHART ENGINE PROMO COMPONENT
// ============================================================================

function ChartEnginePromo({ extensionId }: { extensionId: string | null }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const highlightFeatures = [
    { icon: LineChart, label: "173+ Indicators", value: "Technical analysis arsenal" },
    { icon: Brush, label: "45+ Drawing Tools", value: "Professional annotations" },
    { icon: Eye, label: "50+ Patterns", value: "Auto candlestick detection" },
    { icon: Gauge, label: "60 FPS", value: "WebGL acceleration" },
    { icon: Target, label: "Harmonic Patterns", value: "Gartley, Butterfly, Bat, Crab" },
    { icon: Activity, label: "Signal Aggregation", value: "Multi-indicator consensus" },
  ];

  const capabilities = [
    "5 Chart Types (Candlestick, Line, Area, Bar, Heikin-Ashi)",
    "9 Timeframes (1m to 1w)",
    "Trade Replay Engine with adjustable speed",
    "Multi-Timeframe Analysis panels",
    "Divergence Analysis (Regular & Hidden)",
    "Price Alert System with notifications",
    "Binary Order Visualization",
    "Dark & Light Themes",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 rounded-2xl" />

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "0.75s" }} />
      </div>

      {/* Inner content */}
      <div className="relative m-[2px] bg-gradient-to-br from-zinc-900/98 via-zinc-900/95 to-zinc-950/98 rounded-[14px] p-6 md:p-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl blur-xl opacity-60 animate-pulse" />
                <div className="relative p-4 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 rounded-2xl shadow-lg shadow-purple-500/30">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">{t("chart_engine")}</h2>
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs font-semibold shadow-lg shadow-orange-500/20">
                    <Star className="w-3 h-3 mr-1 fill-current" /> {t("pro_addon")}
                  </Badge>
                </div>
                <p className="text-zinc-400">{t("professional_trading_charts_advanced_technical_ana")}</p>
              </div>
            </div>
            <p className="text-zinc-300 text-base leading-relaxed max-w-2xl">
              {t("transform_your_binary_trading_platform_with")} <span className="text-violet-400 font-semibold">{`173+ ${tCommon('technical_indicators')}`}</span>,
              <span className="text-purple-400 font-semibold"> {`45+ ${tCommon('drawing_tools')}`}</span>, automated pattern recognition,
              and real-time binary order visualization - all powered by WebGL for blazing fast 60 FPS performance.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:min-w-[200px]">
            <Link href={extensionId ? `/admin/system/extension/${extensionId}` : "/admin/system/extension"}>
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 hover:from-violet-600 hover:via-purple-600 hover:to-indigo-600 text-white border-0 shadow-xl shadow-purple-500/30 gap-2 h-12"
              >
                <Gift className="w-5 h-5" />
                {tCommon("activate_license")}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                onClick={() => window.open("https://demo.mashdiv.com/en/binary", "_blank")}
              >
                <Play className="w-3 h-3 mr-1" /> {t("live_demo")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                onClick={() => window.open("https://docs.mashdiv.com/#chart-engine-installation", "_blank")}
              >
                <ExternalLink className="w-3 h-3 mr-1" /> Docs
              </Button>
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {highlightFeatures.map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 border border-white/10 hover:border-purple-500/40 transition-all duration-300"
            >
              <div className="flex items-center gap-2 mb-2">
                <feature.icon className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <span className="text-sm font-semibold text-white">{feature.label}</span>
              </div>
              <p className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">{feature.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Capabilities List */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 mb-6">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            {t("full_feature_set")}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {capabilities.map((cap, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom comparison bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-indigo-500/10 border border-purple-500/20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
              <span className="text-sm">{t("basic_tradingview")}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-400" />
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 shadow-lg shadow-purple-500/50" />
              <span className="text-sm font-semibold text-white">{tCommon("chart_engine_pro")}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
              <Check className="w-3 h-3 mr-1" /> {t("binary_optimized")}
            </Badge>
            <Badge variant="outline" className="border-violet-500/50 text-violet-400 bg-violet-500/10">
              <Zap className="w-3 h-3 mr-1" /> {t("n_48_811_lines")}
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// WARNINGS PANEL COMPONENT (Redesigned)
// ============================================================================

function WarningsPanel({ warnings }: { warnings: Warning[] }) {
  const t = useTranslations("dashboard_admin");
  const [isExpanded, setIsExpanded] = useState(false);

  const dangerCount = warnings.filter((w) => w.level === "danger").length;
  const warningCount = warnings.filter((w) => w.level === "warning").length;
  const infoCount = warnings.filter((w) => w.level === "info").length;

  // Sort warnings by severity
  const sortedWarnings = [...warnings].sort((a, b) => {
    const order = { danger: 0, warning: 1, info: 2 };
    return order[a.level] - order[b.level];
  });

  const getIcon = (level: Warning["level"]) => {
    switch (level) {
      case "danger":
        return AlertCircle;
      case "warning":
        return AlertTriangle;
      case "info":
        return Info;
    }
  };

  const getColors = (level: Warning["level"]) => {
    switch (level) {
      case "danger":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          text: "text-red-500",
          icon: "text-red-400",
          dot: "bg-red-500",
        };
      case "warning":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-500",
          icon: "text-amber-400",
          dot: "bg-amber-500",
        };
      case "info":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          text: "text-blue-500",
          icon: "text-blue-400",
          dot: "bg-blue-500",
        };
    }
  };

  const primaryLevel = dangerCount > 0 ? "danger" : warningCount > 0 ? "warning" : "info";
  const primaryColors = getColors(primaryLevel);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border overflow-hidden transition-all",
        primaryColors.border,
        primaryColors.bg
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", primaryColors.bg)}>
            {primaryLevel === "danger" ? (
              <AlertCircle className={cn("w-5 h-5", primaryColors.icon)} />
            ) : primaryLevel === "warning" ? (
              <AlertTriangle className={cn("w-5 h-5", primaryColors.icon)} />
            ) : (
              <Info className={cn("w-5 h-5", primaryColors.icon)} />
            )}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{t("configuration_issues")}</span>
              <span className="text-sm text-muted-foreground">
                ({warnings.length} {warnings.length === 1 ? "item" : "items"})
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {dangerCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-red-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {dangerCount} critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-amber-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {warningCount} warning
                </span>
              )}
              {infoCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-blue-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {infoCount} info
                </span>
              )}
            </div>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {sortedWarnings.map((warning, index) => {
                const colors = getColors(warning.level);
                const Icon = getIcon(warning.level);

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex gap-3 p-3 rounded-lg border bg-card",
                      colors.border
                    )}
                  >
                    <div className={cn("p-1.5 rounded-md h-fit", colors.bg)}>
                      <Icon className={cn("w-4 h-4", colors.icon)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{warning.category}</span>
                        {warning.field && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {warning.field}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{warning.message}</p>
                      {warning.suggestion && (
                        <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-muted/50">
                          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-xs text-muted-foreground">{warning.suggestion}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-4 transition-all",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-lg"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
          )}
        </div>
        <div className={cn("p-2 rounded-lg", color.replace("text-", "bg-").replace("500", "500/10"))}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// QUICK TOGGLE COMPONENT
// ============================================================================

function QuickToggle({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
  color,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  color: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-xl border transition-all",
      checked ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30",
      disabled && "opacity-50"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", color.replace("text-", "bg-").replace("500", "500/10"))}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

// ============================================================================
// SECTION CONTENT COMPONENTS
// ============================================================================

function OverviewSection({
  settings,
  updateSettings,
  isChartEngineLicensed,
  chartEngineExtId,
  onNavigate,
}: {
  settings: BinarySettings;
  updateSettings: (updater: (prev: BinarySettings) => BinarySettings) => void;
  isChartEngineLicensed: boolean;
  chartEngineExtId: string | null;
  onNavigate: (section: SectionId) => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const enabledOrderTypes = Object.values(settings.orderTypes).filter(t => t.enabled).length;
  const enabledDurations = settings.durations.filter(d => d.enabled).length;
  const avgProfit = Math.round(
    Object.values(settings.orderTypes)
      .filter(t => t.enabled)
      .reduce((sum, t) => sum + t.profitPercentage, 0) / Math.max(enabledOrderTypes, 1)
  );

  return (
    <div className="space-y-6">
      {/* Chart Engine Promo (if not licensed) */}
      {!isChartEngineLicensed && (
        <ChartEnginePromo extensionId={chartEngineExtId} />
      )}

      {/* Chart Engine Selection (if licensed) */}
      {isChartEngineLicensed && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t("chart_engine")}</CardTitle>
                <CardDescription>{t("select_which_chart_to_display_for_traders")}</CardDescription>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                <Unlock className="w-3 h-3 mr-1" /> Licensed
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Chart Engine Option */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => updateSettings((s) => ({
                  ...s,
                  display: { ...s.display, chartType: "CHART_ENGINE" },
                }))}
                className={cn(
                  "relative p-5 rounded-xl border-2 cursor-pointer transition-all",
                  settings.display?.chartType === "CHART_ENGINE"
                    ? "border-purple-500 bg-purple-500/5 shadow-lg shadow-purple-500/10"
                    : "border-border hover:border-purple-500/50"
                )}
              >
                {settings.display?.chartType === "CHART_ENGINE" && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{tCommon("chart_engine_pro")}</h3>
                    <p className="text-xs text-muted-foreground">{t("binary_optimized_trading")}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs">{t("order_markers")}</Badge>
                  <Badge variant="secondary" className="text-xs">{t("p_l_zones")}</Badge>
                  <Badge variant="secondary" className="text-xs">Signals</Badge>
                </div>
              </motion.div>

              {/* TradingView Option */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => updateSettings((s) => ({
                  ...s,
                  display: { ...s.display, chartType: "TRADINGVIEW" },
                }))}
                className={cn(
                  "relative p-5 rounded-xl border-2 cursor-pointer transition-all",
                  settings.display?.chartType === "TRADINGVIEW"
                    ? "border-teal-500 bg-teal-500/5 shadow-lg shadow-teal-500/10"
                    : "border-border hover:border-teal-500/50"
                )}
              >
                {settings.display?.chartType === "TRADINGVIEW" && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-teal-500/10">
                    <LineChart className="w-5 h-5 text-teal-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">TradingView</h3>
                    <p className="text-xs text-muted-foreground">{tCommon("industry_standard_charts")}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs">{tCommon("technical_analysis")}</Badge>
                  <Badge variant="secondary" className="text-xs">Indicators</Badge>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Power}
          label={t("trading_status")}
          value={settings.global.enabled ? "Active" : "Disabled"}
          subValue={settings.global.enabled ? "Accepting orders" : "Orders blocked"}
          color={settings.global.enabled ? "text-emerald-500" : "text-red-500"}
        />
        <StatCard
          icon={Layers}
          label={t("order_types")}
          value={`${enabledOrderTypes}/5`}
          subValue="types enabled"
          color="text-purple-500"
          onClick={() => onNavigate("orderTypes")}
        />
        <StatCard
          icon={Clock}
          label="Durations"
          value={enabledDurations}
          subValue="expiry options"
          color="text-cyan-500"
          onClick={() => onNavigate("durations")}
        />
        <StatCard
          icon={TrendingUp}
          label={t("avg_payout")}
          value={`${avgProfit}%`}
          subValue="profit rate"
          color="text-amber-500"
          onClick={() => onNavigate("optimizer")}
        />
      </div>

      {/* Quick Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tCommon("quick_settings")}</CardTitle>
          <CardDescription>{tCommon("essential_controls_at_a_glance")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cancellation Toggle */}
          <QuickToggle
            icon={XCircle}
            label={t("order_cancellation")}
            description={t("allow_traders_to_cancel_orders_early")}
            checked={settings.cancellation?.enabled ?? true}
            onCheckedChange={(checked) => updateSettings((s) => ({
              ...s,
              cancellation: { ...s.cancellation, enabled: checked },
            }))}
            color="text-orange-500"
          />

          <Separator />

          {/* Trading Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">{t("max_concurrent_orders")}</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={settings.global.maxConcurrentOrders}
                onChange={(e) => updateSettings((s) => ({
                  ...s,
                  global: { ...s.global, maxConcurrentOrders: parseInt(e.target.value) || 1 },
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("max_daily_orders")}</Label>
              <Input
                type="number"
                min={1}
                max={10000}
                value={settings.global.maxDailyOrders}
                onChange={(e) => updateSettings((s) => ({
                  ...s,
                  global: { ...s.global, maxDailyOrders: parseInt(e.target.value) || 1 },
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Cooldown (seconds)</Label>
              <Input
                type="number"
                min={0}
                max={300}
                value={settings.global.cooldownSeconds}
                onChange={(e) => updateSettings((s) => ({
                  ...s,
                  global: { ...s.global, cooldownSeconds: parseInt(e.target.value) || 0 },
                }))}
              />
            </div>
          </div>

          {/* Buffer Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Order Placement Buffer (sec)</Label>
              <Input
                type="number"
                min={5}
                max={300}
                value={settings.global.orderExpirationBuffer}
                onChange={(e) => updateSettings((s) => ({
                  ...s,
                  global: { ...s.global, orderExpirationBuffer: parseInt(e.target.value) || 30 },
                }))}
              />
              <p className="text-xs text-muted-foreground">{t("block_orders_within_this_time_of_expiry")}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Cancellation Buffer (sec)</Label>
              <Input
                type="number"
                min={10}
                max={600}
                value={settings.global.cancelExpirationBuffer}
                onChange={(e) => updateSettings((s) => ({
                  ...s,
                  global: { ...s.global, cancelExpirationBuffer: parseInt(e.target.value) || 60 },
                }))}
              />
              <p className="text-xs text-muted-foreground">{t("block_cancellations_within_this_time_of_expiry")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tCommon("configuration_sections")}</CardTitle>
          <CardDescription>{tCommon("navigate_to_detailed_settings")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SECTIONS.slice(1).map((section) => (
              <motion.button
                key={section.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate(section.id)}
                className={cn(
                  "flex flex-col items-start p-4 rounded-xl border transition-all text-left",
                  "hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                <div className={cn("p-2 rounded-lg mb-3", section.bgColor)}>
                  <section.icon className={cn("w-4 h-4", section.color)} />
                </div>
                <h4 className="text-sm font-medium">{section.label}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CancellationSection({
  settings,
  updateSettings,
}: {
  settings: BinarySettings;
  updateSettings: (updater: (prev: BinarySettings) => BinarySettings) => void;
}) {
  const t = useTranslations("dashboard_admin");
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t("early_cancellation_rules")}</CardTitle>
            <CardDescription>{t("configure_penalties_and_restrictions_for_order")}</CardDescription>
          </div>
          <Switch
            checked={settings.cancellation?.enabled ?? true}
            onCheckedChange={(checked) => updateSettings((s) => ({
              ...s,
              cancellation: { ...s.cancellation, enabled: checked },
            }))}
          />
        </div>
      </CardHeader>
      <CardContent>
        {settings.cancellation?.enabled ? (
          <div className="space-y-4">
            {(Object.keys(settings.cancellation.rules || {}) as Array<keyof typeof settings.cancellation.rules>).map(
              (orderType) => {
                const rule = settings.cancellation.rules[orderType];
                const typeLabel = ORDER_TYPE_LABELS[orderType];

                return (
                  <div key={orderType} className="p-4 rounded-xl bg-muted/30 border">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{typeLabel}</h3>
                        <Badge variant={rule?.enabled ? "default" : "secondary"}>
                          {rule?.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <Switch
                        checked={rule?.enabled ?? false}
                        onCheckedChange={(checked) =>
                          updateSettings((s) => ({
                            ...s,
                            cancellation: {
                              ...s.cancellation,
                              rules: {
                                ...s.cancellation.rules,
                                [orderType]: {
                                  ...s.cancellation.rules[orderType],
                                  enabled: checked,
                                },
                              },
                            },
                          }))
                        }
                      />
                    </div>

                    {rule?.enabled && (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Min Time Before Expiry (sec)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={300}
                            value={rule.minTimeBeforeExpirySeconds}
                            onChange={(e) =>
                              updateSettings((s) => ({
                                ...s,
                                cancellation: {
                                  ...s.cancellation,
                                  rules: {
                                    ...s.cancellation.rules,
                                    [orderType]: {
                                      ...s.cancellation.rules[orderType],
                                      minTimeBeforeExpirySeconds: parseInt(e.target.value) || 0,
                                    },
                                  },
                                },
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Penalty Percentage (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={rule.penaltyPercentage}
                            onChange={(e) =>
                              updateSettings((s) => ({
                                ...s,
                                cancellation: {
                                  ...s.cancellation,
                                  rules: {
                                    ...s.cancellation.rules,
                                    [orderType]: {
                                      ...s.cancellation.rules[orderType],
                                      penaltyPercentage: parseInt(e.target.value) || 0,
                                    },
                                  },
                                },
                              }))
                            }
                          />
                        </div>

                        {rule.penaltyByTimeRemaining && (
                          <>
                            <div className="space-y-2">
                              <Label className="text-sm">Penalty &gt;60s (%)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={rule.penaltyByTimeRemaining.above60Seconds}
                                onChange={(e) =>
                                  updateSettings((s) => ({
                                    ...s,
                                    cancellation: {
                                      ...s.cancellation,
                                      rules: {
                                        ...s.cancellation.rules,
                                        [orderType]: {
                                          ...s.cancellation.rules[orderType],
                                          penaltyByTimeRemaining: {
                                            ...s.cancellation.rules[orderType].penaltyByTimeRemaining!,
                                            above60Seconds: parseInt(e.target.value) || 0,
                                          },
                                        },
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Penalty 30-60s (%)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={rule.penaltyByTimeRemaining.above30Seconds}
                                onChange={(e) =>
                                  updateSettings((s) => ({
                                    ...s,
                                    cancellation: {
                                      ...s.cancellation,
                                      rules: {
                                        ...s.cancellation.rules,
                                        [orderType]: {
                                          ...s.cancellation.rules[orderType],
                                          penaltyByTimeRemaining: {
                                            ...s.cancellation.rules[orderType].penaltyByTimeRemaining!,
                                            above30Seconds: parseInt(e.target.value) || 0,
                                          },
                                        },
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Penalty &lt;30s (%)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={rule.penaltyByTimeRemaining.below30Seconds}
                                onChange={(e) =>
                                  updateSettings((s) => ({
                                    ...s,
                                    cancellation: {
                                      ...s.cancellation,
                                      rules: {
                                        ...s.cancellation.rules,
                                        [orderType]: {
                                          ...s.cancellation.rules[orderType],
                                          penaltyByTimeRemaining: {
                                            ...s.cancellation.rules[orderType].penaltyByTimeRemaining!,
                                            below30Seconds: parseInt(e.target.value) || 0,
                                          },
                                        },
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <XCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg">{t("cancellation_disabled")}</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {t("enable_cancellation_to_allow_traders_to")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RiskSection({
  settings,
  updateSettings,
}: {
  settings: BinarySettings;
  updateSettings: (updater: (prev: BinarySettings) => BinarySettings) => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{tCommon("risk_management")}</CardTitle>
        <CardDescription>{t("set_trading_limits_and_alerts_to")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          <div className="space-y-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              <h3 className="font-medium">{tCommon("loss_limits")}</h3>
            </div>
            <div className="space-y-2">
              <Label>Daily Loss Limit (trades)</Label>
              <Input
                type="number"
                min={0}
                value={settings.riskManagement.dailyLossLimit}
                onChange={(e) =>
                  updateSettings((s) => ({
                    ...s,
                    riskManagement: {
                      ...s.riskManagement,
                      dailyLossLimit: parseInt(e.target.value) || 0,
                    },
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("auto_pause_trading_after_this_many")}
              </p>
            </div>
          </div>

          <div className="space-y-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="font-medium">{t("win_rate_alert")}</h3>
            </div>
            <div className="space-y-2">
              <Label>Alert Threshold (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={settings.riskManagement.winRateAlert}
                onChange={(e) =>
                  updateSettings((s) => ({
                    ...s,
                    riskManagement: {
                      ...s.riskManagement,
                      winRateAlert: parseInt(e.target.value) || 0,
                    },
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("alert_admin_if_a_users_win")}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BinarySettingsClient() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  // State
  const [settings, setSettings] = useState<BinarySettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<BinarySettings | null>(null);
  const [binaryStatus, setBinaryStatus] = useState(true);
  const [binaryPracticeStatus, setBinaryPracticeStatus] = useState(true);
  const [originalBinaryStatus, setOriginalBinaryStatus] = useState(true);
  const [originalBinaryPracticeStatus, setOriginalBinaryPracticeStatus] = useState(true);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  // Extension license state
  const [isChartEngineLicensed, setIsChartEngineLicensed] = useState(false);
  const [chartEngineExtId, setChartEngineExtId] = useState<string | null>(null);
  const [isLoadingExtensions, setIsLoadingExtensions] = useState(true);

  // Fetch settings and extensions on mount
  useEffect(() => {
    fetchSettings();
    fetchPresets();
    fetchExtensions();
  }, []);

  const fetchExtensions = async () => {
    setIsLoadingExtensions(true);
    try {
      const { data, error } = await $fetch<{
        extensions: Array<{ id: string; name: string; licenseVerified: boolean; status: boolean }>;
      }>({
        url: "/api/admin/system/extension",
        method: "GET",
      });

      if (!error && data?.extensions) {
        const chartEngineExt = data.extensions.find((ext) => ext.name === "chart_engine");
        setIsChartEngineLicensed(chartEngineExt?.licenseVerified === true);
        setChartEngineExtId(chartEngineExt?.id ?? null);
      }
    } catch (err) {
      console.error("Failed to fetch extensions:", err);
      setIsChartEngineLicensed(false);
    } finally {
      setIsLoadingExtensions(false);
    }
  };

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch<BinarySettingsResponse & { binaryStatus: boolean; binaryPracticeStatus: boolean }>({
        url: "/api/admin/finance/binary/settings",
        method: "GET",
      });

      if (error) {
        toast.error("Failed to load settings");
        setSettings(DEFAULT_BINARY_SETTINGS);
        setOriginalSettings(DEFAULT_BINARY_SETTINGS);
        setBinaryStatus(true);
        setBinaryPracticeStatus(true);
        setOriginalBinaryStatus(true);
        setOriginalBinaryPracticeStatus(true);
        return;
      }

      if (data) {
        setSettings(data.settings);
        setOriginalSettings(cloneSettings(data.settings));
        setBinaryStatus(data.binaryStatus ?? true);
        setBinaryPracticeStatus(data.binaryPracticeStatus ?? true);
        setOriginalBinaryStatus(data.binaryStatus ?? true);
        setOriginalBinaryPracticeStatus(data.binaryPracticeStatus ?? true);
        setValidation(data.validation);
        setIsDefault(data.isDefault);
      }
    } catch (err) {
      toast.error("Failed to load settings");
      setSettings(DEFAULT_BINARY_SETTINGS);
      setOriginalSettings(DEFAULT_BINARY_SETTINGS);
      setBinaryStatus(true);
      setBinaryPracticeStatus(true);
      setOriginalBinaryStatus(true);
      setOriginalBinaryPracticeStatus(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPresets = async () => {
    try {
      const { data, error } = await $fetch<PresetsResponse>({
        url: "/api/admin/finance/binary/settings/presets",
        method: "GET",
      });

      if (!error && data) {
        setPresets(data.presets);
      }
    } catch (err) {
      console.error("Failed to fetch presets:", err);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const { data, error } = await $fetch<{
        success: boolean;
        message: string;
        settings: BinarySettings;
        validation: ValidationResult;
      }>({
        url: "/api/admin/finance/binary/settings",
        method: "PUT",
        body: {
          binaryStatus,
          binaryPracticeStatus,
          binarySettings: settings,
        },
      });

      if (error) {
        toast.error(typeof error === "string" ? error : "Failed to save settings");
        return;
      }

      if (data?.success) {
        toast.success(data.message || "Settings saved successfully");
        setOriginalSettings(cloneSettings(data.settings));
        setSettings(data.settings);
        setOriginalBinaryStatus(binaryStatus);
        setOriginalBinaryPracticeStatus(binaryPracticeStatus);
        setValidation(data.validation);
        setIsDefault(false);

        if (typeof window !== "undefined") {
          localStorage.setItem("binary_settings_updated", Date.now().toString());
          window.dispatchEvent(new StorageEvent("storage", {
            key: "binary_settings_updated",
            newValue: Date.now().toString(),
          }));
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setSettings(cloneSettings(originalSettings));
      setBinaryStatus(originalBinaryStatus);
      setBinaryPracticeStatus(originalBinaryPracticeStatus);
    }
  };

  const updateSettings = useCallback((updater: (prev: BinarySettings) => BinarySettings) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
  }, []);

  const hasChanges = (settings && originalSettings && settingsChanged(originalSettings, settings)) ||
                     binaryStatus !== originalBinaryStatus ||
                     binaryPracticeStatus !== originalBinaryPracticeStatus;

  // Loading state
  if (isLoading || isLoadingExtensions) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full blur-xl opacity-30 animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary relative" />
          </div>
          <p className="text-muted-foreground">{t("loading_binary_settings_ellipsis")}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-lg font-semibold mb-2">{tCommon("failed_to_load_settings")}</h2>
          <p className="text-muted-foreground mb-4">{t("something_went_wrong_while_loading_the_settings")}</p>
          <Button onClick={fetchSettings}>
            <RotateCcw className="w-4 h-4 mr-2" />
            {tCommon("try_again")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <Link href="/admin">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{t("binary_trading_settings")}</h1>
                  <p className="text-sm text-muted-foreground">{t("configure_your_binary_options_trading_platform")}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isDefault && (
                <Badge variant="outline" className="text-blue-500 border-blue-500">
                  {tCommon("using_defaults")}
                </Badge>
              )}
              {hasChanges && (
                <Badge variant="outline" className="text-amber-500 border-amber-500 animate-pulse">
                  {tCommon("unsaved_changes")}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* Master Toggles - Most Important Settings */}
        <div className="mb-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Power className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("master_controls")}</CardTitle>
                  <CardDescription>{t("primary_system_toggles_for_binary_trading")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Binary Trading Master Toggle */}
                <div className={cn(
                  "flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border transition-all",
                  binaryStatus ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/30"
                )}>
                  <div className="flex items-center gap-3 mb-3 sm:mb-0">
                    <div className={cn("p-2 rounded-lg", binaryStatus ? "bg-emerald-500/10" : "bg-muted")}>
                      <Power className={cn("w-5 h-5", binaryStatus ? "text-emerald-500" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t("binary_trading")}</p>
                      <p className="text-xs text-muted-foreground">{t("master_switch_for_all_binary_trading")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={binaryStatus}
                    onCheckedChange={setBinaryStatus}
                  />
                </div>

                {/* Practice Mode Toggle */}
                <div className={cn(
                  "flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border transition-all",
                  binaryPracticeStatus ? "border-blue-500/30 bg-blue-500/5" : "border-border bg-muted/30"
                )}>
                  <div className="flex items-center gap-3 mb-3 sm:mb-0">
                    <div className={cn("p-2 rounded-lg", binaryPracticeStatus ? "bg-blue-500/10" : "bg-muted")}>
                      <Play className={cn("w-5 h-5", binaryPracticeStatus ? "text-blue-500" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t("practice_mode")}</p>
                      <p className="text-xs text-muted-foreground">{t("enable_demo_trading_with_virtual_funds")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={binaryPracticeStatus}
                    onCheckedChange={setBinaryPracticeStatus}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warnings Panel */}
        {validation && validation.warnings.length > 0 && (
          <div className="mb-6">
            <WarningsPanel warnings={validation.warnings} />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="hidden lg:block lg:w-64 shrink-0">
            <div className="sticky top-24 space-y-2">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                    activeSection === section.id
                      ? "bg-primary/10 border border-primary/20 shadow-sm"
                      : "hover:bg-muted"
                  )}
                >
                  <div className={cn("p-2 rounded-lg", section.bgColor)}>
                    <section.icon className={cn("w-4 h-4", section.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", activeSection === section.id && "text-primary")}>
                      {section.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{section.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden w-full mb-4 overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 min-w-max pb-2">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all",
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <section.icon className="w-4 h-4" />
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeSection === "overview" && (
                  <OverviewSection
                    settings={settings}
                    updateSettings={updateSettings}
                    isChartEngineLicensed={isChartEngineLicensed}
                    chartEngineExtId={chartEngineExtId}
                    onNavigate={setActiveSection}
                  />
                )}

                {activeSection === "orderTypes" && (
                  <div className="space-y-4">
                    {(Object.keys(settings.orderTypes) as Array<keyof typeof settings.orderTypes>).map(
                      (type) => (
                        <OrderTypeCard
                          key={type}
                          type={type}
                          config={settings.orderTypes[type]}
                          icon={ORDER_TYPE_ICONS[type]}
                          label={ORDER_TYPE_LABELS[type]}
                          description={ORDER_TYPE_DESCRIPTIONS[type]}
                          onUpdate={(updates) =>
                            updateSettings((s) => ({
                              ...s,
                              orderTypes: {
                                ...s.orderTypes,
                                [type]: { ...s.orderTypes[type], ...updates },
                              },
                            }))
                          }
                        />
                      )
                    )}
                  </div>
                )}

                {activeSection === "barriers" && (
                  <BarrierLevelsEditor settings={settings} onUpdate={updateSettings} />
                )}

                {activeSection === "durations" && (
                  <DurationManager
                    durations={settings.durations}
                    orderTypes={settings.orderTypes}
                    onUpdate={(durations) => updateSettings((s) => ({ ...s, durations }))}
                  />
                )}

                {activeSection === "cancellation" && (
                  <CancellationSection settings={settings} updateSettings={updateSettings} />
                )}

                {activeSection === "risk" && (
                  <RiskSection settings={settings} updateSettings={updateSettings} />
                )}

                {activeSection === "optimizer" && (
                  <PayoutOptimizer
                    settings={settings}
                    onApplyOptimized={(optimized) => {
                      updateSettings((s) => ({
                        ...s,
                        ...optimized,
                        orderTypes: {
                          ...s.orderTypes,
                          ...(optimized.orderTypes || {}),
                        },
                        durations: optimized.durations || s.durations,
                      }));
                      toast.success("Optimized settings applied. Review and save to confirm.");
                    }}
                  />
                )}

                {activeSection === "presets" && (
                  <PresetSelector
                    presets={presets}
                    currentSettings={settings}
                    currentPreset={settings._preset}
                    onApply={(presetId) => {
                      const preset = presets.find((p) => p.id === presetId);
                      if (preset?.settings) {
                        setSettings(cloneSettings(preset.settings));
                        toast.success(`Applied "${preset.name}" preset`);
                      }
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floating Save Bar */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          >
            <div className="container py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-sm font-medium">{tCommon("you_have_unsaved_changes")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Discard
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving} className="min-w-32">
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {tCommon("save_changes")}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
