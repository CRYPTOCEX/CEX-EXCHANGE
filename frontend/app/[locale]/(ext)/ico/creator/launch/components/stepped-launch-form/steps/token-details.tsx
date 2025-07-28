"use client";

import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload"; // Make sure the path is correct
import type { FormData } from "../types";

interface TokenDetailsStepProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
}

export default function TokenDetailsStep({
  formData,
  updateFormData,
  errors,
}: TokenDetailsStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Token Name"
          placeholder="e.g. Ethereum"
          value={formData.name}
          onChange={(e) => updateFormData("name", e.target.value)}
          error={!!errors.name}
          errorMessage={errors.name}
        />

        <Input
          label="Token Symbol"
          placeholder="e.g. ETH"
          value={formData.symbol}
          onChange={(e) => updateFormData("symbol", e.target.value)}
          error={!!errors.symbol}
          errorMessage={errors.symbol}
        />
      </div>

      {/* New Icon upload field */}
      <div className="mt-4">
        <ImageUpload
          title="Token Icon"
          value={formData.icon}
          onChange={(fileOrNull) => updateFormData("icon", fileOrNull)}
          error={!!errors.icon}
          errorMessage={errors.icon}
        />
      </div>
    </div>
  );
}
