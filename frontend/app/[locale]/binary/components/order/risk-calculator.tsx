"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Calculator, Percent, DollarSign, AlertTriangle, TrendingUp, BarChart3, Target } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { OverlayModal, ToolbarButton } from "./order-ui";

interface RiskCalculatorProps {
  balance: number;
  onSetAmount: (amount: number) => void;
  /** @deprecated Tokens are theme-aware; kept so callers need no change. */
  darkMode?: boolean;
}

/**
 * Risk presets are a LADDER, not three identities: default -> interactive ->
 * caution. `destructive` is deliberately absent — sizing a trade at 5% is not
 * an error, it is a warning, and `destructive` is reserved in this panel for
 * things the platform actually refused.
 *
 * These used to be built as `bg-${preset.color}-500`, a constructed class name.
 * Tailwind v4 has no config to safelist against, so it emitted no CSS at all
 * and the selected preset rendered `text-overlay-foreground` on no fill.
 */
const RISK_PRESETS = [
  { percent: 1, label: "Safe", fill: "bg-surface-3 text-foreground border border-border-strong" },
  { percent: 2, label: "Moderate", fill: "bg-primary/15 text-foreground border border-primary" },
  { percent: 5, label: "Aggressive", fill: "bg-warning/15 text-foreground border border-warning" },
] as const;

/** Slider fills need real colour values; read them from the live tokens. */
const sliderTrack = (token: string, filledPercent: number) =>
  `linear-gradient(to right, hsl(var(${token})) ${filledPercent}%, hsl(var(--surface-3)) ${filledPercent}%)`;

