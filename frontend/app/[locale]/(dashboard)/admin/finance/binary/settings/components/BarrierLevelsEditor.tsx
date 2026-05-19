"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Target,
  TrendingUp,
  Percent,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { BarrierLevel, BinarySettings, BinaryOrderType } from "../types";
import { getProfitColor, ORDER_TYPE_CONFIG } from "../settings";
import { useTranslations } from "next-intl";

// Order types that use barriers
const BARRIER_ORDER_TYPES: BinaryOrderType[] = [
  "HIGHER_LOWER",
  "TOUCH_NO_TOUCH",
  "TURBO",
];

// Order types that use strike levels
const STRIKE_ORDER_TYPES: BinaryOrderType[] = ["CALL_PUT"];

interface BarrierLevelsEditorProps {
  settings: BinarySettings;
  onUpdate: (updater: (prev: BinarySettings) => BinarySettings) => void;
}

export function BarrierLevelsEditor({
  settings,
  onUpdate,
}: BarrierLevelsEditorProps) {
  const t = useTranslations("dashboard_admin");
  const [expandedTypes, setExpandedTypes] = useState<string[]>(["HIGHER_LOWER"]);

  const toggleExpanded = (type: string) => {
    setExpandedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const generateId = () =>
    `barrier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get barrier levels for a specific order type
  const getLevels = (orderType: BinaryOrderType): BarrierLevel[] => {
    const config = settings.orderTypes[orderType];
    if ("barrierLevels" in config && config.barrierLevels) {
      return config.barrierLevels;
    }
    if ("strikeLevels" in config && config.strikeLevels) {
      return config.strikeLevels;
    }
    return [];
  };

  // Update levels for a specific order type
  const updateLevels = (orderType: BinaryOrderType, levels: BarrierLevel[]) => {
    onUpdate((prev) => {
      const fieldName =
        orderType === "CALL_PUT" ? "strikeLevels" : "barrierLevels";
      return {
        ...prev,
        orderTypes: {
          ...prev.orderTypes,
          [orderType]: {
            ...prev.orderTypes[orderType],
            [fieldName]: levels,
          },
        },
      };
    });
  };

  // Calculate risk indicator
  const getRiskIndicator = (distancePercent: number, profitPercent: number) => {
    const riskScore = distancePercent * (profitPercent / 100);
    if (riskScore > 1) return { level: "danger", text: "High Risk" };
    if (riskScore > 0.5) return { level: "warning", text: "Medium Risk" };
    return { level: "safe", text: "Low Risk" };
  };

  const renderBarrierEditor = (orderType: BinaryOrderType) => {
    const levels = getLevels(orderType);
    const isExpanded = expandedTypes.includes(orderType);
    const config = ORDER_TYPE_CONFIG[orderType];
    const typeConfig = settings.orderTypes[orderType];
    const enabledCount = levels.filter((l) => l.enabled).length;
    const isStrike = orderType === "CALL_PUT";

    const addLevel = () => {
      const newLevel: BarrierLevel = {
        id: generateId(),
        label: `${isStrike ? "Strike" : "Barrier"} ${levels.length + 1}`,
        distancePercent: 0.5,
        profitPercent: 80,
        enabled: true,
      };
      updateLevels(orderType, [...levels, newLevel]);
    };

    const updateLevel = (index: number, updates: Partial<BarrierLevel>) => {
      const newLevels = [...levels];
      newLevels[index] = { ...newLevels[index], ...updates };
      updateLevels(orderType, newLevels);
    };

    const removeLevel = (index: number) => {
      updateLevels(
        orderType,
        levels.filter((_, i) => i !== index)
      );
    };

    return (
      <Card key={orderType} className="overflow-hidden">
        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(orderType)}>
          <CollapsibleTrigger asChild>
            <div
              className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                !typeConfig.enabled ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <span style={{ color: config.color }}>
                    <config.icon size={20} />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{config.label}</h3>
                    {!typeConfig.enabled && (
                      <Badge variant="secondary" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isStrike ? "Strike price levels" : "Barrier levels"} for{" "}
                    {config.label} orders
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">
                  {enabledCount} of {levels.length} active
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 border-t">
              {/* Profit Curve Visualization */}
              {levels.length > 0 && (
                <div className="my-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {t("profit_curve_preview")}
                    </span>
                  </div>
                  <div className="h-16 flex items-end gap-1">
                    {levels
                      .filter((l) => l.enabled)
                      .sort((a, b) => a.distancePercent - b.distancePercent)
                      .map((level) => (
                        <TooltipProvider key={level.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="flex-1 rounded-t transition-all hover:opacity-80"
                                style={{
                                  height: `${Math.min(
                                    (level.profitPercent / 150) * 100,
                                    100
                                  )}%`,
                                  backgroundColor: getProfitColor(
                                    level.profitPercent
                                  ),
                                  minWidth: "20px",
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{level.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {level.distancePercent}% distance →{" "}
                                {level.profitPercent}% profit
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Closer (Higher Profit)</span>
                    <span>Farther (Lower Profit)</span>
                  </div>
                </div>
              )}

              {/* Levels List */}
              <div className="space-y-2">
                {levels.map((level, index) => {
                  const risk = getRiskIndicator(
                    level.distancePercent,
                    level.profitPercent
                  );
                  return (
                    <div
                      key={level.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        !level.enabled ? "opacity-60 bg-muted/30" : "bg-card"
                      }`}
                    >
                      <div className="cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <Switch
                        checked={level.enabled}
                        onCheckedChange={(checked) =>
                          updateLevel(index, { enabled: checked })
                        }
                      />

                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Label
                          </Label>
                          <Input
                            value={level.label}
                            onChange={(e) =>
                              updateLevel(index, { label: e.target.value })
                            }
                            placeholder={t("level_name")}
                            className="h-8"
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">
                            {t("distance")}
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={level.distancePercent}
                              onChange={(e) =>
                                updateLevel(index, {
                                  distancePercent:
                                    parseFloat(e.target.value) || 0,
                                })
                              }
                              step="0.1"
                              min="0.01"
                              max="10"
                              className="h-8 pr-8"
                            />
                            <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">
                            {t("profit")}
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={level.profitPercent}
                              onChange={(e) =>
                                updateLevel(index, {
                                  profitPercent:
                                    parseFloat(e.target.value) || 0,
                                })
                              }
                              step="1"
                              min="1"
                              max="300"
                              className="h-8 pr-8"
                              style={{
                                borderColor: getProfitColor(level.profitPercent),
                              }}
                            />
                            <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {risk.level !== "safe" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle
                                  className={`h-4 w-4 ${
                                    risk.level === "danger"
                                      ? "text-red-500"
                                      : "text-yellow-500"
                                  }`}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{risk.text}</p>
                                <p className="text-xs text-muted-foreground">
                                  {t("high_distance_high_profit_increases_platform_risk")}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLevel(index)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button variant="outline" onClick={addLevel} className="w-full mt-3">
                <Plus className="h-4 w-4 mr-2" />
                Add {isStrike ? "Strike" : "Barrier"} Level
              </Button>

              {levels.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No {isStrike ? "strike" : "barrier"} {t("levels_defined")}</p>
                  <p className="text-sm">
                    {t("add_at_least_one_level_for")} {config.label} orders
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t("barrier_strike_levels")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("configure_barrier_distances_and_profit_percentages")}
          </p>
        </div>
      </div>

      {/* Barrier-based order types */}
      {BARRIER_ORDER_TYPES.map((type) => renderBarrierEditor(type))}

      {/* Strike-based order types */}
      {STRIKE_ORDER_TYPES.map((type) => renderBarrierEditor(type))}
    </div>
  );
}
