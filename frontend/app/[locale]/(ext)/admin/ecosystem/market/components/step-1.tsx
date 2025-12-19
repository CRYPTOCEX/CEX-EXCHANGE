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
  tokenOptions: { label: string; value: string }[];
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
    <Card className="p-5 space-y-3">
      <h2 className="text-lg font-semibold mb-2">{tDashboardAdmin("basic_information")}</h2>
      <div className="grid grid-cols-2 gap-5">
        {/* Currency */}
        <Select
          value={formData.currency}
          onValueChange={(val) => updateField("currency", val)}
        >
          <SelectTrigger title={tCommon("currency")}>
            <SelectValue placeholder={tCommon("select_currency")} />
          </SelectTrigger>
          <SelectContent search>
            {isLoadingTokens ? (
              <div className="px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">
                {t("loading_tokens")}.
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
        {/* Pair */}
        <Select
          value={formData.pair}
          onValueChange={(val) => updateField("pair", val)}
        >
          <SelectTrigger title={tDashboardAdmin("pair")}>
            <SelectValue placeholder={t("select_pair")} />
          </SelectTrigger>
          <SelectContent search>
            {isLoadingTokens ? (
              <div className="px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">
                {t("loading_tokens")}.
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
        {/* isTrending */}
        <Select
          value={formData.isTrending ? "true" : "false"}
          onValueChange={(val) => updateField("isTrending", val === "true")}
        >
          <SelectTrigger
            title={t("is_trending")}
            description={t("when_enabled_this_the_frontend")}
          >
            <SelectValue placeholder={t('is_trending')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">{tCommon("yes")}</SelectItem>
            <SelectItem value="false">{tCommon("no")}</SelectItem>
          </SelectContent>
        </Select>
        {/* isHot */}
        <Select
          value={formData.isHot ? "true" : "false"}
          onValueChange={(val) => updateField("isHot", val === "true")}
        >
          <SelectTrigger
            title={t("is_hot")}
            description={t("when_enabled_this_markets_category")}
          >
            <SelectValue placeholder={t('is_hot')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">{tCommon("yes")}</SelectItem>
            <SelectItem value="false">{tCommon("no")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
};

export default BasicInfoStep;
