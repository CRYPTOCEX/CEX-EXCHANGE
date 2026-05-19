import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import {
  Hash,
  BarChart3,
  LineChart,
  Info,
  Calculator,
  Eye,
} from "lucide-react";

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

  // Generate example values based on precision
  const amountExample = (1.23456789).toFixed(formData.metadata.precision.amount);
  const priceExample = (45678.123456).toFixed(formData.metadata.precision.price);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Hash className="h-5 w-5 text-primary" />
          {tCommon("precision")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("configure_the_number_of_decimals_to_display")}
        </p>
      </div>

      {/* Precision Configuration Card */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-4 w-4 text-primary" />
          <h3 className="font-medium">{t("decimal_precision_settings")}</h3>
        </div>

        {/* Precision Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <span className="font-medium text-sm">{tCommon("amount_precision")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('amount_precision_explanation') + ' (' + t('amount_precision_example') + ')'}
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <LineChart className="h-4 w-4 text-cyan-500" />
              <span className="font-medium text-sm">{tCommon("price_precision")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon("price_precision_explanation") + ' (' + t('price_precision_example') + ')'}
            </p>
          </div>
        </div>

        {/* Precision Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              {tCommon("amount_precision")}
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="18"
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
            <p className="text-xs text-muted-foreground">
              {t("amount_precision_helper")}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <LineChart className="h-4 w-4 text-cyan-500" />
              {tCommon("price_precision")}
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="18"
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
            <p className="text-xs text-muted-foreground">
              {t("price_precision_helper")}
            </p>
          </div>
        </div>
      </Card>

      {/* Live Preview Card */}
      <Card className="p-6 bg-linear-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="font-medium">{t("precision_preview")}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Amount Example */}
          <div className="p-4 bg-background rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">
                {t("amount_display_example")}
              </span>
            </div>
            <p className="font-mono text-lg font-semibold">{amountExample}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.metadata.precision.amount} {t("decimal_places")}
            </p>
          </div>

          {/* Price Example */}
          <div className="p-4 bg-background rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <LineChart className="h-4 w-4 text-cyan-500" />
              <span className="text-sm text-muted-foreground">
                {t("price_display_example")}
              </span>
            </div>
            <p className="font-mono text-lg font-semibold">{priceExample}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.metadata.precision.price} {t("decimal_places")}
            </p>
          </div>
        </div>
      </Card>

      {/* Chart Usage Guide */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <LineChart className="h-4 w-4 text-primary" />
          <h3 className="font-medium">{t("where_precision_is_used")}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
              <BarChart3 className="h-5 w-5 text-purple-500" />
            </div>
            <h4 className="font-medium text-sm mb-1">{t("trading_interface")}</h4>
            <p className="text-xs text-muted-foreground">
              {t("trading_interface_precision_usage")}
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center mb-3">
              <LineChart className="h-5 w-5 text-cyan-500" />
            </div>
            <h4 className="font-medium text-sm mb-1">{t("price_charts")}</h4>
            <p className="text-xs text-muted-foreground">
              {t("price_charts_precision_usage")}
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
              <Calculator className="h-5 w-5 text-green-500" />
            </div>
            <h4 className="font-medium text-sm mb-1">{tCommon("order_book")}</h4>
            <p className="text-xs text-muted-foreground">
              {t("order_book_precision_usage")}
            </p>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-purple-500/10 border-purple-500/20">
        <div className="flex gap-3">
          <div className="shrink-0">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Info className="h-4 w-4 text-purple-500" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("precision_info_title")}</p>
            <p className="text-xs text-muted-foreground">
              {t("precision_info_description")}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PrecisionStep;
