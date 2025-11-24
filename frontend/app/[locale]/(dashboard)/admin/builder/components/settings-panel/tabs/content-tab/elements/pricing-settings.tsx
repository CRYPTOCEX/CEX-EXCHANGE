"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash, ArrowUp, ArrowDown } from "lucide-react";
import { LabeledInput } from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function PricingSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  const t = useTranslations("dashboard");
  const moveFeature = (index: number, direction: "up" | "down") => {
    if (!settings.features) return;
    const features = [...settings.features];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= features.length) return;
    [features[index], features[newIndex]] = [
      features[newIndex],
      features[index],
    ];
    onSettingChange("features", features);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <LabeledInput
          id="planName"
          label="Plan Name"
          value={settings.planName || "Basic Plan"}
          onChange={(e) => onSettingChange("planName", e.target.value)}
          className="h-8 text-sm"
        />
        <LabeledInput
          id="price"
          label="Price"
          value={settings.price || "$19"}
          onChange={(e) => onSettingChange("price", e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex items-center space-x-2 pt-1">
        <Switch
          checked={settings.highlighted || false}
          onCheckedChange={(checked) => onSettingChange("highlighted", checked)}
          id="highlighted"
        />
        <Label htmlFor="highlighted" className="text-sm">
          {t("highlight_this_plan")}
        </Label>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs font-medium">{t("Features")}</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const features = [...(settings.features || []), "New feature"];
              onSettingChange("features", features);
            }}
            className="h-6 text-xs gap-1"
          >
            <Plus className="h-3 w-3 mr-1" />
            {t("add_feature")}
          </Button>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-1">
          {(settings.features || []).map((feature: string, index: number) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-gray-50 rounded p-1"
            >
              <Input
                value={feature}
                onChange={(e) => {
                  const newFeatures = [...(settings.features || [])];
                  newFeatures[index] = e.target.value;
                  onSettingChange("features", newFeatures);
                }}
                className="h-7 text-xs flex-1"
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveFeature(index, "up")}
                  disabled={index === 0}
                  className={`h-7 w-7 p-0 ${index === 0 ? "opacity-0" : ""}`}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveFeature(index, "down")}
                  disabled={index === (settings.features || []).length - 1}
                  className={`h-7 w-7 p-0 ${index === (settings.features || []).length - 1 ? "opacity-0" : ""}`}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const newFeatures = [...(settings.features || [])];
                    newFeatures.splice(index, 1);
                    onSettingChange("features", newFeatures);
                  }}
                  className="h-7 w-7 p-0 text-red-500"
                >
                  <Trash className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {(settings.features || []).length === 0 && (
            <div className="text-center py-2 text-gray-500 text-xs">
              {t("no_features_added_yet")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
