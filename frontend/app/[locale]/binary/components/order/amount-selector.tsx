"use client";

import React, { type RefObject, useRef, useEffect, useState, memo } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, ChevronDown, History, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

// Smart suggestion type
interface SmartSuggestion {
  amount: number;
  reason: string;
  icon: "history" | "trend_up" | "trend_down" | "sparkles";
}

interface AmountSelectorProps {
  amount: number;
  balance: number;
  increaseAmount: () => void;
  decreaseAmount: () => void;
  setAmount: (amount: number) => void;
  showAmountDropdown: boolean;
  setShowAmountDropdown: (show: boolean) => void;
  amountButtonRef: RefObject<HTMLDivElement | null>;
  amountPopoverPosition?: {
    top: number;
    left: number;
  };
  isMounted?: boolean;
  isMobile?: boolean;
  darkMode?: boolean;
  symbol: string;
  // Smart suggestions props
  recentTradeAmounts?: number[];
  winStreak?: number;
  lossStreak?: number;
  // Market limits
  minAmount?: number;
  maxAmount?: number;
}

// PERFORMANCE: Wrapped in React.memo to prevent unnecessary re-renders
// This component only needs to re-render when its props actually change
// Calculate smart suggestions based on trading history
function calculateSmartSuggestions(
  balance: number,
  currentAmount: number,
  recentAmounts: number[],
  winStreak: number,
  lossStreak: number,
  minAmountLimit: number = 1,
  maxAmountLimit?: number
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const minAmount = minAmountLimit;
  const maxAmount = maxAmountLimit || balance;

  // 1. Most frequent recent trade amount
  if (recentAmounts.length >= 3) {
    const frequency: Record<number, number> = {};
    recentAmounts.forEach((amt) => {
      frequency[amt] = (frequency[amt] || 0) + 1;
    });
    const mostFrequent = Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)[0];
    if (mostFrequent && Number(mostFrequent[0]) >= minAmount && Number(mostFrequent[0]) <= maxAmount) {
      const freqAmount = Number(mostFrequent[0]);
      if (freqAmount !== currentAmount) {
        suggestions.push({
          amount: freqAmount,
          reason: "Most used",
          icon: "history",
        });
      }
    }
  }

  // 2. Average of recent trades
  if (recentAmounts.length >= 2) {
    const avg = Math.round(recentAmounts.reduce((a, b) => a + b, 0) / recentAmounts.length);
    const clampedAvg = Math.min(Math.max(avg, minAmount), maxAmount);
    if (!suggestions.find(s => s.amount === clampedAvg) && clampedAvg !== currentAmount) {
      suggestions.push({
        amount: clampedAvg,
        reason: "Average",
        icon: "sparkles",
      });
    }
  }

  // 3. Win streak suggestion (can increase stake)
  if (winStreak >= 3) {
    const lastAmount = recentAmounts[0] || balance * 0.1;
    const suggestedIncrease = Math.min(Math.round(lastAmount * 1.5), maxAmount, Math.round(balance * 0.25));
    if (!suggestions.find(s => s.amount === suggestedIncrease) && suggestedIncrease !== currentAmount) {
      suggestions.push({
        amount: suggestedIncrease,
        reason: `${winStreak} wins`,
        icon: "trend_up",
      });
    }
  }

  // 4. Loss streak suggestion (should decrease stake)
  if (lossStreak >= 2) {
    const conservativeAmount = Math.max(Math.round(balance * 0.05), minAmount);
    if (!suggestions.find(s => s.amount === conservativeAmount) && conservativeAmount !== currentAmount) {
      suggestions.push({
        amount: conservativeAmount,
        reason: "Safe bet",
        icon: "trend_down",
      });
    }
  }

  // Limit to 3 suggestions
  return suggestions.slice(0, 3);
}

