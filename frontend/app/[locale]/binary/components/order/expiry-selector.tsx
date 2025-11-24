"use client";

import { useRef, useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Clock, Minus, Plus, Timer, Check } from "lucide-react";

// Update the ref type to accept HTMLDivElement | null
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
  expiryPopoverPosition?: {
    top: number;
    left: number;
  };
  presetExpiryTimes: Array<{
    minutes: number;
    display: string;
    profit: number;
    remaining: string;
    expiryTime: Date;
  }>;
  isMobile?: boolean;
  darkMode?: boolean;
}
export default function ExpirySelector({
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
}: ExpirySelectorProps) {
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
  }, [setShowExpiryDropdown, expiryButtonRef]);
  return (
    <div className="relative flex-1">
      <div
        ref={expiryButtonRef}
        className={`${darkMode ? "bg-zinc-900" : "bg-gray-100"} p-2 rounded-md cursor-pointer h-full ${darkMode ? "border border-[#2A2E39]" : "border border-gray-200"}`}
        onClick={() => setShowExpiryDropdown(!showExpiryDropdown)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span
              className={`${darkMode ? "text-gray-400" : "text-gray-500"} text-xs`}
            >
              Expiry
            </span>
          </div>
          <div className="flex space-x-1">
            <button
              className={`${darkMode ? "bg-[#2A2E39]" : "bg-gray-200"} rounded w-5 h-5 flex items-center justify-center ${presetExpiryTimes.length === 0 || presetExpiryTimes.findIndex((item) => item.minutes === expiryMinutes) <= 0 ? "opacity-50 cursor-not-allowed" : darkMode ? "hover:bg-[#3A3E4A]" : "hover:bg-gray-300"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (
                  presetExpiryTimes.length > 0 &&
                  presetExpiryTimes.findIndex(
                    (item) => item.minutes === expiryMinutes
                  ) > 0
                ) {
                  decreaseExpiry();
                }
              }}
              disabled={
                presetExpiryTimes.length === 0 ||
                presetExpiryTimes.findIndex(
                  (item) => item.minutes === expiryMinutes
                ) <= 0
              }
            >
              <Minus size={14} />
            </button>
            <button
              className={`${darkMode ? "bg-[#2A2E39]" : "bg-gray-200"} rounded w-5 h-5 flex items-center justify-center ${presetExpiryTimes.length === 0 || presetExpiryTimes.findIndex((item) => item.minutes === expiryMinutes) >= presetExpiryTimes.length - 1 ? "opacity-50 cursor-not-allowed" : darkMode ? "hover:bg-[#3A3E4A]" : "hover:bg-gray-300"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (
                  presetExpiryTimes.length > 0 &&
                  presetExpiryTimes.findIndex(
                    (item) => item.minutes === expiryMinutes
                  ) <
                    presetExpiryTimes.length - 1
                ) {
                  increaseExpiry();
                }
              }}
              disabled={
                presetExpiryTimes.length === 0 ||
                presetExpiryTimes.findIndex(
                  (item) => item.minutes === expiryMinutes
                ) >=
                  presetExpiryTimes.length - 1
              }
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="flex items-center mt-1">
          <Clock
            size={16}
            className={`${darkMode ? "text-gray-400" : "text-gray-500"} mr-1`}
          />
          <span
            className={`${darkMode ? "text-white" : "text-gray-800"} text-base font-bold min-w-[90px]`}
          >
            {expiryTime}
          </span>
        </div>
        <div
          className={`text-[12px] ${darkMode ? "text-gray-400" : "text-gray-500"} mt-1`}
        >
          {expiryMinutes} {expiryMinutes === 1 ? "minute" : "minutes"}
        </div>
      </div>

      {/* Portal-based dropdown for better mobile positioning */}
      {showExpiryDropdown &&
        isMounted &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`fixed w-[260px] ${darkMode ? "bg-black border border-zinc-800" : "bg-white border border-gray-200"} rounded-md shadow-lg z-[9999] animate-in fade-in zoom-in-95 duration-100`}
            style={{
              top: expiryButtonRef.current
                ? expiryButtonRef.current.getBoundingClientRect().bottom + 8
                : 0,
              ...(isMobile
                ? {
                    left: expiryButtonRef.current
                      ? expiryButtonRef.current.getBoundingClientRect().left
                      : 0,
                    maxWidth: "calc(100vw - 20px)",
                    width: "min(260px, calc(100vw - 20px))",
                  }
                : {
                    right: expiryButtonRef.current
                      ? window.innerWidth -
                        expiryButtonRef.current.getBoundingClientRect().right +
                        10
                      : 0,
                  }),
            }}
          >
            <div className="p-2">
              <div
                className={`text-xs font-medium ${darkMode ? "text-white" : "text-gray-800"} mb-2`}
              >
                Expiry Time
              </div>
              <div className="space-y-1">
                {presetExpiryTimes.map((item) => {
                  return (
                    <button
                      key={item.minutes}
                      className={`w-full flex justify-between items-center p-2 rounded transition-colors ${expiryMinutes === item.minutes ? "bg-[#00C896]" : darkMode ? "bg-[#2A2E39] hover:bg-zinc-800" : "bg-gray-100 hover:bg-gray-200"}`}
                      onClick={() => {
                        setExpiryMinutes(item.minutes);
                        setExpiryTime(item.display);
                        setShowExpiryDropdown(false);
                      }}
                    >
                      <div className="flex items-center">
                        {expiryMinutes === item.minutes && (
                          <Check size={14} className="mr-2 text-white" />
                        )}
                        <div className="flex flex-col items-start">
                          <span
                            className={`text-[14px] font-bold ${expiryMinutes === item.minutes ? "text-white" : darkMode ? "text-white" : "text-gray-800"}`}
                          >
                            {item.display}
                          </span>
                          <span
                            className={`text-[11px] ${expiryMinutes === item.minutes ? "text-white" : darkMode ? "text-gray-400" : "text-gray-500"}`}
                          >
                            {item.minutes} min
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div
                          className={`${expiryMinutes === item.minutes ? "bg-white text-[#00C896]" : "bg-[#00C896] text-white"} px-2 py-0.5 rounded font-bold text-[12px]`}
                        >
                          {item.profit}%
                        </div>
                        <div
                          className={`flex items-center text-[11px] mt-1 ${expiryMinutes === item.minutes ? "text-white" : darkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          <Timer size={10} className="mr-0.5" />
                          <span>{item.remaining}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
