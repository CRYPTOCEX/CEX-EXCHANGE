"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Settings2,
  Percent,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { OrderTypeConfig, BinaryOrderType } from "../types";
import { ORDER_TYPE_CONFIG, getProfitColor } from "../settings";
import { useTranslations } from "next-intl";

interface OrderTypeCardProps {
  type: BinaryOrderType;
  config: OrderTypeConfig;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  description: string;
  onUpdate: (updates: Partial<OrderTypeConfig>) => void;
}

export function OrderTypeCard({
  type: orderType,
  config,
  icon: Icon,
  label,
  description,
  onUpdate,
}: OrderTypeCardProps) {
  const t = useTranslations("dashboard_admin");
  const [isExpanded, setIsExpanded] = useState(false);

  const typeInfo = ORDER_TYPE_CONFIG[orderType];

  const updateConfig = (updates: Partial<OrderTypeConfig>) => {
    onUpdate(updates);
  };

  const renderTypeSpecificFields = () => {
    switch (orderType) {
      case "TOUCH_NO_TOUCH":
        return (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label className="text-sm">{t("touch_profit_multiplier")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider
                  value={[(config as any).touchProfitMultiplier || 1.5]}
                  onValueChange={([value]) =>
                    updateConfig({ touchProfitMultiplier: value } as any)
                  }
                  min={1}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {((config as any).touchProfitMultiplier || 1.5).toFixed(1)}x
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("applied_to_base_profit_for_touch_orders")}
              </p>
            </div>
            <div>
              <Label className="text-sm">{t("no_touch_profit_multiplier")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider
                  value={[(config as any).noTouchProfitMultiplier || 0.8]}
                  onValueChange={([value]) =>
                    updateConfig({ noTouchProfitMultiplier: value } as any)
                  }
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {((config as any).noTouchProfitMultiplier || 0.8).toFixed(1)}x
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("applied_to_base_profit_for_no_touch_orders")}
              </p>
            </div>
          </div>
        );

      case "TURBO":
        return (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">{t("min_payout_per_point")}</Label>
                <Input
                  type="number"
                  value={(config as any).payoutPerPointRange?.min || 0.1}
                  onChange={(e) =>
                    updateConfig({
                      payoutPerPointRange: {
                        ...(config as any).payoutPerPointRange,
                        min: parseFloat(e.target.value) || 0,
                      },
                    } as any)
                  }
                  step="0.01"
                  min="0.01"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">{t("max_payout_per_point")}</Label>
                <Input
                  type="number"
                  value={(config as any).payoutPerPointRange?.max || 10}
                  onChange={(e) =>
                    updateConfig({
                      payoutPerPointRange: {
                        ...(config as any).payoutPerPointRange,
                        max: parseFloat(e.target.value) || 0,
                      },
                    } as any)
                  }
                  step="0.1"
                  min="0.1"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Max Duration (minutes)</Label>
                <Input
                  type="number"
                  value={(config as any).maxDuration || 5}
                  onChange={(e) =>
                    updateConfig({ maxDuration: parseInt(e.target.value) || 1 } as any)
                  }
                  min="1"
                  max="60"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("turbo_is_meant_for_short_term_trades")}
                </p>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={(config as any).allowTicksBased || false}
                  onCheckedChange={(checked) =>
                    updateConfig({ allowTicksBased: checked } as any)
                  }
                />
                <Label className="text-sm">{t("allow_ticks_based_duration")}</Label>
              </div>
            </div>
          </div>
        );

      case "CALL_PUT":
        return (
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-blue-500" />
              <span>
                {t("strike_levels_are_configured_in_the_barriers_tab")}
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card
      className={`
        transition-all border-2
        ${config.enabled ? `border-l-4` : "opacity-75 border-muted"}
      `}
      style={{
        borderLeftColor: config.enabled ? typeInfo?.color : undefined,
      }}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-4 p-4">
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => updateConfig({ enabled: checked })}
          />

          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${typeInfo?.color}20` }}
          >
            <Icon size={20} />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{label}</h3>
              {!config.enabled && (
                <Badge variant="secondary">Disabled</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {config.enabled && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-right">
                      <div className="text-sm font-medium" style={{ color: getProfitColor(config.profitPercentage) }}>
                        {config.profitPercentage}%
                      </div>
                      <div className="text-xs text-muted-foreground">{t("base_profit")}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("base_profit_percentage_for_this_order_type")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

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
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t">
            {/* Base Profit % */}
            <div className="mt-4">
              <Label className="text-sm">{t("base_profit")}</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  value={config.profitPercentage}
                  onChange={(e) =>
                    updateConfig({
                      profitPercentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="1"
                  max="200"
                  step="1"
                  className="pr-8 max-w-[200px]"
                  style={{
                    borderColor: getProfitColor(config.profitPercentage),
                  }}
                />
                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Profit slider visualization */}
            <div className="mt-4">
              <Label className="text-sm">{t("profit_percentage")}</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  value={[config.profitPercentage]}
                  onValueChange={([value]) =>
                    updateConfig({ profitPercentage: value })
                  }
                  min={10}
                  max={150}
                  step={1}
                  className="flex-1"
                />
                <Badge
                  className="w-16 justify-center"
                  style={{
                    backgroundColor: getProfitColor(config.profitPercentage),
                    color: "white",
                  }}
                >
                  {config.profitPercentage}%
                </Badge>
              </div>
            </div>

            {/* Type-specific configuration */}
            {renderTypeSpecificFields()}

            {/* Trading Mode Configuration */}
            <div className="mt-4 pt-4 border-t">
              <Label className="text-sm font-medium">{t("trading_modes")}</Label>
              <p className="text-xs text-muted-foreground mb-3">
                {t("control_where_this_order_type_is_available")}
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.tradingModes?.demo ?? true}
                    onCheckedChange={(checked) =>
                      updateConfig({
                        tradingModes: {
                          ...(config.tradingModes || { demo: true, live: true }),
                          demo: checked,
                        },
                      } as any)
                    }
                  />
                  <Label className="text-sm">{t("demo_mode")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.tradingModes?.live ?? true}
                    onCheckedChange={(checked) =>
                      updateConfig({
                        tradingModes: {
                          ...(config.tradingModes || { demo: true, live: true }),
                          live: checked,
                        },
                      } as any)
                    }
                  />
                  <Label className="text-sm">{t("live_mode")}</Label>
                </div>
              </div>
            </div>

            {/* Warning for high profit */}
            {config.profitPercentage > 95 && (
              <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-500">{t("high_profit_warning")}</p>
                  <p className="text-muted-foreground">
                    {t("profit_over_95_may_not_be_sustainable_long_term")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
