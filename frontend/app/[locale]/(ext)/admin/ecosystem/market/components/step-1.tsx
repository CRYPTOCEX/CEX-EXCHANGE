import React from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { TrendingUp, Flame, Coins, ArrowLeftRight } from "lucide-react";

export interface BasicInfoStepProps {
  formData: {
    currency: string;
    pair: string;
    isTrending: boolean;
    isHot: boolean;
  };
  updateField: (
    field: "currency" | "pair" | "isTrending" | "isHot",
    value: any
  ) => void;
  tokenOptions: { label: string; value: string; symbol?: string }[];
  isLoadingTokens: boolean;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  formData,
  updateField,
  tokenOptions,
  isLoadingTokens,
}) => {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");

  const filteredCurrency = tokenOptions.filter(
    (opt) => opt.value !== formData.pair
  );
  const filteredPair = tokenOptions.filter(
    (opt) => opt.value !== formData.currency
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          {tCommon("basic_information")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("configure_trading_market_pairs")}
        </p>
      </div>

      {/* Trading Pair Selection */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeftRight className="h-4 w-4 text-primary" />
          <h3 className="font-medium">{t("trading_pair_selection")}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Currency (Base) */}
          <div className="space-y-2">
            <Select
              value={formData.currency}
              onValueChange={(val) => updateField("currency", val)}
            >
              <SelectTrigger
                title={t("base_currency")}
                description={t("base_currency_description")}
                className="w-full"
              >
                <SelectValue placeholder={tCommon("select_currency")} />
              </SelectTrigger>
              <SelectContent search>
                {isLoadingTokens ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {t("loading_tokens")}...
                  </div>
                ) : (
                  filteredCurrency.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Pair (Quote) */}
          <div className="space-y-2">
            <Select
              value={formData.pair}
              onValueChange={(val) => updateField("pair", val)}
            >
              <SelectTrigger
                title={t("quote_currency")}
                description={t("quote_currency_description")}
                className="w-full"
              >
                <SelectValue placeholder={t("select_pair")} />
              </SelectTrigger>
              <SelectContent search>
                {isLoadingTokens ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {t("loading_tokens")}...
                  </div>
                ) : (
                  filteredPair.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Live Preview of Selected Pair */}
        {formData.currency && formData.pair && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              {t("selected_trading_pair")}:
            </p>
            <p className="text-lg font-semibold text-primary">
              {tokenOptions.find((t) => t.value === formData.currency)?.symbol || formData.currency}/
              {tokenOptions.find((t) => t.value === formData.pair)?.symbol || formData.pair}
            </p>
          </div>
        )}
      </Card>

      {/* Market Visibility Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-medium">{t("market_visibility")}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t("market_visibility_description")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* isTrending */}
          <div className="space-y-2">
            <Select
              value={formData.isTrending ? "true" : "false"}
              onValueChange={(val) => updateField("isTrending", val === "true")}
            >
              <SelectTrigger
                title={
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {t("is_trending")}
                  </span>
                }
                description={t("trending_description")}
                className="w-full"
              >
                <SelectValue placeholder={t("is_trending")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    {tCommon("yes")} - {t("show_in_trending")}
                  </span>
                </SelectItem>
                <SelectItem value="false">
                  <span className="flex items-center gap-2">
                    {tCommon("no")} - {t("hide_from_trending")}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* isHot */}
          <div className="space-y-2">
            <Select
              value={formData.isHot ? "true" : "false"}
              onValueChange={(val) => updateField("isHot", val === "true")}
            >
              <SelectTrigger
                title={
                  <span className="flex items-center gap-2">
                    <Flame className="h-4 w-4" />
                    {t("is_hot")}
                  </span>
                }
                description={t("hot_description")}
                className="w-full"
              >
                <SelectValue placeholder={t("is_hot")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">
                  <span className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    {tCommon("yes")} - {t("show_in_hot")}
                  </span>
                </SelectItem>
                <SelectItem value="false">
                  <span className="flex items-center gap-2">
                    {tCommon("no")} - {t("hide_from_hot")}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-blue-500/10 border-blue-500/20">
        <div className="flex gap-3">
          <div className="shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Coins className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("trading_pair_info_title")}</p>
            <p className="text-xs text-muted-foreground">
              {t("trading_pair_info_description")}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BasicInfoStep;
