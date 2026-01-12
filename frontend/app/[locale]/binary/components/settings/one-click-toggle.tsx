"use client";

import { useState, useCallback, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface OneClickToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  maxAmount?: number;
  className?: string;
  darkMode?: boolean;
  compact?: boolean;
}

const ONE_CLICK_STORAGE_KEY = "binary-one-click-trading";

export function OneClickToggle({
  enabled,
  onChange,
  maxAmount = 1000,
  className = "",
  darkMode = true,
  compact = false,
}: OneClickToggleProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [showWarning, setShowWarning] = useState(false);
  const [pendingEnable, setPendingEnable] = useState(false);

  // Handle toggle change
  const handleToggle = useCallback((checked: boolean) => {
    if (checked) {
      // Show warning before enabling
      setPendingEnable(true);
      setShowWarning(true);
    } else {
      // Disable immediately
      onChange(false);
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(ONE_CLICK_STORAGE_KEY, "false");
      }
    }
  }, [onChange]);

  // Confirm enabling one-click mode
  const confirmEnable = useCallback(() => {
    onChange(true);
    setShowWarning(false);
    setPendingEnable(false);
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(ONE_CLICK_STORAGE_KEY, "true");
    }
  }, [onChange]);

  // Cancel enabling
  const cancelEnable = useCallback(() => {
    setShowWarning(false);
    setPendingEnable(false);
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(ONE_CLICK_STORAGE_KEY);
      if (saved === "true" && !enabled) {
        onChange(true);
      }
    }
  }, []);

  const bgClass = darkMode ? "bg-zinc-800/50" : "bg-zinc-100";
  const textClass = darkMode ? "text-white" : "text-zinc-900";
  const mutedClass = darkMode ? "text-zinc-400" : "text-zinc-500";

  if (compact) {
    return (
      <>
        <div className={`flex items-center gap-2 ${className}`}>
          <Switch
            id="one-click-trading"
            checked={enabled}
            onCheckedChange={handleToggle}
            className={enabled ? "bg-yellow-500" : ""}
          />
          <Label
            htmlFor="one-click-trading"
            className={`text-xs cursor-pointer flex items-center gap-1 ${enabled ? "text-yellow-500" : mutedClass}`}
          >
            <Zap className="w-3 h-3" />
            {t("one_click") || "1-Click"}
          </Label>
        </div>

        <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                {t("enable_one_click_trading")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                {t("one_click_trading_mode_will_execute")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
                <ul className="text-sm text-yellow-400 space-y-1">
                  <li>{t("trades_execute_instantly_on_button_click")}</li>
                  <li>{t("no_confirmation_dialog_will_be_shown")}</li>
                  <li>{t("maximum_one_click_trade")} {maxAmount} USDT</li>
                </ul>
              </div>
            </div>
            <AlertDialogFooter>
              <Button variant="outline" onClick={cancelEnable} className="border-zinc-700">
                Cancel
              </Button>
              <Button onClick={confirmEnable} className="bg-yellow-600 hover:bg-yellow-700">
                <Zap className="w-4 h-4 mr-2" />
                {t("enable_one_click")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <div className={`rounded-lg ${bgClass} p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${enabled ? "bg-yellow-500/20" : "bg-zinc-700/50"}`}>
              <Zap className={`w-4 h-4 ${enabled ? "text-yellow-500" : "text-zinc-500"}`} />
            </div>
            <div>
              <Label htmlFor="one-click-trading-full" className={`text-sm font-medium ${textClass} cursor-pointer`}>
                {tCommon("one_click_trading")}
              </Label>
              <p className={`text-xs ${mutedClass}`}>
                {enabled ? "Trades execute instantly" : "Confirmation required"}
              </p>
            </div>
          </div>
          <Switch
            id="one-click-trading-full"
            checked={enabled}
            onCheckedChange={handleToggle}
            className={enabled ? "bg-yellow-500" : ""}
          />
        </div>

        {enabled && (
          <div className="mt-3 pt-3 border-t border-zinc-700">
            <div className="flex items-center gap-2 text-xs text-yellow-500">
              <AlertTriangle className="w-3 h-3" />
              <span>{t("one_click_mode_active_trades_execute_immediately")}</span>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              {t("enable_one_click_trading")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {t("one_click_trading_mode_will_execute")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
              <ul className="text-sm text-yellow-400 space-y-1">
                <li>{t("trades_execute_instantly_on_button_click")}</li>
                <li>{t("no_confirmation_dialog_will_be_shown")}</li>
                <li>{t("maximum_one_click_trade")} {maxAmount} USDT</li>
              </ul>
            </div>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={cancelEnable} className="border-zinc-700">
              Cancel
            </Button>
            <Button onClick={confirmEnable} className="bg-yellow-600 hover:bg-yellow-700">
              <Zap className="w-4 h-4 mr-2" />
              {t("enable_one_click")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default OneClickToggle;

// Hook to use one-click trading state - uses global store for persistence
export function useOneClickTrading(maxAmount: number = 1000) {
  // Use global settings store for persistence
  const { useTradingSettingsStore } = require("@/store/trade/use-trading-settings-store");
  const oneClickSettings = useTradingSettingsStore((state: any) => state.oneClick);
  const setOneClickEnabled = useTradingSettingsStore((state: any) => state.setOneClickEnabled);
  const updateOneClick = useTradingSettingsStore((state: any) => state.updateOneClick);

  const enabled = oneClickSettings.enabled;
  const storeMaxAmount = oneClickSettings.maxAmount;

  // Use the higher of provided maxAmount or store maxAmount
  const effectiveMaxAmount = Math.max(maxAmount, storeMaxAmount);

  // Check if amount is within one-click limit
  const canOneClick = useCallback((amount: number) => {
    return enabled && amount <= effectiveMaxAmount;
  }, [enabled, effectiveMaxAmount]);

  return {
    enabled,
    setEnabled: setOneClickEnabled,
    canOneClick,
    maxAmount: effectiveMaxAmount,
    updateSettings: updateOneClick,
  };
}
