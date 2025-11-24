import React from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  const t = useTranslations("ext");
  const filteredCurrency = tokenOptions.filter(
    (opt) => opt.value !== formData.pair
  );
  const filteredPair = tokenOptions.filter(
    (opt) => opt.value !== formData.currency
  );

  return (
    <Card className="p-5 space-y-3">
      <h2 className="text-lg font-semibold mb-2">{t("basic_information")}</h2>
      <div className="grid grid-cols-2 gap-5">
        {/* Currency */}
        <div>
          <Label>{t("Currency")}</Label>
          <Select
            value={formData.currency}
            onValueChange={(val) => updateField("currency", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
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
        </div>
        {/* Pair */}
        <div>
          <Label>{t("Pair")}</Label>
          <Select
            value={formData.pair}
            onValueChange={(val) => updateField("pair", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select pair" />
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
        </div>
        {/* isTrending */}
        <div>
          <Label>{t("is_trending")}</Label>
          <Select
            value={formData.isTrending ? "true" : "false"}
            onValueChange={(val) => updateField("isTrending", val === "true")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Is Trending?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t("Yes")}</SelectItem>
              <SelectItem value="false">{t("No")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t("when_enabled_this_the_frontend")}.
          </p>
        </div>
        {/* isHot */}
        <div>
          <Label>{t("is_hot")}</Label>
          <Select
            value={formData.isHot ? "true" : "false"}
            onValueChange={(val) => updateField("isHot", val === "true")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Is Hot?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t("Yes")}</SelectItem>
              <SelectItem value="false">{t("No")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t("when_enabled_this_markets_category")}.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default BasicInfoStep;
