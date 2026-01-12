"use client";

import React, { useState } from "react";
import {
  Shield,
  Scale,
  Flame,
  Check,
  ArrowRight,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { BinarySettings, PresetInfo } from "../types";
import { useTranslations } from "next-intl";

// Alias for Preset type
type Preset = PresetInfo;

interface PresetSelectorProps {
  presets: Preset[];
  currentSettings: BinarySettings;
  onApply: (presetId: string) => void;
  currentPreset?: string;
}

const PRESET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  conservative: Shield,
  balanced: Scale,
  aggressive: Flame,
};

const PRESET_COLORS: Record<string, string> = {
  conservative: "#22c55e",
  balanced: "#3b82f6",
  aggressive: "#f97316",
};

export function PresetSelector({
  presets,
  currentSettings,
  onApply,
  currentPreset,
}: PresetSelectorProps) {
  const t = useTranslations("dashboard_admin");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handlePresetClick = (presetId: string) => {
    setSelectedPreset(presetId);
    setShowConfirmDialog(true);
  };

  const handleConfirmApply = () => {
    if (selectedPreset) {
      onApply(selectedPreset);
    }
    setShowConfirmDialog(false);
    setSelectedPreset(null);
  };

  const getPresetDifferences = (preset: Preset) => {
    const differences: string[] = [];

    // Early return if currentSettings or preset.settings is not available
    if (!currentSettings?.global || !preset?.settings?.global) {
      return differences;
    }

    const presetSettings = preset.settings;

    // Check global enabled
    if (presetSettings.global.enabled !== currentSettings.global.enabled) {
      differences.push(
        `Binary trading ${presetSettings.global.enabled ? "enabled" : "disabled"}`
      );
    }

    // Check max concurrent orders
    if (presetSettings.global.maxConcurrentOrders !== currentSettings.global.maxConcurrentOrders) {
      differences.push(
        `Max concurrent orders: ${currentSettings.global.maxConcurrentOrders} → ${presetSettings.global.maxConcurrentOrders}`
      );
    }

    // Check max daily orders
    if (presetSettings.global.maxDailyOrders !== currentSettings.global.maxDailyOrders) {
      differences.push(
        `Max daily orders: ${currentSettings.global.maxDailyOrders} → ${presetSettings.global.maxDailyOrders}`
      );
    }

    // Check enabled order types
    const currentEnabled = Object.entries(currentSettings.orderTypes || {})
      .filter(([_, cfg]) => (cfg as { enabled?: boolean })?.enabled)
      .map(([type]) => type);
    const presetEnabled = Object.entries(presetSettings.orderTypes || {})
      .filter(([_, cfg]) => (cfg as { enabled?: boolean })?.enabled)
      .map(([type]) => type);

    if (currentEnabled.length !== presetEnabled.length) {
      differences.push(
        `Order types: ${currentEnabled.length} → ${presetEnabled.length} enabled`
      );
    }

    // Check durations
    const currentDurations = (currentSettings.durations || []).filter((d) => d.enabled).length;
    const presetDurations = (presetSettings.durations || []).filter((d) => d.enabled).length;
    if (currentDurations !== presetDurations) {
      differences.push(`Durations: ${currentDurations} → ${presetDurations} enabled`);
    }

    return differences;
  };

  const selectedPresetData = presets.find((p) => p.id === selectedPreset);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {presets.map((preset) => {
          const Icon = PRESET_ICONS[preset.id] || Scale;
          const color = PRESET_COLORS[preset.id] || "#3b82f6";
          const isCurrentPreset = currentPreset === preset.id;
          const differences = getPresetDifferences(preset);

          return (
            <Card
              key={preset.id}
              className={`
                relative overflow-hidden transition-all cursor-pointer
                hover:shadow-lg hover:border-primary/50
                ${isCurrentPreset ? "ring-2 ring-primary" : ""}
              `}
              onClick={() => handlePresetClick(preset.id)}
            >
              {isCurrentPreset && (
                <div className="absolute top-2 right-2">
                  <Badge variant="default" className="gap-1">
                    <Check className="h-3 w-3" />
                    Current
                  </Badge>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <span style={{ color }}>
                      <Icon className="h-6 w-6" />
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{preset.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">
                      {preset.id} preset
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {preset.description}
                </p>

                {/* Features list */}
                <div className="space-y-2 mb-4">
                  {preset.features.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-3 w-3" style={{ color }} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Changes preview */}
                {differences.length > 0 && !isCurrentPreset && (
                  <div className="text-xs text-muted-foreground border-t pt-3">
                    <p className="font-medium mb-1">{t("will_change")}</p>
                    <ul className="space-y-1">
                      {differences.slice(0, 3).map((diff, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          {diff}
                        </li>
                      ))}
                      {differences.length > 3 && (
                        <li className="text-muted-foreground">
                          +{differences.length - 3} {t("more_changes")}
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {isCurrentPreset && (
                  <div className="text-xs text-muted-foreground border-t pt-3">
                    <div className="flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      <span>{t("this_preset_is_currently_applied")}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Colored bottom border */}
              <div
                className="h-1 w-full"
                style={{ backgroundColor: color }}
              />
            </Card>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPresetData && (
                <>
                  {(() => {
                    const Icon = PRESET_ICONS[selectedPresetData.id] || Scale;
                    return (
                      <span style={{ color: PRESET_COLORS[selectedPresetData.id] }}>
                        <Icon className="h-5 w-5" />
                      </span>
                    );
                  })()}
                  Apply {selectedPresetData.name}?
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {t("this_will_replace_your_current_settings_with_the")}{" "}
              {selectedPresetData?.id} {t("preset_configuration")}
            </DialogDescription>
          </DialogHeader>

          {selectedPresetData && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm mb-2">{selectedPresetData.description}</p>
                <div className="space-y-1">
                  {selectedPresetData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Check
                        className="h-3 w-3"
                        style={{ color: PRESET_COLORS[selectedPresetData.id] }}
                      />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {getPresetDifferences(selectedPresetData).length > 0 && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-500">
                        {t("settings_will_change")}
                      </p>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        {getPresetDifferences(selectedPresetData).map((diff, i) => (
                          <li key={i}>{diff}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApply}
              style={{
                backgroundColor: selectedPresetData
                  ? PRESET_COLORS[selectedPresetData.id]
                  : undefined,
              }}
            >
              {t("apply_preset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
