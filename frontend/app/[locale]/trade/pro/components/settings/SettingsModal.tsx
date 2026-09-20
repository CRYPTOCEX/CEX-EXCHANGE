"use client";

import React, { memo, useEffect } from "react";
import { cn } from "../../utils/cn";
import { X, HelpCircle } from "lucide-react";
import { useUIStore } from "../../stores/ui-store";
import { useSettingsStore } from "../../stores/settings-store";
import { useTranslations } from "next-intl";

export const SettingsModal = memo(function SettingsModal() {
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  const { isSettingsOpen, closeSettings } = useUIStore();
  const { settings, updateSettings, resetSettings } = useSettingsStore();

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSettingsOpen) {
        closeSettings();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSettingsOpen, closeSettings]);

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-overlay/60 backdrop-blur-sm"
        onClick={closeSettings}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative z-10",
          "w-full max-w-md mx-4",
          "bg-[var(--tp-bg-secondary)]",
          "border border-[var(--tp-border)]",
          "rounded-lg shadow-2xl",
          "max-h-[80vh] overflow-hidden flex flex-col"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--tp-border)]">
          <h2 className="text-sm font-semibold text-[var(--tp-text-primary)]">
            Settings
          </h2>
          <button
            onClick={closeSettings}
            className="p-1 rounded hover:bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Trading Section */}
          <SettingsSection title="Trading">
            <SettingsToggle
              label={tCommon("one_click_trading")}
              description={t("place_orders_with_a_single_click")}
              checked={settings.oneClickTrading}
              onChange={(v) => updateSettings({ oneClickTrading: v })}
            />
            <SettingsToggle
              label={tCommon("order_confirmation")}
              description={t("show_confirmation_before_placing_orders")}
              checked={settings.orderConfirmation}
              onChange={(v) => updateSettings({ orderConfirmation: v })}
            />
            <SettingsSelect
              label={tCommon("default_order_type")}
              value={settings.defaultOrderType}
              options={[
                { value: "market", label: tCommon("market") },
                { value: "limit", label: tCommon("limit") },
              ]}
              onChange={(v) => updateSettings({ defaultOrderType: v as any })}
            />
          </SettingsSection>

          {/* Display Section */}
          <SettingsSection title="Display">
            <SettingsSegmented
              label={tCommon("text_size")}
              description={t("scale_the_entire_interface_for_easier_reading")}
              value={settings.fontScale ?? 1}
              options={[
                { value: 0.9, label: "S" },
                { value: 1, label: "M" },
                { value: 1.15, label: "L" },
                { value: 1.3, label: "XL" },
              ]}
              onChange={(v) => updateSettings({ fontScale: v })}
            />
            <SettingsToggle
              label={t("show_pnl_in_currency")}
              checked={settings.showPnlInCurrency}
              onChange={(v) => updateSettings({ showPnlInCurrency: v })}
            />
            <SettingsToggle
              label={t("show_pnl_percentage")}
              checked={settings.showPnlPercentage}
              onChange={(v) => updateSettings({ showPnlPercentage: v })}
            />
          </SettingsSection>

          {/* Sound Section */}
          <SettingsSection title="Sounds">
            <SettingsToggle
              label={tCommon("sound_effects")}
              checked={settings.soundEnabled}
              onChange={(v) => updateSettings({ soundEnabled: v })}
            />
            {settings.soundEnabled && (
              <>
                <SettingsToggle
                  label={t("order_placed_sound")}
                  checked={settings.soundOrderPlaced}
                  onChange={(v) => updateSettings({ soundOrderPlaced: v })}
                />
                <SettingsToggle
                  label={t("order_filled_sound")}
                  checked={settings.soundOrderFilled}
                  onChange={(v) => updateSettings({ soundOrderFilled: v })}
                />
              </>
            )}
          </SettingsSection>

          {/* Hotkeys Section */}
          <SettingsSection title="Hotkeys">
            <SettingsToggle
              label={t("enable_hotkeys")}
              checked={settings.hotkeysEnabled}
              onChange={(v) => updateSettings({ hotkeysEnabled: v })}
            />
          </SettingsSection>

          {/* Help & Onboarding Section */}
          <SettingsSection title={t("help_onboarding")}>
            <div className="flex items-center justify-between py-1.5">
              <div>
                <span className="text-xs text-[var(--tp-text-primary)]">{t("interface_tutorial")}</span>
                <p className="text-[10px] text-[var(--tp-text-muted)]">{t("learn_how_to_use_trading_pro")}</p>
              </div>
              <button
                onClick={() => {
                  closeSettings();
                  // Dispatch event to trigger tutorial
                  window.dispatchEvent(new CustomEvent("tp-start-tutorial"));
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs",
                  "bg-[var(--tp-bg-tertiary)] hover:bg-[var(--tp-bg-elevated)]",
                  "text-[var(--tp-text-secondary)]",
                  "rounded transition-colors"
                )}
              >
                <HelpCircle size={14} />
                {t("start_tutorial")}
              </button>
            </div>
          </SettingsSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--tp-border)]">
          <button
            onClick={resetSettings}
            className="px-3 py-1.5 text-xs text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
          >
            {tCommon("reset_to_defaults")}
          </button>
          <button
            onClick={closeSettings}
            className="px-4 py-1.5 text-xs font-medium bg-[var(--tp-blue)] text-[var(--tp-blue-fg)] rounded hover:bg-[var(--tp-blue-dim)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
});

// Settings Section
function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-medium text-[var(--tp-text-secondary)] uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// Toggle Setting
function SettingsToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer group">
      <div>
        <span className="text-xs text-[var(--tp-text-primary)]">{label}</span>
        {description && (
          <p className="text-[10px] text-[var(--tp-text-muted)]">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors",
          checked ? "bg-[var(--tp-blue)]" : "bg-[var(--tp-bg-tertiary)]"
        )}
      >
        <span
          className={cn(
            // `bg-background`, not `bg-white`: the same thumb token
            // `components/ui/switch` uses, so it follows the theme.
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background transition-transform",
            checked && "translate-x-4"
          )}
        />
      </button>
    </label>
  );
}

// Select Setting
function SettingsSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-[var(--tp-text-primary)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "px-2 py-1 text-xs",
          "bg-[var(--tp-bg-tertiary)]",
          "border border-[var(--tp-border)]",
          "rounded",
          "text-[var(--tp-text-secondary)]",
          "outline-none focus:border-[var(--tp-blue)]"
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Segmented Setting (for numeric / enumerated choices like text size)
function SettingsSegmented<T extends string | number>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <span className="text-xs text-[var(--tp-text-primary)]">{label}</span>
        {description && (
          <p className="text-[10px] text-[var(--tp-text-muted)]">{description}</p>
        )}
      </div>
      <div
        className={cn(
          "flex items-center gap-0.5 p-0.5 rounded",
          "bg-[var(--tp-bg-tertiary)]",
          "border border-[var(--tp-border)]"
        )}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "px-2 py-0.5 text-[11px] rounded transition-colors",
                active
                  ? "bg-[var(--tp-blue)] text-[var(--tp-blue-fg)]"
                  : "text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-elevated)]"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SettingsModal;
