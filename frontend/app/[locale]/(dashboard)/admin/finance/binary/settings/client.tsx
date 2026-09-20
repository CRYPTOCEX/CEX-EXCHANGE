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
import { m, AnimatePresence } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";
/**
 * This page hand-rolled the settings frame instead of rendering `SettingsPage`,
 * so it did not move when the shared band was tightened and it sat a band's
 * height lower than every other settings screen. It cannot simply adopt the
 * component — its body is a bespoke editor (order-type cards, a barrier-level
 * grid, a duration manager, a preset selector), not a `FieldDefinition[]` — but
 * the FRAME is the same job, and these are the strings that define it.
 */
import {
  SETTINGS_BAND,
  SETTINGS_BAND_CONTROL,
  SETTINGS_BAND_INNER,
  SETTINGS_CONTAINER,
  SETTINGS_DESCRIPTION,
  SETTINGS_MARK,
  SETTINGS_MARK_ICON,
  SETTINGS_ROOT,
  SETTINGS_TITLE,
} from "@/components/admin/settings/layout";
/* Straight from `types`, not the `@/components/admin/settings` barrel — the
   barrel re-exports `SettingsPage` and its whole field/tab tree, none of which
   this page renders. */
import { DEFAULT_TAB_COLORS } from "@/components/admin/settings/types";

import type {
  BinarySettings,
  BinarySettingsResponse,
  OrderTypeConfig,
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
  { id: "overview", label: "Overview", icon: BarChart3, description: "Dashboard & quick settings", color: "text-primary", bgColor: "bg-primary/10" },
  { id: "orderTypes", label: "Order Types", icon: Layers, description: "Configure trading types", color: "text-primary", bgColor: "bg-primary/10" },
  { id: "barriers", label: "Barriers & Strikes", icon: Target, description: "Price levels & profits", color: "text-warning", bgColor: "bg-warning/10" },
  { id: "durations", label: "Durations", icon: Clock, description: "Expiry time options", color: "text-primary", bgColor: "bg-primary/10" },
  { id: "cancellation", label: "Cancellation", icon: XCircle, description: "Early exit rules", color: "text-warning", bgColor: "bg-warning/10" },
  { id: "risk", label: "Risk Controls", icon: Shield, description: "Limits & alerts", color: "text-destructive", bgColor: "bg-destructive/10" },
  { id: "optimizer", label: "Optimizer", icon: Calculator, description: "Payout analysis", color: "text-success", bgColor: "bg-success/10" },
  { id: "presets", label: "Presets", icon: Bookmark, description: "Quick templates", color: "text-primary", bgColor: "bg-primary/10" },
];

// ============================================================================
// CHART ENGINE PROMO COMPONENT
// ============================================================================

