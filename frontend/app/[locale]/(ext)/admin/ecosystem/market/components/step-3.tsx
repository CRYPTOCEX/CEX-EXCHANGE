import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

export interface PrecisionStepProps {
  formData: {
    metadata: {
      precision: {
        amount: number;
        price: number;
      };
    };
  };
  updateNestedField: (path: string, value: any) => void;
}

const PrecisionStep: React.FC<PrecisionStepProps> = ({
  formData,
  updateNestedField,
}) => {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return (
    <Card className="p-5 space-y-3">
      <h2 className="text-lg font-semibold mb-2">{tCommon("precision")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {t("configure_the_number_of_decimals_to_display")}.<br />
        <strong>{tCommon("price_precision")}</strong>
        {t("defaults_to_6_decimals")}.<br />
        <strong>{tCommon("amount_precision")}</strong>
        {t("defaults_to_8_decimals")}.
      </p>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <Label>{tCommon("amount_precision")}</Label>
          <Input
            type="number"
            value={formData.metadata.precision.amount}
            onChange={(e) =>
              updateNestedField(
                "metadata.precision.amount",
                parseInt(e.target.value) || 0
              )
            }
            placeholder={t("enter_amount_precision")}
          />
        </div>
        <div>
          <Label>{tCommon("price_precision")}</Label>
          <Input
            type="number"
            value={formData.metadata.precision.price}
            onChange={(e) =>
              updateNestedField(
                "metadata.precision.price",
                parseInt(e.target.value) || 0
              )
            }
            placeholder={t("enter_price_precision")}
          />
        </div>
      </div>
    </Card>
  );
};

export default PrecisionStep;
