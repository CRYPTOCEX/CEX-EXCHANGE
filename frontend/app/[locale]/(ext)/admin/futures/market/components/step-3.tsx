import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

export interface FuturesFeesStepProps {
  formData: {
    metadata: {
      taker: number;
      maker: number;
    };
  };
  updateNestedField: (path: string, value: any) => void;
}

const FuturesFeesStep: React.FC<FuturesFeesStepProps> = ({
  formData,
  updateNestedField,
}) => {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return (
    <Card className="p-5 space-y-3">
      <h2 className="text-lg font-semibold mb-2">{tCommon("fees")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {t("configure_fee_settings")}.<br />
        <strong>{tCommon("taker_fee")}</strong>
        {t("this_fee_in_an_order")}.<br />
        <strong>{tCommon("maker_fee")}</strong>
        {t("this_fee_in_provides_liquidity")}.
      </p>
      <div className="grid grid-cols-2 gap-5">
        <Input
          title={`${tCommon("taker_fee")} (%)`}
          description={t("enter_the_fee_percentage_charged_from")}
          type="number"
          placeholder={t("enter_taker_fee")}
          value={formData.metadata.taker}
          onChange={(e) =>
            updateNestedField("metadata.taker", parseFloat(e.target.value) || 0)
          }
        />
        <Input
          title={`${tCommon("maker_fee")} (%)`}
          description={t("enter_the_fee_percentage_charged_from_1")}
          type="number"
          placeholder={t("enter_maker_fee")}
          value={formData.metadata.maker}
          onChange={(e) =>
            updateNestedField("metadata.maker", parseFloat(e.target.value) || 0)
          }
        />
      </div>
    </Card>
  );
};

export default FuturesFeesStep;
