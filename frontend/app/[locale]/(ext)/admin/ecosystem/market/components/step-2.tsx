import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("ext");
  return (
    <Card className="p-5 space-y-3">
      <h2 className="text-lg font-semibold mb-2">{t("Metadata")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {t("configure_fee_settings")}.<br />
        <strong>{t("taker_fee")}</strong>
        {t("fee_(in_percentage)_a_bid)")}.<br />
        <strong>{t("maker_fee")}</strong>
        {t("fee_(in_percentage)_providing_liquidity)")}.
      </p>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <Label>{t("taker_fee_(%)")}</Label>
          <Input
            type="number"
            value={formData.metadata.taker}
            onChange={(e) =>
              updateNestedField(
                "metadata.taker",
                parseFloat(e.target.value) || 0
              )
            }
            placeholder="Enter taker fee"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("the_fee_collected_from_the_taker_as_a_percentage")}.
          </p>
        </div>
        <div>
          <Label>{t("maker_fee_(%)")}</Label>
          <Input
            type="number"
            value={formData.metadata.maker}
            onChange={(e) =>
              updateNestedField(
                "metadata.maker",
                parseFloat(e.target.value) || 0
              )
            }
            placeholder="Enter maker fee"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("the_fee_collected_from_the_maker_as_a_percentage")}.
          </p>
        </div>
      </div>
      {/* Live Preview */}
      <Card className="p-4 border mt-4">
        <h3 className="text-md font-semibold mb-1">{t("live_preview")}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("trending")}
          {formData.isTrending ? "Yes" : "No"} <br />
          {t("hot")}
          {formData.isHot ? "Yes" : "No"} <br />
          {t("taker_fee")}
          {formData.metadata.taker}% <br />
          {t("maker_fee")}
          {formData.metadata.maker}%
        </p>
      </Card>
    </Card>
  );
};

export default MetadataStep;
