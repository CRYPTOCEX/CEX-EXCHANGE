"use client";

/**
 * Collapsible Setting Section Component
 *
 * Reusable collapsible section for settings with toggle switch
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface SettingSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  darkMode: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
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
  darkMode,
  defaultExpanded = true,
  children,
  accentColor = "emerald",
}: SettingSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Premium dark theme
  const borderClass = darkMode ? "border-zinc-800/50" : "border-gray-200";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const mutedClass = darkMode ? "text-zinc-400" : "text-gray-500";

  const accentColors: Record<string, { bg: string; text: string; activeBg: string }> = {
    yellow: {
      bg: darkMode ? "bg-yellow-500/10" : "bg-yellow-50",
      text: "text-yellow-500",
      activeBg: "bg-yellow-500",
    },
    orange: {
      bg: darkMode ? "bg-orange-500/10" : "bg-orange-50",
      text: "text-orange-500",
      activeBg: "bg-orange-500",
    },
    emerald: {
      bg: darkMode ? "bg-emerald-500/10" : "bg-emerald-50",
      text: "text-emerald-500",
      activeBg: "bg-emerald-500",
    },
    blue: {
      bg: darkMode ? "bg-blue-500/10" : "bg-blue-50",
      text: "text-blue-500",
      activeBg: "bg-blue-500",
    },
    purple: {
      bg: darkMode ? "bg-purple-500/10" : "bg-purple-50",
      text: "text-purple-500",
      activeBg: "bg-purple-500",
    },
  };

  const colors = accentColors[accentColor] || accentColors.emerald;

  return (
    <div className={`border-b ${borderClass}`}>
      {/* Header - clickable to expand/collapse */}
      <div
        className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${
          darkMode ? "hover:bg-zinc-800/50" : "hover:bg-gray-50"
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${enabled ? colors.bg : darkMode ? "bg-zinc-800" : "bg-gray-100"}`}>
            <span className={enabled ? colors.text : mutedClass}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-semibold ${textClass}`}>{title}</h3>
              {enabled && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} font-medium`}>
                  ON
                </span>
              )}
            </div>
            <p className={`text-xs ${mutedClass} truncate`}>{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle switch */}
          <label
            className="relative inline-flex items-center cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div
              className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${
                enabled ? colors.activeBg : darkMode ? "bg-zinc-600" : "bg-gray-300"
              }`}
            />
          </label>

          {/* Expand/collapse indicator */}
          <div className={mutedClass}>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`px-5 pb-5 ${darkMode ? "bg-zinc-900/50" : "bg-gray-50/50"}`}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SettingSection;
