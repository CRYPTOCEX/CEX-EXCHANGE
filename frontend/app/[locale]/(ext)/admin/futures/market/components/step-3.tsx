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
  const t = useTranslations("ext");
  return (
    <Card className="p-5 space-y-3">
      <h2 className="text-lg font-semibold mb-2">{t("Fees")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {t("configure_fee_settings")}.<br />
        <strong>{t("taker_fee")}</strong>
        {t("this_fee_(in_an_order")}.<br />
        <strong>{t("maker_fee")}</strong>
        {t("this_fee_(in_provides_liquidity")}.
      </p>
      <div className="grid grid-cols-2 gap-5">
        <Input
          title="Taker Fee (%)"
          description="Enter the fee percentage charged from the taker when executing an order."
          type="number"
          placeholder="Enter taker fee"
          value={formData.metadata.taker}
          onChange={(e) =>
            updateNestedField("metadata.taker", parseFloat(e.target.value) || 0)
          }
        />
        <Input
          title="Maker Fee (%)"
          description="Enter the fee percentage charged from the maker when providing liquidity."
          type="number"
          placeholder="Enter maker fee"
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
