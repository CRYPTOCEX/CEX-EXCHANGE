"use client";

/**
 * Trading Tab Settings Component
 *
 * Contains One-Click Trading and Martingale Strategy settings
 */

import { AlertTriangle, Zap, TrendingUp, Info } from "lucide-react";
import MartingaleSettings, { type MartingaleState } from "../martingale-settings";
import { SettingSection } from "./setting-section";
import { NoticeStrip, SummaryRow } from "../../risk-management/risk-ui";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

export interface TradingTabSettingsProps {
  /** @deprecated Theme is resolved by design tokens; retained for API stability. */
  darkMode?: boolean;
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

  return (
    <>
      {/* One-Click Trading Section */}
      <SettingSection
        title={tCommon("one_click_trading")}
        description={t("execute_trades_instantly_without_confirmation")}
        icon={<Zap size={16} />}
        enabled={oneClickEnabled}
        onToggle={onOneClickChange}
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            {t("when_enabled_trades_will_execute_immediately")}
          </p>

          {oneClickEnabled && (
            <>
              <SummaryRow
                className="p-3 rounded-lg bg-card border border-border"
                label={tCommon("maximum_trade_amount")}
                value={`${oneClickMaxAmount.toLocaleString()} USDT`}
              />
              {/* Skipping the confirmation dialog is a real exposure, so this
                  one stays coloured — warning on the icon, copy on foreground. */}
              <NoticeStrip tone="warning" icon={<AlertTriangle size={14} />}>
                {t("trades_below_this_amount_execute_immediately")}
              </NoticeStrip>
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
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            {t("automatically_increase_your_bet_size_after")}
          </p>

          {martingaleState.enabled && (
            <MartingaleSettings
              state={martingaleState}
              onChange={onMartingaleChange}
              balance={balance}
              currentAmount={currentAmount}
              compact={false}
              alwaysExpanded={true}
            />
          )}

          {!martingaleState.enabled && (
            <NoticeStrip tone="neutral" icon={<Info size={14} />}>
              {t("enable_this_setting_to_configure_multiplier")}
            </NoticeStrip>
          )}
        </div>
      </SettingSection>
    </>
  );
}

export default TradingTabSettings;
