"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { useChart } from "../../../context/chart-context";
import { cn } from "@/lib/utils";
import { TimeFrame } from "@/store/trade/use-binary-store";

const TimeframeSelector = () => {
  // Get the entire context object first
  const context = useChart();
  // Extract known properties directly
  const { timeFrame, onTimeFrameChange } = context;
  // Use type assertion for the property that's not in the type definition
  const timeframeDurations = (context as any).timeframeDurations;

  const [showTimeframeMenu, setShowTimeframeMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Use the timeframeDurations from context, or fall back to default if not provided
  const availableTimeframes = timeframeDurations || [
    { value: "1m", label: "1m" },
    { value: "5m", label: "5m" },
    { value: "15m", label: "15m" },
    { value: "30m", label: "30m" },
    { value: "1h", label: "1h" },
    { value: "4h", label: "4h" },
    { value: "1d", label: "1d" },
    { value: "1w", label: "1w" },
  ];

  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
    if (onTimeFrameChange) {
      onTimeFrameChange(newTimeframe);
    }
    setShowTimeframeMenu(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowTimeframeMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      {/* Custom button that matches the size of other buttons */}
      <div
        ref={buttonRef}
        className={cn(
          "bg-[#2A2E39] text-gray-200 hover:bg-[#343A47] rounded flex items-center justify-center cursor-pointer",
          "h-[34px] px-3",
          showTimeframeMenu && "bg-green-600 text-white"
        )}
        onClick={() => setShowTimeframeMenu(!showTimeframeMenu)}
      >
        <Clock size={12} className="text-green-400 mr-1" />
        <span className="text-xs font-medium">{timeFrame}</span>
        <ChevronDown
          size={10}
          className={cn(
            "ml-1 transition-transform duration-200",
            showTimeframeMenu ? "rotate-180" : ""
          )}
        />
      </div>

      {/* Custom dropdown menu */}
      {showTimeframeMenu && (
        <div
          ref={menuRef}
          className="absolute left-14 top-0 -translate-y-full mt-[-10px] w-[180px] p-2 bg-[#1A1C27] border border-[#2A2E39] text-white shadow-xl rounded-lg z-50"
        >
          <div className="grid grid-cols-2 gap-1">
            {availableTimeframes.map((tf) => (
              <div
                key={tf.value}
                className={cn(
                  "flex items-center justify-center p-2 rounded text-xs font-medium transition-all cursor-pointer",
                  timeFrame === tf.value
                    ? "bg-green-600 text-white"
                    : "bg-[#2A2E39] text-gray-300 hover:bg-[#343A47]"
                )}
                onClick={() => handleTimeframeChange(tf.value)}
              >
                {tf.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeframeSelector;
