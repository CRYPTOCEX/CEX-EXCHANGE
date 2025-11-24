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
  const t = useTranslations("ext");
  return (
    <Card className="p-5 space-y-3">
      <h2 className="text-lg font-semibold mb-2">{t("Metadata")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {t("configure_market_settings_for_futures")}.
      </p>

      {/* Precision Section */}
      <div>
        <h3 className="text-md font-semibold">{t("Precision")}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("define_the_number_and_prices")}.{" "}
          {t("defaults_are_8_for_amounts_and_6_for_prices")}.
        </p>
        <div className="grid grid-cols-2 gap-5">
          <Input
            title="Amount Precision"
            description="Specify the decimal precision for trade amounts (default is 8)."
            type="number"
            placeholder="Enter amount precision"
            value={formData.metadata.precision.amount}
            onChange={(e) =>
              updateNestedField(
                "metadata.precision.amount",
                parseInt(e.target.value) || 0
              )
            }
          />
          <Input
            title="Price Precision"
            description="Specify the decimal precision for prices (default is 6)."
            type="number"
            placeholder="Enter price precision"
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
        <h3 className="text-md font-semibold">{t("Limits")}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("set_the_minimum_overall_cost")}.{" "}
          {t("for_example_the_minimum_trade_amount_might_be")}.{" "}
          {t("00001_while_the_maximum_is")}.
        </p>
        <div className="grid grid-cols-2 gap-5">
          <Input
            title="Amount Min"
            description="Minimum trade amount allowed."
            type="number"
            placeholder="Enter minimum amount"
            value={formData.metadata.limits.amount.min}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.amount.min",
                parseFloat(e.target.value) || 0
              )
            }
          />
          <Input
            title="Amount Max"
            description="Maximum trade amount allowed."
            type="number"
            placeholder="Enter maximum amount"
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
            title="Price Min"
            description="Minimum price allowed for trades."
            type="number"
            placeholder="Enter minimum price"
            value={formData.metadata.limits.price.min}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.price.min",
                parseFloat(e.target.value) || 0
              )
            }
          />
          <Input
            title="Price Max"
            description="Maximum price allowed for trades."
            type="number"
            placeholder="Enter maximum price"
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
            title="Cost Min"
            description="Minimum total cost for an order."
            type="number"
            placeholder="Enter minimum cost"
            value={formData.metadata.limits.cost.min}
            onChange={(e) =>
              updateNestedField(
                "metadata.limits.cost.min",
                parseFloat(e.target.value) || 0
              )
            }
          />
          <Input
            title="Cost Max"
            description="Maximum total cost for an order."
            type="number"
            placeholder="Enter maximum cost"
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
            description="Enter the leverage value if applicable (e.g., 2x, 5x)."
            type="text"
            placeholder="Enter leverage"
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
