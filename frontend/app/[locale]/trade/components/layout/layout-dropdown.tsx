"use client";
import { useLayout } from "./layout-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, LayoutPanelLeft, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function LayoutDropdown() {
  const t = useTranslations("trade/components/layout/layout-dropdown");
  const {
    layoutConfig,
    setLayoutConfig,
    resetLayout,
    applyPreset,
    layoutPresets,
  } = useLayout();

  // Toggle panel visibility
  const togglePanel = (panelId: string) => {
    setLayoutConfig({
      ...layoutConfig,
      panels: {
        ...layoutConfig.panels,
        [panelId]: {
          ...layoutConfig.panels[panelId],
          visible: !layoutConfig.panels[panelId].visible,
        },
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-zinc-900 border-zinc-800 text-zinc-300"
      >
        <DropdownMenuLabel>{t("Layout")}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />

        <DropdownMenuLabel className="text-xs text-zinc-500 font-normal">
          {t("Presets")}
        </DropdownMenuLabel>
        {Object.keys(layoutPresets).map((presetName) => (
          <DropdownMenuItem
            key={presetName}
            onClick={() => applyPreset(presetName)}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            <span>{presetName}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuLabel className="text-xs text-zinc-500 font-normal">
          {t("Panels")}
        </DropdownMenuLabel>

        <DropdownMenuItem onClick={() => togglePanel("markets")}>
          <LayoutPanelLeft className="mr-2 h-4 w-4" />
          <span>{t("Markets")}</span>
          <div className="ml-auto">
            {layoutConfig.panels.markets.visible ? (
              <div className="h-2 w-2 rounded-full bg-green-500" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-zinc-700" />
            )}
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => togglePanel("chart")}>
          <LayoutPanelLeft className="mr-2 h-4 w-4" />
          <span>{t("Chart")}</span>
          <div className="ml-auto">
            {layoutConfig.panels.chart.visible ? (
              <div className="h-2 w-2 rounded-full bg-green-500" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-zinc-700" />
            )}
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => togglePanel("orderbook")}>
          <LayoutPanelLeft className="mr-2 h-4 w-4" />
          <span>{t("Orderbook")}</span>
          <div className="ml-auto">
            {layoutConfig.panels.orderbook.visible ? (
              <div className="h-2 w-2 rounded-full bg-green-500" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-zinc-700" />
            )}
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => togglePanel("trading")}>
          <LayoutPanelLeft className="mr-2 h-4 w-4" />
          <span>{t("Trading")}</span>
          <div className="ml-auto">
            {layoutConfig.panels.trading.visible ? (
              <div className="h-2 w-2 rounded-full bg-green-500" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-zinc-700" />
            )}
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => togglePanel("orders")}>
          <LayoutPanelLeft className="mr-2 h-4 w-4" />
          <span>{t("Orders")}</span>
          <div className="ml-auto">
            {layoutConfig.panels.orders.visible ? (
              <div className="h-2 w-2 rounded-full bg-green-500" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-zinc-700" />
            )}
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => togglePanel("alerts")}>
          <LayoutPanelLeft className="mr-2 h-4 w-4" />
          <span>{t("Alerts")}</span>
          <div className="ml-auto">
            {layoutConfig.panels.alerts.visible ? (
              <div className="h-2 w-2 rounded-full bg-green-500" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-zinc-700" />
            )}
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onClick={resetLayout}>
          <Trash2 className="mr-2 h-4 w-4" />
          <span>{t("reset_layout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
