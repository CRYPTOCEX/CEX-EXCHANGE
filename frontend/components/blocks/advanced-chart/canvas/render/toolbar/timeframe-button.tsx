"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface TimeframeButtonProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function TimeframeButton({
  value,
  onChange,
  options,
}: TimeframeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Find the current selected option label
  const selectedOption = options.find((option) => option.value === value);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Theme-aware button classes
  const buttonClasses = cn(
    "h-[34px] px-3 inline-flex items-center gap-1 rounded cursor-pointer",
    isDark
      ? "bg-[#1E2230] hover:bg-[#2A2E39]"
      : "bg-white hover:bg-gray-100 border border-gray-200 shadow-sm",
    isOpen && (isDark ? "bg-[#2A2E39]" : "bg-gray-100")
  );

  // Theme-aware dropdown classes
  const dropdownClasses = cn(
    "absolute top-full left-0 mt-1 w-32 border rounded-md shadow-lg z-10",
    isDark ? "bg-[#1E2230] border-[#2A2E39]" : "bg-white border-gray-200"
  );

  // Theme-aware option classes
  const getOptionClasses = (isSelected: boolean) =>
    cn(
      "px-3 py-1.5 text-xs cursor-pointer",
      isDark ? "hover:bg-[#2A2E39]" : "hover:bg-gray-100",
      isSelected ? "text-green-500" : isDark ? "text-white" : "text-gray-700"
    );

  return (
    <div className="relative">
      {/* Custom button that matches the size of other buttons */}
      <div
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClasses}
      >
        <Clock size={12} className="text-green-500" />
        <span
          className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-700"
          )}
        >
          {selectedOption?.label || value}
        </span>
        <ChevronDown
          size={10}
          className={isDark ? "text-gray-400" : "text-gray-500"}
        />
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div ref={dropdownRef} className={dropdownClasses}>
          <div className="py-1">
            {options.map((option) => (
              <div
                key={option.value}
                className={getOptionClasses(option.value === value)}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
