"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

interface AffiliateCommissionSettingsSectionProps {
  settings?: {
    PayoutThreshold?: number;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function AffiliateCommissionSettingsSection({
  settings = {},
  onUpdate,
}: AffiliateCommissionSettingsSectionProps) {
  const t = useTranslations("ext_admin");
  const safeSettings = {
    PayoutThreshold: settings.PayoutThreshold ?? 50,
  };

  return (
    <div className="space-y-6 pt-3">
      {/* Payout Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label
            htmlFor="payoutThreshold"
            className="block text-sm font-medium mb-1.5"
          >
            {t("payout_threshold")}
          </Label>
          <Input
            id="payoutThreshold"
            type="number"
            value={safeSettings.PayoutThreshold}
            onChange={(e) =>
              onUpdate("PayoutThreshold", Number(e.target.value))
            }
            placeholder={t("enter_payout_threshold")}
            min="0"
            step="1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("the_minimum_amount_a_payout")}.
          </p>
        </div>
      </div>

      {/* Info about commission rates */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <p className="text-sm text-muted-foreground">
          {t("commission_rates_are_configured_in_affiliate_conditions")}
        </p>
      </div>
    </div>
  );
}
