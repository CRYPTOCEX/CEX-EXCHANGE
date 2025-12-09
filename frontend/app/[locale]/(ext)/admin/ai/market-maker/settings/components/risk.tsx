"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "next-intl";

interface RiskSettingsSectionProps {
  settings?: {
    MinLiquidity?: number;
    MaxDailyLossPercent?: number;
    DefaultVolatilityThreshold?: number;
    StopLossEnabled?: boolean;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function RiskSettingsSection({
  settings = {},
  onUpdate,
}: RiskSettingsSectionProps) {
  const t = useTranslations("ext");
  const safeSettings = {
    MinLiquidity: settings.MinLiquidity ?? 100,
    MaxDailyLossPercent: settings.MaxDailyLossPercent ?? 5,
    DefaultVolatilityThreshold: settings.DefaultVolatilityThreshold ?? 10,
    StopLossEnabled: settings.StopLossEnabled ?? true,
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Stop Loss Toggle */}
        <div className="flex items-center justify-between border p-4 rounded-lg">
          <div className="space-y-0.5">
            <span className="text-sm font-medium">{t("enable_stop_loss_protection")}</span>
            <p className="text-xs text-muted-foreground">
              {t("automatically_pause_all_trading_when_daily")} {t("this_is_a_critical_safety_feature")}
            </p>
          </div>
          <Switch
            id="stopLossEnabled"
            checked={safeSettings.StopLossEnabled}
            onCheckedChange={(checked) => onUpdate("StopLossEnabled", checked)}
          />
        </div>

        {/* Liquidity Settings */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium mb-4">{t("liquidity_requirements")}</h4>
          <div className="space-y-2">
            <Label htmlFor="minLiquidity">{t("minimum_quote_balance")}</Label>
            <Input
              id="minLiquidity"
              type="number"
              value={safeSettings.MinLiquidity}
              onChange={(e) => onUpdate("MinLiquidity", Number(e.target.value))}
              placeholder="100"
              min="0"
              step="10"
            />
            <p className="text-xs text-muted-foreground">
              {t("minimum_quote_currency_balance_required_in")} {t("for_example_100_means_the_pool")}
            </p>
          </div>
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              <strong>{t("note")}</strong> {t("this_value_is_compared_directly_to")} {t("set_appropriately_based_on_your_markets")}
            </p>
          </div>
        </div>

        {/* Loss Limits */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium mb-4">{t("loss_limits")}</h4>
          <div className={`space-y-4 ${!safeSettings.StopLossEnabled ? "opacity-50" : ""}`}>
            <div className="flex justify-between items-center">
              <Label>{t("max_daily_loss_threshold")}</Label>
              <span className="text-sm font-medium text-warning-500">{safeSettings.MaxDailyLossPercent}%</span>
            </div>
            <Slider
              value={[safeSettings.MaxDailyLossPercent]}
              onValueChange={(value) => onUpdate("MaxDailyLossPercent", value[0])}
              max={20}
              min={1}
              step={1}
              disabled={!safeSettings.StopLossEnabled}
            />
            <p className="text-xs text-muted-foreground">
              {safeSettings.StopLossEnabled
                ? "All trading will automatically pause if daily losses exceed this percentage of total pool value (TVL)."
                : "Enable Stop Loss Protection above to activate this limit."}
            </p>
          </div>
        </div>

        {/* Volatility Settings */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium mb-4">{t("volatility_controls")}</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>{t("default_volatility_threshold")}</Label>
              <span className="text-sm font-medium">{safeSettings.DefaultVolatilityThreshold}%</span>
            </div>
            <Slider
              value={[safeSettings.DefaultVolatilityThreshold]}
              onValueChange={(value) => onUpdate("DefaultVolatilityThreshold", value[0])}
              max={50}
              min={1}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              {t("default_threshold_for_volatility_based_trading")} {t("when_price_volatility_exceeds_this_percentage")}
            </p>
          </div>
        </div>

        {/* Warning Box */}
        <div className="bg-warning-500/10 border border-warning-500/20 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="shrink-0">
              <svg className="w-5 h-5 text-warning-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h5 className="text-sm font-medium text-warning-700 dark:text-warning-300">{t("risk_warning")}</h5>
              <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">
                {t("adjusting_these_settings_affects_the_risk")} {t("lower_thresholds_provide_more_protection_but")} {t("higher_thresholds_allow_more_aggressive_trading")}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
