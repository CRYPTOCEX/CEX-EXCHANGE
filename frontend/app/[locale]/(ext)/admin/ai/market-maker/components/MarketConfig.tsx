"use client";

import React, { useState } from "react";
import { $fetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { PriceMode, MarketBias, MarketPhase } from "../types";

interface MarketConfigProps {
  data: any;
  onRefresh: () => void;
}

// Convert aggression level (1-10) to enum
const getAggressionEnum = (level: number): string => {
  if (level <= 3) return "CONSERVATIVE";
  if (level <= 7) return "MODERATE";
  return "AGGRESSIVE";
};

// Convert enum back to level for slider
const getAggressionLevel = (aggression: string): number => {
  switch (aggression) {
    case "CONSERVATIVE": return 2;
    case "MODERATE": return 5;
    case "AGGRESSIVE": return 9;
    default: return 5;
  }
};

export const MarketConfig: React.FC<MarketConfigProps> = ({ data, onRefresh }) => {
  const t = useTranslations("ext_admin");
  const quoteCurrency = data.market?.pair || "";
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    targetPrice: data.targetPrice || "",
    priceRangeLow: data.priceRangeLow || "",
    priceRangeHigh: data.priceRangeHigh || "",
    aggressionLevel: typeof data.aggressionLevel === 'string'
      ? getAggressionLevel(data.aggressionLevel)
      : (data.aggressionLevel || 5),
    realLiquidityPercent: data.realLiquidityPercent || 50,
    maxDailyVolume: data.maxDailyVolume || "100000",
    volatilityPauseEnabled: data.volatilityPauseEnabled || false,
    volatilityThreshold: data.volatilityThreshold || 10,
    // Multi-Timeframe Volatility System
    priceMode: (data.priceMode || "AUTONOMOUS") as PriceMode,
    externalSymbol: data.externalSymbol || "",
    correlationStrength: data.correlationStrength || 50,
    marketBias: (data.marketBias || "NEUTRAL") as MarketBias,
    biasStrength: data.biasStrength || 50,
    baseVolatility: data.baseVolatility || 2.0,
    volatilityMultiplier: data.volatilityMultiplier || 1.0,
    momentumDecay: data.momentumDecay || 0.95,
  });

  const [forcePhaseLoading, setForcePhaseLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      await $fetch({
        url: `/api/admin/ai/market-maker/market/${data.id}`,
        method: "PUT",
        body: {
          targetPrice: Number(config.targetPrice),
          priceRangeLow: Number(config.priceRangeLow),
          priceRangeHigh: Number(config.priceRangeHigh),
          aggressionLevel: getAggressionEnum(Number(config.aggressionLevel)),
          realLiquidityPercent: Number(config.realLiquidityPercent),
          maxDailyVolume: Number(config.maxDailyVolume),
          volatilityPauseEnabled: config.volatilityPauseEnabled,
          volatilityThreshold: Number(config.volatilityThreshold),
        },
      });
      toast.success("Configuration saved successfully");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleBiasUpdate = async () => {
    try {
      setLoading(true);
      await $fetch({
        url: `/api/admin/ai/market-maker/market/${data.id}/bias`,
        method: "PUT",
        body: {
          marketBias: config.marketBias,
          biasStrength: Number(config.biasStrength),
        },
      });
      toast.success("Market bias updated successfully");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update market bias");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceModeUpdate = async () => {
    try {
      setLoading(true);
      await $fetch({
        url: `/api/admin/ai/market-maker/market/${data.id}/price-mode`,
        method: "PUT",
        body: {
          priceMode: config.priceMode,
          externalSymbol: config.externalSymbol || null,
          correlationStrength: Number(config.correlationStrength),
        },
      });
      toast.success("Price mode updated successfully");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update price mode");
    } finally {
      setLoading(false);
    }
  };

  const handleVolatilityUpdate = async () => {
    try {
      setLoading(true);
      await $fetch({
        url: `/api/admin/ai/market-maker/market/${data.id}/volatility`,
        method: "PUT",
        body: {
          baseVolatility: Number(config.baseVolatility),
          volatilityMultiplier: Number(config.volatilityMultiplier),
          momentumDecay: Number(config.momentumDecay),
        },
      });
      toast.success("Volatility settings updated successfully");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update volatility settings");
    } finally {
      setLoading(false);
    }
  };

  const handleForcePhase = async (targetPhase: MarketPhase) => {
    if (!confirm(`Are you sure you want to force transition to ${targetPhase} phase? This bypasses normal phase transition rules.`)) {
      return;
    }
    try {
      setForcePhaseLoading(true);
      await $fetch({
        url: `/api/admin/ai/market-maker/market/${data.id}/phase`,
        method: "POST",
        body: {
          targetPhase,
        },
      });
      toast.success(`Phase changed to ${targetPhase}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to force phase transition");
    } finally {
      setForcePhaseLoading(false);
    }
  };

  const handleResetDaily = async () => {
    if (!confirm("Are you sure you want to reset daily trade counts for all bots? This will allow bots to trade again if they've hit their daily limit.")) {
      return;
    }
    try {
      setLoading(true);
      const response = await $fetch({
        url: `/api/admin/ai/market-maker/market/${data.id}/reset-daily`,
        method: "POST",
      });
      toast.success(response.message || "Daily counts reset successfully");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to reset daily counts");
    } finally {
      setLoading(false);
    }
  };

  const handleTargetPriceUpdate = async () => {
    if (!config.targetPrice || Number(config.targetPrice) <= 0) {
      toast.error("Please enter a valid target price");
      return;
    }
    try {
      setLoading(true);
      await $fetch({
        url: `/api/admin/ai/market-maker/market/${data.id}/target`,
        method: "PUT",
        body: {
          targetPrice: Number(config.targetPrice),
        },
      });
      toast.success("Target price updated");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update target price");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Price Configuration */}
      <Card className="p-5 dark:border dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Icon icon="mdi:currency-usd" className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {t("price_configuration")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("set_the_target_price_and_trading_range")}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                label={`Target Price (${quoteCurrency || "Quote Currency"})`}
                type="number"
                value={config.targetPrice}
                onChange={(e) => setConfig({ ...config, targetPrice: e.target.value })}
                step="0.000001"
              />
            </div>
            <Button
              color="primary"
              onClick={handleTargetPriceUpdate}
              loading={loading}
            >
              <Icon icon="mdi:check" className="w-5 h-5 mr-1" />
              Update
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={`Price Range Low (${quoteCurrency || "Quote Currency"})`}
              type="number"
              value={config.priceRangeLow}
              onChange={(e) => setConfig({ ...config, priceRangeLow: e.target.value })}
              step="0.000001"
            />
            <Input
              label={`Price Range High (${quoteCurrency || "Quote Currency"})`}
              type="number"
              value={config.priceRangeHigh}
              onChange={(e) => setConfig({ ...config, priceRangeHigh: e.target.value })}
              step="0.000001"
            />
          </div>

          <div className="p-4 bg-muted dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon icon="mdi:information" className="w-5 h-5 text-blue-500" />
              <span>
                {t("trading_range")} {Number(config.priceRangeLow || 0).toFixed(6)} - {Number(config.priceRangeHigh || 0).toFixed(6)} {quoteCurrency}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Trading Configuration */}
      <Card className="p-5 dark:border dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Icon icon="mdi:tune" className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {t("trading_configuration")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("adjust_trading_behavior_and_limits")}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t("aggression_level")} {config.aggressionLevel} ({getAggressionEnum(config.aggressionLevel)})
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={config.aggressionLevel}
              onChange={(e) => setConfig({ ...config, aggressionLevel: Number(e.target.value) })}
              className="w-full h-2 bg-muted dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Conservative</span>
              <span>Aggressive</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t("real_liquidity")} {config.realLiquidityPercent}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.realLiquidityPercent}
              onChange={(e) => setConfig({ ...config, realLiquidityPercent: Number(e.target.value) })}
              className="w-full h-2 bg-muted dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>AI Only (Simulated)</span>
              <span>{t("fully_real_ecosystem")}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {config.realLiquidityPercent}% {t("of_orders_will_be_placed_as_real_ecosystem_orders")}{" "}
              {100 - config.realLiquidityPercent}% {t("will_be_ai_simulated_only")}
            </p>
          </div>

          <Input
            label={`Max Daily Volume (${quoteCurrency || "Quote Currency"})`}
            type="number"
            value={config.maxDailyVolume}
            onChange={(e) => setConfig({ ...config, maxDailyVolume: e.target.value })}
          />
        </div>
      </Card>

      {/* Safety Configuration */}
      <Card className="p-5 dark:border dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Icon icon="mdi:shield-check" className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {t("safety_configuration")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("configure_safety_limits_and_automatic_pauses")}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-slate-800/50 rounded-lg">
            <div>
              <p className="font-medium text-foreground">
                {t("volatility_pause")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("automatically_pause_trading_during_high_volatility")}
              </p>
            </div>
            <Switch
              checked={config.volatilityPauseEnabled}
              onChange={(checked) => setConfig({ ...config, volatilityPauseEnabled: checked })}
            />
          </div>

          {config.volatilityPauseEnabled && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                {t("volatility_threshold")} {config.volatilityThreshold}%
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={config.volatilityThreshold}
                onChange={(e) => setConfig({ ...config, volatilityThreshold: Number(e.target.value) })}
                className="w-full h-2 bg-muted dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {t("trading_will_pause_if_price_moves_more_than")} {config.volatilityThreshold}% {t("in_a_short_period")}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Market Phase Control */}
      <Card className="p-5 dark:border dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Icon icon="mdi:chart-timeline-variant" className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Market Phase Control
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage market cycles and phase transitions
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Current Phase Display */}
          {data.currentPhase && (
            <div className="p-4 bg-muted/50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    data.currentPhase === "MARKUP" ? "bg-green-500/20" :
                    data.currentPhase === "MARKDOWN" ? "bg-red-500/20" :
                    data.currentPhase === "ACCUMULATION" ? "bg-blue-500/20" :
                    "bg-amber-500/20"
                  }`}>
                    <Icon
                      icon={
                        data.currentPhase === "MARKUP" ? "mdi:trending-up" :
                        data.currentPhase === "MARKDOWN" ? "mdi:trending-down" :
                        "mdi:chart-line"
                      }
                      className={`w-5 h-5 ${
                        data.currentPhase === "MARKUP" ? "text-green-500" :
                        data.currentPhase === "MARKDOWN" ? "text-red-500" :
                        data.currentPhase === "ACCUMULATION" ? "text-blue-500" :
                        "text-amber-500"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Current Phase: {data.currentPhase}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.nextPhaseChangeAt && (
                        <>Next change: {new Date(data.nextPhaseChangeAt).toLocaleString()}</>
                      )}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  data.currentPhase === "MARKUP" ? "bg-green-500/20 text-green-600 dark:text-green-400" :
                  data.currentPhase === "MARKDOWN" ? "bg-red-500/20 text-red-600 dark:text-red-400" :
                  data.currentPhase === "ACCUMULATION" ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" :
                  "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                }`}>
                  {data.currentPhase === "ACCUMULATION" ? "Consolidation" :
                   data.currentPhase === "MARKUP" ? "Bull Run" :
                   data.currentPhase === "DISTRIBUTION" ? "Topping" :
                   "Bear Market"}
                </span>
              </div>
            </div>
          )}

          {/* Force Phase Transition */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              Force Phase Transition (Admin Override)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["ACCUMULATION", "MARKUP", "DISTRIBUTION", "MARKDOWN"] as MarketPhase[]).map((phase) => (
                <Button
                  key={phase}
                  variant={data.currentPhase === phase ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleForcePhase(phase)}
                  loading={forcePhaseLoading}
                  disabled={data.currentPhase === phase}
                  className={
                    phase === "MARKUP" ? "border-green-500/50 hover:bg-green-500/10" :
                    phase === "MARKDOWN" ? "border-red-500/50 hover:bg-red-500/10" :
                    phase === "ACCUMULATION" ? "border-blue-500/50 hover:bg-blue-500/10" :
                    "border-amber-500/50 hover:bg-amber-500/10"
                  }
                >
                  <Icon
                    icon={
                      phase === "MARKUP" ? "mdi:trending-up" :
                      phase === "MARKDOWN" ? "mdi:trending-down" :
                      phase === "ACCUMULATION" ? "mdi:consolidate" :
                      "mdi:chart-bell-curve"
                    }
                    className="w-4 h-4 mr-1"
                  />
                  {phase}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Warning: Forcing a phase transition bypasses normal market cycle rules.
            </p>
          </div>

          {/* Reset Daily Trade Counts */}
          <div className="pt-4 border-t border-border">
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              Bot Daily Limits
            </label>
            <div className="flex items-center justify-between p-4 bg-amber-500/10 dark:bg-amber-500/5 rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">Reset Daily Trade Counts</p>
                <p className="text-xs text-muted-foreground">
                  Use this if bots have hit their daily trade limit and you want them to continue trading.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDaily}
                loading={loading}
                className="border-amber-500/50 hover:bg-amber-500/10"
              >
                <Icon icon="mdi:refresh" className="w-4 h-4 mr-1" />
                Reset Limits
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Market Bias Configuration */}
      <Card className="p-5 dark:border dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Icon icon="mdi:compass" className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Market Bias
            </h3>
            <p className="text-sm text-muted-foreground">
              Guide market direction without direct control
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Bias Selection */}
          <div className="grid grid-cols-3 gap-2">
            {(["BULLISH", "NEUTRAL", "BEARISH"] as MarketBias[]).map((bias) => (
              <button
                key={bias}
                onClick={() => setConfig({ ...config, marketBias: bias })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  config.marketBias === bias
                    ? bias === "BULLISH" ? "border-green-500 bg-green-500/10" :
                      bias === "BEARISH" ? "border-red-500 bg-red-500/10" :
                      "border-gray-500 bg-gray-500/10"
                    : "border-muted hover:border-muted-foreground"
                }`}
              >
                <Icon
                  icon={
                    bias === "BULLISH" ? "mdi:trending-up" :
                    bias === "BEARISH" ? "mdi:trending-down" :
                    "mdi:minus"
                  }
                  className={`w-6 h-6 mx-auto mb-2 ${
                    bias === "BULLISH" ? "text-green-500" :
                    bias === "BEARISH" ? "text-red-500" :
                    "text-gray-500"
                  }`}
                />
                <p className={`text-sm font-medium text-center ${
                  config.marketBias === bias ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {bias}
                </p>
              </button>
            ))}
          </div>

          {/* Bias Strength */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Bias Strength: {config.biasStrength}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.biasStrength}
              onChange={(e) => setConfig({ ...config, biasStrength: Number(e.target.value) })}
              className="w-full h-2 bg-muted dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Subtle</span>
              <span>Strong Influence</span>
            </div>
          </div>

          <Button color="primary" onClick={handleBiasUpdate} loading={loading}>
            <Icon icon="mdi:check" className="w-5 h-5 mr-1" />
            Update Bias
          </Button>
        </div>
      </Card>

      {/* Price Mode Configuration */}
      <Card className="p-5 dark:border dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <Icon icon="mdi:earth" className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Price Mode
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure how prices are generated
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Price Mode Selection */}
          <div className="grid grid-cols-3 gap-2">
            {(["AUTONOMOUS", "HYBRID", "FOLLOW_EXTERNAL"] as PriceMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setConfig({ ...config, priceMode: mode })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  config.priceMode === mode
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-muted hover:border-muted-foreground"
                }`}
              >
                <Icon
                  icon={
                    mode === "AUTONOMOUS" ? "mdi:robot" :
                    mode === "FOLLOW_EXTERNAL" ? "mdi:earth" :
                    "mdi:shuffle-variant"
                  }
                  className={`w-6 h-6 mx-auto mb-2 ${
                    config.priceMode === mode ? "text-cyan-500" : "text-muted-foreground"
                  }`}
                />
                <p className={`text-sm font-medium text-center ${
                  config.priceMode === mode ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {mode === "FOLLOW_EXTERNAL" ? "Follow External" : mode}
                </p>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {mode === "AUTONOMOUS" ? "AI-driven" :
                   mode === "FOLLOW_EXTERNAL" ? "Track exchange" :
                   "Combined"}
                </p>
              </button>
            ))}
          </div>

          {/* External Symbol (shown for HYBRID and FOLLOW_EXTERNAL) */}
          {(config.priceMode === "HYBRID" || config.priceMode === "FOLLOW_EXTERNAL") && (
            <>
              <Input
                label="External Symbol (e.g., BTC/USDT)"
                value={config.externalSymbol}
                onChange={(e) => setConfig({ ...config, externalSymbol: e.target.value })}
                placeholder="BTC/USDT"
              />

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Correlation Strength: {config.correlationStrength}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.correlationStrength}
                  onChange={(e) => setConfig({ ...config, correlationStrength: Number(e.target.value) })}
                  className="w-full h-2 bg-muted dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Loose Follow</span>
                  <span>Tight Follow</span>
                </div>
              </div>
            </>
          )}

          <Button color="primary" onClick={handlePriceModeUpdate} loading={loading}>
            <Icon icon="mdi:check" className="w-5 h-5 mr-1" />
            Update Price Mode
          </Button>
        </div>
      </Card>

      {/* Volatility Settings */}
      <Card className="p-5 dark:border dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Icon icon="mdi:chart-bell-curve-cumulative" className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Volatility Settings
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure price movement characteristics
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Base Volatility */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Base Volatility: {config.baseVolatility}% daily
            </label>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.1"
              value={config.baseVolatility}
              onChange={(e) => setConfig({ ...config, baseVolatility: Number(e.target.value) })}
              className="w-full h-2 bg-muted dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Stable (0.5%)</span>
              <span>Volatile (10%)</span>
            </div>
          </div>

          {/* Volatility Multiplier */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Volatility Multiplier: {config.volatilityMultiplier}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={config.volatilityMultiplier}
              onChange={(e) => setConfig({ ...config, volatilityMultiplier: Number(e.target.value) })}
              className="w-full h-2 bg-muted dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Reduced (0.5x)</span>
              <span>Amplified (2x)</span>
            </div>
          </div>

          {/* Momentum Decay */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Momentum Decay: {config.momentumDecay}
            </label>
            <input
              type="range"
              min="0.8"
              max="0.99"
              step="0.01"
              value={config.momentumDecay}
              onChange={(e) => setConfig({ ...config, momentumDecay: Number(e.target.value) })}
              className="w-full h-2 bg-muted dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Fast Decay (0.8)</span>
              <span>Slow Decay (0.99)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Higher values mean momentum persists longer, creating more sustained trends.
            </p>
          </div>

          <Button color="primary" onClick={handleVolatilityUpdate} loading={loading}>
            <Icon icon="mdi:check" className="w-5 h-5 mr-1" />
            Update Volatility Settings
          </Button>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onRefresh}>
          <Icon icon="mdi:refresh" className="w-5 h-5 mr-1" />
          Reset
        </Button>
        <Button color="primary" onClick={handleSave} loading={loading}>
          <Icon icon="mdi:content-save" className="w-5 h-5 mr-1" />
          {t("save_all_changes")}
        </Button>
      </div>

      {/* Danger Zone */}
      <Card className="p-5 border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <Icon icon="mdi:alert-octagon" className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-red-600 dark:text-red-400">
              {t("danger_zone")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("irreversible_actions")}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-500/20 rounded-lg">
            <div>
              <p className="font-medium text-foreground">
                {t("delete_market_maker")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("permanently_remove_this_market_maker_and")}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirm("Are you sure you want to delete this market maker? This action cannot be undone.")) {
                  return;
                }
                try {
                  await $fetch({
                    url: `/api/admin/ai/market-maker/market/${data.id}`,
                    method: "DELETE",
                  });
                  toast.success("Market maker deleted");
                  window.location.href = "/admin/ai/market-maker/market";
                } catch (err: any) {
                  toast.error(err.message || "Failed to delete market maker");
                }
              }}
            >
              <Icon icon="mdi:delete" className="w-5 h-5 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MarketConfig;
