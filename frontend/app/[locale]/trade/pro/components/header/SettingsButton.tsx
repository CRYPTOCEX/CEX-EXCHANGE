"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { Settings } from "lucide-react";
import { useUIStore } from "../../stores/ui-store";

interface SettingsButtonProps {
  compact?: boolean;
}

export const SettingsButton = memo(function SettingsButton({ compact = false }: SettingsButtonProps) {
  const { openSettings } = useUIStore();

  return (
    <button
      onClick={openSettings}
      className={cn(
        "h-10 w-10 flex items-center justify-center",
        "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
        "hover:bg-[var(--tp-bg-tertiary)]",
        "transition-colors",
        "cursor-pointer"
      )}
      title="Settings"
    >
      <Settings size={16} />
    </button>
  );
});
