import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import {
  Gauge,
  ArrowDownUp,
  DollarSign,
  Coins,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

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
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");

  // Validation helpers
  const isValidRange = (min: number, max: number) => max === 0 || max >= min;
  const amountValid = isValidRange(
    formData.metadata.limits.amount.min,
    formData.metadata.limits.amount.max
  );
  const priceValid = isValidRange(
    formData.metadata.limits.price.min,
    formData.metadata.limits.price.max
  );
  const costValid = isValidRange(
    formData.metadata.limits.cost.min,
    formData.metadata.limits.cost.max
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          {tCommon("limits")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("configure_trading_limits")}
        </p>
      </div>

      {/* Amount Limits Card */}
      <Card className={`p-6 ${!amountValid ? "border-red-500/50" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-purple-500" />
            <h3 className="font-medium">{t("amount_limits")}</h3>
          </div>
          {amountValid ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t("amount_limits_description")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {tExt("minimum")}
            </Label>
            <Input
              type="number"
              step="0.00001"
              min="0"
              value={formData.metadata.limits.amount.min}
              onChange={(e) =>
                updateNestedField(
                  "metadata.limits.amount.min",
                  parseFloat(e.target.value) || 0
                )
              }
              placeholder={t("enter_minimum_amount")}
            />
            <p className="text-xs text-muted-foreground">
              {t("minimum_amount_helper")}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {t("maximum")}
            </Label>
            <Input
              type="number"
              step="0.00001"
              min="0"
              value={formData.metadata.limits.amount.max}
              onChange={(e) =>
                updateNestedField(
                  "metadata.limits.amount.max",
                  parseFloat(e.target.value) || 0
                )
              }
              placeholder={t("enter_maximum_amount")}
            />
            <p className="text-xs text-muted-foreground">
              {t("maximum_amount_helper")}
            </p>
          </div>
        </div>

        {!amountValid && (
          <p className="text-xs text-red-500 mt-2">
            {t("max_must_be_greater_than_min")}
          </p>
        )}
      </Card>

      {/* Price Limits Card */}
      <Card className={`p-6 ${!priceValid ? "border-red-500/50" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-cyan-500" />
            <h3 className="font-medium">{t("price_limits")}</h3>
          </div>
          {priceValid ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t("price_limits_description")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {tExt("minimum")}
            </Label>
            <Input
              type="number"
              step="0.00001"
              min="0"
              value={formData.metadata.limits.price.min}
              onChange={(e) =>
                updateNestedField(
                  "metadata.limits.price.min",
                  parseFloat(e.target.value) || 0
                )
              }
              placeholder={t("enter_minimum_price")}
            />
            <p className="text-xs text-muted-foreground">
              {t("minimum_price_helper")}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {t("maximum")}
            </Label>
            <Input
              type="number"
              step="0.00001"
              min="0"
              value={formData.metadata.limits.price.max}
              onChange={(e) =>
                updateNestedField(
                  "metadata.limits.price.max",
                  parseFloat(e.target.value) || 0
                )
              }
              placeholder={t("enter_maximum_price")}
            />
            <p className="text-xs text-muted-foreground">
              {t("maximum_price_helper")}
            </p>
          </div>
        </div>

        {!priceValid && (
          <p className="text-xs text-red-500 mt-2">
            {t("max_must_be_greater_than_min")}
          </p>
        )}
      </Card>

      {/* Cost Limits Card */}
      <Card className={`p-6 ${!costValid ? "border-red-500/50" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-green-500" />
            <h3 className="font-medium">{t("cost_limits")}</h3>
          </div>
          {costValid ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t("cost_limits_description")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {tExt("minimum")}
            </Label>
            <Input
              type="number"
              step="0.00001"
              min="0"
              value={formData.metadata.limits.cost.min}
              onChange={(e) =>
                updateNestedField(
                  "metadata.limits.cost.min",
                  parseFloat(e.target.value) || 0
                )
              }
              placeholder={t("enter_minimum_cost")}
            />
            <p className="text-xs text-muted-foreground">
              {t("minimum_cost_helper")}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {t("maximum")}
            </Label>
            <Input
              type="number"
              step="0.00001"
              min="0"
              value={formData.metadata.limits.cost.max}
              onChange={(e) =>
                updateNestedField(
                  "metadata.limits.cost.max",
                  parseFloat(e.target.value) || 0
                )
              }
              placeholder={t("enter_maximum_cost")}
            />
            <p className="text-xs text-muted-foreground">
              {t("maximum_cost_helper")}
            </p>
          </div>
        </div>

        {!costValid && (
          <p className="text-xs text-red-500 mt-2">
            {t("max_must_be_greater_than_min")}
          </p>
        )}
      </Card>

      {/* Summary Card */}
      <Card className="p-6 bg-linear-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="h-4 w-4 text-primary" />
          <h3 className="font-medium">{t("limits_summary")}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-background rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">{tCommon("amount")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.metadata.limits.amount.min} - {formData.metadata.limits.amount.max || t("unlimited")}
            </p>
          </div>

          <div className="p-4 bg-background rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-cyan-500" />
              <span className="text-sm font-medium">{tCommon("price")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.metadata.limits.price.min} - {formData.metadata.limits.price.max || t("unlimited")}
            </p>
          </div>

          <div className="p-4 bg-background rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">{tCommon("cost")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.metadata.limits.cost.min} - {formData.metadata.limits.cost.max || t("unlimited")}
            </p>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-green-500/10 border-green-500/20">
        <div className="flex gap-3">
          <div className="shrink-0">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Info className="h-4 w-4 text-green-500" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("limits_info_title")}</p>
            <p className="text-xs text-muted-foreground">
              {t("limits_info_description")}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LimitsStep;
