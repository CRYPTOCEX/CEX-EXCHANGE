"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface RiskSettingsProps {
  settings: {
    MaxDailyLossDefault: number;
    MaxPositionDefault: number;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function RiskSettingsSection({
  settings,
  onUpdate,
}: RiskSettingsProps) {
  const t = useTranslations("ext_admin");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("default_risk_controls")}</CardTitle>
        <CardDescription>
          {t("set_default_risk_parameters_for_new_subscriptions")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>{t("default_max_daily_loss")}</Label>
              <span className="text-sm font-medium">{settings.MaxDailyLossDefault}%</span>
            </div>
            <Slider
              value={[settings.MaxDailyLossDefault]}
              onValueChange={([value]) => onUpdate("MaxDailyLossDefault", value)}
              min={5}
              max={50}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              {t("default_maximum_daily_loss_percentage_before")}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>{t("default_max_position_size")}</Label>
              <span className="text-sm font-medium">{settings.MaxPositionDefault}%</span>
            </div>
            <Slider
              value={[settings.MaxPositionDefault]}
              onValueChange={([value]) => onUpdate("MaxPositionDefault", value)}
              min={5}
              max={50}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              {t("default_maximum_position_size_as_percentage")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
