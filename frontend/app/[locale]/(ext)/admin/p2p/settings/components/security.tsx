"use client";

import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface P2PSecuritySettingsSectionProps {
  settings?: {
    EnableDisputeSystem?: boolean;
    EnableRatingSystem?: boolean;
    EnableChatSystem?: boolean;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function P2PSecuritySettingsSection({
  settings = {},
  onUpdate,
}: P2PSecuritySettingsSectionProps) {
  const t = useTranslations("ext");
  const safeSettings = {
    EnableDisputeSystem: settings.EnableDisputeSystem ?? true,
    EnableRatingSystem: settings.EnableRatingSystem ?? true,
    EnableChatSystem: settings.EnableChatSystem ?? true,
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">
                {t("enable_dispute_system")}
              </span>
              <p className="text-xs text-muted-foreground">
                {t("allow_users_to_open_disputes_for_trades")}.{" "}
                {t("when_disabled_users_must_contact_support_directly")}.
              </p>
            </div>
            <Switch
              id="enableDisputeSystem"
              checked={safeSettings.EnableDisputeSystem}
              onCheckedChange={(checked) =>
                onUpdate("EnableDisputeSystem", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">
                {t("enable_rating_system")}
              </span>
              <p className="text-xs text-muted-foreground">
                {t("allow_users_to_completing_trades")}.
              </p>
            </div>
            <Switch
              id="enableRatingSystem"
              checked={safeSettings.EnableRatingSystem}
              onCheckedChange={(checked) =>
                onUpdate("EnableRatingSystem", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">
                {t("enable_chat_system")}
              </span>
              <p className="text-xs text-muted-foreground">
                {t("allow_users_to_chat_with_each_other_during_trades")}.{" "}
                {t("when_disabled_users_other_means")}.
              </p>
            </div>
            <Switch
              id="enableChatSystem"
              checked={safeSettings.EnableChatSystem}
              onCheckedChange={(checked) =>
                onUpdate("EnableChatSystem", checked)
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
