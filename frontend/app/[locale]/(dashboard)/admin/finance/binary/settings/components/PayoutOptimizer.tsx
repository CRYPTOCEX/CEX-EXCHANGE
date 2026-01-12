"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Zap,
  Target,
  Activity,
} from "lucide-react";
import type { BinarySettings } from "../types";
import { ORDER_TYPE_LABELS } from "../types";
import { useTranslations } from "next-intl";

interface PayoutOptimizerProps {
  settings: BinarySettings;
  onApplyOptimized: (optimizedSettings: Partial<BinarySettings>) => void;
}

interface OptimizationAnalysis {
  overallEdge: number;
  byDuration: { [minutes: number]: number };
  byOrderType: { [type: string]: number };
  analysis: string[];
  warnings: string[];
  recommendations: string[];
}

// Platform edge percentages by duration category
const PLATFORM_EDGE_BY_DURATION = {
  ULTRA_SHORT: 8,
  SHORT: 7,
  MEDIUM: 9,
  LONG: 10,
};

// Calculate break-even rate for a given payout
function calculateBreakEvenRate(payoutPercent: number): number {
  return 100 / (100 + payoutPercent);
}

// Calculate platform edge
function calculatePlatformEdge(payoutPercent: number): number {
  const breakEvenRate = calculateBreakEvenRate(payoutPercent);
  return (breakEvenRate - 0.5) * 100;
}

// Calculate optimal payout for a target break-even rate
function calculateOptimalPayout(breakEvenRate: number): number {
  if (breakEvenRate <= 0.5) return 100;
  if (breakEvenRate >= 1) return 0;
  const payout = (100 / breakEvenRate) - 100;
  return Math.round(payout * 10) / 10;
}

// Get duration category
function getDurationCategory(minutes: number): keyof typeof PLATFORM_EDGE_BY_DURATION {
  if (minutes <= 1) return "ULTRA_SHORT";
  if (minutes <= 5) return "SHORT";
  if (minutes <= 30) return "MEDIUM";
  return "LONG";
}

