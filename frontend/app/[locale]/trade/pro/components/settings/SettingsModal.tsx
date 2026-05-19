"use client";

import React, { memo, useEffect } from "react";
import { cn } from "../../utils/cn";
import { X, HelpCircle } from "lucide-react";
import { useUIStore } from "../../stores/ui-store";
import { useSettingsStore } from "../../stores/settings-store";

export const SettingsModal = memo(function SettingsModal() {
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
              label="One-Click Trading"
              description="Place orders with a single click"
              checked={settings.oneClickTrading}
              onChange={(v) => updateSettings({ oneClickTrading: v })}
            />
            <SettingsToggle
              label="Order Confirmation"
              description="Show confirmation before placing orders"
              checked={settings.orderConfirmation}
              onChange={(v) => updateSettings({ orderConfirmation: v })}
            />
            <SettingsSelect
              label="Default Order Type"
              value={settings.defaultOrderType}
              options={[
                { value: "market", label: "Market" },
                { value: "limit", label: "Limit" },
              ]}
              onChange={(v) => updateSettings({ defaultOrderType: v as any })}
            />
          </SettingsSection>

          {/* Display Section */}
          <SettingsSection title="Display">
            <SettingsToggle
              label="Show PnL in Currency"
              checked={settings.showPnlInCurrency}
              onChange={(v) => updateSettings({ showPnlInCurrency: v })}
            />
            <SettingsToggle
              label="Show PnL Percentage"
              checked={settings.showPnlPercentage}
              onChange={(v) => updateSettings({ showPnlPercentage: v })}
            />
          </SettingsSection>

          {/* Sound Section */}
          <SettingsSection title="Sounds">
            <SettingsToggle
              label="Sound Effects"
              checked={settings.soundEnabled}
              onChange={(v) => updateSettings({ soundEnabled: v })}
            />
            {settings.soundEnabled && (
              <>
                <SettingsToggle
                  label="Order Placed Sound"
                  checked={settings.soundOrderPlaced}
                  onChange={(v) => updateSettings({ soundOrderPlaced: v })}
                />
                <SettingsToggle
                  label="Order Filled Sound"
                  checked={settings.soundOrderFilled}
                  onChange={(v) => updateSettings({ soundOrderFilled: v })}
                />
              </>
            )}
          </SettingsSection>

          {/* Hotkeys Section */}
          <SettingsSection title="Hotkeys">
            <SettingsToggle
              label="Enable Hotkeys"
              checked={settings.hotkeysEnabled}
              onChange={(v) => updateSettings({ hotkeysEnabled: v })}
            />
          </SettingsSection>

          {/* Help & Onboarding Section */}
          <SettingsSection title="Help & Onboarding">
            <div className="flex items-center justify-between py-1.5">
              <div>
                <span className="text-xs text-[var(--tp-text-primary)]">Interface Tutorial</span>
                <p className="text-[10px] text-[var(--tp-text-muted)]">Learn how to use Trading Pro</p>
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
                Start Tutorial
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
            Reset to Defaults
          </button>
          <button
            onClick={closeSettings}
            className="px-4 py-1.5 text-xs font-medium bg-[var(--tp-blue)] text-white rounded hover:bg-[var(--tp-blue-dim)]"
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
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
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

export default SettingsModal;