export default function RiskCalculator({
  balance,
  onSetAmount,
}: RiskCalculatorProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);
  const [riskPercent, setRiskPercent] = useState(2);
  const [riskAmount, setRiskAmount] = useState(0);
  const [isRiskHigh, setIsRiskHigh] = useState(false);
  const [activeTab, setActiveTab] = useState<"risk" | "stats">("risk");
  const [isMounted, setIsMounted] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Check if component is mounted to prevent SSR issues
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Risk metrics
  const [winRate, setWinRate] = useState(55);
  const [riskRewardRatio, setRiskRewardRatio] = useState(1.5);
  const [expectedValue, setExpectedValue] = useState(0);

  // Calculate risk amount when percentage changes
  useEffect(() => {
    const amount = Math.round((balance * riskPercent) / 100);
    setRiskAmount(amount);
    setIsRiskHigh(riskPercent > 5);

    // Calculate expected value
    const ev = (winRate / 100) * riskRewardRatio - (100 - winRate) / 100;
    setExpectedValue(ev);
  }, [riskPercent, balance, winRate, riskRewardRatio]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle risk percentage change
  const handleRiskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0.1 && value <= 20) {
      setRiskPercent(value);
    }
  };

  // Handle win rate change
  const handleWinRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      setWinRate(value);
    }
  };

  // Handle risk/reward ratio change
  const handleRiskRewardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0.1 && value <= 5) {
      setRiskRewardRatio(value);
    }
  };

  // Apply the calculated amount
  const applyRiskAmount = () => {
    onSetAmount(riskAmount);
    setIsOpen(false);
  };

  // Quick risk presets
  const applyRiskPreset = (percent: number) => {
    setRiskPercent(percent);
    const amount = Math.round((balance * percent) / 100);
    onSetAmount(amount);
    setIsOpen(false);
  };

  // Expectancy and win probability are money outcomes, so they read as price
  // direction rather than as success/failure states.
  const isPositiveEv = expectedValue > 0;

  const renderModal = () => {
    if (!isMounted || !isOpen) return null;

    return (
      <OverlayModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        panelRef={popupRef}
        icon={Calculator}
        title={t("risk_calculator")}
        subtitle={t("calculate_optimal_position_size")}
      >
        {/* Tabs */}
        <div className="flex mx-4 mt-3 rounded-xl overflow-hidden bg-surface-3">
          {(
            [
              { id: "risk", label: t("calculator") },
              { id: "stats", label: t("statistics") },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "flex-1 py-2 text-center text-xs font-semibold transition-all duration-200 cursor-pointer",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-4 py-4 overflow-y-auto max-h-[60vh]">
          <AnimatePresence mode="wait">
            {activeTab === "risk" ? (
              <m.div
                key="risk-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Balance display */}
                <div className="p-3 rounded-xl bg-surface-3">
                  <div className="text-[10px] uppercase tracking-wide font-semibold mb-1 text-subtle-foreground">
                    {tCommon("available_balance")}
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-primary" />
                    <span className="text-xl font-bold text-foreground">
                      {balance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Risk slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                      {t("risk_percentage")}
                    </div>
                    <div
                      className={cn(
                        "text-sm font-bold",
                        isRiskHigh ? "text-warning" : "text-foreground"
                      )}
                    >
                      {riskPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0.1"
                      max="20"
                      step="0.1"
                      value={riskPercent}
                      onChange={handleRiskChange}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-surface-3"
                      style={{
                        background: sliderTrack("--warning", (riskPercent / 20) * 100),
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-subtle-foreground">
                    <span>0.1%</span>
                    <span className="text-foreground">Safe: 1-2%</span>
                    <span>20%</span>
                  </div>
                </div>

                {/* Risk amount */}
                <div
                  className={cn(
                    "p-3 rounded-xl",
                    isRiskHigh
                      ? "bg-warning/10 border border-warning/40"
                      : "bg-surface-3"
                  )}
                >
                  <div className="text-[10px] uppercase tracking-wide font-semibold mb-1 text-subtle-foreground">
                    {t("risk_amount")}
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign
                      size={16}
                      className={isRiskHigh ? "text-warning" : "text-primary"}
                    />
                    <span className="text-xl font-bold text-foreground">
                      {riskAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Quick presets */}
                <div>
                  <div className="text-[10px] uppercase tracking-wide font-semibold mb-2 text-subtle-foreground">
                    {tCommon("quick_presets")}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {RISK_PRESETS.map((preset) => (
                      <button
                        key={preset.percent}
                        className={cn(
                          "py-2.5 rounded-xl text-center transition-all duration-200 cursor-pointer active:scale-95",
                          riskPercent === preset.percent
                            ? `${preset.fill} shadow-lg`
                            : "bg-surface-3 text-muted-foreground hover:bg-primary/10 border border-border"
                        )}
                        onClick={() => applyRiskPreset(preset.percent)}
                      >
                        <div className="text-sm font-bold">{preset.percent}%</div>
                        <div className="text-[9px] opacity-70">{preset.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* High risk warning */}
                {isRiskHigh && (
                  <m.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/10 border border-warning/40"
                  >
                    <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                    <div className="text-[11px] text-foreground leading-relaxed">
                      {t("high_risk_5_can_lead_to_significant_drawdowns")}
                    </div>
                  </m.div>
                )}

                {/* Apply button */}
                <button
                  onClick={applyRiskAmount}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all duration-200 shadow-lg active:scale-[0.98] cursor-pointer"
                >
                  {t("apply")}{riskAmount.toLocaleString()}
                </button>
              </m.div>
            ) : (
              <m.div
                key="stats-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Win rate slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-up" />
                      <span className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                        {tCommon("win_rate")}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-foreground">{winRate}%</div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={winRate}
                    onChange={handleWinRateChange}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{ background: sliderTrack("--up", winRate) }}
                  />
                </div>

                {/* Risk/Reward slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Target size={14} className="text-primary" />
                      <span className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                        {t('risk_reward_ratio')}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-foreground">1:{riskRewardRatio.toFixed(1)}</div>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={riskRewardRatio}
                    onChange={handleRiskRewardChange}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: sliderTrack("--primary", (riskRewardRatio / 5) * 100),
                    }}
                  />
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-surface-3">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3
                        size={12}
                        className={isPositiveEv ? "text-up" : "text-down"}
                      />
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-subtle-foreground">
                        {t("expected_value")}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "text-xl font-bold",
                        isPositiveEv ? "text-up" : "text-down"
                      )}
                    >
                      {isPositiveEv ? "+" : ""}{expectedValue.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Percent
                        size={12}
                        className={isPositiveEv ? "text-up" : "text-down"}
                      />
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-subtle-foreground">
                        {t("win_probability")}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "text-xl font-bold",
                        winRate > 50 ? "text-up" : "text-down"
                      )}
                    >
                      {winRate}%
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                <div
                  className={cn(
                    "p-3 rounded-xl border",
                    isPositiveEv
                      ? "bg-up/10 border-up/40"
                      : "bg-down/10 border-down/40"
                  )}
                >
                  <div className="text-xs font-medium text-foreground">
                    {isPositiveEv
                      ? t("positive_expectancy_this_strategy_has_an_edge")
                      : t("negative_expectancy_adjust_your_parameters")}
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </OverlayModal>
    );
  };

  return (
    <>
      <ToolbarButton
        icon={Calculator}
        label="Risk"
        badge={`${riskPercent}%`}
        onClick={() => setIsOpen(true)}
        title={t("risk_calculator")}
      />

      {renderModal()}
    </>
  );
}
