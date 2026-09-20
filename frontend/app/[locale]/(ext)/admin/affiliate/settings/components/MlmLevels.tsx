"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomComponentProps } from "@/components/admin/settings";
import { Network, Percent, Users } from "lucide-react";
import { useTranslations } from "next-intl";

export default function MlmLevelsField({
  formValues,
  handleChange,
}: CustomComponentProps) {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  // Get MLM system type
  const mlmSystem = formValues.affiliateMlmSystem || "DIRECT";

  // Get levels count
  const binaryLevels = parseInt(formValues.affiliateBinaryLevels) || 2;
  const unilevelLevels = parseInt(formValues.affiliateUnilevelLevels) || 2;

  // Parse level percentages from form values
  const getBinaryPercentages = (): Record<string, number> => {
    const percentages: Record<string, number> = {};
    for (let i = 1; i <= 7; i++) {
      const key = `affiliateBinaryLevel${i}`;
      percentages[key] = parseFloat(formValues[key]) || 0;
    }
    return percentages;
  };

  const getUnilevelPercentages = (): Record<string, number> => {
    const percentages: Record<string, number> = {};
    for (let i = 1; i <= 7; i++) {
      const key = `affiliateUnilevelLevel${i}`;
      percentages[key] = parseFloat(formValues[key]) || 0;
    }
    return percentages;
  };

  const [binaryPercentages, setBinaryPercentages] = useState(getBinaryPercentages);
  const [unilevelPercentages, setUnilevelPercentages] = useState(getUnilevelPercentages);

  // Update local state when form values change
  useEffect(() => {
    setBinaryPercentages(getBinaryPercentages());
    setUnilevelPercentages(getUnilevelPercentages());
  }, [formValues]);

  const handleMlmSystemChange = (value: string) => {
    handleChange("affiliateMlmSystem", value);
  };

  const handleBinaryLevelsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value >= 2 && value <= 7) {
      handleChange("affiliateBinaryLevels", String(value));
    }
  };

  const handleUnilevelLevelsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value >= 2 && value <= 7) {
      handleChange("affiliateUnilevelLevels", String(value));
    }
  };

  const handleBinaryPercentageChange = (level: number, value: string) => {
    const key = `affiliateBinaryLevel${level}`;
    const numValue = parseFloat(value) || 0;
    setBinaryPercentages(prev => ({ ...prev, [key]: numValue }));
    handleChange(key, String(numValue));
  };

  const handleUnilevelPercentageChange = (level: number, value: string) => {
    const key = `affiliateUnilevelLevel${level}`;
    const numValue = parseFloat(value) || 0;
    setUnilevelPercentages(prev => ({ ...prev, [key]: numValue }));
    handleChange(key, String(numValue));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-purple-500/10">
          <Network className="w-4 h-4 text-purple-500" />
        </div>
        <div>
          <Label className="text-sm font-medium">{t("mlm_system_configuration")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("configure_your_multi_level_marketing_structure")}
          </p>
        </div>
      </div>

      {/* MLM System Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="mlmSystem" className="block text-sm font-medium mb-1.5">
            {tExt("mlm_system_type")}
          </Label>
          <Select value={mlmSystem} onValueChange={handleMlmSystemChange}>
            <SelectTrigger id="mlmSystem" className="w-full">
              <SelectValue placeholder={t("select_mlm_system")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DIRECT">{t("direct_referral")}</SelectItem>
              <SelectItem value="BINARY">Binary</SelectItem>
              <SelectItem value="UNILEVEL">Unilevel</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {t("select_the_type_of_affiliate_program_structure")}
          </p>
        </div>

        {/* Binary Levels Count */}
        {mlmSystem === "BINARY" && (
          <div>
            <Label htmlFor="binaryLevels" className="block text-sm font-medium mb-1.5">
              {tCommon("binary_levels")}
            </Label>
            <Input
              id="binaryLevels"
              type="number"
              min={2}
              max={7}
              step={1}
              value={binaryLevels}
              onChange={handleBinaryLevelsChange}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('number_of_levels_in_the_binary_structure_2_7')}
            </p>
          </div>
        )}

        {/* Unilevel Levels Count */}
        {mlmSystem === "UNILEVEL" && (
          <div>
            <Label htmlFor="unilevelLevels" className="block text-sm font-medium mb-1.5">
              {tCommon("unilevel_levels")}
            </Label>
            <Input
              id="unilevelLevels"
              type="number"
              min={2}
              max={7}
              step={1}
              value={unilevelLevels}
              onChange={handleUnilevelLevelsChange}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('number_of_levels_in_the_unilevel_structure_2_7')}
            </p>
          </div>
        )}
      </div>

      {/* Binary Level Percentages */}
      {mlmSystem === "BINARY" && binaryLevels > 0 && (
        <div className="mt-6 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-4 h-4 text-purple-500" />
            <h4 className="text-sm font-medium">{t("binary_level_percentages")}</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: binaryLevels }, (_, i) => {
              const level = i + 1;
              const key = `affiliateBinaryLevel${level}`;
              return (
                <div key={`binary-level-${level}`}>
                  <Label htmlFor={key} className="block text-xs font-medium mb-1.5">
                    Level {level} (%)
                  </Label>
                  <Input
                    id={key}
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={binaryPercentages[key] || ""}
                    onChange={(e) => handleBinaryPercentageChange(level, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {tCommon("set_the_commission_binary_structure")}
          </p>
        </div>
      )}

      {/* Unilevel Level Percentages */}
      {mlmSystem === "UNILEVEL" && unilevelLevels > 0 && (
        <div className="mt-6 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-4 h-4 text-purple-500" />
            <h4 className="text-sm font-medium">{t("unilevel_level_percentages")}</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: unilevelLevels }, (_, i) => {
              const level = i + 1;
              const key = `affiliateUnilevelLevel${level}`;
              return (
                <div key={`unilevel-level-${level}`}>
                  <Label htmlFor={key} className="block text-xs font-medium mb-1.5">
                    Level {level} (%)
                  </Label>
                  <Input
                    id={key}
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={unilevelPercentages[key] || ""}
                    onChange={(e) => handleUnilevelPercentageChange(level, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {tCommon("set_the_commission_binary_structure")}
          </p>
        </div>
      )}

      {/* Direct Referral Info */}
      {mlmSystem === "DIRECT" && (
        <div className="mt-6 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-medium">{t("direct_referral_system")}</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("direct_referral_system_pays_commissions_only")}
          </p>
        </div>
      )}
    </div>
  );
}
