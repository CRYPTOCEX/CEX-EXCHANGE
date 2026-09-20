"use client";

/**
 * Display Tab Settings Component
 *
 * Per-user display preferences for the binary trading interface.
 * Currently exposes a Text Size segmented control that scales every
 * Tailwind text utility used inside `.binary-workspace` via the
 * `--binary-font-scale` CSS variable. Layout is preserved.
 */

import { Type } from "lucide-react";
import { useTradingSettingsStore } from "@/store/trade/use-trading-settings-store";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

export interface DisplayTabSettingsProps {
  /** @deprecated Theme is resolved by design tokens; retained for API stability. */
  darkMode?: boolean;
}

// Choices match Trading Pro's Text Size control for consistency.
const TEXT_SIZE_OPTIONS: { value: number; label: string; hint: string }[] = [
  { value: 0.9, label: "S", hint: "Small" },
  { value: 1, label: "M", hint: "Default" },
  { value: 1.15, label: "L", hint: "Large" },
  { value: 1.3, label: "XL", hint: "Extra Large" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function DisplayTabSettings(_props: DisplayTabSettingsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const fontScale = useTradingSettingsStore((s) => s.fontScale);
  const setFontScale = useTradingSettingsStore((s) => s.setFontScale);

  const activeChoice = TEXT_SIZE_OPTIONS.find((o) => o.value === fontScale) ?? TEXT_SIZE_OPTIONS[1];

  return (
    <div className="p-5 space-y-5">
      <div className="rounded-lg bg-card border border-border overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Type size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{tCommon("text_size")}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("scale_text_across_the_binary_trading")}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {/* Segmented control */}
          <div className="flex items-center gap-1 rounded-lg p-1 bg-surface-2 border border-border">
            {TEXT_SIZE_OPTIONS.map((opt) => {
              const active = opt.value === fontScale;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFontScale(opt.value)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                  }`}
                  aria-pressed={active}
                  title={opt.hint}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Live preview */}
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("preview")} {activeChoice.label} ({Math.round(fontScale * 100)}%)
            </div>
            {/* This block lives inside .binary-workspace, so the scale already applies. */}
            <div className="space-y-1 text-foreground">
              <div className="text-[11px]">Order book row · 11px</div>
              <div className="text-xs">Position row · text-xs</div>
              <div className="text-sm">Header label · text-sm</div>
              <div className="text-base font-semibold">Balance · text-base</div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {t("saved_per_browser_the_chart_and")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default DisplayTabSettings;
