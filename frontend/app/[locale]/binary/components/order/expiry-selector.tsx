"use client";

import React, { useRef, useEffect, useState, type RefObject, memo } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AnchoredPopover,
  FieldLabel,
  PayoutChip,
  StepperButton,
} from "./order-ui";

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
  /** @deprecated Tokens are theme-aware; kept so callers need no change. */
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
  profitOverride,
  hideProfitBadge = false,
}: ExpirySelectorProps) {
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
        className={cn(
          "relative overflow-hidden rounded-lg cursor-pointer transition-all duration-200 bg-surface-2 border hover:border-border-strong",
          showExpiryDropdown ? "border-primary" : "border-border"
        )}
        onClick={() => setShowExpiryDropdown(!showExpiryDropdown)}
      >
        <div className="p-2">
          {/* Header */}
          <div className="flex justify-between items-center mb-0.5">
            <FieldLabel>Expiry</FieldLabel>
            <div className="flex items-center gap-0.5">
              <StepperButton
                disabled={!canDecrease}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canDecrease) decreaseExpiry();
                }}
              >
                <Minus size={10} />
              </StepperButton>
              <StepperButton
                disabled={!canIncrease}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canIncrease) increaseExpiry();
                }}
              >
                <Plus size={10} />
              </StepperButton>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-foreground">
              {expiryTime}
            </span>
            <ChevronDown
              size={12}
              className={cn(
                "ml-auto transition-transform text-subtle-foreground",
                showExpiryDropdown && "rotate-180"
              )}
            />
          </div>

          {/* Duration + profit */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-subtle-foreground">
              <span className="text-primary font-medium">{expiryMinutes}</span> min
            </span>
            {!hideProfitBadge && (
              <PayoutChip className="font-semibold">+{currentProfit}%</PayoutChip>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {showExpiryDropdown &&
        isMounted &&
        createPortal(
          <AnchoredPopover
            panelRef={dropdownRef}
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
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-all cursor-pointer text-foreground",
                      isSelected ? "bg-primary/15" : "hover:bg-surface-3"
                    )}
                    onClick={() => {
                      setExpiryMinutes(item.minutes);
                      setExpiryTime(item.display);
                      setShowExpiryDropdown(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center",
                          isSelected ? "bg-primary" : "bg-surface-3"
                        )}
                      >
                        {isSelected && (
                          <Check size={10} className="text-primary-foreground" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-medium">{item.display}</div>
                        <div className="text-[9px] text-subtle-foreground">
                          {item.minutes}m · {item.remaining}
                        </div>
                      </div>
                    </div>
                    {!hideProfitBadge && (
                      <PayoutChip>
                        +{profitOverride != null ? profitOverride : item.profit}%
                      </PayoutChip>
                    )}
                  </button>
                );
              })}
            </div>
          </AnchoredPopover>,
          document.body
        )}
    </div>
  );
});

export default ExpirySelector;
