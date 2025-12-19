"use client";

import React, { useState } from "react";
import { $fetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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
  });

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