function ChartEnginePromo({ extensionId }: { extensionId: string | null }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const highlightFeatures = [
    { icon: LineChart, label: `225 ${tCommon('indicators')}`, value: "Technical analysis arsenal" },
    { icon: Brush, label: `132 ${tCommon('drawing_tools')}`, value: "Professional annotations" },
    { icon: Eye, label: `50+ ${tCommon('patterns')}`, value: "Auto candlestick detection" },
    { icon: Gauge, label: "Cached calculations", value: "A live tick recalculates nothing" },
    { icon: Target, label: tCommon("harmonic_patterns"), value: "Gartley, Butterfly, Bat, Crab" },
    { icon: Activity, label: t("signal_aggregation"), value: "Multi-indicator consensus" },
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
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-primary rounded-2xl" />

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "0.75s" }} />
      </div>

      {/* Inner content */}
      <div className="relative m-[2px] bg-linear-to-br from-surface-2/98 via-surface-2/95 to-background/98 rounded-xl p-4 sm:p-6 md:p-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Top row: Icon, Title, Badge, and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Left: Icon and Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-primary rounded-xl sm:rounded-2xl blur-xl opacity-60 animate-pulse" />
                <div className="relative p-3 sm:p-4 bg-primary rounded-xl sm:rounded-2xl shadow-lg shadow-primary/30">
                  <Sparkles className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                  {/* `text-foreground`, NOT `text-warning-foreground`.
                      `--warning-foreground` is the ink PAIRED WITH a warning
                      fill — the near-black that reads on the yellow chip beside
                      this heading. On the card's own dark surface it was
                      near-black on near-black, so the promo's title was
                      invisible in dark mode. The badge below is the correct use
                      of the pair: `bg-warning text-warning-foreground`. */}
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{t("chart_engine")}</h2>
                  <Badge className="bg-warning text-warning-foreground border-0 text-[10px] sm:text-xs font-semibold shadow-lg shadow-warning/20 whitespace-nowrap">
                    <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 fill-current" /> {t("pro_addon")}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm sm:text-base">{t("professional_trading_charts_advanced_technical_ana")}</p>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 sm:gap-3 sm:shrink-0 lg:min-w-[200px]">
              <Link href={extensionId ? `/admin/system/extension/${extensionId}` : "/admin/system/extension"} className="w-full sm:w-auto lg:w-full">
                <Button
                  size="lg"
                  className="w-full bg-primary hover:bg-primary text-primary-foreground border-0 shadow-xl shadow-primary/30 gap-2 h-10 sm:h-12 text-sm sm:text-base"
                >
                  <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
                  {tCommon("activate_license")}
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </Link>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => window.open("https://demo.mashdiv.com/en/binary", "_blank")}
                >
                  <Play className="w-3 h-3 mr-1" /> {t("live_demo")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => window.open("https://docs.mashdiv.com/#chart-engine-installation", "_blank")}
                >
                  <ExternalLink className="w-3 h-3 mr-1" /> Docs
                </Button>
              </div>
            </div>
          </div>

          {/* Description text */}
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl">
            {t("transform_your_binary_trading_platform_with")} <span className="text-primary font-semibold">{`225 ${tCommon('technical_indicators')}`}</span>,
            <span className="text-primary font-semibold"> {`132 ${tCommon('drawing_tools')}`}</span>, automated pattern recognition,
            and real-time binary order visualization.
          </p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {highlightFeatures.map((feature, i) => (
            <m.div
              key={feature.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative p-3 sm:p-4 rounded-lg sm:rounded-xl bg-surface-2 hover:bg-surface-3 border border-border hover:border-primary/40 transition-all duration-300"
            >
              {/* `items-start` + wrapping, not `items-center` + `truncate`.
                  The label IS the feature being sold, and at six columns three
                  of the six were cut mid-word — "45+ Drawing …", "Harmonic
                  Pa…", "Signal Aggre…". A grid row equalises its cells, so a
                  label that takes two lines costs nothing but the row height
                  the longest tile already sets. */}
              <div className="flex items-start gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <feature.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{feature.label}</span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-muted-foreground transition-colors line-clamp-2">{feature.value}</p>
            </m.div>
          ))}
        </div>

        {/* Capabilities List */}
        <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-surface-2 border border-border mb-4 sm:mb-6">
          <h4 className="text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-3 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            {t("full_feature_set")}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
            {capabilities.map((cap, i) => (
              <div key={i} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <Check className="w-3 h-3 text-success shrink-0 mt-0.5" />
                <span className="leading-tight">{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom comparison bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-muted" />
              <span className="text-xs sm:text-sm">{t("basic_tradingview")}</span>
            </div>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary shadow-lg shadow-primary/50" />
              {/* Same defect as the heading above, other token: this row sits
                  on `bg-primary/10`, a TINT, and `--primary-foreground` is the
                  ink for a SOLID primary fill. `text-primary` is the ink a
                  primary tint takes. */}
              <span className="text-xs sm:text-sm font-semibold text-primary">{tCommon("chart_engine_pro")}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Badge variant="outline" className="border-success/50 text-success-ink bg-success/10 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
              <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" /> {t("binary_optimized")}
            </Badge>
            <Badge variant="outline" className="border-primary/50 text-primary-ink bg-primary/10 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
              <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" /> 48,811 Lines
            </Badge>
          </div>
        </div>
      </div>
    </m.div>
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
          bg: "bg-destructive/10",
          border: "border-destructive/30",
          text: "text-destructive",
          icon: "text-destructive",
          dot: "bg-destructive",
        };
      case "warning":
        return {
          bg: "bg-warning/10",
          border: "border-warning/30",
          text: "text-warning",
          icon: "text-warning",
          dot: "bg-warning",
        };
      case "info":
        return {
          bg: "bg-primary/10",
          border: "border-primary/30",
          text: "text-primary",
          icon: "text-primary",
          dot: "bg-primary",
        };
    }
  };

  const primaryLevel = dangerCount > 0 ? "danger" : warningCount > 0 ? "warning" : "info";
  const primaryColors = getColors(primaryLevel);

  return (
    <m.div
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
        className="w-full flex items-center justify-between p-4 hover:bg-foreground/5 transition-colors"
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
                <span className="flex items-center gap-1.5 text-xs text-destructive">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {dangerCount} critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-warning">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                  {warningCount} warning
                </span>
              )}
              {infoCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {infoCount} info
                </span>
              )}
            </div>
          </div>
        </div>
        <m.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </m.div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <m.div
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
                  <m.div
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
                          <Lightbulb className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                          <span className="text-xs text-muted-foreground">{warning.suggestion}</span>
                        </div>
                      )}
                    </div>
                  </m.div>
                );
              })}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
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