export function PayoutOptimizer({ settings, onApplyOptimized }: PayoutOptimizerProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [analysis, setAnalysis] = useState<OptimizationAnalysis | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Analyze current settings
  useEffect(() => {
    analyzeSettings();
  }, [settings]);

  const analyzeSettings = () => {
    setIsCalculating(true);

    // Calculate edges
    const byDuration: { [minutes: number]: number } = {};
    const byOrderType: { [type: string]: number } = {};
    const analysisMessages: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Calculate edge for each duration
    for (const duration of settings.durations.filter(d => d.enabled)) {
      const basePayout = settings.orderTypes.RISE_FALL.profitPercentage;
      const adjustment = duration.orderTypeOverrides?.["RISE_FALL"]?.profitAdjustment || 0;
      const effectivePayout = basePayout + (basePayout * adjustment / 100);
      byDuration[duration.minutes] = calculatePlatformEdge(effectivePayout);
    }

    // Calculate edge for each order type
    for (const [type, config] of Object.entries(settings.orderTypes)) {
      if (config.enabled) {
        byOrderType[type] = calculatePlatformEdge(config.profitPercentage);
      }
    }

    // Calculate weighted average
    const edges = Object.values(byOrderType).filter(e => !isNaN(e));
    const overallEdge = edges.length > 0
      ? edges.reduce((sum, e) => sum + e, 0) / edges.length
      : 0;

    // Generate analysis
    if (overallEdge < 5) {
      warnings.push(`Low platform edge (${overallEdge.toFixed(1)}%). Consider lowering payouts.`);
    } else if (overallEdge > 15) {
      warnings.push(`High platform edge (${overallEdge.toFixed(1)}%). May discourage traders.`);
    } else {
      analysisMessages.push(`Healthy platform edge of ${overallEdge.toFixed(1)}%`);
    }

    // Check for barrier abuse potential
    for (const [type, config] of Object.entries(settings.orderTypes)) {
      if (!config.enabled) continue;

      if ("barrierLevels" in config) {
        const barriers = (config as any).barrierLevels || [];
        for (const barrier of barriers) {
          if (barrier.enabled && barrier.distancePercent > 1 && barrier.profitPercent > 60) {
            warnings.push(
              `${ORDER_TYPE_LABELS[type as keyof typeof ORDER_TYPE_LABELS]}: Barrier "${barrier.label}" has abuse potential`
            );
            recommendations.push(
              `Reduce profit for barrier "${barrier.label}" to below 50%`
            );
          }
        }
      }
    }

    // Check duration payouts
    for (const duration of settings.durations.filter(d => d.enabled)) {
      const category = getDurationCategory(duration.minutes);
      const expectedEdge = PLATFORM_EDGE_BY_DURATION[category];
      const actualEdge = byDuration[duration.minutes] || 0;

      if (actualEdge < expectedEdge - 2) {
        recommendations.push(
          `${duration.minutes}min: Consider lowering payout (current edge: ${actualEdge.toFixed(1)}%, recommended: ${expectedEdge}%)`
        );
      }
    }

    if (warnings.length === 0) {
      analysisMessages.push("Settings appear balanced for platform profitability");
    }

    setAnalysis({
      overallEdge,
      byDuration,
      byOrderType,
      analysis: analysisMessages,
      warnings,
      recommendations,
    });

    setIsCalculating(false);
  };

  const generateOptimizedSettings = (): Partial<BinarySettings> => {
    const durationMinutes = [1, 2, 3, 5, 10, 15, 30, 60];

    // Calculate optimal RISE_FALL payout for 5-minute reference
    const referencePlatformEdge = PLATFORM_EDGE_BY_DURATION.SHORT;
    const referenceBreakEven = (50 + referencePlatformEdge) / 100;
    const optimalRiseFallPayout = calculateOptimalPayout(referenceBreakEven);

    // Generate optimized durations with adjustments
    const optimizedDurations = durationMinutes.map(minutes => {
      const category = getDurationCategory(minutes);
      const categoryEdge = PLATFORM_EDGE_BY_DURATION[category];
      const categoryBreakEven = (50 + categoryEdge) / 100;
      const categoryOptimalPayout = calculateOptimalPayout(categoryBreakEven);

      // Calculate adjustment relative to base (RISE_FALL)
      const adjustment = Math.round(((categoryOptimalPayout / optimalRiseFallPayout) - 1) * 100);

      return {
        id: `duration_${minutes}m`,
        minutes,
        enabled: settings.durations.find(d => d.minutes === minutes)?.enabled ?? true,
        orderTypeOverrides: {
          RISE_FALL: { enabled: true, profitAdjustment: adjustment },
          HIGHER_LOWER: { enabled: true, profitAdjustment: adjustment - 5 },
          TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: adjustment },
          CALL_PUT: { enabled: true, profitAdjustment: adjustment - 8 },
          TURBO: { enabled: minutes <= 5, profitAdjustment: adjustment - 10 },
        },
      };
    });

    return {
      orderTypes: {
        ...settings.orderTypes,
        RISE_FALL: {
          ...settings.orderTypes.RISE_FALL,
          profitPercentage: Math.round(optimalRiseFallPayout),
        },
        HIGHER_LOWER: {
          ...settings.orderTypes.HIGHER_LOWER,
          profitPercentage: Math.round(optimalRiseFallPayout * 0.95),
        },
        TOUCH_NO_TOUCH: {
          ...settings.orderTypes.TOUCH_NO_TOUCH,
          profitPercentage: Math.round(optimalRiseFallPayout * 1.1),
        },
        CALL_PUT: {
          ...settings.orderTypes.CALL_PUT,
          profitPercentage: Math.round(optimalRiseFallPayout * 0.92),
        },
        TURBO: {
          ...settings.orderTypes.TURBO,
          profitPercentage: Math.round(optimalRiseFallPayout * 0.9),
        },
      },
      durations: optimizedDurations,
    };
  };

  const handleApplyOptimized = () => {
    const optimized = generateOptimizedSettings();
    onApplyOptimized(optimized);
  };

  const getEdgeColor = (edge: number) => {
    if (edge < 5) return "text-red-500";
    if (edge > 12) return "text-yellow-500";
    return "text-emerald-500";
  };

  const getEdgeBgColor = (edge: number) => {
    if (edge < 5) return "bg-red-500";
    if (edge > 12) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calculator className="h-5 w-5 text-emerald-500" />
              {t("payout_optimizer")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t("analyze_and_optimize_your_binary_options")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={analyzeSettings}
            disabled={isCalculating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isCalculating ? "animate-spin" : ""}`} />
            {t("refresh_analysis")}
          </Button>
        </div>

        {analysis && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Overall Edge */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{t("platform_edge")}</span>
                <Badge variant="outline" className={getEdgeColor(analysis.overallEdge)}>
                  {analysis.overallEdge.toFixed(1)}%
                </Badge>
              </div>
              <Progress
                value={Math.min(100, analysis.overallEdge * 5)}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {analysis.overallEdge < 5
                  ? "Low - increase payouts"
                  : analysis.overallEdge > 12
                  ? "High - may deter traders"
                  : "Optimal range"}
              </p>
            </div>

            {/* Enabled Types */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{t("active_order_types")}</span>
                <Badge variant="secondary">
                  {Object.values(settings.orderTypes).filter(t => t.enabled).length} / 5
                </Badge>
              </div>
              <div className="flex gap-1 flex-wrap mt-2">
                {Object.entries(settings.orderTypes).map(([type, config]) => (
                  <Badge
                    key={type}
                    variant={config.enabled ? "default" : "outline"}
                    className={`text-xs ${!config.enabled ? "opacity-50" : ""}`}
                  >
                    {type.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Durations */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{t("active_durations")}</span>
                <Badge variant="secondary">
                  {settings.durations.filter(d => d.enabled).length}
                </Badge>
              </div>
              <div className="flex gap-1 flex-wrap mt-2">
                {settings.durations
                  .filter(d => d.enabled)
                  .map(d => (
                    <Badge key={d.id} variant="outline" className="text-xs">
                      {d.minutes}m
                    </Badge>
                  ))}
              </div>
            </div>

            {/* Health Score */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{t("health_score")}</span>
                <Badge
                  variant="outline"
                  className={
                    analysis.warnings.length === 0
                      ? "text-emerald-500"
                      : analysis.warnings.length <= 2
                      ? "text-yellow-500"
                      : "text-red-500"
                  }
                >
                  {analysis.warnings.length === 0
                    ? "Excellent"
                    : analysis.warnings.length <= 2
                    ? "Good"
                    : "Needs Attention"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {analysis.warnings.length === 0 ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {analysis.warnings.length} {tCommon("alerts")} {analysis.recommendations.length} suggestion(s)
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Edge by Order Type */}
      <Card className="p-6">
        <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {t("platform_edge_by_order_type")}
        </h3>
        {analysis && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(analysis.byOrderType).map(([type, edge]) => {
              const config = settings.orderTypes[type as keyof typeof settings.orderTypes];
              return (
                <div
                  key={type}
                  className="p-4 rounded-lg border bg-card flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{ORDER_TYPE_LABELS[type as keyof typeof ORDER_TYPE_LABELS]}</p>
                    <p className="text-sm text-muted-foreground">
                      {tCommon("payout")} {config.profitPercentage}%
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={getEdgeBgColor(edge)}>
                      {edge.toFixed(1)}% edge
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("break_even")} {calculateBreakEvenRate(config.profitPercentage).toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Edge by Duration */}
      <Card className="p-6">
        <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
          <Target className="h-4 w-4" />
          {t("platform_edge_by_duration")}
        </h3>
        {analysis && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left">Duration</th>
                  <th className="py-2 px-4 text-left">Category</th>
                  <th className="py-2 px-4 text-left">{t("current_edge")}</th>
                  <th className="py-2 px-4 text-left">{t("target_edge")}</th>
                  <th className="py-2 px-4 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analysis.byDuration).map(([minutes, edge]) => {
                  const category = getDurationCategory(parseInt(minutes));
                  const targetEdge = PLATFORM_EDGE_BY_DURATION[category];
                  const diff = edge - targetEdge;
                  return (
                    <tr key={minutes} className="border-b">
                      <td className="py-2 px-4 font-medium">{minutes}m</td>
                      <td className="py-2 px-4">{category.replace("_", " ")}</td>
                      <td className="py-2 px-4">
                        <Badge variant="outline" className={getEdgeColor(edge)}>
                          {edge.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-2 px-4 text-muted-foreground">{targetEdge}%</td>
                      <td className="py-2 px-4">
                        {Math.abs(diff) < 1 ? (
                          <span className="flex items-center gap-1 text-emerald-500">
                            <CheckCircle className="h-4 w-4" /> Optimal
                          </span>
                        ) : diff > 0 ? (
                          <span className="flex items-center gap-1 text-yellow-500">
                            <TrendingUp className="h-4 w-4" /> {diff.toFixed(1)}% high
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500">
                            <TrendingDown className="h-4 w-4" /> {Math.abs(diff).toFixed(1)}% low
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Warnings and Recommendations */}
      {analysis && (analysis.warnings.length > 0 || analysis.recommendations.length > 0) && (
        <Card className="p-6">
          <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            {t("warnings_recommendations")}
          </h3>
          <div className="space-y-4">
            {analysis.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-yellow-500">Warnings</h4>
                {analysis.warnings.map((warning, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
                  >
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span className="text-sm">{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {analysis.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-500">Recommendations</h4>
                {analysis.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20"
                  >
                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                    <span className="text-sm">{rec}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Apply Optimized Settings */}
      <Card className="p-6 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-md font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" />
              {t("auto_optimize_settings")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("apply_mathematically_optimized_payouts_based_on")}
            </p>
          </div>
          <Button onClick={handleApplyOptimized} className="bg-emerald-600 hover:bg-emerald-700">
            <Zap className="h-4 w-4 mr-2" />
            {t("apply_optimized_settings")}
          </Button>
        </div>
        <div className="mt-4 p-4 rounded-lg bg-muted/50">
          <h4 className="text-sm font-medium mb-2">{t("what_this_will_do")}</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Set RISE_FALL base payout to ~72% (7% platform edge)</li>
            <li>{t("adjust_other_order_types_based_on")}</li>
            <li>{t("configure_duration_based_profit_adjustments")}</li>
            <li>{t("optimize_barrier_level_payouts_for_fair")}</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
