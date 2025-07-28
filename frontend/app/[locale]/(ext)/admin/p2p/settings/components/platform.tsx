"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface P2PPlatformSettingsSectionProps {
  settings?: {
    Enabled?: boolean;
    MaintenanceMode?: boolean;
    AllowNewOffers?: boolean;
    AllowGuestBrowsing?: boolean;
    AllowCustomPaymentMethods?: boolean;
    MaxActiveOffersPerUser?: number;
    MaxActiveTrades?: number;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function P2PPlatformSettingsSection({
  settings = {},
  onUpdate,
}: P2PPlatformSettingsSectionProps) {
  const t = useTranslations("ext");
  const safeSettings = {
    Enabled: settings.Enabled ?? true,
    MaintenanceMode: settings.MaintenanceMode ?? false,
    AllowNewOffers: settings.AllowNewOffers ?? true,
    AllowGuestBrowsing: settings.AllowGuestBrowsing ?? true,
    AllowCustomPaymentMethods: settings.AllowCustomPaymentMethods ?? false,
    MaxActiveOffersPerUser: settings.MaxActiveOffersPerUser ?? 5,
    MaxActiveTrades: settings.MaxActiveTrades ?? 10,
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Platform Status Switches */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">
                {t("enable_p2p_trading")}
              </span>
              <p className="text-xs text-muted-foreground">
                {t("turn_on_off_the_entire_p2p_trading_platform")}.{" "}
                {t("when_disabled_users_cannot_access_p2p_features")}.
              </p>
            </div>
            <Switch
              id="p2pEnabled"
              checked={safeSettings.Enabled}
              onCheckedChange={(checked) => onUpdate("Enabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">
                {t("maintenance_mode")}
              </span>
              <p className="text-xs text-muted-foreground">
                {t("put_the_p2p_platform_in_maintenance_mode")}.{" "}
                {t("users_can_view_but_not_create_trades_or_offers")}.
              </p>
            </div>
            <Switch
              id="maintenanceMode"
              checked={safeSettings.MaintenanceMode}
              onCheckedChange={(checked) =>
                onUpdate("MaintenanceMode", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">
                {t("allow_new_offers")}
              </span>
              <p className="text-xs text-muted-foreground">
                {t("allow_users_to_create_new_trading_offers")}.{" "}
                {t("when_disabled_users_can_only_take_existing_offers")}.
              </p>
            </div>
            <Switch
              id="allowNewOffers"
              checked={safeSettings.AllowNewOffers}
              onCheckedChange={(checked) => onUpdate("AllowNewOffers", checked)}
            />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">
                {t("allow_guest_browsing")}
              </span>
              <p className="text-xs text-muted-foreground">
                {t("allow_non-logged-in_users_to_browse_offers")}.{" "}
                {t("they_will_still_need_to_log_in_to_trade")}.
              </p>
            </div>
            <Switch
              id="allowGuestBrowsing"
              checked={safeSettings.AllowGuestBrowsing}
              onCheckedChange={(checked) =>
                onUpdate("AllowGuestBrowsing", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">
                {t("allow_custom_payment_methods")}
              </span>
              <p className="text-xs text-muted-foreground">
                {t("allow_users_to_create_custom_payment_methods")}.{" "}
                {t("when_disabled_users_cannot_create_custom_payment_methods")}.
              </p>
            </div>
            <Switch
              id="allowCustomPaymentMethods"
              checked={safeSettings.AllowCustomPaymentMethods}
              onCheckedChange={(checked) =>
                onUpdate("AllowCustomPaymentMethods", checked)
              }
            />
          </div>
        </div>

        {/* Limits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="maxActiveOffersPerUser">
              {t("max_active_offers_per_user")}
            </Label>
            <Input
              id="maxActiveOffersPerUser"
              type="number"
              value={safeSettings.MaxActiveOffersPerUser}
              onChange={(e) =>
                onUpdate("MaxActiveOffersPerUser", Number(e.target.value))
              }
              placeholder="Enter maximum number of offers"
              min="1"
              max="100"
            />
            <p className="text-xs text-muted-foreground">
              {t("maximum_number_of_one_time")}.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxActiveTrades">
              {t("max_active_trades_per_user")}
            </Label>
            <Input
              id="maxActiveTrades"
              type="number"
              value={safeSettings.MaxActiveTrades}
              onChange={(e) =>
                onUpdate("MaxActiveTrades", Number(e.target.value))
              }
              placeholder="Enter maximum number of trades"
              min="1"
              max="100"
            />
            <p className="text-xs text-muted-foreground">
              {t("maximum_number_of_one_time")}.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
