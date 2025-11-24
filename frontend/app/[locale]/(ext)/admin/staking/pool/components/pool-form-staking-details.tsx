"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { validationRules } from "@/utils/validation";
import type { PoolFormValues } from "./pool-form";

interface PoolFormStakingDetailsProps {
  formData: PoolFormValues;
  updateFormData: (data: Partial<PoolFormValues>) => void;
  validationErrors?: Record<string, string>;
  hasSubmitted?: boolean;
}

export function PoolFormStakingDetails({
  formData,
  updateFormData,
  validationErrors = {},
  hasSubmitted = false,
}: PoolFormStakingDetailsProps) {
  const [errors, setErrors] = useState({
    apr: "",
    minStake: "",
    maxStake: "",
    lockPeriod: "",
    availableToStake: "",
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
      case "apr":
        if (!validationRules.required().validate(value)) {
          error = "APR is required";
        } else if (!validationRules.numeric().validate(value)) {
          error = "APR must be a number";
        } else if (!validationRules.min(0).validate(value)) {
          error = "APR must be a positive number";
        }
        break;
      case "minStake":
        if (!validationRules.required().validate(value)) {
          error = "Minimum stake is required";
        } else if (!validationRules.numeric().validate(value)) {
          error = "Minimum stake must be a number";
        } else if (!validationRules.min(0).validate(value)) {
          error = "Minimum stake must be a positive number";
        }
        break;
      case "lockPeriod":
        if (!validationRules.required().validate(value)) {
          error = "Lock period is required";
        } else if (!validationRules.numeric().validate(value)) {
          error = "Lock period must be a number";
        } else if (!validationRules.min(1).validate(value)) {
          error = "Lock period must be at least 1 day";
        }
        break;
      case "availableToStake":
        if (!validationRules.required().validate(value)) {
          error = "Available to stake is required";
        } else if (!validationRules.numeric().validate(value)) {
          error = "Available to stake must be a number";
        } else if (!validationRules.min(0).validate(value)) {
          error = "Available to stake must be a positive number";
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
          label="Annual Percentage Rate (APR)"
          type="number"
          step="0.1"
          value={formData.apr.toString()}
          onChange={(e) =>
            handleInputChange("apr", Number.parseFloat(e.target.value) || 0)
          }
          onBlur={(e) => validateField("apr", e.target.value)}
          error={hasError("apr")}
          errorMessage={getErrorMessage("apr")}
          validationRules={[
            validationRules.required("APR is required"),
            validationRules.numeric("APR must be a number"),
            validationRules.min(0, "APR must be a positive number"),
          ]}
          validateOnChange
          description="The annual yield percentage for stakers"
        />

        <Input
          label="Lock Period (days)"
          type="number"
          value={formData.lockPeriod.toString()}
          onChange={(e) =>
            handleInputChange(
              "lockPeriod",
              Number.parseInt(e.target.value) || 0
            )
          }
          onBlur={(e) => validateField("lockPeriod", e.target.value)}
          error={hasError("lockPeriod")}
          errorMessage={getErrorMessage("lockPeriod")}
          validationRules={[
            validationRules.required("Lock period is required"),
            validationRules.numeric("Lock period must be a number"),
            validationRules.min(1, "Lock period must be at least 1 day"),
          ]}
          validateOnChange
          description="Number of days tokens must remain staked"
        />

        <Input
          label="Minimum Stake"
          type="number"
          step="0.01"
          value={formData.minStake.toString()}
          onChange={(e) =>
            handleInputChange(
              "minStake",
              Number.parseFloat(e.target.value) || 0
            )
          }
          onBlur={(e) => validateField("minStake", e.target.value)}
          error={hasError("minStake")}
          errorMessage={getErrorMessage("minStake")}
          validationRules={[
            validationRules.required("Minimum stake is required"),
            validationRules.numeric("Minimum stake must be a number"),
            validationRules.min(0, "Minimum stake must be a positive number"),
          ]}
          validateOnChange
          description="Minimum amount users can stake"
        />

        <Input
          label="Maximum Stake (optional)"
          type="number"
          step="0.01"
          value={formData.maxStake?.toString() || ""}
          onChange={(e) => {
            const value =
              e.target.value === "" ? null : Number.parseFloat(e.target.value);
            handleInputChange("maxStake", value);
          }}
          description="Maximum amount users can stake (leave empty for no limit)"
        />

        <Input
          label="Available to Stake"
          type="number"
          step="0.01"
          value={formData.availableToStake.toString()}
          onChange={(e) =>
            handleInputChange(
              "availableToStake",
              Number.parseFloat(e.target.value) || 0
            )
          }
          onBlur={(e) => validateField("availableToStake", e.target.value)}
          error={hasError("availableToStake")}
          errorMessage={getErrorMessage("availableToStake")}
          validationRules={[
            validationRules.required("Available to stake is required"),
            validationRules.numeric("Available to stake must be a number"),
            validationRules.min(
              0,
              "Available to stake must be a positive number"
            ),
          ]}
          validateOnChange
          description="Total amount available in the staking pool"
        />
      </div>
    </div>
  );
}
