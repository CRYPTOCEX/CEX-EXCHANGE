"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/ui/editor";
import { validationRules } from "@/utils/validation";
import type { PoolFormValues } from "./pool-form";
import { useTranslations } from "next-intl";

interface PoolFormDescriptionProps {
  formData: PoolFormValues;
  updateFormData: (data: Partial<PoolFormValues>) => void;
  validationErrors?: Record<string, string>;
  hasSubmitted?: boolean;
}

export function PoolFormDescription({
  formData,
  updateFormData,
  validationErrors = {},
  hasSubmitted = false,
}: PoolFormDescriptionProps) {
  const t = useTranslations("ext");
  const [errors, setErrors] = useState({
    description: "",
    risks: "",
    rewards: "",
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
      case "description":
      case "risks":
      case "rewards":
        if (!validationRules.required().validate(value)) {
          error = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        } else if (!validationRules.minLength(10).validate(value)) {
          error = `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least 10 characters`;
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === "";
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {t("Description")}
        </label>
        <RichTextEditor
          value={formData.description}
          onChange={(content) => {
            handleInputChange("description", content);
            validateField("description", content);
          }}
          placeholder="Describe the staking pool and its benefits..."
          uploadDir="staking-pools"
        />
        {hasError("description") && (
          <div className="flex items-center gap-2 text-red-500 text-sm mt-1 bg-red-50 dark:bg-red-900/10 p-2 rounded-md">
            <span>{getErrorMessage("description")}</span>
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {t("detailed_description_of_the_staking_pool")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Textarea
          title="Risks"
          placeholder="Describe potential risks for stakers"
          className="min-h-[150px]"
          value={formData.risks}
          onChange={(e) => handleInputChange("risks", e.target.value)}
          onBlur={(e) => validateField("risks", e.target.value)}
          error={hasError("risks")}
          errorMessage={getErrorMessage("risks")}
          validationRules={[
            validationRules.required("Risks description is required"),
            validationRules.minLength(
              10,
              "Risks description must be at least 10 characters"
            ),
          ]}
          description="Potential risks users should be aware of"
        />

        <Textarea
          title="Rewards"
          placeholder="Describe the rewards structure"
          className="min-h-[150px]"
          value={formData.rewards}
          onChange={(e) => handleInputChange("rewards", e.target.value)}
          onBlur={(e) => validateField("rewards", e.target.value)}
          error={hasError("rewards")}
          errorMessage={getErrorMessage("rewards")}
          validationRules={[
            validationRules.required("Rewards description is required"),
            validationRules.minLength(
              10,
              "Rewards description must be at least 10 characters"
            ),
          ]}
          description="Details about rewards distribution and schedule"
        />
      </div>
    </div>
  );
}
