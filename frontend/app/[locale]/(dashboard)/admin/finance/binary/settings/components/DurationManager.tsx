"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Clock,
  Settings2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { DurationConfig, BinaryOrderType, BinarySettings } from "../types";
import { formatDuration, ORDER_TYPE_CONFIG } from "../settings";
import { useTranslations } from "next-intl";

interface DurationManagerProps {
  durations: DurationConfig[];
  orderTypes: BinarySettings["orderTypes"];
  onUpdate: (durations: DurationConfig[]) => void;
}

const PRESET_DURATIONS = [1, 2, 3, 5, 10, 15, 30, 60, 120, 240, 1440];

// All possible profit adjustment values from -25% to +25%
const PROFIT_ADJUSTMENT_OPTIONS = [
  -25, -20, -15, -14, -13, -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1,
  0,
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25
];

// All order types for showing overrides
const ALL_ORDER_TYPES: BinaryOrderType[] = [
  "RISE_FALL",
  "HIGHER_LOWER",
  "TOUCH_NO_TOUCH",
  "CALL_PUT",
  "TURBO",
];

export function DurationManager({
  durations,
  orderTypes,
  onUpdate,
}: DurationManagerProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  // Extract enabled order types from the orderTypes config
  const enabledOrderTypes = Object.entries(orderTypes || {})
    .filter(([_, config]) => config?.enabled)
    .map(([type]) => type as BinaryOrderType);

  // Get order types that have overrides in any duration (even if disabled)
  const orderTypesWithOverrides = useMemo(() => {
    const typesWithOverrides = new Set<BinaryOrderType>();
    durations.forEach((duration) => {
      if (duration.orderTypeOverrides) {
        Object.entries(duration.orderTypeOverrides).forEach(([type, override]) => {
          if (override && (override.enabled !== undefined || override.profitAdjustment !== undefined)) {
            typesWithOverrides.add(type as BinaryOrderType);
          }
        });
      }
    });
    return typesWithOverrides;
  }, [durations]);

  // Show enabled types + types with overrides
  const orderTypesToShow = useMemo(() => {
    const types = new Set<BinaryOrderType>(enabledOrderTypes);
    orderTypesWithOverrides.forEach((type) => types.add(type));
    // Sort to maintain consistent order
    return ALL_ORDER_TYPES.filter((type) => types.has(type));
  }, [enabledOrderTypes, orderTypesWithOverrides]);

  // Wrapper for onChange compatibility
  const onChange = onUpdate;
  const [expandedDuration, setExpandedDuration] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState("");

  const generateId = () => `duration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addDuration = (minutes: number) => {
    // Check if duration already exists
    if (durations.some((d) => d.minutes === minutes)) return;

    const newDuration: DurationConfig = {
      id: generateId(),
      minutes,
      enabled: true,
      orderTypeOverrides: {},
    };
    onChange([...durations, newDuration].sort((a, b) => a.minutes - b.minutes));
  };

  const addCustomDuration = () => {
    const minutes = parseInt(customMinutes);
    if (isNaN(minutes) || minutes <= 0) return;
    addDuration(minutes);
    setCustomMinutes("");
  };

  const updateDuration = (id: string, updates: Partial<DurationConfig>) => {
    onChange(
      durations.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const removeDuration = (id: string) => {
    onChange(durations.filter((d) => d.id !== id));
  };

  const toggleTypeOverride = (
    durationId: string,
    orderType: BinaryOrderType,
    enabled: boolean
  ) => {
    const duration = durations.find((d) => d.id === durationId);
    if (!duration) return;

    const newOverrides = {
      ...duration.orderTypeOverrides,
      [orderType]: {
        ...duration.orderTypeOverrides?.[orderType],
        enabled,
      },
    };

    updateDuration(durationId, { orderTypeOverrides: newOverrides });
  };

  const setProfitAdjustment = (
    durationId: string,
    orderType: BinaryOrderType,
    adjustment: number
  ) => {
    const duration = durations.find((d) => d.id === durationId);
    if (!duration) return;

    const newOverrides = {
      ...duration.orderTypeOverrides,
      [orderType]: {
        ...duration.orderTypeOverrides?.[orderType],
        profitAdjustment: adjustment,
      },
    };

    updateDuration(durationId, { orderTypeOverrides: newOverrides });
  };

  const availablePresets = PRESET_DURATIONS.filter(
    (m) => !durations.some((d) => d.minutes === m)
  );

  const enabledCount = durations.filter((d) => d.enabled).length;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{tCommon("duration_configuration")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("manage_available_trading_durations_and_per")}
            </p>
          </div>
        </div>
        <Badge variant="outline">
          {enabledCount} of {durations.length} active
        </Badge>
      </div>

      {/* Quick Add Presets */}
      <div className="mb-4">
        <Label className="text-sm text-muted-foreground mb-2 block">{t("quick_add")}</Label>
        <div className="flex flex-wrap gap-2">
          {availablePresets.slice(0, 8).map((minutes) => (
            <Button
              key={minutes}
              variant="outline"
              size="sm"
              onClick={() => addDuration(minutes)}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {formatDuration(minutes)}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Duration Input */}
      <div className="flex gap-2 mb-4">
        <Input
          type="number"
          placeholder={t("custom_minutes")}
          value={customMinutes}
          onChange={(e) => setCustomMinutes(e.target.value)}
          className="flex-1"
          min="1"
        />
        <Button onClick={addCustomDuration} disabled={!customMinutes}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      {/* Durations List */}
      <div className="space-y-2">
        {durations.map((duration) => {
          const isExpanded = expandedDuration === duration.id;
          const hasOverrides =
            duration.orderTypeOverrides &&
            Object.keys(duration.orderTypeOverrides).length > 0;

          return (
            <Collapsible
              key={duration.id}
              open={isExpanded}
              onOpenChange={(open) =>
                setExpandedDuration(open ? duration.id : null)
              }
            >
              <div
                className={`
                  rounded-lg border transition-all
                  ${!duration.enabled ? "opacity-60 bg-muted/30" : "bg-card"}
                `}
              >
                <div className="flex items-center gap-3 p-3">
                  <Switch
                    checked={duration.enabled}
                    onCheckedChange={(checked) =>
                      updateDuration(duration.id, { enabled: checked })
                    }
                  />

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatDuration(duration.minutes)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({duration.minutes} min)
                      </span>
                      {hasOverrides && (
                        <Badge variant="secondary" className="text-xs">
                          {t("has_overrides")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings2 className="h-4 w-4 mr-1" />
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDuration(duration.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0 border-t">
                    <Label className="text-sm text-muted-foreground block mt-3 mb-2">
                      {t("per_type_overrides")}
                    </Label>
                    <div className="space-y-2">
                      {orderTypesToShow.map((orderType) => {
                        const override = duration.orderTypeOverrides?.[orderType];
                        const config = ORDER_TYPE_CONFIG[orderType];
                        const isTypeEnabled = override?.enabled !== false;
                        const profitAdjustment = override?.profitAdjustment || 0;
                        const isOrderTypeGloballyEnabled = enabledOrderTypes.includes(orderType);

                        return (
                          <div
                            key={orderType}
                            className={`
                              flex items-center gap-3 p-2 rounded-lg
                              ${!isOrderTypeGloballyEnabled ? "bg-amber-500/10 border border-amber-500/20" : isTypeEnabled ? "bg-muted/50" : "bg-muted/20"}
                            `}
                          >
                            <Switch
                              checked={isTypeEnabled}
                              onCheckedChange={(checked) =>
                                toggleTypeOverride(duration.id, orderType, checked)
                              }
                            />

                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span
                                className="text-sm font-medium"
                                style={{ color: config?.color }}
                              >
                                {config?.label || orderType}
                              </span>
                              {!isOrderTypeGloballyEnabled && (
                                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {t("type_disabled")}
                                </Badge>
                              )}
                              {isOrderTypeGloballyEnabled && !isTypeEnabled && (
                                <Badge variant="outline" className="text-xs">
                                  {t("disabled_for_this_duration")}
                                </Badge>
                              )}
                            </div>

                            {isTypeEnabled && (
                              <div className="flex items-center gap-2 shrink-0">
                                <Label className="text-xs text-muted-foreground">
                                  {t("profit_adj")}
                                </Label>
                                <Select
                                  value={profitAdjustment.toString()}
                                  onValueChange={(value) =>
                                    setProfitAdjustment(
                                      duration.id,
                                      orderType,
                                      parseInt(value)
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-20 h-7 text-xs">
                                    <SelectValue placeholder="0%">
                                      {profitAdjustment === 0
                                        ? "0%"
                                        : profitAdjustment > 0
                                          ? `+${profitAdjustment}%`
                                          : `${profitAdjustment}%`}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="max-h-50">
                                    {PROFIT_ADJUSTMENT_OPTIONS.map((value) => (
                                      <SelectItem key={value} value={value.toString()}>
                                        {value === 0 ? "0%" : value > 0 ? `+${value}%` : `${value}%`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {orderTypesToShow.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("no_order_types_enabled_enable_order")}
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {durations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t("no_durations_configured")}</p>
          <p className="text-sm">{t("add_at_least_one_duration_for_trading_to_work")}</p>
        </div>
      )}
    </Card>
  );
}
