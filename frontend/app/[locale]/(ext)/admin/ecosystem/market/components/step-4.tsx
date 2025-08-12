import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

export interface LimitsStepProps {
  formData: {
    metadata: {
      limits: {
        amount: { min: number; max: number };
        price: { min: number; max: number };
        cost: { min: number; max: number };
      };
    };
  };
  updateNestedField: (path: string, value: any) => void;
}

const LimitsStep: React.FC<LimitsStepProps> = ({
  formData,
  updateNestedField,
}) => {
  const t = useTranslations("ext");
  return (
    <Card className="p-5 space-y-3">
      <h2 className="text-lg font-semibold mb-2">{t("Limits")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {t("set_the_minimum_and_costs")}.<br />
        {t("for_example_the_minimum_is")}.{" "}
        {t("00001_and_the_maximum_is")}.
      </p>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <Label>{t("amount_min")}</Label>
          <Input
            type="number"
            value={formData.metadata.limits.amount.min}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.amount.min",
                parseFloat(e.target.value) || 0
              )
            }
            placeholder="Enter minimum amount"
          />
        </div>
        <div>
          <Label>{t("amount_max")}</Label>
          <Input
            type="number"
            value={formData.metadata.limits.amount.max}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.amount.max",
                parseFloat(e.target.value) || 0
              )
            }
            placeholder="Enter maximum amount"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5 mt-3">
        <div>
          <Label>{t("price_min")}</Label>
          <Input
            type="number"
            value={formData.metadata.limits.price.min}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.price.min",
                parseFloat(e.target.value) || 0
              )
            }
            placeholder="Enter minimum price"
          />
        </div>
        <div>
          <Label>{t("price_max")}</Label>
          <Input
            type="number"
            value={formData.metadata.limits.price.max}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.price.max",
                parseFloat(e.target.value) || 0
              )
            }
            placeholder="Enter maximum price"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5 mt-3">
        <div>
          <Label>{t("cost_min")}</Label>
          <Input
            type="number"
            value={formData.metadata.limits.cost.min}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.cost.min",
                parseFloat(e.target.value) || 0
              )
            }
            placeholder="Enter minimum cost"
          />
        </div>
        <div>
          <Label>{t("cost_max")}</Label>
          <Input
            type="number"
            value={formData.metadata.limits.cost.max}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.cost.max",
                parseFloat(e.target.value) || 0
              )
            }
            placeholder="Enter maximum cost"
          />
        </div>
      </div>
    </Card>
  );
};

export default LimitsStep;
