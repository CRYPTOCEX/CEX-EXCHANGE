"use client";

/**
 * Collapsible Setting Section Component
 *
 * Reusable collapsible section for settings with toggle switch.
 *
 * `accentColor` used to pick between five decorative hues — yellow for
 * One-Click, orange for Martingale, emerald for Daily Limit, blue for
 * Stop-Loss, purple for Cooldown — so five adjacent rows in one settings list
 * each wore a different colour. That is colour as a category label, and with
 * five peers it separates nothing that the icon and title do not already
 * separate. Worse, in a risk panel it actively misleads: the section that stops
 * you trading read as a success and the one that limits losses read as info.
 *
 * All five now resolve to one accent for the enabled state and the muted ramp
 * for the disabled one. The prop is kept as a documented no-op so call sites
 * (and the exported type) stay valid.
 */

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Toggle } from "../../risk-management/risk-ui";

// ============================================================================
// TYPES
// ============================================================================

export interface SettingSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  /** @deprecated Theme is resolved by design tokens; retained for API stability. */
  darkMode?: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  /**
   * @deprecated No-op. One accent marks "on"; identity comes from the icon and
   * the title. See the note at the top of this file.
   */
  accentColor?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SettingSection({
  title,
  description,
  icon,
  enabled,
  onToggle,
  defaultExpanded = true,
  children,
}: SettingSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-border">
      {/* Header - clickable to expand/collapse */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer transition-colors hover:bg-surface-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`p-2 rounded-lg ${enabled ? "bg-primary/10" : "bg-surface-2"}`}
          >
            <span className={enabled ? "text-primary" : "text-muted-foreground"}>
              {icon}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {enabled && (
                // Opaque, not `text-primary` on `bg-primary/10`: that pairing
                // measures 3.99:1 at 10px in light mode. A tint composites onto
                // whatever is behind it, so an opaque step is the only way a
                // 10px chip reads the same everywhere.
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-medium">
                  ON
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle switch */}
          <span onClick={(e) => e.stopPropagation()}>
            <Toggle checked={enabled} onChange={onToggle} ariaLabel={title} />
          </span>

          {/* Expand/collapse indicator */}
          <div className="text-muted-foreground">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 bg-surface-2/50">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SettingSection;
