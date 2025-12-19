import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export interface MetadataStepProps {
  formData: {
    metadata: {
      taker: number;
      maker: number;
    };
    isTrending: boolean;
    isHot: boolean;
  };
  updateNestedField: (path: string, value: any) => void;
}

const MetadataStep: React.FC<MetadataStepProps> = ({
  formData,
  updateNestedField,
}) => {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return (
    <Card className="p-5 space-y-3">
      <h2 className="text-lg font-semibold mb-2">{tCommon("metadata")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {t("configure_fee_settings")}.<br />
        <strong>{tCommon("taker_fee")}</strong>
        {t("fee_in_percentage_a_bid")} {t("the_user_executing_the_order_using_a_bid")}<br />
        <strong>{tCommon("maker_fee")}</strong>
        {t("fee_in_percentage_providing_liquidity")} {t("the_user_providing_liquidity")}
      </p>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <Label>{`${tCommon("taker_fee")} (%)`}</Label>
          <Input
            type="number"
            value={formData.metadata.taker}
            onChange={(e) =>
              updateNestedField(
                "metadata.taker",
                parseFloat(e.target.value) || 0
              )
            }
            placeholder={t("enter_taker_fee")}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("the_fee_collected_from_the_taker_as_a_percentage")}.
          </p>
        </div>
        <div>
          <Label>{`${tCommon("maker_fee")} (%)`}</Label>
          <Input
            type="number"
            value={formData.metadata.maker}
            onChange={(e) =>
              updateNestedField(
                "metadata.maker",
                parseFloat(e.target.value) || 0
              )
            }
            placeholder={t("enter_maker_fee")}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("the_fee_collected_from_the_maker_as_a_percentage")}.
          </p>
        </div>
      </div>
      {/* Live Preview */}
      <Card className="p-4 border mt-4">
        <h3 className="text-md font-semibold mb-1">{tCommon("live_preview")}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {tCommon("trending")}
          {formData.isTrending ? "Yes" : "No"} <br />
          {tCommon("hot")}
          {formData.isHot ? "Yes" : "No"} <br />
          {tCommon("taker_fee")}
          {formData.metadata.taker}% <br />
          {tCommon("maker_fee")}
          {formData.metadata.maker}%
        </p>
      </Card>
    </Card>
  );
};

export default MetadataStep;
