"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { validationRules } from "@/utils/validation";
import type { PoolFormValues } from "./pool-form";
import { useTranslations } from "next-intl";

interface PoolFormProfitSettingsProps {
  formData: PoolFormValues;
  updateFormData: (data: Partial<PoolFormValues>) => void;
  validationErrors?: Record<string, string>;
  hasSubmitted?: boolean;
}

export function PoolFormProfitSettings({
  formData,
  updateFormData,
  validationErrors = {},
  hasSubmitted = false,
}: PoolFormProfitSettingsProps) {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const [errors, setErrors] = useState({
    externalPoolUrl: "",
    adminFeePercentage: "",
    earlyWithdrawalFee: "",
    profitSource: "",
    fundAllocation: "",
  });

  // Update form data when inputs change
  const handleInputChange = (field: keyof PoolFormValues, value: any) => {
    updateFormData({ [field]: value });
    // Clear local validation error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Get the effective error message (server validation takes priority)
  const getErrorMessage = (field: string) => {
    if (hasSubmitted && validationErrors[field]) {
      return validationErrors[field];
    }
    return errors[field];
  };

  const hasError = (field: string) => {
    return (hasSubmitted && !!validationErrors[field]) || !!errors[field];
  };

  // Validate fields
  const validateField = (field: string, value: any) => {
    let error = "";

    switch (field) {
      case "externalPoolUrl":
        if (
          value &&
          !validationRules.pattern(/^https?:\/\/.+/i).validate(value)
        ) {
          error = "Must be a valid URL starting with http:// or https://";
        }
        break;
      case "adminFeePercentage":
        if (!validationRules.required().validate(value)) {
          error = "Admin fee percentage is required";
        } else if (!validationRules.numeric().validate(value)) {
          error = "Admin fee percentage must be a number";
        } else if (!validationRules.min(0).validate(value)) {
          error = "Admin fee percentage must be at least 0";
        } else if (!validationRules.max(100).validate(value)) {
          error = "Admin fee percentage must be at most 100";
        }
        break;
      case "earlyWithdrawalFee":
        if (!validationRules.required().validate(value)) {
          error = "Early withdrawal fee is required";
        } else if (!validationRules.numeric().validate(value)) {
          error = "Early withdrawal fee must be a number";
        } else if (!validationRules.min(0).validate(value)) {
          error = "Early withdrawal fee must be at least 0";
        } else if (!validationRules.max(100).validate(value)) {
          error = "Early withdrawal fee must be at most 100";
        }
        break;
      case "profitSource":
        if (!validationRules.required().validate(value)) {
          error = "Profit source description is required";
        } else if (!validationRules.minLength(10).validate(value)) {
          error = "Profit source description must be at least 10 characters";
        }
        break;
      case "fundAllocation":
        if (!validationRules.required().validate(value)) {
          error = "Fund allocation description is required";
        } else if (!validationRules.minLength(10).validate(value)) {
          error = "Fund allocation description must be at least 10 characters";
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === "";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label={t("external_pool_url")}
          placeholder="https://example.com/staking-pool"
          value={formData.externalPoolUrl || ""}
          onChange={(e) => handleInputChange("externalPoolUrl", e.target.value)}
          onBlur={(e) => validateField("externalPoolUrl", e.target.value)}
          error={hasError("externalPoolUrl")}
          errorMessage={getErrorMessage("externalPoolUrl")}
          description="URL to the external staking pool being used (optional)"
        />

        <div className="flex flex-col space-y-2">
          <Select
            value={formData.earningFrequency}
            onValueChange={(value) =>
              handleInputChange("earningFrequency", value)
            }
          >
            <SelectTrigger
              title={t("earning_frequency")}
              description={t("how_often_earnings_are_distributed_to_users")}
              className="w-full"
            >
              <SelectValue placeholder={t("select_earning_frequency")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">{tExt("daily")}</SelectItem>
              <SelectItem value="WEEKLY">{tExt("weekly")}</SelectItem>
              <SelectItem value="MONTHLY">{tExt("monthly")}</SelectItem>
              <SelectItem value="END_OF_TERM">{tExt("end_of_term")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Input
          label={t("admin_fee_percentage")}
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={formData.adminFeePercentage.toString()}
          onChange={(e) =>
            handleInputChange(
              "adminFeePercentage",
              Number.parseFloat(e.target.value) || 0
            )
          }
          onBlur={(e) => validateField("adminFeePercentage", e.target.value)}
          error={hasError("adminFeePercentage")}
          errorMessage={getErrorMessage("adminFeePercentage")}
          validationRules={[
            validationRules.required("Admin fee percentage is required"),
            validationRules.numeric("Admin fee percentage must be a number"),
            validationRules.min(0, "Admin fee percentage must be at least 0"),
            validationRules.max(
              100,
              "Admin fee percentage must be at most 100"
            ),
          ]}
          validateOnChange
          description={t("percentage_of_earnings_that_goes_to_the_platform")}
        />

        <Input
          label={tExt("early_withdrawal_fee")}
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={formData.earlyWithdrawalFee.toString()}
          onChange={(e) =>
            handleInputChange(
              "earlyWithdrawalFee",
              Number.parseFloat(e.target.value) || 0
            )
          }
          onBlur={(e) => validateField("earlyWithdrawalFee", e.target.value)}
          error={hasError("earlyWithdrawalFee")}
          errorMessage={getErrorMessage("earlyWithdrawalFee")}
          validationRules={[
            validationRules.required("Early withdrawal fee is required"),
            validationRules.numeric("Early withdrawal fee must be a number"),
            validationRules.min(0, "Early withdrawal fee must be at least 0"),
            validationRules.max(
              100,
              "Early withdrawal fee must be at most 100"
            ),
          ]}
          validateOnChange
          description={t("fee_percentage_for_withdrawals_before_lock")}
        />

        <div className="md:col-span-2">
          <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
            <Checkbox
              id="autoCompound"
              checked={formData.autoCompound}
              onCheckedChange={(checked) =>
                handleInputChange("autoCompound", !!checked)
              }
            />
            <div className="space-y-1 leading-none">
              <label
                htmlFor="autoCompound"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("auto_compound_earnings")}
              </label>
              <p className="text-sm text-muted-foreground">
                {t("when_enabled_user_their_stake")}
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <Textarea
            title={tExt("profit_source")}
            placeholder={t("describe_how_profits_are_generated_for_this_pool")}
            className="min-h-[100px]"
            value={formData.profitSource}
            onChange={(e) => handleInputChange("profitSource", e.target.value)}
            onBlur={(e) => validateField("profitSource", e.target.value)}
            error={hasError("profitSource")}
            errorMessage={getErrorMessage("profitSource")}
            validationRules={[
              validationRules.required("Profit source description is required"),
              validationRules.minLength(
                10,
                "Profit source description must be at least 10 characters"
              ),
            ]}
            description={t("explain_how_profits_are_generated_for")}
          />
        </div>

        <div className="md:col-span-2">
          <Textarea
            title={tExt("fund_allocation")}
            placeholder={t("describe_how_funds_are_allocated_e")}
            className="min-h-[100px]"
            value={formData.fundAllocation}
            onChange={(e) =>
              handleInputChange("fundAllocation", e.target.value)
            }
            onBlur={(e) => validateField("fundAllocation", e.target.value)}
            error={hasError("fundAllocation")}
            errorMessage={getErrorMessage("fundAllocation")}
            validationRules={[
              validationRules.required(
                "Fund allocation description is required"
              ),
              validationRules.minLength(
                10,
                "Fund allocation description must be at least 10 characters"
              ),
            ]}
            description={t("explain_how_funds_are_allocated_across")}
          />
        </div>
      </div>
    </div>
  );
}
