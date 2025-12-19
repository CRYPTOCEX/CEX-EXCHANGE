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
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t("investment_limits")}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="min-investment"
          type="number"
          label={`${tCommon("minimum_investment_amount")} ($)`}
          value={minAmount ?? ""}
          onChange={(e) =>
            onUpdate("icoMinInvestmentAmount", Number(e.target.value))
          }
          placeholder={t("enter_minimum_investment_amount")}
        />
        <Input
          id="max-investment"
          type="number"
          label={`${tCommon("maximum_investment_amount")} ($)`}
          value={maxAmount ?? ""}
          onChange={(e) =>
            onUpdate("icoMaxInvestmentAmount", Number(e.target.value))
          }
          placeholder={t("enter_maximum_investment_amount")}
        />
      </div>
    </div>
  );
}
