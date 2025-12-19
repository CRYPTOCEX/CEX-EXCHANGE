"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface TradingSettingsProps {
  settings: {
    PlatformFeePercent: number;
    MaxCopyLatencyMs: number;
    EnableMarketOrders: boolean;
    EnableLimitOrders: boolean;
    EnableAutoRetry: boolean;
    MaxRetryAttempts: number;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function TradingSettingsSection({
  settings,
  onUpdate,
}: TradingSettingsProps) {
  const t = useTranslations("ext_admin");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("trading_settings")}</CardTitle>
        <CardDescription>
          {t("configure_trade_execution_and_fee_settings")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Platform Fee */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>{t("platform_fee_percentage")}</Label>
            <span className="text-sm font-medium">{settings.PlatformFeePercent}%</span>
          </div>
          <Slider
            value={[settings.PlatformFeePercent]}
            onValueChange={([value]) => onUpdate("PlatformFeePercent", value)}
            min={0}
            max={10}
            step={0.5}
          />
          <p className="text-xs text-muted-foreground">
            {t("platform_fee_charged_on_copy_trading_profits")}
          </p>
        </div>

        {/* Execution Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">{t("execution_settings")}</h4>

          <div className="space-y-2">
            <Label htmlFor="maxLatency">{t("max_copy_latency_ms")}</Label>
            <Input
              id="maxLatency"
              type="number"
              value={settings.MaxCopyLatencyMs}
              onChange={(e) => onUpdate("MaxCopyLatencyMs", parseInt(e.target.value) || 0)}
              min={100}
              max={30000}
            />
            <p className="text-xs text-muted-foreground">
              {t("maximum_acceptable_latency_for_copying_trades")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between border p-4 rounded-lg">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">{t("enable_market_orders")}</span>
                <p className="text-xs text-muted-foreground">
                  {t("allow_market_orders_for_copy_trading")}
                </p>
              </div>
              <Switch
                checked={settings.EnableMarketOrders}
                onCheckedChange={(checked) => onUpdate("EnableMarketOrders", checked)}
              />
            </div>

            <div className="flex items-center justify-between border p-4 rounded-lg">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">{t("enable_limit_orders")}</span>
                <p className="text-xs text-muted-foreground">
                  {t("allow_limit_orders_for_copy_trading")}
                </p>
              </div>
              <Switch
                checked={settings.EnableLimitOrders}
                onCheckedChange={(checked) => onUpdate("EnableLimitOrders", checked)}
              />
            </div>
          </div>
        </div>

        {/* Retry Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">{t("retry_settings")}</h4>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">{t("enable_auto_retry")}</span>
              <p className="text-xs text-muted-foreground">
                {t("automatically_retry_failed_copy_trades")}
              </p>
            </div>
            <Switch
              checked={settings.EnableAutoRetry}
              onCheckedChange={(checked) => onUpdate("EnableAutoRetry", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxRetry">{t("max_retry_attempts")}</Label>
            <Input
              id="maxRetry"
              type="number"
              value={settings.MaxRetryAttempts}
              onChange={(e) => onUpdate("MaxRetryAttempts", parseInt(e.target.value) || 0)}
              min={0}
              max={10}
              disabled={!settings.EnableAutoRetry}
            />
            <p className="text-xs text-muted-foreground">
              {t("maximum_number_of_retry_attempts_for_failed_trades")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
