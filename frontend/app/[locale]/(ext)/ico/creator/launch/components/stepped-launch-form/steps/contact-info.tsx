"use client";

import { Input } from "@/components/ui/input";
import type { FormData } from "../types";

interface ContactInfoStepProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
}

export default function ContactInfoStep({
  formData,
  updateFormData,
  errors,
}: ContactInfoStepProps) {
  return (
    <div className="space-y-4">
      <Input
        label="Website"
        placeholder="https://yourproject.com"
        value={formData.website}
        onChange={(e) => updateFormData("website", e.target.value)}
        error={!!errors.website}
        errorMessage={errors.website}
      />
    </div>
  );
}
