"use client";

/**
 * Trading Tab Settings Component
 *
 * Contains One-Click Trading and Martingale Strategy settings
 */

import { AlertTriangle, Zap, TrendingUp, Info } from "lucide-react";
import MartingaleSettings, { type MartingaleState } from "../martingale-settings";
import { SettingSection, type SettingSectionProps } from "./setting-section";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

export interface TradingTabSettingsProps {
  darkMode: boolean;
  // One-click trading
  oneClickEnabled: boolean;
  onOneClickChange: (enabled: boolean) => void;
  oneClickMaxAmount: number;
  // Martingale
  martingaleState: MartingaleState;
  onMartingaleChange: (state: MartingaleState) => void;
  balance: number;
  currentAmount: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TradingTabSettings({
  darkMode,
  oneClickEnabled,
  onOneClickChange,
  oneClickMaxAmount,
  martingaleState,
  onMartingaleChange,
  balance,
  currentAmount,
}: TradingTabSettingsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const mutedClass = darkMode ? "text-zinc-400" : "text-gray-500";

  return (
    <>
      {/* One-Click Trading Section */}
      <SettingSection
        title={tCommon("one_click_trading")}
        description={t("execute_trades_instantly_without_confirmation")}
        icon={<Zap size={16} />}
        enabled={oneClickEnabled}
        onToggle={onOneClickChange}
        darkMode={darkMode}
        accentColor="yellow"
      >
        <div className="space-y-4 pt-2">
          <p className={`text-sm ${mutedClass}`}>
            {t("when_enabled_trades_will_execute_immediately")}
          </p>

          {oneClickEnabled && (
            <>
              <div
                className={`flex items-center justify-between p-3 rounded-lg ${
                  darkMode ? "bg-zinc-800" : "bg-white border border-gray-200"
                }`}
              >
                <span className={`text-sm ${mutedClass}`}>{tCommon("maximum_trade_amount")}</span>
                <span className="text-sm font-semibold text-yellow-500">
                  {oneClickMaxAmount.toLocaleString()} USDT
                </span>
              </div>
              <div
                className={`p-3 rounded-lg flex items-start gap-2 ${
                  darkMode
                    ? "bg-yellow-500/10 border border-yellow-500/20"
                    : "bg-yellow-50 border border-yellow-200"
                }`}
              >
                <AlertTriangle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                <p className={`text-xs ${darkMode ? "text-yellow-400" : "text-yellow-700"}`}>
                  {t("trades_below_this_amount_execute_immediately")}
                </p>
              </div>
            </>
          )}
        </div>
      </SettingSection>

      {/* Martingale Strategy Section */}
      <SettingSection
        title={t("martingale_strategy")}
        description={t("auto_adjust_bet_sizes_after_wins_losses")}
        icon={<TrendingUp size={16} />}
        enabled={martingaleState.enabled}
        onToggle={(enabled) => onMartingaleChange({ ...martingaleState, enabled })}
        darkMode={darkMode}
        accentColor="orange"
      >
        <div className="space-y-4 pt-2">
          <p className={`text-sm ${mutedClass}`}>
            {t("automatically_increase_your_bet_size_after")}
          </p>

          {martingaleState.enabled && (
            <MartingaleSettings
              state={martingaleState}
              onChange={onMartingaleChange}
              balance={balance}
              currentAmount={currentAmount}
              darkMode={darkMode}
              compact={false}
              alwaysExpanded={true}
            />
          )}

          {!martingaleState.enabled && (
            <div
              className={`p-3 rounded-lg flex items-start gap-2 ${
                darkMode ? "bg-zinc-800" : "bg-gray-100"
              }`}
            >
              <Info size={14} className={mutedClass + " shrink-0 mt-0.5"} />
              <p className={`text-xs ${mutedClass}`}>
                {t("enable_this_setting_to_configure_multiplier")}
              </p>
            </div>
          )}
        </div>
      </SettingSection>
    </>
  );
}

export default TradingTabSettings;
