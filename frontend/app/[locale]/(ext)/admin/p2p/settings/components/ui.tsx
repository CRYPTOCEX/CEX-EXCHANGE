"use client";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface P2PUISettingsSectionProps {
  settings?: {
    ShowRecentTrades?: boolean;
    ShowMarketTrends?: boolean;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function P2PUISettingsSection({
  settings = {},
  onUpdate,
}: P2PUISettingsSectionProps) {
  const t = useTranslations("ext");
  const safeSettings = {
    ShowRecentTrades: settings.ShowRecentTrades ?? true,
    ShowMarketTrends: settings.ShowMarketTrends ?? true,
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* UI Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">
                {t("show_recent_trades")}
              </span>
              <p className="text-xs text-muted-foreground">
                {t("display_recent_trades_marketplace_homepage")}.
              </p>
            </div>
            <Switch
              id="showRecentTrades"
              checked={safeSettings.ShowRecentTrades}
              onCheckedChange={(checked) =>
                onUpdate("ShowRecentTrades", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">
                {t("show_market_trends")}
              </span>
              <p className="text-xs text-muted-foreground">
                {t("display_market_trend_p2p_marketplace")}.
              </p>
            </div>
            <Switch
              id="showMarketTrends"
              checked={safeSettings.ShowMarketTrends}
              onCheckedChange={(checked) =>
                onUpdate("ShowMarketTrends", checked)
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
