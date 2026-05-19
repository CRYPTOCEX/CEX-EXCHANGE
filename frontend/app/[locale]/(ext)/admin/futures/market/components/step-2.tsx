import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

export interface FuturesMetadataStepProps {
  formData: {
    metadata: {
      precision: { amount: number; price: number };
      limits: {
        amount: { min: number; max: number };
        price: { min: number; max: number };
        cost: { min: number; max: number };
        leverage: string;
      };
    };
  };
  updateNestedField: (path: string, value: any) => void;
}

const FuturesMetadataStep: React.FC<FuturesMetadataStepProps> = ({
  formData,
  updateNestedField,
}) => {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return (
    <Card className="p-5 space-y-3">
      <h2 className="text-lg font-semibold mb-2">{tCommon("metadata")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {t("configure_market_settings_for_futures")}.
      </p>

      {/* Precision Section */}
      <div>
        <h3 className="text-md font-semibold">{tCommon("precision")}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("define_the_number_and_prices")}.{" "}
          {t("defaults_are_8_for_amounts_and_6_for_prices")}.
        </p>
        <div className="grid grid-cols-2 gap-5">
          <Input
            title={tCommon("amount_precision")}
            description={t("specify_the_decimal_precision_for_trade")}
            type="number"
            placeholder={t("enter_amount_precision")}
            value={formData.metadata.precision.amount}
            onChange={(e) =>
              updateNestedField(
                "metadata.precision.amount",
                parseInt(e.target.value) || 0
              )
            }
          />
          <Input
            title={tCommon("price_precision")}
            description={t("specify_the_decimal_precision_for_prices")}
            type="number"
            placeholder={t("enter_price_precision")}
            value={formData.metadata.precision.price}
            onChange={(e) =>
              updateNestedField(
                "metadata.precision.price",
                parseInt(e.target.value) || 0
              )
            }
          />
        </div>
      </div>

      {/* Limits Section */}
      <div className="mt-4">
        <h3 className="text-md font-semibold">{tCommon("limits")}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("set_the_minimum_overall_cost")}.{" "}
          {t("for_example_the_minimum_trade_amount_might_be")}.{" "}
          {`00001 ${tCommon('while_the_maximum_is_10000')}`}.
        </p>
        <div className="grid grid-cols-2 gap-5">
          <Input
            title={t("amount_min")}
            description={t("minimum_trade_amount_allowed")}
            type="number"
            placeholder={t("enter_minimum_amount")}
            value={formData.metadata.limits.amount.min}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.amount.min",
                parseFloat(e.target.value) || 0
              )
            }
          />
          <Input
            title={t("amount_max")}
            description={t("maximum_trade_amount_allowed")}
            type="number"
            placeholder={t("enter_maximum_amount")}
            value={formData.metadata.limits.amount.max}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.amount.max",
                parseFloat(e.target.value) || 0
              )
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-5 mt-3">
          <Input
            title={t("price_min")}
            description={t("minimum_price_allowed_for_trades")}
            type="number"
            placeholder={t("enter_minimum_price")}
            value={formData.metadata.limits.price.min}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.price.min",
                parseFloat(e.target.value) || 0
              )
            }
          />
          <Input
            title={t("price_max")}
            description={t("maximum_price_allowed_for_trades")}
            type="number"
            placeholder={t("enter_maximum_price")}
            value={formData.metadata.limits.price.max}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.price.max",
                parseFloat(e.target.value) || 0
              )
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-5 mt-3">
          <Input
            title={t("cost_min")}
            description={t("minimum_total_cost_for_an_order")}
            type="number"
            placeholder={t("enter_minimum_cost")}
            value={formData.metadata.limits.cost.min}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.cost.min",
                parseFloat(e.target.value) || 0
              )
            }
          />
          <Input
            title={t("cost_max")}
            description={t("maximum_total_cost_for_an_order")}
            type="number"
            placeholder={t("enter_maximum_cost")}
            value={formData.metadata.limits.cost.max}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.cost.max",
                parseFloat(e.target.value) || 0
              )
            }
          />
        </div>
        <div className="mt-3">
          <Input
            title="Leverage"
            description={t("enter_the_leverage_value_if_applicable_e_g_2x_5x")}
            type="text"
            placeholder={t("enter_leverage")}
            value={formData.metadata.limits.leverage}
            onChange={(e) =>
              updateNestedField("metadata.limits.leverage", e.target.value)
            }
          />
        </div>
      </div>
    </Card>
  );
};

export default FuturesMetadataStep;
