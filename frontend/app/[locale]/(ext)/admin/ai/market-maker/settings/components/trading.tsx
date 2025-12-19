"use client";

import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface TradingSettingsSectionProps {
  settings?: {
    TradingEnabled?: boolean;
    GlobalPauseEnabled?: boolean;
    MaintenanceMode?: boolean;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function TradingSettingsSection({
  settings = {},
  onUpdate,
}: TradingSettingsSectionProps) {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const safeSettings = {
    TradingEnabled: settings.TradingEnabled ?? true,
    GlobalPauseEnabled: settings.GlobalPauseEnabled ?? false,
    MaintenanceMode: settings.MaintenanceMode ?? false,
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Trading Switches */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">{t("enable_ai_market_maker")}</span>
              <p className="text-xs text-muted-foreground">
                {t("master_switch_for_all_ai_market_maker_operations")} {t("when_disabled_no_trading_activity_will_occur")}
              </p>
            </div>
            <Switch
              id="tradingEnabled"
              checked={safeSettings.TradingEnabled}
              onCheckedChange={(checked) => onUpdate("Enabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">{t("global_pause")}</span>
              <p className="text-xs text-muted-foreground">
                {t("pause_all_active_markets_without_stopping")}
              </p>
            </div>
            <Switch
              id="globalPauseEnabled"
              checked={safeSettings.GlobalPauseEnabled}
              onCheckedChange={(checked) => onUpdate("GlobalPauseEnabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">{tExt("maintenance_mode")}</span>
              <p className="text-xs text-muted-foreground">
                {t("enable_for_system_maintenance")} {t("this_will_stop_all_trading_and")}
              </p>
            </div>
            <Switch
              id="maintenanceMode"
              checked={safeSettings.MaintenanceMode}
              onCheckedChange={(checked) => onUpdate("MaintenanceMode", checked)}
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-info-500/10 border border-info-500/20 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="shrink-0">
              <svg className="w-5 h-5 text-info-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h5 className="text-sm font-medium text-info-700 dark:text-info-300">{t("settings_scope")}</h5>
              <p className="text-xs text-info-600 dark:text-info-400 mt-1">
                {t("these_are_global_trading_controls")} {t("individual_market_settings_spread_target_price")}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
