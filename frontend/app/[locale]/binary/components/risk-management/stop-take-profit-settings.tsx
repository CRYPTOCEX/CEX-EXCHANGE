"use client";

/**
 * Stop-Loss & Take-Profit Settings Component
 *
 * Combined settings for automatic cash-out triggers.
 *
 * This file carried its content TWICE (once for `alwaysExpanded`, once inside
 * the standalone card — 349 byte-identical lines) and, within each copy, the
 * stop-loss and take-profit panes were the same 90 lines written out twice more
 * with the nouns swapped. Both axes are collapsed: one `SidePane`, driven by a
 * config object, rendered once.
 *
 * Colour: selecting `-50%` or `+70%` is choosing an option, so the selected
 * preset is the brand accent, not red or green. Direction lives where it is
 * actually information — the armed dot beside each tab and the running P&L
 * figure — per R1.
 *
 * Every `t("…")` call is written out literally rather than looked up through
 * the config, because the i18n build scrapes these keys statically.
 */

import { memo, useState } from "react";
import {
  Shield,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import type { StopLossSettings, TakeProfitSettings } from "./risk-management-types";
import {
  FieldLabel,
  Hint,
  NoticeStrip,
  NumberField,
  OptionRow,
  Panel,
  PanelTitle,
  SummaryRow,
  Toggle,
  type Tone,
} from "./risk-ui";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface StopTakeProfitSettingsProps {
  stopLoss: StopLossSettings;
  takeProfit: TakeProfitSettings;
  onStopLossChange: (settings: Partial<StopLossSettings>) => void;
  onTakeProfitChange: (settings: Partial<TakeProfitSettings>) => void;
  /** @deprecated Theme is resolved by design tokens; retained for API stability. */
  theme?: "dark" | "light";
  compact?: boolean;
  /** When true, renders only the settings content without wrapper (for use inside SettingSection) */
  alwaysExpanded?: boolean;
}

type TriggerType = "per_trade" | "session" | "daily";

/** Everything that differs between the stop-loss pane and the take-profit pane. */
interface SideConfig {
  tone: Tone;
  sign: "-" | "+";
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  type: TriggerType;
  onTypeChange: (type: TriggerType) => void;
  enableLabel: string;
  typeLabel: string;
  perTradeLabel: string;
  perTradeHint: string;
  perTradePresets: readonly number[];
  perTradeValue: number;
  onPerTradeChange: (pct: number) => void;
  sessionFieldLabel: string;
  sessionLimit: number;
  onSessionLimitChange: (value: number) => void;
  sessionSummaryLabel: string;
  sessionCurrent: number;
  dailyFieldLabel: string;
  dailyLimit: number;
  onDailyLimitChange: (value: number) => void;
  dailySummaryLabel: string;
  dailyCurrent: number;
}

const TYPE_OPTIONS = [
  { value: "per_trade" as const, label: "Per Trade" },
  { value: "session" as const, label: "Session" },
  { value: "daily" as const, label: "Daily" },
];

const STOP_LOSS_PRESETS = [20, 30, 50, 70] as const;
const TAKE_PROFIT_PRESETS = [30, 50, 70, 90] as const;

// ============================================================================
// SIDE PANE — one definition serving both stop-loss and take-profit
// ============================================================================

function SidePane({ cfg }: { cfg: SideConfig }) {
  return (
    <>
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">{cfg.enableLabel}</span>
        <Toggle
          checked={cfg.enabled}
          onChange={cfg.onToggle}
          ariaLabel={cfg.enableLabel}
        />
      </div>

      {cfg.enabled && (
        <>
          {/* Type selection */}
          <div>
            <FieldLabel>{cfg.typeLabel}</FieldLabel>
            <OptionRow
              className="mt-1"
              layout="grid-3"
              value={cfg.type}
              onSelect={cfg.onTypeChange}
              options={TYPE_OPTIONS}
            />
          </div>

          {/* Type-specific settings */}
          {cfg.type === "per_trade" && (
            <div>
              <FieldLabel>{cfg.perTradeLabel}</FieldLabel>
              <OptionRow
                className="mt-1"
                value={cfg.perTradeValue}
                onSelect={cfg.onPerTradeChange}
                options={cfg.perTradePresets.map((pct) => ({
                  value: pct,
                  label: `${cfg.sign}${pct}%`,
                }))}
              />
              <Hint>{cfg.perTradeHint}</Hint>
            </div>
          )}

          {cfg.type === "session" && (
            <div>
              <FieldLabel>{cfg.sessionFieldLabel}</FieldLabel>
              <NumberField
                value={cfg.sessionLimit}
                onChange={cfg.onSessionLimitChange}
                suffix="USDT"
                ariaLabel={cfg.sessionFieldLabel}
              />
              <SummaryRow
                className="mt-2 p-2 rounded-lg bg-surface-2"
                label={cfg.sessionSummaryLabel}
                value={`${cfg.sign}${cfg.sessionCurrent.toFixed(2)} USDT`}
                tone={cfg.tone}
              />
            </div>
          )}

          {cfg.type === "daily" && (
            <div>
              <FieldLabel>{cfg.dailyFieldLabel}</FieldLabel>
              <NumberField
                value={cfg.dailyLimit}
                onChange={cfg.onDailyLimitChange}
                suffix="USDT"
                ariaLabel={cfg.dailyFieldLabel}
              />
              <SummaryRow
                className="mt-2 p-2 rounded-lg bg-surface-2"
                label={cfg.dailySummaryLabel}
                value={`${cfg.sign}${cfg.dailyCurrent.toFixed(2)} USDT`}
                tone={cfg.tone}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export const StopTakeProfitSettings = memo(function StopTakeProfitSettings({
  stopLoss,
  takeProfit,
  onStopLossChange,
  onTakeProfitChange,
  compact = false,
  alwaysExpanded = false,
}: StopTakeProfitSettingsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeTab, setActiveTab] = useState<"stopLoss" | "takeProfit">("stopLoss");

  const stopLossConfig: SideConfig = {
    tone: "down",
    sign: "-",
    enabled: stopLoss.enabled,
    onToggle: (enabled) => onStopLossChange({ enabled }),
    type: stopLoss.type,
    onTypeChange: (type) => onStopLossChange({ type }),
    enableLabel: t("enable_stop_loss"),
    typeLabel: t("stop_loss_type"),
    perTradeLabel: `${t("cash_out_at_loss")} %`,
    perTradeHint: t("automatically_cash_out_if_unrealized_loss"),
    perTradePresets: STOP_LOSS_PRESETS,
    perTradeValue: stopLoss.perTradeLossPercent,
    onPerTradeChange: (perTradeLossPercent) => onStopLossChange({ perTradeLossPercent }),
    sessionFieldLabel: "Session Loss Limit (USDT)",
    sessionLimit: stopLoss.sessionLossLimit,
    onSessionLimitChange: (sessionLossLimit) => onStopLossChange({ sessionLossLimit }),
    sessionSummaryLabel: `${t("session_loss")}:`,
    sessionCurrent: stopLoss.currentSessionLoss,
    dailyFieldLabel: "Daily Loss Limit (USDT)",
    dailyLimit: stopLoss.dailyLossLimit,
    onDailyLimitChange: (dailyLossLimit) => onStopLossChange({ dailyLossLimit }),
    dailySummaryLabel: t("todays_loss"),
    dailyCurrent: stopLoss.currentDailyLoss,
  };

  const takeProfitConfig: SideConfig = {
    tone: "up",
    sign: "+",
    enabled: takeProfit.enabled,
    onToggle: (enabled) => onTakeProfitChange({ enabled }),
    type: takeProfit.type,
    onTypeChange: (type) => onTakeProfitChange({ type }),
    enableLabel: t("enable_take_profit"),
    typeLabel: t("take_profit_type"),
    perTradeLabel: `${t("cash_out_at_profit")} %`,
    perTradeHint: t("automatically_cash_out_if_unrealized_profit"),
    perTradePresets: TAKE_PROFIT_PRESETS,
    perTradeValue: takeProfit.perTradeProfitPercent,
    onPerTradeChange: (perTradeProfitPercent) =>
      onTakeProfitChange({ perTradeProfitPercent }),
    sessionFieldLabel: "Session Profit Target (USDT)",
    sessionLimit: takeProfit.sessionProfitTarget,
    onSessionLimitChange: (sessionProfitTarget) =>
      onTakeProfitChange({ sessionProfitTarget }),
    sessionSummaryLabel: `${t("session_profit")}:`,
    sessionCurrent: takeProfit.currentSessionProfit,
    dailyFieldLabel: "Daily Profit Target (USDT)",
    dailyLimit: takeProfit.dailyProfitTarget,
    onDailyLimitChange: (dailyProfitTarget) => onTakeProfitChange({ dailyProfitTarget }),
    dailySummaryLabel: `${t("todays_profit")}:`,
    dailyCurrent: takeProfit.currentDailyProfit,
  };

  // Tabs — selection is the accent; the dot beside the label is the direction,
  // and it is the only place the up/down hues appear in the chrome.
  const tabs = (
    <div className="flex border-b border-border">
      <button
        type="button"
        onClick={() => setActiveTab("stopLoss")}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
          activeTab === "stopLoss"
            ? "text-primary border-b-2 border-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <TrendingDown size={14} />
        Stop-Loss
        {stopLoss.enabled && <span className="w-2 h-2 rounded-full bg-down" />}
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("takeProfit")}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
          activeTab === "takeProfit"
            ? "text-primary border-b-2 border-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <TrendingUp size={14} />
        Take-Profit
        {takeProfit.enabled && <span className="w-2 h-2 rounded-full bg-up" />}
      </button>
    </div>
  );

  const panes = (
    <>
      {activeTab === "stopLoss" && <SidePane cfg={stopLossConfig} />}
      {activeTab === "takeProfit" && <SidePane cfg={takeProfitConfig} />}

      {/* Info box */}
      <NoticeStrip tone="info" dense icon={<Info size={12} />}>
        {activeTab === "stopLoss"
          ? t("stop_loss_triggers_automatic_cash_out")
          : t("take_profit_locks_in_gains_automatically")}
      </NoticeStrip>
    </>
  );

  // Always expanded mode - just render the settings content without wrapper
  // Used when embedded in SettingSection which provides its own header and toggle
  if (alwaysExpanded) {
    return (
      <div className="space-y-4">
        {tabs}
        <div className="space-y-4">{panes}</div>
      </div>
    );
  }

  // Compact view
  if (compact && !isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2 border border-border"
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">
            {tCommon("stop_loss_take_profit")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {stopLoss.enabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-down/20 text-foreground font-medium">
                SL
              </span>
            )}
            {takeProfit.enabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-up/20 text-foreground font-medium">
                TP
              </span>
            )}
          </div>
          <ChevronDown size={14} className="text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <Panel
      bodyClassName="p-0"
      header={
        <>
          <PanelTitle icon={<Shield size={16} />}>{t("auto_cash_out")}</PanelTitle>
          {compact && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded hover:bg-surface-3"
            >
              <ChevronUp size={14} className="text-muted-foreground" />
            </button>
          )}
        </>
      }
    >
      {tabs}
      <div className="p-4 space-y-4">{panes}</div>
    </Panel>
  );
});

export default StopTakeProfitSettings;
