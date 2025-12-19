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
import { useTranslations } from "next-intl";

interface StakingEarningsSettingsSectionProps {
  settings?: {
    DefaultEarningFrequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM";
    MinimumWithdrawalAmount?: number;
    AutomaticEarningsDistribution?: boolean;
    RequireWithdrawalApproval?: boolean;
    DefaultAprCalculationMethod?: "SIMPLE" | "COMPOUND";
    EarningsDistributionTime?: string;
  };
  onUpdate: (key: string, value: any) => void;
  validationErrors?: Record<string, string>;
  hasSubmitted?: boolean;
}

export default function StakingEarningsSettingsSection({
  settings = {},
  onUpdate,
  validationErrors = {},
  hasSubmitted = false,
}: StakingEarningsSettingsSectionProps) {
  const t = useTranslations("ext_admin");
  const safeSettings = {
    DefaultEarningFrequency: settings.DefaultEarningFrequency ?? "MONTHLY",
    MinimumWithdrawalAmount: settings.MinimumWithdrawalAmount ?? 0,
    AutomaticEarningsDistribution:
      settings.AutomaticEarningsDistribution ?? false,
    RequireWithdrawalApproval: settings.RequireWithdrawalApproval ?? false,
    DefaultAprCalculationMethod:
      settings.DefaultAprCalculationMethod ?? "SIMPLE",
    EarningsDistributionTime: settings.EarningsDistributionTime ?? "00:00",
  };

  const aprCalculationDescriptions: Record<string, string> = {
    SIMPLE:
      "Simple Interest calculates earnings solely on the principal amount.",
    COMPOUND:
      "Compound Interest includes interest on both the principal and accumulated interest, increasing returns over time.",
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
    <div className="space-y-8 pt-3">
      {/* Row 1: Earning Frequency & APR Calculation Method */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            {t("apr_calculation_method")}
          </label>
          <Select
            value={safeSettings.DefaultAprCalculationMethod}
            onValueChange={(value) =>
              onUpdate("DefaultAprCalculationMethod", value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("select_apr_calculation")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SIMPLE">
                {t("simple_interest_apr")} (APR)
              </SelectItem>
              <SelectItem value="COMPOUND">
                {t("compound_interest_apy")} (APY)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {
              aprCalculationDescriptions[
                safeSettings.DefaultAprCalculationMethod
              ]
            }
          </p>
        </div>
      </div>

      {/* Row 2: Minimum Withdrawal Amount & Earnings Distribution Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Input
            id="minimumWithdrawalAmount"
            type="number"
            label={t("minimum_withdrawal_amount")}
            value={safeSettings.MinimumWithdrawalAmount}
            onChange={(e) =>
              onUpdate("MinimumWithdrawalAmount", Number(e.target.value))
            }
            placeholder={t("enter_minimum_withdrawal_amount")}
            min="0"
            step="0.0001"
            error={hasError("MinimumWithdrawalAmount")}
            errorMessage={getErrorMessage("MinimumWithdrawalAmount")}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("set_the_minimum_prevent_micro_withdrawals")}.
          </p>
        </div>
        <div>
          <Input
            id="earningsDistributionTime"
            type="time"
            label={t("earnings_distribution_time")}
            value={safeSettings.EarningsDistributionTime}
            onChange={(e) =>
              onUpdate("EarningsDistributionTime", e.target.value)
            }
            error={hasError("EarningsDistributionTime")}
            errorMessage={getErrorMessage("EarningsDistributionTime")}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("specify_the_time_payout_schedule")}.
          </p>
        </div>
      </div>

      {/* Row 3: Switches for Automatic Earnings Distribution & Withdrawal Approval */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border p-4 rounded-lg">
          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t("automatic_earnings_distribution")}
            </span>
            <p className="text-xs text-muted-foreground">
              {t("enable_this_option_set_schedule")}.
            </p>
          </div>
          <Switch
            id="automaticEarningsDistribution"
            checked={safeSettings.AutomaticEarningsDistribution}
            onCheckedChange={(checked) =>
              onUpdate("AutomaticEarningsDistribution", checked)
            }
          />
        </div>
        <div className="flex items-center justify-between border p-4 rounded-lg">
          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t("require_withdrawal_approval")}
            </span>
            <p className="text-xs text-muted-foreground">
              {t("enable_this_to_processing_withdrawals")}.
            </p>
          </div>
          <Switch
            id="requireWithdrawalApproval"
            checked={safeSettings.RequireWithdrawalApproval}
            onCheckedChange={(checked) =>
              onUpdate("RequireWithdrawalApproval", checked)
            }
          />
        </div>
      </div>
    </div>
  );
}
