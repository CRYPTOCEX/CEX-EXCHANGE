"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash, ArrowUp, ArrowDown, Check, X } from "lucide-react";
import {
  LabeledSelect,
  LabeledSlider,
} from "../../structure-tab/ui-components";
import { IconPicker } from "@/components/ui/icon-picker";
import type { SettingsProps } from "../settings-map";
interface StatsSettingsProps extends SettingsProps {}
export function StatsSettings({
  element,
  settings,
  onSettingChange,
  onElementUpdate,
}: StatsSettingsProps) {
  const [editingStatIndex, setEditingStatIndex] = useState<number | null>(null);

  // Initialize default stats if none exist
  useEffect(() => {
    if (!settings.stats || settings.stats.length === 0) {
      const defaultStats = [
        {
          label: "Users",
          value: "10K+",
          icon: "users",
        },
        {
          label: "Countries",
          value: "30+",
          icon: "globe",
        },
        {
          label: "Servers",
          value: "100+",
          icon: "server",
        },
      ];
      onSettingChange("stats", defaultStats);
    }
  }, [settings.stats, onSettingChange]);
  const moveItem = (index: number, direction: "up" | "down") => {
    const stats = [...(settings.stats || [])];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stats.length) return;
    [stats[index], stats[newIndex]] = [stats[newIndex], stats[index]];
    onSettingChange("stats", stats);
    if (editingStatIndex === index) {
      setEditingStatIndex(newIndex);
    } else if (editingStatIndex === newIndex) {
      setEditingStatIndex(index);
    }
  };
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <LabeledSelect
          id="statsLayout"
          label="Layout"
          value={settings.layout || "row"}
          onValueChange={(value) => onSettingChange("layout", value)}
          options={[
            {
              value: "row",
              label: "Row",
            },
            {
              value: "grid",
              label: "Grid",
            },
          ]}
          placeholder="Select layout"
        />
      </div>
      {settings.layout === "grid" && (
        <div className="space-y-2">
          <LabeledSlider
            id="columns"
            label="Columns"
            min={1}
            max={4}
            step={1}
            value={settings.columns || 3}
            onValueChange={(value) => onSettingChange("columns", value)}
          />
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <Label>Statistics</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const stats = [
                ...(settings.stats || []),
                {
                  label: "New Stat",
                  value: "0",
                  icon: "star",
                },
              ];
              onSettingChange("stats", stats);
            }}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" /> Add Stat
          </Button>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-2">
          {(settings.stats || []).map((stat: any, index: number) => {
            return (
              <div key={index} className="border rounded-md p-2 bg-gray-50">
                {editingStatIndex === index ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={stat.label}
                        onChange={(e) => {
                          const stats = [...(settings.stats || [])];
                          stats[index] = {
                            ...stats[index],
                            label: e.target.value,
                          };
                          onSettingChange("stats", stats);
                        }}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Value</Label>
                      <Input
                        value={stat.value}
                        onChange={(e) => {
                          const stats = [...(settings.stats || [])];
                          stats[index] = {
                            ...stats[index],
                            value: e.target.value,
                          };
                          onSettingChange("stats", stats);
                        }}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Icon</Label>
                      <IconPicker
                        selectedIcon={stat.icon || "star"}
                        onSelectIcon={(iconName) => {
                          const stats = [...(settings.stats || [])];
                          stats[index] = {
                            ...stats[index],
                            icon: iconName,
                          };
                          onSettingChange("stats", stats);
                        }}
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingStatIndex(null)}
                        className="h-7 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setEditingStatIndex(null)}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" /> Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                        <IconPicker.Icon
                          name={stat.icon || "star"}
                          className="h-3 w-3 text-purple-600"
                        />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{stat.value}</div>
                        <div className="text-xs text-gray-500">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveItem(index, "down")}
                        disabled={index === (settings.stats || []).length - 1}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingStatIndex(index)}
                        className="h-6 w-6 p-0"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const stats = [...(settings.stats || [])];
                          stats.splice(index, 1);
                          onSettingChange("stats", stats);
                        }}
                        className="h-6 w-6 p-0 text-red-500"
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {(settings.stats || []).length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              No statistics added yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
