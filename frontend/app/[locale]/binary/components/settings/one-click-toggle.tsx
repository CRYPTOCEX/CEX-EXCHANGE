"use client";

/**
 * One-Click Trading toggle.
 *
 * The confirmation dialog was written out twice, once in each render branch,
 * with identical contents. It is now one `<OneClickWarningDialog>`.
 *
 * Colour: one-click is a setting that is either on or off, so the switch and
 * the "1-Click" label take the accent, not amber. What amber is actually for
 * here is the consequence — skipping the confirmation step — so the warning
 * dialog and the "mode active" strip keep `warning`, with the hue on the icon
 * and the copy on `foreground` so it stays legible in light mode.
 */

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
  /** @deprecated Theme is resolved by design tokens; retained for API stability. */
  darkMode?: boolean;
  compact?: boolean;
}

const ONE_CLICK_STORAGE_KEY = "binary-one-click-trading";

export function OneClickToggle({
  enabled,
  onChange,
  maxAmount = 1000,
  className = "",
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

  // One definition, rendered by both branches.
  const warningDialog = (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            {t("enable_one_click_trading")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("one_click_trading_mode_will_execute")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <div className="rounded-lg bg-warning/10 border border-warning/30 p-3">
            <ul className="text-sm text-foreground space-y-1">
              <li>{t("trades_execute_instantly_on_button_click")}</li>
              <li>{t("no_confirmation_dialog_will_be_shown")}</li>
              <li>{t("maximum_one_click_trade")}: {maxAmount} USDT</li>
            </ul>
          </div>
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={cancelEnable}>
            Cancel
          </Button>
          <Button
            onClick={confirmEnable}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            <Zap className="w-4 h-4 mr-2" />
            {t("enable_one_click")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (compact) {
    return (
      <>
        <div className={`flex items-center gap-2 ${className}`}>
          <Switch
            id="one-click-trading"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
          <Label
            htmlFor="one-click-trading"
            className={`text-xs cursor-pointer flex items-center gap-1 ${
              enabled ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Zap className="w-3 h-3" />
            {t("one_click") || "1-Click"}
          </Label>
        </div>

        {warningDialog}
      </>
    );
  }

  return (
    <>
      <div className={`rounded-lg bg-surface-2 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                enabled ? "bg-primary/15" : "bg-surface-3"
              }`}
            >
              <Zap
                className={`w-4 h-4 ${enabled ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>
            <div>
              <Label
                htmlFor="one-click-trading-full"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                {tCommon("one_click_trading")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {enabled ? t("trades_execute_instantly") : t("confirmation_required")}
              </p>
            </div>
          </div>
          <Switch
            id="one-click-trading-full"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {enabled && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-foreground">
              <AlertTriangle className="w-3 h-3 shrink-0 text-warning" />
              <span>{t("one_click_mode_active_trades_execute_immediately")}</span>
            </div>
          </div>
        )}
      </div>

      {warningDialog}
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
