"use client";

import type { RefObject } from "react";
import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DollarSign, Minus, Plus, Check } from "lucide-react";

// Update the ref type to accept HTMLDivElement | null
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
}
export default function AmountSelector({
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
}: AmountSelectorProps) {
  const presetAmounts = [100, 500, 1000, 2000, 5000, 10000];
  const availableBalance = balance;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Mount check for portal rendering
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
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
  }, [setShowAmountDropdown, amountButtonRef]);
  return (
    <div className="relative flex-1">
      <div
        ref={amountButtonRef}
        className={`${darkMode ? "bg-zinc-900" : "bg-gray-100"} p-2 rounded-md cursor-pointer h-full ${darkMode ? "border border-[#2A2E39]" : "border border-gray-200"}`}
        onClick={() => setShowAmountDropdown(!showAmountDropdown)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span
              className={`${darkMode ? "text-gray-400" : "text-gray-500"} text-xs`}
            >
              Amount
            </span>
          </div>
          <div className="flex space-x-1">
            <button
              className={`${darkMode ? "bg-[#2A2E39]" : "bg-gray-200"} rounded w-5 h-5 flex items-center justify-center ${amount <= 100 ? "opacity-50 cursor-not-allowed" : darkMode ? "hover:bg-[#3A3E4A]" : "hover:bg-gray-300"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (amount > 100) decreaseAmount();
              }}
              disabled={amount <= 100}
            >
              <Minus size={14} />
            </button>
            <button
              className={`${darkMode ? "bg-[#2A2E39]" : "bg-gray-200"} rounded w-5 h-5 flex items-center justify-center ${amount >= balance ? "opacity-50 cursor-not-allowed" : darkMode ? "hover:bg-[#3A3E4A]" : "hover:bg-gray-300"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (amount < balance) increaseAmount();
              }}
              disabled={amount >= balance}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="flex items-center mt-1">
          <DollarSign
            size={16}
            className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}
          />
          <span
            className={`${darkMode ? "text-white" : "text-gray-800"} text-base font-bold`}
          >
            {amount.toLocaleString()}
          </span>
        </div>
        <div
          className={`text-[12px] ${darkMode ? "text-gray-400" : "text-gray-500"} mt-1`}
        >
          {((amount / balance) * 100).toFixed(1)}% of balance
        </div>
      </div>

      {/* Portal-based dropdown for better mobile positioning */}
      {showAmountDropdown &&
        isMounted &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`fixed w-[260px] ${darkMode ? "bg-black border-zinc-800" : "bg-white border border-gray-200"} rounded-md shadow-lg z-[9999] animate-in fade-in zoom-in-95 duration-100`}
            style={{
              top: amountButtonRef.current
                ? amountButtonRef.current.getBoundingClientRect().bottom + 8
                : 0,
              ...(isMobile
                ? {
                    left: amountButtonRef.current
                      ? amountButtonRef.current.getBoundingClientRect().left
                      : 0,
                    maxWidth: "calc(100vw - 20px)",
                    width: "min(260px, calc(100vw - 20px))",
                  }
                : {
                    right: amountButtonRef.current
                      ? window.innerWidth -
                        amountButtonRef.current.getBoundingClientRect().right +
                        10
                      : 0,
                  }),
            }}
          >
            <div
              className={`p-2 border-b ${darkMode ? "border-zinc-800" : "border-gray-200"}`}
            >
              <div
                className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}
              >
                Quick Amounts
              </div>
              <div className="grid grid-cols-3 gap-1">
                {presetAmounts.map((presetAmount) => {
                  return (
                    <button
                      key={presetAmount}
                      className={`p-2 rounded text-center transition-colors ${amount === presetAmount ? "bg-[#00C896] text-white" : darkMode ? "bg-[#2A2E39] hover:bg-[#3A3E4A] text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-800"}`}
                      onClick={() => {
                        setAmount(presetAmount);
                        setShowAmountDropdown(false);
                      }}
                    >
                      <div className="flex items-center justify-center">
                        {amount === presetAmount && (
                          <Check size={12} className="mr-1" />
                        )}
                        <span className="text-[12px]">
                          ${presetAmount.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-2">
              <div
                className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}
              >
                Percentage of Balance
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[1, 5, 10, 25].map((percent) => (
                  <button
                    key={percent}
                    className={`p-2 rounded text-center transition-colors ${Math.abs(amount - Math.floor(balance * (percent / 100))) < 1 ? "bg-[#00C896] text-white" : darkMode ? "bg-[#2A2E39] hover:bg-[#3A3E4A] text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-800"}`}
                    onClick={() => {
                      setAmount(Math.floor(balance * (percent / 100)));
                      setShowAmountDropdown(false);
                    }}
                  >
                    <div className="flex items-center justify-center">
                      {Math.abs(
                        amount - Math.floor(balance * (percent / 100))
                      ) < 1 && <Check size={12} className="mr-1" />}
                      <span className="text-[12px]">{percent}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`p-2 border-t ${darkMode ? "border-zinc-800" : "border-gray-200"}`}
            >
              <div
                className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}
              >
                Custom Amount
              </div>
              <div
                className={`flex items-center ${darkMode ? "bg-[#2A2E39]" : "bg-gray-100"} rounded p-1`}
              >
                <DollarSign
                  size={14}
                  className={`${darkMode ? "text-gray-400" : "text-gray-500"} ml-1`}
                />
                <input
                  type="number"
                  className={`${darkMode ? "bg-transparent text-white" : "bg-transparent text-gray-800"} w-full text-sm outline-none px-1`}
                  value={amount}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value);
                    if (!isNaN(value)) {
                      setAmount(Math.min(Math.max(value, 0), availableBalance));
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex justify-between items-center mt-2 text-[11px] text-gray-400">
                <span>Available: ${availableBalance.toLocaleString()}</span>
                <button
                  className="bg-[#00C896] hover:bg-[#00B085] text-white px-2 py-1 rounded text-[11px]"
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
}
