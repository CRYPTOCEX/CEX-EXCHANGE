"use client";

/**
 * Analytics Modal Component
 *
 * Full-screen modal for displaying the analytics dashboard.
 */

import { memo, useEffect } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { AnalyticsDashboard } from "../analytics";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: "dark" | "light";
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AnalyticsModal = memo(function AnalyticsModal({
  isOpen,
  onClose,
  theme = "dark",
}: AnalyticsModalProps) {
  const t = useTranslations("binary_components");
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Theme classes
  const overlayBg = theme === "dark" ? "bg-black/80" : "bg-black/50";
  const modalBg = theme === "dark" ? "bg-zinc-950" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div
        className={`absolute inset-0 ${overlayBg} backdrop-blur-sm`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`
          relative ${modalBg} border ${borderClass} rounded-xl
          w-[95vw] h-[90vh] max-w-7xl
          shadow-2xl overflow-hidden
          animate-in fade-in zoom-in-95 duration-200
        `}
      >
        {/* Close button (positioned absolute for overlay on content) */}
        <button
          onClick={onClose}
          className={`
            absolute top-4 right-4 z-10 p-2 rounded-lg
            ${theme === "dark" ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}
            transition-colors
          `}
          aria-label={t("close_analytics")}
        >
          <X size={20} className={theme === "dark" ? "text-zinc-400" : "text-zinc-600"} />
        </button>

        {/* Analytics Dashboard */}
        <AnalyticsDashboard
          theme={theme}
          className="h-full"
          onClose={onClose}
        />
      </div>
    </div>
  );
});

export default AnalyticsModal;
