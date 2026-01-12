"use client";

import React, { memo, useState } from "react";
import { cn } from "../../../utils/cn";

interface LeverageSliderProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  presets?: number[];
}

const DEFAULT_PRESETS = [1, 2, 5, 10, 20, 50, 75, 100, 125];

export const LeverageSlider = memo(function LeverageSlider({
  value,
  onChange,
  max = 125,
  presets = DEFAULT_PRESETS,
}: LeverageSliderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= max) {
      onChange(parsed);
    } else {
      setInputValue(value.toString());
    }
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInputBlur();
    } else if (e.key === "Escape") {
      setInputValue(value.toString());
      setIsEditing(false);
    }
  };

  const filteredPresets = presets.filter((p) => p <= max);

  return (
    <div className="px-3 py-2 border-b border-[var(--tp-border)]">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-[var(--tp-text-muted)]">Leverage</label>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <input
              type="number"
              min={1}
              max={max}
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className="w-14 px-1 py-0.5 text-sm font-mono bg-[var(--tp-bg-tertiary)] border border-[var(--tp-blue)] rounded text-center outline-none text-[var(--tp-text-primary)]"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setInputValue(value.toString());
                setIsEditing(true);
              }}
              className="text-sm font-semibold text-[var(--tp-blue)] hover:text-[var(--tp-blue)]/80"
            >
              {value}x
            </button>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={1}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className={cn(
            "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
            "bg-[var(--tp-bg-tertiary)]",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:h-4",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-[var(--tp-blue)]",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:shadow-md",
            "[&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:h-4",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:bg-[var(--tp-blue)]",
            "[&::-moz-range-thumb]:cursor-pointer",
            "[&::-moz-range-thumb]:border-0"
          )}
        />
        {/* Progress bar overlay */}
        <div
          className="absolute top-0 left-0 h-1.5 bg-[var(--tp-blue)] rounded-l-lg pointer-events-none"
          style={{ width: `${((value - 1) / (max - 1)) * 100}%` }}
        />
      </div>

      {/* Preset buttons */}
      <div className="flex gap-1 mt-2">
        {filteredPresets.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={cn(
              "flex-1 py-1 text-[10px] rounded",
              "transition-colors",
              value === preset
                ? "bg-[var(--tp-blue)] text-white"
                : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
            )}
          >
            {preset}x
          </button>
        ))}
      </div>

      {/* Risk indicator */}
      <div className="flex items-center justify-between mt-2 text-[10px]">
        <span className="text-[var(--tp-text-muted)]">Risk Level</span>
        <span
          className={cn(
            value <= 5 && "text-[var(--tp-green)]",
            value > 5 && value <= 20 && "text-[var(--tp-yellow)]",
            value > 20 && value <= 50 && "text-[var(--tp-orange)]",
            value > 50 && "text-[var(--tp-red)]"
          )}
        >
          {value <= 5 && "Low"}
          {value > 5 && value <= 20 && "Medium"}
          {value > 20 && value <= 50 && "High"}
          {value > 50 && "Very High"}
        </span>
      </div>
    </div>
  );
});

export default LeverageSlider;
