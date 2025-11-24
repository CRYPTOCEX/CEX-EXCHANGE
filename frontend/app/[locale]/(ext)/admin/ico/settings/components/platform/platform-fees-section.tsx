"use client";

import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

interface PlatformFeesSectionProps {
  feePercentage: number;
  onUpdate: (key, value) => void;
}

export default function PlatformFeesSection({
  feePercentage,
  onUpdate,
}: PlatformFeesSectionProps) {
  const t = useTranslations("ext");
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t("platform_fees")}</h3>
      <Input
        id="platform-fee"
        type="number"
        step="0.1"
        value={feePercentage ?? ""}
        label="Platform Fee Percentage (%)"
        onChange={(e) =>
          onUpdate("icoPlatformFeePercentage", Number(e.target.value))
        }
        placeholder="Enter fee percentage"
      />
    </div>
  );
}
