/**
 * Notification Toast Component
 *
 * Individual toast notification with animations.
 * Supports different notification types with appropriate icons and colors.
 */

"use client";

import React, { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Bell,
  BellRing,
  Zap,
  Check,
} from "lucide-react";
import type { TradingNotification, NotificationType } from "../types";

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationToastProps {
  notification: TradingNotification;
  onDismiss: (id: string) => void;
  darkMode?: boolean;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
  trade_win: TrendingUp,
  trade_loss: TrendingDown,
  order_placed: Check,
  order_cancelled: X,
  alert_triggered: BellRing,
  price_alert: Bell,
  signal: Zap,
};

const NOTIFICATION_COLORS: Record<NotificationType, {
  bg: string;
  bgLight: string;
  border: string;
  borderLight: string;
  icon: string;
  text: string;
}> = {
  success: {
    bg: "bg-emerald-500/10",
    bgLight: "bg-emerald-50",
    border: "border-emerald-500/30",
    borderLight: "border-emerald-200",
    icon: "text-emerald-500",
    text: "text-emerald-500",
  },
  warning: {
    bg: "bg-amber-500/10",
    bgLight: "bg-amber-50",
    border: "border-amber-500/30",
    borderLight: "border-amber-200",
    icon: "text-amber-500",
    text: "text-amber-500",
  },
  error: {
    bg: "bg-red-500/10",
    bgLight: "bg-red-50",
    border: "border-red-500/30",
    borderLight: "border-red-200",
    icon: "text-red-500",
    text: "text-red-500",
  },
  info: {
    bg: "bg-blue-500/10",
    bgLight: "bg-blue-50",
    border: "border-blue-500/30",
    borderLight: "border-blue-200",
    icon: "text-blue-500",
    text: "text-blue-500",
  },
  trade_win: {
    bg: "bg-emerald-500/10",
    bgLight: "bg-emerald-50",
    border: "border-emerald-500/30",
    borderLight: "border-emerald-200",
    icon: "text-emerald-500",
    text: "text-emerald-500",
  },
  trade_loss: {
    bg: "bg-red-500/10",
    bgLight: "bg-red-50",
    border: "border-red-500/30",
    borderLight: "border-red-200",
    icon: "text-red-500",
    text: "text-red-500",
  },
  order_placed: {
    bg: "bg-blue-500/10",
    bgLight: "bg-blue-50",
    border: "border-blue-500/30",
    borderLight: "border-blue-200",
    icon: "text-blue-500",
    text: "text-blue-500",
  },
  order_cancelled: {
    bg: "bg-gray-500/10",
    bgLight: "bg-gray-50",
    border: "border-gray-500/30",
    borderLight: "border-gray-200",
    icon: "text-gray-500",
    text: "text-gray-500",
  },
  alert_triggered: {
    bg: "bg-amber-500/10",
    bgLight: "bg-amber-50",
    border: "border-amber-500/30",
    borderLight: "border-amber-200",
    icon: "text-amber-500",
    text: "text-amber-500",
  },
  price_alert: {
    bg: "bg-amber-500/10",
    bgLight: "bg-amber-50",
    border: "border-amber-500/30",
    borderLight: "border-amber-200",
    icon: "text-amber-500",
    text: "text-amber-500",
  },
  signal: {
    bg: "bg-purple-500/10",
    bgLight: "bg-purple-50",
    border: "border-purple-500/30",
    borderLight: "border-purple-200",
    icon: "text-purple-500",
    text: "text-purple-500",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const NotificationToast = memo(function NotificationToast({
  notification,
  onDismiss,
  darkMode = true,
  position = "top-right",
}: NotificationToastProps) {
  const [progress, setProgress] = useState(100);
  const Icon = NOTIFICATION_ICONS[notification.type] || Info;
  const colors = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.info;

  // Progress bar animation
  useEffect(() => {
    if (!notification.duration || notification.duration === 0) return;

    const startTime = Date.now();
    const duration = notification.duration;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [notification.duration]);

  // Theme classes
  const theme = {
    bg: darkMode ? "bg-zinc-900" : "bg-white",
    border: darkMode ? colors.border : colors.borderLight,
    text: darkMode ? "text-white" : "text-gray-900",
    textMuted: darkMode ? "text-zinc-400" : "text-gray-600",
    iconBg: darkMode ? colors.bg : colors.bgLight,
  };

  // Animation variants based on position
  const getAnimationVariants = () => {
    const isRight = position.includes("right");
    const isTop = position.includes("top");
    const isCenter = position.includes("center");

    return {
      initial: {
        opacity: 0,
        x: isCenter ? 0 : isRight ? 100 : -100,
        y: isTop ? -20 : 20,
        scale: 0.9,
      },
      animate: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
      },
      exit: {
        opacity: 0,
        x: isCenter ? 0 : isRight ? 100 : -100,
        scale: 0.9,
        transition: { duration: 0.2 },
      },
    };
  };

  // Format profit/loss for trade notifications
  const formatTradeData = () => {
    if (!notification.data) return null;
    const { profit, profitPercentage, amount, symbol, side } = notification.data;

    if (notification.type === "trade_win" || notification.type === "trade_loss") {
      return (
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {symbol && (
            <span className={theme.textMuted}>{symbol}</span>
          )}
          {side && (
            <span className={`px-1.5 py-0.5 rounded text-chart-xs font-medium ${
              side === "RISE"
                ? "bg-emerald-500/20 text-emerald-500"
                : "bg-red-500/20 text-red-500"
            }`}>
              {side}
            </span>
          )}
          {profit !== undefined && (
            <span className={`font-mono font-medium ${
              profit >= 0 ? "text-emerald-500" : "text-red-500"
            }`}>
              {profit >= 0 ? "+" : ""}{profit.toFixed(2)}
              {profitPercentage !== undefined && (
                <span className="ml-1 opacity-70">
                  ({profitPercentage >= 0 ? "+" : ""}{profitPercentage.toFixed(1)}%)
                </span>
              )}
            </span>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div
      layout
      {...getAnimationVariants()}
      className={`relative w-80 rounded-lg border shadow-lg overflow-hidden ${theme.bg} ${theme.border}`}
    >
      {/* Progress bar */}
      {notification.duration && notification.duration > 0 && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-black/10 dark:bg-white/10">
          <motion.div
            className={`h-full ${colors.icon.replace("text-", "bg-")}`}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.05 }}
          />
        </div>
      )}

      <div className="flex items-start gap-3 p-3 pt-3.5">
        {/* Icon */}
        <div className={`flex-shrink-0 p-2 rounded-lg ${theme.iconBg}`}>
          <Icon size={18} className={colors.icon} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium ${theme.text}`}>
            {notification.title}
          </h4>
          <p className={`text-xs mt-0.5 ${theme.textMuted} line-clamp-2`}>
            {notification.message}
          </p>
          {formatTradeData()}
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(notification.id)}
          className={`flex-shrink-0 p-1 rounded-md transition-colors ${
            darkMode
              ? "text-zinc-500 hover:text-white hover:bg-white/10"
              : "text-gray-400 hover:text-gray-900 hover:bg-black/5"
          }`}
        >
          <X size={16} />
        </button>
      </div>

      {/* Actions */}
      {notification.actions && notification.actions.length > 0 && (
        <div className={`flex items-center gap-2 px-3 pb-3 pt-1`}>
          {notification.actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                action.variant === "primary"
                  ? `${colors.icon.replace("text-", "bg-")} text-white`
                  : action.variant === "danger"
                  ? "bg-red-500 text-white"
                  : darkMode
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-black/5 text-gray-900 hover:bg-black/10"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
});

export default NotificationToast;
