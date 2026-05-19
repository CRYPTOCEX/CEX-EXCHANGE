/**
 * Toast Container Component
 *
 * Container that manages and displays multiple toast notifications.
 * Handles positioning, stacking, and animations.
 */

"use client";

import React, { memo } from "react";
import { AnimatePresence } from "framer-motion";
import { NotificationToast } from "./notification-toast";
import { useTradingNotificationsStore } from "../core";
import type { TradingNotification } from "../types";

// ============================================================================
// TYPES
// ============================================================================

export interface ToastContainerProps {
  darkMode?: boolean;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  className?: string;
}

// ============================================================================
// POSITION STYLES
// ============================================================================

const POSITION_STYLES: Record<string, string> = {
  "top-right": "top-4 right-4 items-end",
  "top-left": "top-4 left-4 items-start",
  "bottom-right": "bottom-4 right-4 items-end",
  "bottom-left": "bottom-4 left-4 items-start",
  "top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ToastContainer = memo(function ToastContainer({
  darkMode = true,
  position = "top-right",
  className = "",
}: ToastContainerProps) {
  const activeToasts = useTradingNotificationsStore((state) => state.activeToasts);
  const settings = useTradingNotificationsStore((state) => state.settings);
  const dismissToast = useTradingNotificationsStore((state) => state.dismissToast);

  // Use settings position if available
  const effectivePosition = settings.toastPosition || position;

  // Don't render if toasts are disabled
  if (!settings.toastEnabled || !settings.enabled) {
    return null;
  }

  return (
    <div
      className={`fixed z-[100] flex flex-col gap-2 pointer-events-none ${POSITION_STYLES[effectivePosition]} ${className}`}
    >
      <AnimatePresence mode="popLayout">
        {activeToasts.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationToast
              notification={notification}
              onDismiss={dismissToast}
              darkMode={darkMode}
              position={effectivePosition}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
});

export default ToastContainer;
