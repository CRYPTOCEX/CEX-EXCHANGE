"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Calculator, Percent, DollarSign, AlertTriangle } from "lucide-react";
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
  const t = useTranslations("binary/components/order/risk-calculator");
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

  // Theme-based style variables
  const styles = {
    button: darkMode
      ? "bg-black hover:bg-zinc-900 border-zinc-800 text-white"
      : "bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800",
    modal: darkMode
      ? "bg-black border-zinc-800 text-white"
      : "bg-white border-gray-200 text-gray-800",
    input: darkMode ? "bg-zinc-900/70 text-white" : "bg-gray-100 text-gray-800",
    activeTab: darkMode
      ? "border-[#00C896] text-white"
      : "border-green-600 text-gray-800",
    inactiveTab: darkMode
      ? "text-gray-400 hover:bg-zinc-800/30"
      : "text-gray-500 hover:bg-gray-100",
    accent: darkMode ? "text-[#00C896]" : "text-green-600",
    riskPreset: darkMode
      ? "bg-zinc-900/70 hover:bg-zinc-800/70 text-white"
      : "bg-gray-200 hover:bg-gray-300 text-gray-800",
    applyButton: darkMode
      ? "bg-[#00C896] hover:bg-[#00B085] text-white"
      : "bg-green-600 hover:bg-green-700 text-white",
    border: darkMode ? "border-zinc-800/70" : "border-gray-200",
    label: darkMode ? "text-gray-400" : "text-gray-500",
    slider: darkMode
      ? "bg-zinc-900/70 accent-[#00C896]"
      : "bg-gray-200 accent-green-600",
    warning: darkMode
      ? "bg-red-900/30 text-red-400"
      : "bg-red-100 text-red-600",
    riskDisplay: {
      normal: darkMode ? "bg-zinc-900/70" : "bg-gray-100",
      high: darkMode ? "bg-red-900/30" : "bg-red-100",
    },
    statCard: darkMode ? "bg-zinc-900/70" : "bg-gray-100",
  };

  const renderModal = () => {
    if (!isMounted || !isOpen) return null;

    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999]"
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
                className={`${styles.modal} border rounded-lg shadow-xl p-4 w-[340px] max-h-[90vh] overflow-y-auto`}
                style={{ pointerEvents: "auto" }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <Calculator size={18} className={styles.accent} />
                    {t("risk_calculator")}
                  </h3>
                  <motion.button
                    onClick={() => setIsOpen(false)}
                    className={`text-gray-400 hover:${darkMode ? "text-white" : "text-gray-800"} p-1 rounded-full hover:bg-opacity-50 ${darkMode ? "hover:bg-zinc-800" : "hover:bg-gray-200"}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </motion.button>
                </div>

                {/* Tabs */}
                <div className={`flex border-b ${styles.border} mb-4`}>
                  <motion.button
                    className={`flex-1 py-2 text-center text-sm font-medium ${
                      activeTab === "risk"
                        ? `border-b-2 ${styles.activeTab}`
                        : styles.inactiveTab
                    }`}
                    onClick={() => setActiveTab("risk")}
                    whileHover={{
                      backgroundColor:
                        activeTab === "risk"
                          ? ""
                          : darkMode
                            ? "rgba(42, 46, 57, 0.3)"
                            : "rgba(229, 231, 235, 0.5)",
                    }}
                  >
                    {t("risk_calculator")}
                  </motion.button>
                  <motion.button
                    className={`flex-1 py-2 text-center text-sm font-medium ${
                      activeTab === "stats"
                        ? `border-b-2 ${styles.activeTab}`
                        : styles.inactiveTab
                    }`}
                    onClick={() => setActiveTab("stats")}
                    whileHover={{
                      backgroundColor:
                        activeTab === "stats"
                          ? ""
                          : darkMode
                            ? "rgba(42, 46, 57, 0.3)"
                            : "rgba(229, 231, 235, 0.5)",
                    }}
                  >
                    {t("Statistics")}
                  </motion.button>
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === "risk" ? (
                    <motion.div
                      key="risk-tab"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="mb-4">
                        <div className={`${styles.label} text-sm mb-1`}>
                          {t("account_balance")}
                        </div>
                        <div
                          className={`flex items-center ${darkMode ? "bg-zinc-900" : "bg-gray-100"} p-3 rounded-md`}
                        >
                          <DollarSign
                            size={16}
                            className={`${styles.accent} mr-1`}
                          />
                          <span className="font-medium">
                            {balance.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between">
                          <div className={`${styles.label} text-sm mb-1`}>
                            {t("risk_percentage")}
                          </div>
                          <div className={`text-sm ${styles.label}`}>
                            (0. 1% - 20%)
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0.1"
                            max="20"
                            step="0.1"
                            value={riskPercent}
                            onChange={handleRiskChange}
                            className={`w-full h-2 ${styles.slider} rounded-lg appearance-none cursor-pointer`}
                          />
                          <motion.div
                            className={`flex items-center ${isRiskHigh ? "bg-red-500/20" : styles.input} px-2.5 py-1.5 rounded-md min-w-[60px] justify-center`}
                            animate={{
                              backgroundColor: isRiskHigh
                                ? darkMode
                                  ? "rgba(220, 38, 38, 0.3)"
                                  : "rgba(254, 202, 202, 0.8)"
                                : darkMode
                                  ? "rgba(24, 24, 27, 0.7)"
                                  : "rgba(243, 244, 246, 1)",
                              color: isRiskHigh
                                ? darkMode
                                  ? "#ff9999"
                                  : "#dc2626"
                                : darkMode
                                  ? "#ffffff"
                                  : "#111827",
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            <span className="font-medium text-sm">
                              {riskPercent.toFixed(1)}
                            </span>
                            <Percent size={14} className="ml-1" />
                          </motion.div>
                        </div>
                      </div>

                      <div className="mb-5">
                        <div className={`${styles.label} text-sm mb-1`}>
                          {t("risk_amount")}
                        </div>
                        <motion.div
                          className={`flex items-center ${isRiskHigh ? styles.riskDisplay.high : styles.riskDisplay.normal} p-3 rounded-md`}
                          animate={{
                            backgroundColor: isRiskHigh
                              ? darkMode
                                ? "rgba(220, 38, 38, 0.3)"
                                : "rgba(254, 202, 202, 0.8)"
                              : darkMode
                                ? "rgba(24, 24, 27, 0.7)"
                                : "rgba(243, 244, 246, 1)",
                            color: isRiskHigh
                              ? darkMode
                                ? "#ff9999"
                                : "#dc2626"
                              : darkMode
                                ? "#ffffff"
                                : "#111827",
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <DollarSign
                            size={16}
                            className={
                              isRiskHigh
                                ? "text-red-400 mr-1"
                                : `${styles.accent} mr-1`
                            }
                          />
                          <span className="font-medium">
                            {riskAmount.toLocaleString()}
                          </span>
                        </motion.div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-5">
                        {[1, 2, 5].map((percent) => (
                          <motion.button
                            key={percent}
                            className={`${styles.riskPreset} py-2 rounded-md text-sm font-medium transition-colors`}
                            onClick={() => applyRiskPreset(percent)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {percent}%
                          </motion.button>
                        ))}
                      </div>

                      {isRiskHigh && (
                        <motion.div
                          className={`mb-4 flex items-start p-3 ${styles.warning} rounded-md`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <AlertTriangle
                            size={16}
                            className="text-red-500 mr-2 mt-0.5 flex-shrink-0"
                          />
                          <span className="text-sm">
                            {t("risk_above_5%_account_drawdowns")}.
                          </span>
                        </motion.div>
                      )}

                      <motion.button
                        onClick={applyRiskAmount}
                        className={`w-full ${styles.applyButton} py-2.5 rounded-md font-medium transition-colors shadow-lg`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {t("apply_risk_amount")}
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="stats-tab"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="mb-4">
                        <div className="flex justify-between">
                          <div className={`${styles.label} text-sm mb-1`}>
                            {t("win_rate_(%)")}
                          </div>
                          <div className="text-sm font-medium">{winRate}%</div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={winRate}
                          onChange={handleWinRateChange}
                          className={`w-full h-2 ${styles.slider} rounded-lg appearance-none cursor-pointer`}
                        />
                        <div className="w-full flex justify-between mt-1">
                          <span className={`text-xs ${styles.label}`}>
                            0%
                          </span>
                          <span className={`text-xs ${styles.label}`}>
                            50%
                          </span>
                          <span className={`text-xs ${styles.label}`}>
                            100%
                          </span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between">
                          <div className={`${styles.label} text-sm mb-1`}>
                            {t("risk_reward_ratio")}
                          </div>
                          <div className="text-sm font-medium">
                            1:
                            {riskRewardRatio.toFixed(1)}
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="5"
                          step="0.1"
                          value={riskRewardRatio}
                          onChange={handleRiskRewardChange}
                          className={`w-full h-2 ${styles.slider} rounded-lg appearance-none cursor-pointer`}
                        />
                        <div className="w-full flex justify-between mt-1">
                          <span className={`text-xs ${styles.label}`}>
                            1:0. 1:
                          </span>
                          <span className={`text-xs ${styles.label}`}>
                            1:2. 5
                          </span>
                          <span className={`text-xs ${styles.label}`}>
                            1:5. 0
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <motion.div
                          className={`${styles.statCard} p-3 rounded-md`}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className={`${styles.label} text-sm`}>
                            {t("expected_value")}
                          </div>
                          <div
                            className={`font-medium text-lg ${expectedValue > 0 ? "text-green-500" : "text-red-500"}`}
                          >
                            {expectedValue > 0 ? "+" : ""}
                            {expectedValue.toFixed(2)}
                          </div>
                        </motion.div>
                        <motion.div
                          className={`${styles.statCard} p-3 rounded-md`}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className={`${styles.label} text-sm`}>
                            {t("Probability")}
                          </div>
                          <div
                            className={`font-medium text-lg ${expectedValue > 0 ? "text-green-500" : "text-red-500"}`}
                          >
                            {winRate}%
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 text-sm ${styles.button} py-2 px-3 rounded-md transition-colors border shadow-sm`}
        title="Risk Calculator"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <Calculator size={16} className={styles.accent} />
        <span className="font-medium">{t("Risk")}</span>
      </motion.button>

      {renderModal()}
    </>
  );
}
