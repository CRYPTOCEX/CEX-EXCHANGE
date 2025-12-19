"use client";

import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface PlatformSettingsProps {
  settings: {
    Enabled: boolean;
    MaintenanceMode: boolean;
    RequireKYC: boolean;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function PlatformSettingsSection({
  settings,
  onUpdate,
}: PlatformSettingsProps) {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("platform_settings")}</CardTitle>
        <CardDescription>
          {t("configure_global_platform_settings_for_copy")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between border p-4 rounded-lg">
          <div className="space-y-0.5">
            <span className="text-sm font-medium">{t("enable_copy_trading")}</span>
            <p className="text-xs text-muted-foreground">
              {t("turn_on_off_the_entire_copy_trading_platform")} {t("when_disabled_users_cannot_access_copy")}
            </p>
          </div>
          <Switch
            checked={settings.Enabled}
            onCheckedChange={(checked) => onUpdate("Enabled", checked)}
          />
        </div>

        <div className="flex items-center justify-between border p-4 rounded-lg">
          <div className="space-y-0.5">
            <span className="text-sm font-medium">{tExt("maintenance_mode")}</span>
            <p className="text-xs text-muted-foreground">
              {t("put_the_copy_trading_platform_in_maintenance_mode")} {t("users_can_view_but_not_create")}
            </p>
          </div>
          <Switch
            checked={settings.MaintenanceMode}
            onCheckedChange={(checked) => onUpdate("MaintenanceMode", checked)}
          />
        </div>

        <div className="flex items-center justify-between border p-4 rounded-lg">
          <div className="space-y-0.5">
            <span className="text-sm font-medium">{tExt("require_kyc_verification")}</span>
            <p className="text-xs text-muted-foreground">
              {t("require_users_to_complete_kyc_verification")}
            </p>
          </div>
          <Switch
            checked={settings.RequireKYC}
            onCheckedChange={(checked) => onUpdate("RequireKYC", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
