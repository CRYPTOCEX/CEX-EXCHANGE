"use client";

import React, { useRef, useEffect, useState, type RefObject, memo } from "react";
import { createPortal } from "react-dom";
import { Clock, Minus, Plus, ChevronDown, Check } from "lucide-react";
import { useTranslations } from "next-intl";

interface ExpirySelectorProps {
  expiryMinutes: number;
  expiryTime: string;
  increaseExpiry: () => void;
  decreaseExpiry: () => void;
  setExpiryMinutes: (minutes: number) => void;
  setExpiryTime: (time: string) => void;
  showExpiryDropdown: boolean;
  setShowExpiryDropdown: (show: boolean) => void;
  expiryButtonRef: RefObject<HTMLDivElement | null>;
  presetExpiryTimes: Array<{
    minutes: number;
    display: string;
    profit: number;
    remaining: string;
    expiryTime: Date;
  }>;
  isMobile?: boolean;
  darkMode?: boolean;
  // When barrier/strike level is selected, hide profit badge or show different value
  profitOverride?: number | null;
  hideProfitBadge?: boolean;
}

// PERFORMANCE: Wrapped in React.memo to prevent unnecessary re-renders
// This component only needs to re-render when its props actually change
const ExpirySelector = memo(function ExpirySelector({
  expiryMinutes,
  expiryTime,
  increaseExpiry,
  decreaseExpiry,
  setExpiryMinutes,
  setExpiryTime,
  showExpiryDropdown,
  setShowExpiryDropdown,
  expiryButtonRef,
  presetExpiryTimes,
  isMobile = false,
  darkMode = true,
  profitOverride,
  hideProfitBadge = false,
}: ExpirySelectorProps) {
  const t = useTranslations("binary_components");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // FIXED: Only attach event listener when dropdown is open
  // This prevents listener accumulation and unnecessary event handling when closed
  useEffect(() => {
    if (!showExpiryDropdown) return; // Don't attach listener if dropdown is closed

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        expiryButtonRef.current &&
        !expiryButtonRef.current.contains(event.target as Node)
      ) {
        setShowExpiryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExpiryDropdown, setShowExpiryDropdown, expiryButtonRef]);

  const currentIndex = presetExpiryTimes.findIndex((item) => item.minutes === expiryMinutes);
  const canDecrease = presetExpiryTimes.length > 0 && currentIndex > 0;
  const canIncrease = presetExpiryTimes.length > 0 && currentIndex < presetExpiryTimes.length - 1;
  const baseDurationProfit = presetExpiryTimes.find((item) => item.minutes === expiryMinutes)?.profit || 85;
  // Use override profit when barrier/strike level is selected, otherwise use duration profit
  const currentProfit = profitOverride != null ? profitOverride : baseDurationProfit;

  return (
    <div className="relative flex-1">
      <div
        ref={expiryButtonRef}
        className={`relative overflow-hidden rounded-lg cursor-pointer transition-all duration-200 ${
          darkMode
            ? "bg-zinc-900/80 border border-zinc-800/60 hover:border-zinc-700"
            : "bg-gray-50 border border-gray-200 hover:border-gray-300"
        } ${showExpiryDropdown ? (darkMode ? "border-blue-500/40" : "border-blue-400") : ""}`}
        onClick={() => setShowExpiryDropdown(!showExpiryDropdown)}
      >
        <div className="p-2">
          {/* Header */}
          <div className="flex justify-between items-center mb-0.5">
            <span className={`text-[10px] font-medium uppercase tracking-wide ${
              darkMode ? "text-zinc-500" : "text-gray-500"
            }`}>
              Expiry
            </span>
            <div className="flex items-center gap-0.5">
              <button
                className={`p-1 rounded transition-all cursor-pointer ${
                  darkMode
                    ? "hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                    : "hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                } ${!canDecrease ? "opacity-30 cursor-not-allowed!" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canDecrease) decreaseExpiry();
                }}
                disabled={!canDecrease}
              >
                <Minus size={10} />
              </button>
              <button
                className={`p-1 rounded transition-all cursor-pointer ${
                  darkMode
                    ? "hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                    : "hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                } ${!canIncrease ? "opacity-30 cursor-not-allowed!" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canIncrease) increaseExpiry();
                }}
                disabled={!canIncrease}
              >
                <Plus size={10} />
              </button>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              {expiryTime}
            </span>
            <ChevronDown size={12} className={`ml-auto transition-transform ${
              darkMode ? "text-zinc-600" : "text-gray-400"
            } ${showExpiryDropdown ? "rotate-180" : ""}`} />
          </div>

          {/* Duration + profit */}
          <div className="flex items-center justify-between mt-1">
            <span className={`text-[10px] ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>
              <span className="text-blue-500 font-medium">{expiryMinutes}</span> min
            </span>
            {!hideProfitBadge && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                darkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
              }`}>
                +{currentProfit}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {showExpiryDropdown &&
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
              top: expiryButtonRef.current
                ? expiryButtonRef.current.getBoundingClientRect().bottom + 4
                : 0,
              left: expiryButtonRef.current
                ? Math.min(
                    expiryButtonRef.current.getBoundingClientRect().left,
                    window.innerWidth - 240 - 8 // Ensure dropdown doesn't overflow right
                  )
                : 0,
              maxWidth: isMobile ? "calc(100vw - 16px)" : "240px",
            }}
          >
            <div className="p-1.5 max-h-[220px] overflow-y-auto">
              {presetExpiryTimes.map((item) => {
                const isSelected = expiryMinutes === item.minutes;
                return (
                  <button
                    key={item.minutes}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? darkMode
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-blue-50 text-blue-600"
                        : darkMode
                          ? "hover:bg-zinc-800 text-zinc-300"
                          : "hover:bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => {
                      setExpiryMinutes(item.minutes);
                      setExpiryTime(item.display);
                      setShowExpiryDropdown(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        isSelected
                          ? "bg-blue-500"
                          : darkMode ? "bg-zinc-700" : "bg-gray-200"
                      }`}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-medium">{item.display}</div>
                        <div className={`text-[9px] ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>
                          {item.minutes}m · {item.remaining}
                        </div>
                      </div>
                    </div>
                    {!hideProfitBadge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-emerald-500 text-white"
                          : darkMode
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-emerald-50 text-emerald-600"
                      }`}>
                        +{profitOverride != null ? profitOverride : item.profit}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
});

export default ExpirySelector;
