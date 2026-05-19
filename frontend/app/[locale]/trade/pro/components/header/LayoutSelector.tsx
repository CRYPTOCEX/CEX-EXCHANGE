"use client";

import React, { memo, useState, useRef, useEffect } from "react";
import { cn } from "../../utils/cn";
import { useLayout } from "../../providers/LayoutProvider";
import { LayoutGrid, Check, Plus, Trash2 } from "lucide-react";

export const LayoutSelector = memo(function LayoutSelector() {
  const {
    presets,
    customLayouts,
    activePreset,
    applyPreset,
    saveCurrentLayout,
    deleteLayout,
  } = useLayout();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSave = () => {
    if (newLayoutName.trim()) {
      saveCurrentLayout(newLayoutName.trim());
      setNewLayoutName("");
      setIsSaveDialogOpen(false);
    }
  };

  const allLayouts = [...presets, ...customLayouts];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-10 w-10 flex items-center justify-center",
          "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
          "hover:bg-[var(--tp-bg-tertiary)]",
          "transition-colors",
          "cursor-pointer",
          isOpen && "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)]"
        )}
        title="Layout presets"
      >
        <LayoutGrid size={16} />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2",
            "w-64",
            "bg-[var(--tp-bg-secondary)]",
            "border border-[var(--tp-border)]",
            "rounded-lg",
            "shadow-xl",
            "overflow-hidden",
            "z-50",
            "tp-animate-slide-in-top"
          )}
        >
          <div className="p-2 border-b border-[var(--tp-border)]">
            <p className="text-xs text-[var(--tp-text-muted)] uppercase tracking-wide px-2">
              Layout Presets
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {allLayouts.map((layout) => (
              <div
                key={layout.id}
                className={cn(
                  "flex items-center justify-between",
                  "px-3 py-2 rounded-md",
                  "cursor-pointer",
                  "transition-colors",
                  activePreset === layout.id
                    ? "bg-[var(--tp-blue)]/10 text-[var(--tp-blue)]"
                    : "hover:bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)]"
                )}
                onClick={() => {
                  applyPreset(layout.id);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  {activePreset === layout.id && <Check size={14} />}
                  <span className="text-sm">{layout.name}</span>
                </div>

                {!layout.isPreset && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLayout(layout.id);
                    }}
                    className="p-1 text-[var(--tp-text-muted)] hover:text-[var(--tp-red)] transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-[var(--tp-border)]">
            {isSaveDialogOpen ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLayoutName}
                  onChange={(e) => setNewLayoutName(e.target.value)}
                  placeholder="Layout name"
                  className="flex-1 px-2 py-1.5 text-sm bg-[var(--tp-bg-tertiary)] rounded border border-[var(--tp-border)] outline-none focus:border-[var(--tp-blue)] text-[var(--tp-text-primary)]"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <button
                  onClick={handleSave}
                  disabled={!newLayoutName.trim()}
                  className="px-3 py-1.5 text-sm bg-[var(--tp-blue)] text-white rounded hover:bg-[var(--tp-blue-dim)] disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSaveDialogOpen(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-tertiary)] rounded-md transition-colors"
              >
                <Plus size={14} />
                <span>Save Current Layout</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