/**
 * The overview tab, rendered in BOTH states.
 *
 * `settings` is nullable here on purpose. Everything this section draws — the
 * card frames, the four KPI labels and their icons, the "Quick Settings" field
 * labels and captions, the whole navigation grid — is knowable before the fetch
 * resolves, so it paints on the first frame and never moves. Only the four
 * FIGURES and the field values wait, and they wait inside the elements that
 * will carry them (`StatsCard`'s own `loading`, and a disabled `Input` whose
 * box is a fixed height either way).
 *
 * The alternative this replaces returned a full-viewport spinner from the page
 * component, so the entire layout — sticky header, master toggles, sidebar,
 * this section — arrived at once as shift.
 */
function OverviewSection({
  settings,
  loading,
  updateSettings,
  isChartEngineLicensed,
  chartEngineExtId,
  onNavigate,
}: {
  settings: BinarySettings | null;
  loading: boolean;
  updateSettings: (updater: (prev: BinarySettings) => BinarySettings) => void;
  isChartEngineLicensed: boolean;
  chartEngineExtId: string | null;
  onNavigate: (section: SectionId) => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const orderTypeConfigs: OrderTypeConfig[] = settings
    ? Object.values(settings.orderTypes)
    : [];
  const enabledOrderTypes = orderTypeConfigs.filter((c) => c.enabled).length;
  const enabledDurations = (settings?.durations ?? []).filter(d => d.enabled).length;
  const avgProfit = Math.round(
    orderTypeConfigs
      .filter((c) => c.enabled)
      .reduce((sum, c) => sum + c.profitPercentage, 0) / Math.max(enabledOrderTypes, 1)
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
              <Badge tone="success" appearance="soft">
                <Unlock className="w-3 h-3 mr-1" /> Licensed
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Chart Engine Option */}
              <m.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => updateSettings((s) => ({
                  ...s,
                  display: { ...s.display, chartType: "CHART_ENGINE" },
                }))}
                className={cn(
                  "relative p-5 rounded-xl border-2 cursor-pointer transition-all",
                  settings?.display?.chartType === "CHART_ENGINE"
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                {settings?.display?.chartType === "CHART_ENGINE" && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
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
              </m.div>

              {/* TradingView Option */}
              <m.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => updateSettings((s) => ({
                  ...s,
                  display: { ...s.display, chartType: "TRADINGVIEW" },
                }))}
                className={cn(
                  "relative p-5 rounded-xl border-2 cursor-pointer transition-all",
                  settings?.display?.chartType === "TRADINGVIEW"
                    ? "border-success bg-success/5 shadow-lg shadow-success/10"
                    : "border-border hover:border-success/50"
                )}
              >
                {settings?.display?.chartType === "TRADINGVIEW" && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                      <Check className="w-4 h-4 text-success-foreground" />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <LineChart className="w-5 h-5 text-success" />
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
              </m.div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid — the grid, the four cards and their captions render in
          both states; `StatsCard` swaps only the figure for a text-measured
          placeholder, so the row's height is produced by the same layout in
          both passes. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Power}
          label={t("trading_status")}
          value={settings?.global.enabled ? "Active" : "Disabled"}
          /* The caption is DERIVED from the value, so while the value is
             unknown the caption has to be too — printing "Orders blocked"
             under a pending figure states the opposite of what may land. It
             still occupies the row, which is what stops the card resizing. */
          description={
            loading
              ? t("master_switch")
              : settings?.global.enabled
                ? t("accepting_orders")
                : t("orders_blocked")
          }
          {...(loading
            ? statsCardColors.neutral
            : settings?.global.enabled
              ? statsCardColors.success
              : statsCardColors.red)}
          loading={loading}
          index={0}
        />
        <StatsCard
          icon={Layers}
          label={t("order_types")}
          value={`${enabledOrderTypes}/5`}
          description={t("types_enabled")}
          {...statsCardColors.primary}
          loading={loading}
          index={1}
          onClick={() => onNavigate("orderTypes")}
        />
        <StatsCard
          icon={Clock}
          label="Durations"
          value={enabledDurations}
          description={t("expiry_options")}
          {...statsCardColors.primary}
          loading={loading}
          index={2}
          onClick={() => onNavigate("durations")}
        />
        <StatsCard
          icon={TrendingUp}
          label={t("avg_payout")}
          value={`${avgProfit}%`}
          description={tCommon("profit_rate")}
          {...statsCardColors.warning}
          loading={loading}
          index={3}
          onClick={() => onNavigate("optimizer")}
        />
      </div>

      {/* Quick Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tCommon("quick_settings")}</CardTitle>
          <CardDescription>{tCommon("essential_controls_at_a_glance")}</CardDescription>
        </CardHeader>
        {/*
          The FIELDS are the values on a settings page, so the pending state is
          the real form, disabled — not a spinner where the form will be. Every
          `Input` here is a fixed-height box whatever it contains, so an empty
          disabled field and a filled one occupy exactly the same space; the
          labels and the captions under them are static strings we already
          have. Blank rather than pre-filled with a default, because a number
          the operator can read is a claim about what is saved.
        */}
        <CardContent className="space-y-4">
          {/* Cancellation Toggle */}
          <QuickToggle
            icon={XCircle}
            label={t("order_cancellation")}
            description={t("allow_traders_to_cancel_orders_early")}
            checked={settings?.cancellation?.enabled ?? true}
            onCheckedChange={(checked) => updateSettings((s) => ({
              ...s,
              cancellation: { ...s.cancellation, enabled: checked },
            }))}
            color="text-warning"
            disabled={loading}
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
                disabled={loading}
                value={settings?.global.maxConcurrentOrders ?? ""}
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
                disabled={loading}
                value={settings?.global.maxDailyOrders ?? ""}
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
                disabled={loading}
                value={settings?.global.cooldownSeconds ?? ""}
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
                disabled={loading}
                value={settings?.global.orderExpirationBuffer ?? ""}
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
                disabled={loading}
                value={settings?.global.cancelExpirationBuffer ?? ""}
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
              <m.button
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
              </m.button>
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
  const tCommon = useTranslations("common");
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
                          {rule?.enabled ? tCommon("enabled") : tCommon("disabled")}
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
          <div className="space-y-4 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
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

          <div className="space-y-4 p-4 rounded-xl bg-warning/5 border border-warning/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" />
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
        extensions: Array<{ id: string; productId: string; name: string; licenseVerified: boolean; status: boolean }>;
      }>({
        url: "/api/admin/system/extension",
        method: "GET",
      });

      if (!error && data?.extensions) {
        const chartEngineExt = data.extensions.find((ext) => ext.name === "chart_engine");
        setIsChartEngineLicensed(chartEngineExt?.licenseVerified === true);
        // the extension detail route resolves by productId, not the DB row id
        setChartEngineExtId(chartEngineExt?.productId ?? null);
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
        toast.error(tCommon("failed_to_load_settings"));
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
      toast.error(tCommon("failed_to_load_settings"));
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
        toast.error(typeof error === "string" ? error : t("failed_to_save_settings"));
        return;
      }

      if (data?.success) {
        toast.success(data.message || tCommon("settings_saved_successfully"));
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
      toast.error(err.message || t("failed_to_save_settings"));
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

  /**
   * PENDING AND FAILED ARE DIFFERENT, AND NEITHER IS A DIFFERENT PAGE.
   * ==========================================================================
   *
   * What used to be here were two `if (...) return <div className="min-h-[60vh]
   * flex items-center justify-center">` bail-outs: one for the fetch being in
   * flight (a `Loader2` over a blurred pulse) and one for it having failed.
   * Both threw away the whole layout — the sticky header with the page title,
   * the master on/off toggles, the eight-item section rail, the section body —
   * and put a 60vh centred box in its place. That is the single largest shift
   * this file can produce, and it fires on EVERY visit: the operator watches a
   * spinner, then the entire settings surface materialises around it and
   * everything reflows at once. The scanner scored it 54, its full-viewport
   * multiplier included, and only two files in the app scored higher.
   *
   * Neither bail-out was needed. Every piece of chrome above is knowable
   * before the request resolves, and the one thing that is not — the saved
   * values — belongs to controls whose boxes do not depend on their contents.
   * So the page renders once and only the values wait.
   *
   * The two states are also kept apart, because they are not the same claim:
   * `pending` says "we do not know yet" and stays quiet, while `loadFailed`
   * says "we asked and it did not work" and needs to say so. The old
   * `if (!settings)` could not tell them apart at all — it was only ever
   * reached because the loading branch above returned first.
   */
  const pending = isLoading || isLoadingExtensions;
  const loadFailed = !pending && !settings;

  return (
    /* `pb-24` on top of the shared root: this page's floating save bar is
       `fixed bottom-0` and full-width, so the last card needs to clear it. */
    <div className={cn(SETTINGS_ROOT, "pb-24")}>
      {/* Hero band */}
      {/* Was `sticky top-0 z-40` under a `fixed top-0 z-50` header, so the
          moment you scrolled the band slid UNDER the header and the title
          disappeared — `top-0` is the viewport top, which is where the header
          already is. The fix is not `top-header`: none of the other seventeen
          settings pages sticks its band, and the two badges this one was
          keeping on screen say "unsaved changes", which the floating save bar
          below already says while it is the thing you would reach for. */}
      <div className={SETTINGS_BAND}>
        <div className={SETTINGS_BAND_INNER}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6">
            <div className="flex items-center gap-3">
              {/* Back Button */}
              {/* `asChild`, not a <Link> wrapping a <Button>: a button inside
                  an anchor is invalid markup and leaves the anchor unstyled,
                  so only the inner box is clickable. Same note as
                  `SettingsPage`. */}
              <Button
                asChild
                variant="ghost"
                size="icon"
                className={cn(
                  "shrink-0 w-9 rounded-lg hover:bg-muted",
                  SETTINGS_BAND_CONTROL
                )}
              >
                <Link href="/admin" aria-label={tCommon("back")}>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>

              {/* The mark takes the accent tint recipe, not a solid `bg-primary`
                  fill — see the R3 note in `SettingsPage`. */}
              <div
                className={cn(
                  SETTINGS_MARK,
                  DEFAULT_TAB_COLORS.general.bg,
                  DEFAULT_TAB_COLORS.general.border
                )}
              >
                <Settings
                  className={cn(
                    SETTINGS_MARK_ICON,
                    DEFAULT_TAB_COLORS.general.text
                  )}
                />
              </div>

              <div className="min-w-0">
                <h1 className={SETTINGS_TITLE}>{t("binary_trading_settings")}</h1>
                <p className={SETTINGS_DESCRIPTION}>
                  {t("configure_your_binary_options_trading_platform")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isDefault && (
                <Badge variant="outline" className="text-primary border-primary">
                  {tCommon("using_defaults")}
                </Badge>
              )}
              {hasChanges && (
                <Badge variant="outline" className="text-warning border-warning animate-pulse">
                  {tCommon("unsaved_changes")}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={SETTINGS_CONTAINER}>
        {/* Master Toggles - Most Important Settings */}
        <div className="mb-6">
          <Card className="border-primary/20 bg-linear-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success">
                  {/* `text-success-foreground` to match the fill. It was
                      `text-primary-foreground`, which survives only while both
                      tokens happen to resolve to the same white — it breaks the
                      moment a palette gives primary and success different ink. */}
                  <Power className="w-5 h-5 text-success-foreground" />
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
                  binaryStatus ? "border-success/30 bg-success/5" : "border-border bg-muted/30"
                )}>
                  <div className="flex items-center gap-3 mb-3 sm:mb-0">
                    <div className={cn("p-2 rounded-lg", binaryStatus ? "bg-success/10" : "bg-muted")}>
                      <Power className={cn("w-5 h-5", binaryStatus ? "text-success" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t("binary_trading")}</p>
                      <p className="text-xs text-muted-foreground">{t("master_switch_for_all_binary_trading")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={binaryStatus}
                    onCheckedChange={setBinaryStatus}
                    disabled={pending}
                  />
                </div>

                {/* Practice Mode Toggle */}
                <div className={cn(
                  "flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border transition-all",
                  binaryPracticeStatus ? "border-info/30 bg-info/10" : "border-border bg-muted/30"
                )}>
                  <div className="flex items-center gap-3 mb-3 sm:mb-0">
                    <div className={cn("p-2 rounded-lg", binaryPracticeStatus ? "bg-primary/10" : "bg-muted")}>
                      <Play className={cn("w-5 h-5", binaryPracticeStatus ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{tCommon("practice_mode")}</p>
                      <p className="text-xs text-muted-foreground">{t("enable_demo_trading_with_virtual_funds")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={binaryPracticeStatus}
                    onCheckedChange={setBinaryPracticeStatus}
                    disabled={pending}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/*
          The failure notice, IN the page rather than instead of it.

          It reads as a banner in the same column as the warnings panel below,
          which is where this page already puts "something about your config
          needs attention". The retry button is the same one the old
          full-viewport error screen had, so nothing an operator could do
          before has been taken away — it just no longer costs them the header,
          the master switches and the section rail to see it.
        */}
        {loadFailed && (
          <div className="mb-6">
            <Card tone="destructive" padding="md" className="border-destructive/30 bg-destructive/5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                  <div className="min-w-0">
                    <p className="font-semibold">{tCommon("failed_to_load_settings")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("something_went_wrong_while_loading_the_settings")}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSettings}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {tCommon("try_again")}
                </Button>
              </div>
            </Card>
          </div>
        )}

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
              <m.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Overview is the section the page opens on, so it is the one
                    that has to exist before the data does — it takes `loading`
                    and renders its own frame. The seven sections below are
                    reachable only by clicking the rail, which cannot happen
                    before the first paint, so they simply wait for `settings`
                    rather than each growing a pending state of their own. */}
                {activeSection === "overview" && (
                  <OverviewSection
                    settings={settings}
                    loading={pending}
                    updateSettings={updateSettings}
                    isChartEngineLicensed={isChartEngineLicensed}
                    chartEngineExtId={chartEngineExtId}
                    onNavigate={setActiveSection}
                  />
                )}

                {activeSection === "orderTypes" && settings && (
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

                {activeSection === "barriers" && settings && (
                  <BarrierLevelsEditor settings={settings} onUpdate={updateSettings} />
                )}

                {activeSection === "durations" && settings && (
                  <DurationManager
                    durations={settings.durations}
                    orderTypes={settings.orderTypes}
                    onUpdate={(durations) => updateSettings((s) => ({ ...s, durations }))}
                  />
                )}

                {activeSection === "cancellation" && settings && (
                  <CancellationSection settings={settings} updateSettings={updateSettings} />
                )}

                {activeSection === "risk" && settings && (
                  <RiskSection settings={settings} updateSettings={updateSettings} />
                )}

                {activeSection === "optimizer" && settings && (
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
                      toast.success(t("optimized_settings_applied_review_and_save"));
                    }}
                  />
                )}

                {activeSection === "presets" && settings && (
                  <PresetSelector
                    presets={presets}
                    currentSettings={settings}
                    currentPreset={settings._preset}
                    onApply={(presetId) => {
                      const preset = presets.find((p) => p.id === presetId);
                      if (preset?.settings) {
                        setSettings(cloneSettings(preset.settings));
                        toast.success(t("applied_preset", { name: String(preset.name) }));
                      }
                    }}
                  />
                )}
              </m.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floating Save Bar */}
      <AnimatePresence>
        {hasChanges && (
          <m.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          >
            <div className="container py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
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
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
