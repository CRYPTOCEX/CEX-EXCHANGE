"use client";

import React, { memo, useState, useCallback, useRef, useEffect } from "react";
import { cn } from "../../utils/cn";

interface MarketSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const MarketSearch = memo(function MarketSearch({
  value,
  onChange,
  placeholder = "Search markets...",
}: MarketSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Focus on keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocused]);

  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div
      className={cn(
        "relative flex items-center flex-nowrap",
        "bg-[var(--tp-bg-tertiary)]",
        "border rounded",
        "transition-colors",
        isFocused
          ? "border-[var(--tp-blue)]"
          : "border-[var(--tp-border)]"
      )}
    >
      {/* Search icon */}
      <div className="pl-2 flex-shrink-0 text-[var(--tp-text-muted)]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={cn(
          "flex-1 min-w-0 px-2 py-1.5",
          "text-xs",
          "bg-transparent",
          "text-[var(--tp-text-primary)]",
          "placeholder:text-[var(--tp-text-muted)]",
          "outline-none"
        )}
      />

      {/* Clear button or shortcut hint */}
      {value ? (
        <button
          onClick={handleClear}
          className="pr-2 flex-shrink-0 text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      ) : (
        <div className="pr-2 flex-shrink-0">
          <kbd className="px-1 py-px text-[9px] text-[var(--tp-text-muted)] bg-[var(--tp-bg-elevated)] rounded font-mono">
            /
          </kbd>
        </div>
      )}
    </div>
  );
});

export default MarketSearch;
