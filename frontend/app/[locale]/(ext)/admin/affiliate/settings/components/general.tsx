"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

interface AffiliateGeneralSettingsSectionProps {
  settings?: {
    RequireApproval?: boolean;
    MlmSystem?: "DIRECT" | "BINARY" | "UNILEVEL";
    BinaryLevels?: number;
    UnilevelLevels?: number;
    [key: string]: any; // For dynamic level percentages
  };
  onUpdate: (key: string, value: any) => void;
}

export default function AffiliateGeneralSettingsSection({
  settings = {},
  onUpdate,
}: AffiliateGeneralSettingsSectionProps) {
  const t = useTranslations("ext");
  const safeSettings = {
    RequireApproval: settings.RequireApproval ?? false,
    MlmSystem: settings.MlmSystem ?? "DIRECT",
    BinaryLevels: settings.BinaryLevels ?? 2,
    UnilevelLevels: settings.UnilevelLevels ?? 2,
  };

  // Local state to track the number of levels
  const [binaryLevels, setBinaryLevels] = useState(safeSettings.BinaryLevels);
  const [unilevelLevels, setUnilevelLevels] = useState(
    safeSettings.UnilevelLevels
  );

  // Local state to track level percentages
  const [binaryPercentages, setBinaryPercentages] = useState<
    Record<string, number>
  >({});
  const [unilevelPercentages, setUnilevelPercentages] = useState<
    Record<string, number>
  >({});

  // Initialize level percentages from settings
  useEffect(() => {
    const newBinaryPercentages: Record<string, number> = {};
    const newUnilevelPercentages: Record<string, number> = {};

    // Extract binary level percentages from settings
    Object.keys(settings).forEach((key) => {
      if (key.startsWith("BinaryLevel")) {
        newBinaryPercentages[key] = settings[key] || 0;
      } else if (key.startsWith("UnilevelLevel")) {
        newUnilevelPercentages[key] = settings[key] || 0;
      }
    });

    setBinaryPercentages(newBinaryPercentages);
    setUnilevelPercentages(newUnilevelPercentages);
  }, [settings]);

  // Update local state when settings change
  useEffect(() => {
    setBinaryLevels(safeSettings.BinaryLevels);
    setUnilevelLevels(safeSettings.UnilevelLevels);
  }, [safeSettings.BinaryLevels, safeSettings.UnilevelLevels]);

  // Handle level number change
  const handleBinaryLevelsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value);
    if (value >= 2 && value <= 7) {
      setBinaryLevels(value);
      onUpdate("BinaryLevels", value);

      // Update MLM settings with the new level count
      const binarySettings = {
        binary: {
          levels: value,
          levelsPercentage: Array.from({ length: value }, (_, i) => ({
            level: i + 1,
            value: binaryPercentages[`BinaryLevel${i + 1}`] || 0,
          })),
        },
      };
      onUpdate("MlmSettings", JSON.stringify(binarySettings));
    }
  };

  const handleUnilevelLevelsChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number.parseInt(e.target.value);
    if (value >= 2 && value <= 7) {
      setUnilevelLevels(value);
      onUpdate("UnilevelLevels", value);

      // Update MLM settings with the new level count
      const unilevelSettings = {
        unilevel: {
          levels: value,
          levelsPercentage: Array.from({ length: value }, (_, i) => ({
            level: i + 1,
            value: unilevelPercentages[`UnilevelLevel${i + 1}`] || 0,
          })),
        },
      };
      onUpdate("MlmSettings", JSON.stringify(unilevelSettings));
    }
  };

  // Handle MLM system change
  const handleMlmSystemChange = (value: string) => {
    onUpdate("MlmSystem", value);

    // Update MLM settings based on the selected system
    if (value === "BINARY") {
      const binarySettings = {
        binary: {
          levels: binaryLevels,
          levelsPercentage: Array.from({ length: binaryLevels }, (_, i) => ({
            level: i + 1,
            value: binaryPercentages[`BinaryLevel${i + 1}`] || 0,
          })),
        },
      };
      onUpdate("MlmSettings", JSON.stringify(binarySettings));
    } else if (value === "UNILEVEL") {
      const unilevelSettings = {
        unilevel: {
          levels: unilevelLevels,
          levelsPercentage: Array.from({ length: unilevelLevels }, (_, i) => ({
            level: i + 1,
            value: unilevelPercentages[`UnilevelLevel${i + 1}`] || 0,
          })),
        },
      };
      onUpdate("MlmSettings", JSON.stringify(unilevelSettings));
    } else {
      // For DIRECT, just set an empty object
      onUpdate("MlmSettings", JSON.stringify({}));
    }
  };

  // Handle level percentage change
  const handleBinaryPercentageChange = (level: number, value: string) => {
    const numValue = Number.parseFloat(value);
    const key = `BinaryLevel${level}`;

    // Update local state
    setBinaryPercentages((prev) => ({
      ...prev,
      [key]: numValue,
    }));

    // Update parent component
    onUpdate(key, numValue);

    // Update MLM settings
    const binarySettings = {
      binary: {
        levels: binaryLevels,
        levelsPercentage: Array.from({ length: binaryLevels }, (_, i) => ({
          level: i + 1,
          value:
            i + 1 === level
              ? numValue
              : binaryPercentages[`BinaryLevel${i + 1}`] || 0,
        })),
      },
    };
    onUpdate("MlmSettings", JSON.stringify(binarySettings));
  };

  const handleUnilevelPercentageChange = (level: number, value: string) => {
    const numValue = Number.parseFloat(value);
    const key = `UnilevelLevel${level}`;

    // Update local state
    setUnilevelPercentages((prev) => ({
      ...prev,
      [key]: numValue,
    }));

    // Update parent component
    onUpdate(key, numValue);

    // Update MLM settings
    const unilevelSettings = {
      unilevel: {
        levels: unilevelLevels,
        levelsPercentage: Array.from({ length: unilevelLevels }, (_, i) => ({
          level: i + 1,
          value:
            i + 1 === level
              ? numValue
              : unilevelPercentages[`UnilevelLevel${i + 1}`] || 0,
        })),
      },
    };
    onUpdate("MlmSettings", JSON.stringify(unilevelSettings));
  };

  return (
    <div className="space-y-6 pt-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <Label
            htmlFor="mlmSystem"
            className="block text-sm font-medium mb-1.5"
          >
            {t("mlm_system")}
          </Label>
          <Select
            value={safeSettings.MlmSystem}
            onValueChange={handleMlmSystemChange}
          >
            <SelectTrigger id="mlmSystem" className="w-full">
              <SelectValue placeholder="Select MLM system" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DIRECT">{t("DIRECT")}</SelectItem>
              <SelectItem value="BINARY">{t("BINARY")}</SelectItem>
              <SelectItem value="UNILEVEL">{t("UNILEVEL")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {t("select_the_type_affiliate_program")}.
          </p>
        </div>

        {safeSettings.MlmSystem === "BINARY" && (
          <div>
            <Label
              htmlFor="binaryLevels"
              className="block text-sm font-medium mb-1.5"
            >
              {t("binary_levels")}
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
              {t("number_of_levels_in_the_binary_structure_(2-7)")}.
            </p>
          </div>
        )}

        {safeSettings.MlmSystem === "UNILEVEL" && (
          <div>
            <Label
              htmlFor="unilevelLevels"
              className="block text-sm font-medium mb-1.5"
            >
              {t("unilevel_levels")}
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
              {t("number_of_levels_in_the_unilevel_structure_(2-7)")}.
            </p>
          </div>
        )}
      </div>

      {/* Dynamic Level Percentages for Binary */}
      {safeSettings.MlmSystem === "BINARY" && binaryLevels > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-medium mb-3">
            {t("binary_level_percentages")}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: binaryLevels }, (_, i) => {
              const level = i + 1;
              const key = `BinaryLevel${level}`;
              return (
                <div key={`binary-level-${level}`}>
                  <Label
                    htmlFor={key}
                    className="block text-sm font-medium mb-1.5"
                  >
                    {t("Level")}
                    {level}
                    {t("Percentage")}
                  </Label>
                  <Input
                    id={key}
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={binaryPercentages[key] || settings[key] || ""}
                    onChange={(e) =>
                      handleBinaryPercentageChange(level, e.target.value)
                    }
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("set_the_commission_binary_structure")}.
          </p>
        </div>
      )}

      {/* Dynamic Level Percentages for Unilevel */}
      {safeSettings.MlmSystem === "UNILEVEL" && unilevelLevels > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-medium mb-3">
            {t("unilevel_level_percentages")}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: unilevelLevels }, (_, i) => {
              const level = i + 1;
              const key = `UnilevelLevel${level}`;
              return (
                <div key={`unilevel-level-${level}`}>
                  <Label
                    htmlFor={key}
                    className="block text-sm font-medium mb-1.5"
                  >
                    {t("Level")}
                    {level}
                    {t("Percentage")}
                  </Label>
                  <Input
                    id={key}
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={unilevelPercentages[key] || settings[key] || ""}
                    onChange={(e) =>
                      handleUnilevelPercentageChange(level, e.target.value)
                    }
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("set_the_commission_unilevel_structure")}.
          </p>
        </div>
      )}

      {/* Switches for Program Settings */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border p-4 rounded-lg">
          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t("require_approval")}
            </span>
            <p className="text-xs text-muted-foreground">
              {t("when_enabled_new_admin_approval")}.
            </p>
          </div>
          <Switch
            id="requireApproval"
            checked={safeSettings.RequireApproval}
            onCheckedChange={(checked) => onUpdate("RequireApproval", checked)}
          />
        </div>
      </div>
    </div>
  );
}
