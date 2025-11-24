"use client";

import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

interface InvestmentLimitsSectionProps {
  minAmount: number;
  maxAmount: number;
  onUpdate: (key, value) => void;
}

export default function InvestmentLimitsSection({
  minAmount,
  maxAmount,
  onUpdate,
}: InvestmentLimitsSectionProps) {
  const t = useTranslations("ext");
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t("investment_limits")}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="min-investment"
          type="number"
          label="Minimum Investment Amount ($)"
          value={minAmount ?? ""}
          onChange={(e) =>
            onUpdate("icoMinInvestmentAmount", Number(e.target.value))
          }
          placeholder="Enter minimum investment amount"
        />
        <Input
          id="max-investment"
          type="number"
          label="Maximum Investment Amount ($)"
          value={maxAmount ?? ""}
          onChange={(e) =>
            onUpdate("icoMaxInvestmentAmount", Number(e.target.value))
          }
          placeholder="Enter maximum investment amount"
        />
      </div>
    </div>
  );
}
