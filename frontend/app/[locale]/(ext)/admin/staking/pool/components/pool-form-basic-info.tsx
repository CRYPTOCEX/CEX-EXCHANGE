"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import { validationRules } from "@/utils/validation";
import type { PoolFormValues } from "./pool-form";
import { useTranslations } from "next-intl";

interface PoolFormBasicInfoProps {
  formData: PoolFormValues;
  updateFormData: (data: Partial<PoolFormValues>) => void;
  validationErrors?: Record<string, string>;
  hasSubmitted?: boolean;
}

export function PoolFormBasicInfo({
  formData,
  updateFormData,
  validationErrors = {},
  hasSubmitted = false,
}: PoolFormBasicInfoProps) {
  const t = useTranslations("ext");
  // Change the useState line to initialize iconFile as null instead of using formData.icon
  const [iconFile, setIconFile] = useState<File | string | null>(null);
  const [errors, setErrors] = useState({
    name: "",
    token: "",
    symbol: "",
    icon: "",
    order: "",
  });

  // Then add a useEffect to only set the iconFile when in edit mode (when formData.icon exists and isn't empty)
  useEffect(() => {
    if (formData.icon) {
      setIconFile(formData.icon);
    }
  }, [formData.icon]);

  // Update form data when inputs change
  const handleInputChange = (field: keyof PoolFormValues, value: any) => {
    updateFormData({ [field]: value });
    // Clear local validation error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Update icon file when user uploads a new image
  const handleIconChange = (file: File | null) => {
    setIconFile(file);
    if (file) {
      // Save the File object so that we can upload it on form submission.
      updateFormData({ icon: file });
    } else {
      updateFormData({ icon: "" });
    }
  };

  // Validate fields
  const validateField = (field: string, value: any) => {
    let error = "";

    switch (field) {
      case "name":
        if (!validationRules.required().validate(value)) {
          error = "Pool name is required";
        } else if (!validationRules.minLength(2).validate(value)) {
          error = "Pool name must be at least 2 characters";
        }
        break;
      case "token":
        if (!validationRules.required().validate(value)) {
          error = "Token name is required";
        }
        break;
      case "symbol":
        if (!validationRules.required().validate(value)) {
          error = "Token symbol is required";
        }
        break;
      case "icon":
        if (!validationRules.required().validate(value)) {
          error = "Token icon is required";
        }
        break;
      case "order":
        if (!validationRules.required().validate(value)) {
          error = "Display order is required";
        } else if (!validationRules.numeric().validate(value)) {
          error = "Display order must be a number";
        } else if (!validationRules.min(1).validate(value)) {
          error = "Display order must be at least 1";
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === "";
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Pool Name"
          placeholder="Bitcoin Staking"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          onBlur={(e) => validateField("name", e.target.value)}
          error={hasError("name")}
          errorMessage={getErrorMessage("name")}
          validationRules={[
            validationRules.required("Pool name is required"),
            validationRules.minLength(
              2,
              "Pool name must be at least 2 characters"
            ),
          ]}
          description="The name displayed to users"
        />

        <Input
          label="Token Name"
          placeholder="Bitcoin"
          value={formData.token}
          onChange={(e) => handleInputChange("token", e.target.value)}
          onBlur={(e) => validateField("token", e.target.value)}
          error={hasError("token")}
          errorMessage={getErrorMessage("token")}
          validationRules={[validationRules.required("Token name is required")]}
          description="The full name of the token"
        />

        <Input
          label="Token Symbol"
          placeholder="BTC"
          value={formData.symbol}
          onChange={(e) => handleInputChange("symbol", e.target.value)}
          onBlur={(e) => validateField("symbol", e.target.value)}
          error={hasError("symbol")}
          errorMessage={getErrorMessage("symbol")}
          validationRules={[
            validationRules.required("Token symbol is required"),
          ]}
          description="The abbreviated symbol (e.g., BTC, ETH)"
        />

        <div className="flex flex-col space-y-2">
          <Select
            value={formData.status}
            onValueChange={(value) => handleInputChange("status", value)}
          >
            <SelectTrigger
              title="Status"
              description="Current status of the staking pool"
              className="w-full"
            >
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">{t("Active")}</SelectItem>
              <SelectItem value="INACTIVE">{t("Inactive")}</SelectItem>
              <SelectItem value="COMING_SOON">{t("coming_soon")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Input
          label="Display Order"
          type="number"
          value={formData.order.toString()}
          onChange={(e) =>
            handleInputChange("order", Number.parseInt(e.target.value) || 0)
          }
          onBlur={(e) => validateField("order", e.target.value)}
          error={hasError("order")}
          errorMessage={getErrorMessage("order")}
          validationRules={[
            validationRules.required("Display order is required"),
            validationRules.numeric("Display order must be a number"),
            validationRules.min(1, "Display order must be at least 1"),
          ]}
          description="Order in which the pool appears in listings"
        />

        <div className="md:col-span-2">
          <ImageUpload
            title="Token Icon"
            value={iconFile}
            onChange={handleIconChange}
            error={hasError("icon")}
            errorMessage={getErrorMessage("icon")}
          />
        </div>
      </div>

      <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
        <Checkbox
          id="isPromoted"
          checked={formData.isPromoted}
          onCheckedChange={(checked) =>
            handleInputChange("isPromoted", !!checked)
          }
        />
        <div className="space-y-1 leading-none">
          <label
            htmlFor="isPromoted"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t("Promoted")}
          </label>
          <p className="text-sm text-muted-foreground">
            {t("promoted_pools_will_user_interface")}
          </p>
        </div>
      </div>
    </div>
  );
}
