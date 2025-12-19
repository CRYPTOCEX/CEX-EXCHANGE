"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";

interface StakingPlatformSettingsSectionProps {
  settings?: {
    Name?: string;
    SupportEmail?: string;
    DefaultAdminFee?: number;
    DefaultEarlyWithdrawalFee?: number;
    Description?: string;
    MaintenanceMode?: boolean;
    AutoCompoundDefault?: boolean;
  };
  onUpdate: (key: string, value: any) => void;
  validationErrors?: Record<string, string>;
  hasSubmitted?: boolean;
}

export default function StakingPlatformSettingsSection({
  settings = {},
  onUpdate,
  validationErrors = {},
  hasSubmitted = false,
}: StakingPlatformSettingsSectionProps) {
  const t = useTranslations("ext_admin");
  const safeSettings = {
    DefaultAdminFee: settings.DefaultAdminFee ?? 0,
    DefaultEarlyWithdrawalFee: settings.DefaultEarlyWithdrawalFee ?? 0,
    AutoCompoundDefault: settings.AutoCompoundDefault ?? false,
  };

  // Get the effective error message (server validation takes priority)
  const getErrorMessage = (field: string) => {
    if (hasSubmitted && validationErrors[`staking${field}`]) {
      return validationErrors[`staking${field}`];
    }
    return "";
  };

  const hasError = (field: string) => {
    return hasSubmitted && !!validationErrors[`staking${field}`];
  };

  return (
    <div className="space-y-6 pt-3">
      {/* Row for Numeric Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Input
            id="defaultAdminFee"
            type="number"
            label={`${t("default_admin_fee")} (%)`}
            value={safeSettings.DefaultAdminFee}
            onChange={(e) =>
              onUpdate("DefaultAdminFee", Number(e.target.value))
            }
            placeholder={t("enter_default_admin_fee")}
            min="0"
            max="100"
            step="0.1"
            error={hasError("DefaultAdminFee")}
            errorMessage={getErrorMessage("DefaultAdminFee")}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("the_default_administrative_staking_rewards")}.
          </p>
        </div>
        <div>
          <Input
            id="defaultEarlyWithdrawalFee"
            type="number"
            label={`${t("default_early_withdrawal_fee")} (%)`}
            value={safeSettings.DefaultEarlyWithdrawalFee}
            onChange={(e) =>
              onUpdate("DefaultEarlyWithdrawalFee", Number(e.target.value))
            }
            placeholder={t("enter_early_withdrawal_fee")}
            min="0"
            max="100"
            step="0.1"
            error={hasError("DefaultEarlyWithdrawalFee")}
            errorMessage={getErrorMessage("DefaultEarlyWithdrawalFee")}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("the_fee_applied_term_ends")}.
          </p>
        </div>
      </div>

      {/* Switch for Auto-Compound */}
      <div className="flex items-center justify-between border p-4 rounded-lg">
        <div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {t("auto_compound_by_default")}
          </span>
          <p className="text-xs text-muted-foreground">
            {t("when_enabled_new_compound_returns")}.
          </p>
        </div>
        <Switch
          id="autoCompoundDefault"
          checked={safeSettings.AutoCompoundDefault}
          onCheckedChange={(checked) =>
            onUpdate("AutoCompoundDefault", checked)
          }
        />
      </div>
    </div>
  );
}