const AmountSelector = memo(function AmountSelector({
  amount,
  balance,
  increaseAmount,
  decreaseAmount,
  setAmount,
  showAmountDropdown,
  setShowAmountDropdown,
  amountButtonRef,
  isMobile = false,
  darkMode = true,
  symbol,
  recentTradeAmounts = [],
  winStreak = 0,
  lossStreak = 0,
  minAmount = 100,
  maxAmount,
}: AmountSelectorProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const presetAmounts = [100, 500, 1000, 2000, 5000, 10000];

  // Calculate smart suggestions with market limits
  const smartSuggestions = calculateSmartSuggestions(
    balance,
    amount,
    recentTradeAmounts,
    winStreak,
    lossStreak,
    minAmount,
    maxAmount
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [inputValue, setInputValue] = useState(amount.toString());

  const getCurrency = (symbol: string) => {
    const parts = symbol.split("/");
    return parts[1] || "USDT";
  };

  useEffect(() => {
    setInputValue(amount.toString());
  }, [amount]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // FIXED: Only attach event listener when dropdown is open
  // This prevents listener accumulation and unnecessary event handling when closed
  useEffect(() => {
    if (!showAmountDropdown) return; // Don't attach listener if dropdown is closed

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        amountButtonRef.current &&
        !amountButtonRef.current.contains(event.target as Node)
      ) {
        setShowAmountDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAmountDropdown, setShowAmountDropdown, amountButtonRef]);

  const balancePercentage = ((amount / balance) * 100).toFixed(1);
  const currency = getCurrency(symbol);

  return (
    <div className="relative flex-1">
      <div
        ref={amountButtonRef}
        className={`relative overflow-hidden rounded-lg cursor-pointer transition-all duration-200 ${
          darkMode
            ? "bg-zinc-900/80 border border-zinc-800/60 hover:border-zinc-700"
            : "bg-gray-50 border border-gray-200 hover:border-gray-300"
        } ${showAmountDropdown ? (darkMode ? "border-emerald-500/40" : "border-emerald-400") : ""}`}
        onClick={() => setShowAmountDropdown(!showAmountDropdown)}
      >
        <div className="p-2">
          {/* Header */}
          <div className="flex justify-between items-center mb-0.5">
            <span className={`text-[10px] font-medium uppercase tracking-wide ${
              darkMode ? "text-zinc-500" : "text-gray-500"
            }`}>
              Amount
            </span>
            <div className="flex items-center gap-0.5">
              <button
                className={`p-1 rounded transition-all cursor-pointer ${
                  darkMode
                    ? "hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                    : "hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                } ${amount <= 100 ? "opacity-30 !cursor-not-allowed" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (amount > 100) decreaseAmount();
                }}
                disabled={amount <= 100}
              >
                <Minus size={10} />
              </button>
              <button
                className={`p-1 rounded transition-all cursor-pointer ${
                  darkMode
                    ? "hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                    : "hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                } ${amount >= balance ? "opacity-30 !cursor-not-allowed" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (amount < balance) increaseAmount();
                }}
                disabled={amount >= balance}
              >
                <Plus size={10} />
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              {amount.toLocaleString()}
            </span>
            <span className={`text-[11px] ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>
              {currency}
            </span>
            <ChevronDown size={12} className={`ml-auto transition-transform ${
              darkMode ? "text-zinc-600" : "text-gray-400"
            } ${showAmountDropdown ? "rotate-180" : ""}`} />
          </div>

          {/* Progress bar */}
          <div className="mt-1.5">
            <div className={`h-0.5 rounded-full overflow-hidden ${darkMode ? "bg-zinc-800" : "bg-gray-200"}`}>
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(Number(balancePercentage), 100)}%` }}
              />
            </div>
            <div className={`text-[9px] mt-0.5 ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>
              <span className="text-emerald-500 font-medium">{balancePercentage}%</span>
              <span className="ml-0.5">{t("of_balance")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {showAmountDropdown &&
        isMounted &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`fixed w-[240px] rounded-xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-1 duration-150 ${
              darkMode
                ? "bg-zinc-900/98 backdrop-blur-xl border border-zinc-800"
                : "bg-white/98 backdrop-blur-xl border border-gray-200"
            }`}
            style={{
              top: amountButtonRef.current
                ? amountButtonRef.current.getBoundingClientRect().bottom + 4
                : 0,
              ...(isMobile
                ? {
                    left: amountButtonRef.current
                      ? amountButtonRef.current.getBoundingClientRect().left
                      : 0,
                    maxWidth: "calc(100vw - 16px)",
                  }
                : {
                    right: amountButtonRef.current
                      ? window.innerWidth -
                        amountButtonRef.current.getBoundingClientRect().right
                      : 0,
                  }),
            }}
          >
            {/* Quick Amounts */}
            <div className="p-2">
              <div className={`text-[9px] font-medium uppercase tracking-wide mb-1.5 ${
                darkMode ? "text-zinc-500" : "text-gray-400"
              }`}>
                {t("quick_amounts")}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {presetAmounts.map((presetAmount) => {
                  const isSelected = amount === presetAmount;
                  return (
                    <button
                      key={presetAmount}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500 text-white"
                          : darkMode
                            ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                      onClick={() => {
                        setAmount(presetAmount);
                        setShowAmountDropdown(false);
                      }}
                    >
                      {presetAmount.toLocaleString()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Percentage */}
            <div className={`p-2 border-t ${darkMode ? "border-zinc-800" : "border-gray-100"}`}>
              <div className={`text-[9px] font-medium uppercase tracking-wide mb-1.5 ${
                darkMode ? "text-zinc-500" : "text-gray-400"
              }`}>
                % of Balance
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[1, 5, 10, 25].map((percent) => {
                  const targetAmount = Math.floor(balance * (percent / 100));
                  return (
                    <button
                      key={percent}
                      className={`py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                        darkMode
                          ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                      onClick={() => {
                        setAmount(targetAmount);
                        setShowAmountDropdown(false);
                      }}
                    >
                      {percent}%
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Smart Suggestions */}
            {smartSuggestions.length > 0 && (
              <div className={`p-2 border-t ${darkMode ? "border-zinc-800" : "border-gray-100"}`}>
                <div className={`text-[9px] font-medium uppercase tracking-wide mb-1.5 flex items-center gap-1 ${
                  darkMode ? "text-zinc-500" : "text-gray-400"
                }`}>
                  <Sparkles size={9} className="text-purple-400" />
                  {t("suggestions") || "Suggestions"}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {smartSuggestions.map(({ amount: suggestedAmount, reason, icon }, idx) => (
                    <button
                      key={`${suggestedAmount}-${idx}`}
                      onClick={() => {
                        setAmount(suggestedAmount);
                        setShowAmountDropdown(false);
                      }}
                      className={`
                        flex items-center gap-1 py-1.5 px-2 rounded-lg text-[10px] transition-all cursor-pointer
                        ${darkMode
                          ? "bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }
                      `}
                    >
                      {icon === "history" && <History size={10} className="text-blue-400" />}
                      {icon === "trend_up" && <TrendingUp size={10} className="text-emerald-400" />}
                      {icon === "trend_down" && <TrendingDown size={10} className="text-amber-400" />}
                      {icon === "sparkles" && <Sparkles size={10} className="text-purple-400" />}
                      <span className="font-semibold">{suggestedAmount.toLocaleString()}</span>
                      <span className={darkMode ? "text-zinc-500" : "text-gray-400"}>
                        {reason}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom input */}
            <div className={`p-2 border-t ${darkMode ? "border-zinc-800" : "border-gray-100"}`}>
              <div className={`flex items-center rounded-lg overflow-hidden ${
                darkMode
                  ? "bg-zinc-800 border border-zinc-700 focus-within:border-emerald-500/50"
                  : "bg-gray-100 border border-gray-200 focus-within:border-emerald-400"
              }`}>
                <span className={`pl-2 text-[10px] ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>
                  {currency}
                </span>
                <input
                  type="number"
                  className={`flex-1 py-1.5 px-2 text-xs font-medium outline-none ${
                    darkMode ? "bg-transparent text-white" : "bg-transparent text-gray-800"
                  }`}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    const value = Number.parseInt(e.target.value);
                    if (!isNaN(value)) {
                      setAmount(Math.min(Math.max(value, 0), balance));
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={tCommon("enter_amount")}
                />
                <button
                  className="px-2 py-1 text-[10px] font-semibold text-emerald-500 hover:text-emerald-400 cursor-pointer"
                  onClick={() => setShowAmountDropdown(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
});

export default AmountSelector;
