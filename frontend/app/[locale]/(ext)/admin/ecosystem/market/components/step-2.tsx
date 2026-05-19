import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import {
  Percent,
  TrendingUp,
  Flame,
  Info,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";

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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Percent className="h-5 w-5 text-primary" />
          {tCommon("metadata")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("configure_fee_settings")}
        </p>
      </div>

      {/* Fee Configuration Card */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Percent className="h-4 w-4 text-primary" />
          <h3 className="font-medium">{tCommon("trading_fees")}</h3>
        </div>

        {/* Fee Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownToLine className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">{tCommon("taker_fee")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("taker_fee_explanation")}
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpFromLine className="h-4 w-4 text-green-500" />
              <span className="font-medium text-sm">{tCommon("maker_fee")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("maker_fee_explanation")}
            </p>
          </div>
        </div>

        {/* Fee Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-blue-500" />
              {tCommon("taker_fee")} (%)
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.metadata.taker}
                onChange={(e) =>
                  updateNestedField(
                    "metadata.taker",
                    parseFloat(e.target.value) || 0
                  )
                }
                placeholder={t("enter_taker_fee")}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("taker_fee_helper")}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ArrowUpFromLine className="h-4 w-4 text-green-500" />
              {tCommon("maker_fee")} (%)
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.metadata.maker}
                onChange={(e) =>
                  updateNestedField(
                    "metadata.maker",
                    parseFloat(e.target.value) || 0
                  )
                }
                placeholder={t("enter_maker_fee")}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("maker_fee_helper")}
            </p>
          </div>
        </div>
      </Card>

      {/* Live Preview Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-4 w-4 text-primary" />
          <h3 className="font-medium">{tCommon("live_preview")}</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Trending Status */}
          <div className="p-3 bg-background rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp
                className={`h-4 w-4 ${
                  formData.isTrending ? "text-green-500" : "text-muted-foreground"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {tCommon("trending")}
              </span>
            </div>
            <p className="font-semibold">
              {formData.isTrending ? tCommon("yes") : tCommon("no")}
            </p>
          </div>

          {/* Hot Status */}
          <div className="p-3 bg-background rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Flame
                className={`h-4 w-4 ${
                  formData.isHot ? "text-orange-500" : "text-muted-foreground"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {tCommon("hot")}
              </span>
            </div>
            <p className="font-semibold">
              {formData.isHot ? tCommon("yes") : tCommon("no")}
            </p>
          </div>

          {/* Taker Fee */}
          <div className="p-3 bg-background rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownToLine className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">
                {tCommon("taker_fee")}
              </span>
            </div>
            <p className="font-semibold">{formData.metadata.taker}%</p>
          </div>

          {/* Maker Fee */}
          <div className="p-3 bg-background rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpFromLine className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">
                {tCommon("maker_fee")}
              </span>
            </div>
            <p className="font-semibold">{formData.metadata.maker}%</p>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-amber-500/10 border-amber-500/20">
        <div className="flex gap-3">
          <div className="shrink-0">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Info className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("fee_info_title")}</p>
            <p className="text-xs text-muted-foreground">
              {t("fee_info_description")}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MetadataStep;
