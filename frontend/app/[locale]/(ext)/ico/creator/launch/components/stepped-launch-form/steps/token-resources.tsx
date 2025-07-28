"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { FormData } from "../types";
import { useTranslations } from "next-intl";

interface TokenResourcesStepProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
}

export default function TokenResourcesStep({
  formData,
  updateFormData,
  errors,
}: TokenResourcesStepProps) {
  const t = useTranslations("ext");
  const updateTokenDetail = (
    field: keyof FormData["tokenDetails"],
    value: string | string[]
  ) => {
    updateFormData("tokenDetails", {
      ...formData.tokenDetails,
      [field]: value,
    });
  };

  const updateUseOfFunds = (index: number, value: string) => {
    const newUseOfFunds = [...formData.tokenDetails.useOfFunds];
    newUseOfFunds[index] = value;
    updateTokenDetail("useOfFunds", newUseOfFunds);
  };

  const addUseOfFunds = () => {
    updateTokenDetail("useOfFunds", [...formData.tokenDetails.useOfFunds, ""]);
  };

  const removeUseOfFunds = (index: number) => {
    if (formData.tokenDetails.useOfFunds.length > 1) {
      const newUseOfFunds = [...formData.tokenDetails.useOfFunds];
      newUseOfFunds.splice(index, 1);
      updateTokenDetail("useOfFunds", newUseOfFunds);
    }
  };

  return (
    <div className="space-y-4">
      {/* Whitepaper Link */}
      <Input
        label="Whitepaper Link"
        placeholder="https://yourproject.com/whitepaper.pdf"
        value={formData.tokenDetails.whitepaper}
        onChange={(e) => updateTokenDetail("whitepaper", e.target.value)}
        error={!!errors.whitepaper}
        errorMessage={errors.whitepaper}
      />

      {/* Use of Funds */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{t("use_of_funds")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addUseOfFunds}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("add_category")}
          </Button>
        </div>
        {formData.tokenDetails.useOfFunds.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="e.g. Development, Marketing, Operations"
              value={item}
              onChange={(e) => updateUseOfFunds(index, e.target.value)}
              className="flex-1"
            />
            {formData.tokenDetails.useOfFunds.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeUseOfFunds(index)}
                className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {errors.useOfFunds && (
          <p className="text-sm font-medium text-destructive">
            {errors.useOfFunds}
          </p>
        )}
      </div>

      {/* GitHub Repository & Telegram Group */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="GitHub Repository"
          placeholder="https://github.com/yourproject"
          value={formData.tokenDetails.github || ""}
          onChange={(e) => updateTokenDetail("github", e.target.value)}
          error={!!errors.github}
          errorMessage={errors.github}
        />
        <Input
          label="Telegram Group"
          placeholder="https://t.me/yourproject"
          value={formData.tokenDetails.telegram || ""}
          onChange={(e) => updateTokenDetail("telegram", e.target.value)}
          error={!!errors.telegram}
          errorMessage={errors.telegram}
        />
      </div>

      {/* Twitter/X Profile */}
      <Input
        label="Twitter/X Profile"
        placeholder="https://twitter.com/yourproject"
        value={formData.tokenDetails.twitter || ""}
        onChange={(e) => updateTokenDetail("twitter", e.target.value)}
        error={!!errors.twitter}
        errorMessage={errors.twitter}
      />
    </div>
  );
}
