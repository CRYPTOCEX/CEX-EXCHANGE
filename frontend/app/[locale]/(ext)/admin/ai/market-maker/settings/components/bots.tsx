"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface BotSettingsSectionProps {
  settings?: {
    MaxConcurrentBots?: number;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function BotSettingsSection({
  settings = {},
  onUpdate,
}: BotSettingsSectionProps) {
  const t = useTranslations("ext_admin");
  const safeSettings = {
    MaxConcurrentBots: settings.MaxConcurrentBots ?? 50,
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Bot Limits */}
        <div>
          <h4 className="text-sm font-medium mb-4">{t("global_bot_limits")}</h4>
          <div className="space-y-2">
            <Label htmlFor="maxConcurrentBots">{t("max_concurrent_markets")}</Label>
            <Input
              id="maxConcurrentBots"
              type="number"
              value={safeSettings.MaxConcurrentBots}
              onChange={(e) => onUpdate("MaxConcurrentBots", Number(e.target.value))}
              placeholder="50"
              min="1"
              max="1000"
            />
            <p className="text-xs text-muted-foreground">
              {t("maximum_number_of_ai_market_maker")} {t("each_market_has_its_own_bots")}
            </p>
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
              <h5 className="text-sm font-medium text-info-700 dark:text-info-300">{t("bot_configuration")}</h5>
              <p className="text-xs text-info-600 dark:text-info-400 mt-1">
                {t("individual_bot_settings")} {t("individual_bot_settings_count_personality_intervals")}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
