"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

interface AffiliateCommissionSettingsSectionProps {
  settings?: {
    DefaultCommissionRate?: number;
    MaxCommissionRate?: number;
    CommissionTiers?: boolean;
    TierLevels?: number;
    PayoutThreshold?: number;
    PayoutFrequency?: "DAILY" | "WEEKLY" | "MONTHLY";
  };
  onUpdate: (key: string, value: any) => void;
}

export default function AffiliateCommissionSettingsSection({
  settings = {},
  onUpdate,
}: AffiliateCommissionSettingsSectionProps) {
  const t = useTranslations("ext");
  const safeSettings = {
    DefaultCommissionRate: settings.DefaultCommissionRate ?? 10,
    MaxCommissionRate: settings.MaxCommissionRate ?? 30,
    // CommissionTiers: settings.CommissionTiers ?? false,
    TierLevels: settings.TierLevels ?? 3,
    PayoutThreshold: settings.PayoutThreshold ?? 50,
    // PayoutFrequency: settings.PayoutFrequency ?? "MONTHLY",
  };

  return (
    <div className="space-y-6 pt-3">
      {/* Row 1: Commission Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label
            htmlFor="defaultCommissionRate"
            className="block text-sm font-medium mb-1.5"
          >
            {t("default_commission_rate_(%)")}
          </Label>
          <Input
            id="defaultCommissionRate"
            type="number"
            value={safeSettings.DefaultCommissionRate}
            onChange={(e) =>
              onUpdate("DefaultCommissionRate", Number(e.target.value))
            }
            placeholder="Enter default commission rate"
            min="0"
            max="100"
            step="0.1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("the_default_commission_new_affiliates")}.
          </p>
        </div>
        <div>
          <Label
            htmlFor="maxCommissionRate"
            className="block text-sm font-medium mb-1.5"
          >
            {t("maximum_commission_rate_(%)")}
          </Label>
          <Input
            id="maxCommissionRate"
            type="number"
            value={safeSettings.MaxCommissionRate}
            onChange={(e) =>
              onUpdate("MaxCommissionRate", Number(e.target.value))
            }
            placeholder="Enter maximum commission rate"
            min="0"
            max="100"
            step="0.1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("the_highest_commission_can_receive")}.
          </p>
        </div>
      </div>

      {/* Row 2: Payout Settings */}
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
            placeholder="Enter payout threshold"
            min="0"
            step="1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("the_minimum_amount_a_payout")}.
          </p>
        </div>
        {/* <div>
          <Label htmlFor="payoutFrequency" className="block text-sm font-medium mb-1.5">
            Payout Frequency
          </Label>
          <Select value={safeSettings.PayoutFrequency} onValueChange={(value) => onUpdate("PayoutFrequency", value)}>
            <SelectTrigger id="payoutFrequency" className="w-full">
              <SelectValue placeholder="Select payout frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            How often affiliate commissions are processed and paid out.
          </p>
        </div> */}
      </div>

      {/* Row 3: Commission Tiers */}
      {/* <div className="flex items-center justify-between border p-4 rounded-lg">
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Enable Commission Tiers
          </span>
          <p className="text-xs text-muted-foreground">
            When enabled, affiliates can earn higher commission rates based on
            performance.
          </p>
        </div>
        <Switch
          id="commissionTiers"
          checked={safeSettings.CommissionTiers}
          onCheckedChange={(checked) => onUpdate("CommissionTiers", checked)}
        />
      </div>

      {safeSettings.CommissionTiers && (
        <div>
          <Label
            htmlFor="tierLevels"
            className="block text-sm font-medium mb-1.5"
          >
            Number of Tier Levels
          </Label>
          <Input
            id="tierLevels"
            type="number"
            value={safeSettings.TierLevels}
            onChange={(e) => onUpdate("TierLevels", Number(e.target.value))}
            placeholder="Enter number of tier levels"
            min="2"
            max="10"
            step="1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            The number of performance tiers in your commission structure.
          </p>
        </div>
      )} */}
    </div>
  );
}
