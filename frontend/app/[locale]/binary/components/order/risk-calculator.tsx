"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Calculator, Percent, DollarSign, AlertTriangle, X, TrendingUp, BarChart3, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface RiskCalculatorProps {
  balance: number;
  onSetAmount: (amount: number) => void;
  darkMode?: boolean;
}

export default function RiskCalculator({
  balance,
  onSetAmount,
  darkMode = true,
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

  const renderModal = () => {
    if (!isMounted || !isOpen) return null;

    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Modal Container */}
            <div
              className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
              style={{ pointerEvents: "none" }}
            >
              <motion.div
                ref={popupRef}
                className={`relative w-[340px] max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl ${
                  darkMode
                    ? "bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/80"
                    : "bg-white/95 backdrop-blur-xl border border-gray-200"
                }`}
                style={{ pointerEvents: "auto" }}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {/* Header */}
                <div className={`flex items-center justify-between px-4 py-3 border-b ${
                  darkMode ? "border-zinc-800/50" : "border-gray-200"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${darkMode ? "bg-amber-500/10" : "bg-amber-50"}`}>
                      <Calculator size={16} className="text-amber-500" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {t("risk_calculator")}
                      </h3>
                      <p className={`text-[10px] ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>
                        {t("calculate_optimal_position_size")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                      darkMode
                        ? "text-zinc-500 hover:text-white hover:bg-zinc-800"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Tabs */}
                <div className={`flex mx-4 mt-3 rounded-xl overflow-hidden ${
                  darkMode ? "bg-zinc-800/50" : "bg-gray-100"
                }`}>
                  <button
                    className={`flex-1 py-2 text-center text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      activeTab === "risk"
                        ? darkMode
                          ? "bg-amber-500 text-white shadow-md"
                          : "bg-amber-500 text-white shadow-md"
                        : darkMode
                          ? "text-zinc-400 hover:text-white"
                          : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveTab("risk")}
                  >
                    Calculator
                  </button>
                  <button
                    className={`flex-1 py-2 text-center text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      activeTab === "stats"
                        ? darkMode
                          ? "bg-amber-500 text-white shadow-md"
                          : "bg-amber-500 text-white shadow-md"
                        : darkMode
                          ? "text-zinc-400 hover:text-white"
                          : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveTab("stats")}
                  >
                    {t("statistics")}
                  </button>
                </div>

                {/* Content */}
                <div className="px-4 py-4 overflow-y-auto max-h-[60vh]">
                  <AnimatePresence mode="wait">
                    {activeTab === "risk" ? (
                      <motion.div
                        key="risk-tab"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        {/* Balance display */}
                        <div className={`p-3 rounded-xl ${
                          darkMode ? "bg-zinc-800/50" : "bg-gray-50"
                        }`}>
                          <div className={`text-[10px] uppercase tracking-wide font-semibold mb-1 ${
                            darkMode ? "text-zinc-500" : "text-gray-400"
                          }`}>
                            {tCommon("available_balance")}
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign size={16} className="text-amber-500" />
                            <span className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {balance.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Risk slider */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <div className={`text-[11px] uppercase tracking-wide font-semibold ${
                              darkMode ? "text-zinc-400" : "text-gray-500"
                            }`}>
                              {t("risk_percentage")}
                            </div>
                            <div className={`text-sm font-bold ${
                              isRiskHigh ? "text-red-400" : "text-amber-500"
                            }`}>
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
                              className={`w-full h-2 rounded-full appearance-none cursor-pointer ${
                                darkMode ? "bg-zinc-800" : "bg-gray-200"
                              }`}
                              style={{
                                background: darkMode
                                  ? `linear-gradient(to right, #f59e0b ${(riskPercent / 20) * 100}%, #27272a ${(riskPercent / 20) * 100}%)`
                                  : `linear-gradient(to right, #f59e0b ${(riskPercent / 20) * 100}%, #e5e7eb ${(riskPercent / 20) * 100}%)`
                              }}
                            />
                          </div>
                          <div className={`flex justify-between mt-1 text-[9px] ${
                            darkMode ? "text-zinc-600" : "text-gray-400"
                          }`}>
                            <span>0.1%</span>
                            <span className="text-amber-500">{t("safe_1_2")}</span>
                            <span>20%</span>
                          </div>
                        </div>

                        {/* Risk amount */}
                        <div className={`p-3 rounded-xl ${
                          isRiskHigh
                            ? darkMode ? "bg-red-950/30 border border-red-900/40" : "bg-red-50 border border-red-200"
                            : darkMode ? "bg-zinc-800/50" : "bg-gray-50"
                        }`}>
                          <div className={`text-[10px] uppercase tracking-wide font-semibold mb-1 ${
                            isRiskHigh
                              ? "text-red-400"
                              : darkMode ? "text-zinc-500" : "text-gray-400"
                          }`}>
                            {t("risk_amount")}
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign size={16} className={isRiskHigh ? "text-red-400" : "text-amber-500"} />
                            <span className={`text-xl font-bold ${
                              isRiskHigh
                                ? "text-red-400"
                                : darkMode ? "text-white" : "text-gray-900"
                            }`}>
                              {riskAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Quick presets */}
                        <div>
                          <div className={`text-[10px] uppercase tracking-wide font-semibold mb-2 ${
                            darkMode ? "text-zinc-500" : "text-gray-400"
                          }`}>
                            {tCommon("quick_presets")}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { percent: 1, label: "Safe", color: "emerald" },
                              { percent: 2, label: "Moderate", color: "amber" },
                              { percent: 5, label: "Aggressive", color: "red" }
                            ].map((preset) => (
                              <button
                                key={preset.percent}
                                className={`py-2.5 rounded-xl text-center transition-all duration-200 cursor-pointer ${
                                  riskPercent === preset.percent
                                    ? `bg-${preset.color}-500 text-white shadow-lg`
                                    : darkMode
                                      ? `bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700`
                                      : `bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200`
                                } active:scale-95`}
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
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-start gap-2.5 p-3 rounded-xl ${
                              darkMode
                                ? "bg-red-950/30 border border-red-900/40"
                                : "bg-red-50 border border-red-200"
                            }`}
                          >
                            <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                            <div className="text-[11px] text-red-400 leading-relaxed">
                              {t("high_risk_5_can_lead_to_significant_drawdowns")}
                            </div>
                          </motion.div>
                        )}

                        {/* Apply button */}
                        <button
                          onClick={applyRiskAmount}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-amber-500/25 active:scale-[0.98] cursor-pointer"
                        >
                          {t("apply")}{riskAmount.toLocaleString()}
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
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
                              <TrendingUp size={14} className="text-emerald-500" />
                              <span className={`text-[11px] uppercase tracking-wide font-semibold ${
                                darkMode ? "text-zinc-400" : "text-gray-500"
                              }`}>
                                {tCommon("win_rate")}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-emerald-500">{winRate}%</div>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={winRate}
                            onChange={handleWinRateChange}
                            className={`w-full h-2 rounded-full appearance-none cursor-pointer`}
                            style={{
                              background: darkMode
                                ? `linear-gradient(to right, #10b981 ${winRate}%, #27272a ${winRate}%)`
                                : `linear-gradient(to right, #10b981 ${winRate}%, #e5e7eb ${winRate}%)`
                            }}
                          />
                        </div>

                        {/* Risk/Reward slider */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <Target size={14} className="text-blue-500" />
                              <span className={`text-[11px] uppercase tracking-wide font-semibold ${
                                darkMode ? "text-zinc-400" : "text-gray-500"
                              }`}>
                                {t('risk_reward_ratio')}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-blue-500">1:{riskRewardRatio.toFixed(1)}</div>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={riskRewardRatio}
                            onChange={handleRiskRewardChange}
                            className={`w-full h-2 rounded-full appearance-none cursor-pointer`}
                            style={{
                              background: darkMode
                                ? `linear-gradient(to right, #3b82f6 ${(riskRewardRatio / 5) * 100}%, #27272a ${(riskRewardRatio / 5) * 100}%)`
                                : `linear-gradient(to right, #3b82f6 ${(riskRewardRatio / 5) * 100}%, #e5e7eb ${(riskRewardRatio / 5) * 100}%)`
                            }}
                          />
                        </div>

                        {/* Stats cards */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`p-3 rounded-xl ${
                            darkMode ? "bg-zinc-800/50" : "bg-gray-50"
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              <BarChart3 size={12} className={expectedValue > 0 ? "text-emerald-500" : "text-red-400"} />
                              <span className={`text-[10px] uppercase tracking-wide font-semibold ${
                                darkMode ? "text-zinc-500" : "text-gray-400"
                              }`}>
                                {t("expected_value")}
                              </span>
                            </div>
                            <div className={`text-xl font-bold ${
                              expectedValue > 0 ? "text-emerald-500" : "text-red-400"
                            }`}>
                              {expectedValue > 0 ? "+" : ""}{expectedValue.toFixed(2)}
                            </div>
                          </div>
                          <div className={`p-3 rounded-xl ${
                            darkMode ? "bg-zinc-800/50" : "bg-gray-50"
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Percent size={12} className={expectedValue > 0 ? "text-emerald-500" : "text-red-400"} />
                              <span className={`text-[10px] uppercase tracking-wide font-semibold ${
                                darkMode ? "text-zinc-500" : "text-gray-400"
                              }`}>
                                {t("win_probability")}
                              </span>
                            </div>
                            <div className={`text-xl font-bold ${
                              winRate > 50 ? "text-emerald-500" : "text-red-400"
                            }`}>
                              {winRate}%
                            </div>
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div className={`p-3 rounded-xl ${
                          expectedValue > 0
                            ? darkMode ? "bg-emerald-950/30 border border-emerald-900/40" : "bg-emerald-50 border border-emerald-200"
                            : darkMode ? "bg-red-950/30 border border-red-900/40" : "bg-red-50 border border-red-200"
                        }`}>
                          <div className={`text-xs font-medium ${
                            expectedValue > 0 ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {expectedValue > 0
                              ? "Positive expectancy - This strategy has an edge"
                              : "Negative expectancy - Adjust your parameters"}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
          darkMode
            ? "bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/50 hover:border-zinc-700"
            : "bg-gray-100 hover:bg-gray-200 border border-gray-200 hover:border-gray-300"
        } active:scale-95`}
        title={t("risk_calculator")}
      >
        <div className={`p-1 rounded-md ${darkMode ? "bg-amber-500/10" : "bg-amber-50"}`}>
          <Calculator size={12} className="text-amber-500" />
        </div>
        <span className={`text-[10px] font-semibold ${darkMode ? "text-zinc-400" : "text-gray-500"}`}>
          Risk
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
          darkMode ? "bg-zinc-800 text-zinc-400" : "bg-gray-200 text-gray-500"
        }`}>
          {riskPercent}%
        </span>
      </button>

      {renderModal()}
    </>
  );
}
