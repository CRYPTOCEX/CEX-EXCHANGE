"use client";

/**
 * Protection Tab Settings Component
 *
 * Contains Daily Loss Limit, Stop-Loss/Take-Profit, and Trade Cooldown settings
 */

import { Shield, Target, Clock } from "lucide-react";
import { DailyLimitSettingsComponent } from "../../risk-management/daily-limit-settings";
import { StopTakeProfitSettings } from "../../risk-management/stop-take-profit-settings";
import { TradeCooldown } from "../../risk-management/trade-cooldown";
import { SettingSection } from "./setting-section";
import type { StopLossSettings, TakeProfitSettings, DailyLimitSettings, CooldownSettings } from "../../risk-management/risk-management-types";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

export interface ProtectionTabSettingsProps {
  darkMode: boolean;
  balance: number;
  currency?: string; // Currency for displaying amounts (e.g., "USDT", "USD", "BTC")
  // Risk management state
  dailyLimit: DailyLimitSettings;
  stopLoss: StopLossSettings;
  takeProfit: TakeProfitSettings;
  cooldown: CooldownSettings;
  // Handlers
  updateDailyLimit: (settings: Partial<DailyLimitSettings>) => void;
  updateStopLoss: (settings: Partial<StopLossSettings>) => void;
  updateTakeProfit: (settings: Partial<TakeProfitSettings>) => void;
  updateCooldown: (settings: Partial<CooldownSettings>) => void;
  overrideDailyLimit: (durationMinutes: number) => void;
  overrideCooldown: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProtectionTabSettings({
  darkMode,
  balance,
  currency = "USDT",
  dailyLimit,
  stopLoss,
  takeProfit,
  cooldown,
  updateDailyLimit,
  updateStopLoss,
  updateTakeProfit,
  updateCooldown,
  overrideDailyLimit,
  overrideCooldown,
}: ProtectionTabSettingsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const mutedClass = darkMode ? "text-zinc-400" : "text-gray-500";

  return (
    <>
      {/* Daily Limit Section */}
      <SettingSection
        title={t("daily_loss_limit")}
        description={t("stop_trading_after_reaching_daily_loss_threshold")}
        icon={<Shield size={16} />}
        enabled={dailyLimit.enabled}
        onToggle={(enabled) => updateDailyLimit({ ...dailyLimit, enabled })}
        darkMode={darkMode}
        accentColor="emerald"
      >
        <div className="pt-2">
          {dailyLimit.enabled ? (
            <DailyLimitSettingsComponent
              settings={dailyLimit}
              balance={balance}
              onChange={updateDailyLimit}
              onOverride={overrideDailyLimit}
              theme={darkMode ? "dark" : "light"}
              alwaysExpanded={true}
              currency={currency}
            />
          ) : (
            <p className={`text-sm ${mutedClass}`}>
              {t("protect_account_with_daily_loss_limit") + ' ' + t("trading_blocked_when_limit_reached")}
            </p>
          )}
        </div>
      </SettingSection>

      {/* Stop-Loss / Take-Profit Section */}
      <SettingSection
        title={tCommon("stop_loss_take_profit")}
        description={t("automatic_profit_loss_targets")}
        icon={<Target size={16} />}
        enabled={stopLoss.enabled || takeProfit.enabled}
        onToggle={(enabled) => {
          updateStopLoss({ ...stopLoss, enabled });
          updateTakeProfit({ ...takeProfit, enabled });
        }}
        darkMode={darkMode}
        accentColor="blue"
      >
        <div className="pt-2">
          {stopLoss.enabled || takeProfit.enabled ? (
            <StopTakeProfitSettings
              stopLoss={stopLoss}
              takeProfit={takeProfit}
              onStopLossChange={updateStopLoss}
              onTakeProfitChange={updateTakeProfit}
              theme={darkMode ? "dark" : "light"}
              alwaysExpanded={true}
            />
          ) : (
            <p className={`text-sm ${mutedClass}`}>
              {t("set_automatic_stop_loss_and_take")}
            </p>
          )}
        </div>
      </SettingSection>

      {/* Trade Cooldown Section */}
      <SettingSection
        title={t("trade_cooldown")}
        description={t("enforce_waiting_period_between_trades")}
        icon={<Clock size={16} />}
        enabled={cooldown.enabled}
        onToggle={(enabled) => updateCooldown({ ...cooldown, enabled })}
        darkMode={darkMode}
        accentColor="purple"
      >
        <div className="pt-2">
          {cooldown.enabled ? (
            <TradeCooldown
              settings={cooldown}
              onChange={updateCooldown}
              onOverride={overrideCooldown}
              theme={darkMode ? "dark" : "light"}
              alwaysExpanded={true}
            />
          ) : (
            <p className={`text-sm ${mutedClass}`}>
              {t("prevent_impulsive_trading_by_enforcing_a")}
            </p>
          )}
        </div>
      </SettingSection>
    </>
  );
}

export default ProtectionTabSettings;
