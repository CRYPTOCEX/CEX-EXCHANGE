/**
 * Notification Center Component
 *
 * Dropdown panel showing notification history.
 * Includes unread count, mark as read, and clear functionality.
 */

"use client";

import React, { memo, useMemo, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellRing,
  X,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Zap,
} from "lucide-react";
import type { TradingNotification, NotificationType } from "../types";
import { useTradingNotificationsStore } from "../core";
import { useTranslations } from "next-intl";
// ============================================================================
// OVERLAY THEME (inline to avoid chart-engine dependency)
// ============================================================================

interface OverlayTheme {
  bg: string;
  bgSubtle: string;
  bgMuted: string;
  bgCard: string;
  bgInput: string;
  bgHover: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  hoverBg: string;
  activeBg: string;
  backdrop: string;
}

function getOverlayTheme(darkMode: boolean): OverlayTheme {
  if (darkMode) {
    return {
      bg: 'bg-surface-2',
      bgSubtle: 'bg-muted/50',
      bgMuted: 'bg-muted/30',
      bgCard: 'bg-muted',
      bgInput: 'bg-muted',
      bgHover: 'bg-muted',
      border: 'border-border/50',
      borderSubtle: 'border-border/30',
      borderStrong: 'border-border-strong',
      text: 'text-white',
      textSecondary: 'text-muted-foreground',
      textMuted: 'text-subtle-foreground',
      textDim: 'text-muted-foreground',
      hoverBg: 'hover:bg-muted/50',
      activeBg: 'bg-muted',
      backdrop: 'bg-overlay/60',
    };
  }

  return {
    bg: 'bg-card',
    bgSubtle: 'bg-muted',
    bgMuted: 'bg-muted/50',
    bgCard: 'bg-muted',
    bgInput: 'bg-muted',
    bgHover: 'bg-muted',
    border: 'border-border/50',
    borderSubtle: 'border-border/50',
    borderStrong: 'border-border-strong',
    text: 'text-foreground',
    textSecondary: 'text-subtle-foreground',
    textMuted: 'text-muted-foreground',
    textDim: 'text-muted-foreground',
    hoverBg: 'hover:bg-muted',
    activeBg: 'bg-muted',
    backdrop: 'bg-overlay/40',
  };
}

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsClick?: () => void;
  darkMode?: boolean;
  maxHeight?: number;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
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

const TYPE_COLORS: Record<NotificationType, string> = {
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  info: "text-primary",
  trade_win: "text-success",
  trade_loss: "text-destructive",
  order_placed: "text-primary",
  order_cancelled: "text-subtle-foreground",
  alert_triggered: "text-warning",
  price_alert: "text-warning",
  signal: "text-primary",
};

// ============================================================================
// NOTIFICATION ITEM
// ============================================================================

interface NotificationItemProps {
  notification: TradingNotification;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
  darkMode: boolean;
}

const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkRead,
  onRemove,
  darkMode,
}: NotificationItemProps) {
  const tCommon = useTranslations("common");
  const Icon = TYPE_ICONS[notification.type] || Info;
  const iconColor = TYPE_COLORS[notification.type] || "text-subtle-foreground";

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const theme = {
    bg: notification.read
      ? darkMode
        ? "bg-surface-2/30"
        : "bg-muted/50"
      : darkMode
      ? "bg-muted/50"
      : "bg-primary/50",
    border: darkMode ? "border-border/50" : "border-border/50",
    text: darkMode ? "text-primary-foreground" : "text-foreground",
    textMuted: darkMode ? "text-muted-foreground" : "text-subtle-foreground",
    textSecondary: darkMode ? "text-muted-foreground" : "text-subtle-foreground",
    hover: darkMode ? "hover:bg-muted" : "hover:bg-muted",
  };

  return (
    <div
      className={`relative px-3 py-2.5 border-b last:border-b-0 ${theme.border} ${theme.bg} ${theme.hover} transition-colors group`}
    >
      <div className="flex items-start gap-2.5">
        {/* Unread indicator */}
        {!notification.read && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
        )}

        {/* Icon */}
        <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
          <Icon size={16} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`text-xs font-medium ${theme.text} truncate`}>
              {notification.title}
            </h4>
            <span className={`text-chart-xs ${theme.textSecondary} flex-shrink-0`}>
              {formatTime(notification.timestamp)}
            </span>
          </div>
          <p className={`text-chart-sm ${theme.textSecondary} mt-0.5 line-clamp-2`}>
            {notification.message}
          </p>

          {/* Trade data */}
          {notification.data?.profit !== undefined && (
            <div className="mt-1 flex items-center gap-2 text-chart-xs">
              {notification.data.symbol && (
                <span className={theme.textSecondary}>{notification.data.symbol}</span>
              )}
              <span
                className={`font-mono font-medium ${
                  notification.data.profit >= 0 ? "text-up" : "text-down"
                }`}
              >
                {notification.data.profit >= 0 ? "+" : ""}
                {notification.data.profit.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.read && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className={`p-1 rounded ${
                darkMode
                  ? "text-subtle-foreground hover:text-white hover:bg-card/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              }`}
              title={tCommon("mark_as_read")}
            >
              <Check size={14} />
            </button>
          )}
          <button
            onClick={() => onRemove(notification.id)}
            className={`p-1 rounded ${
              darkMode
                ? "text-subtle-foreground hover:text-destructive hover:bg-destructive/10"
                : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            }`}
            title="Remove"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const NotificationCenter = memo(function NotificationCenter({
  isOpen,
  onClose,
  onSettingsClick,
  darkMode = true,
  maxHeight = 400,
}: NotificationCenterProps) {
  const t = useTranslations("components_binary");
  const tCommon = useTranslations("common");
  const notifications = useTradingNotificationsStore((state) => state.notifications);
  const unreadCount = useTradingNotificationsStore((state) => state.unreadCount);
  const markAsRead = useTradingNotificationsStore((state) => state.markAsRead);
  const markAllAsRead = useTradingNotificationsStore((state) => state.markAllAsRead);
  const removeNotification = useTradingNotificationsStore(
    (state) => state.removeNotification
  );
  const clearNotifications = useTradingNotificationsStore(
    (state) => state.clearNotifications
  );

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { label: string; notifications: TradingNotification[] }[] = [];
    const todayNotifs: TradingNotification[] = [];
    const yesterdayNotifs: TradingNotification[] = [];
    const olderNotifs: TradingNotification[] = [];

    notifications.forEach((notif) => {
      const notifDate = new Date(notif.timestamp);
      notifDate.setHours(0, 0, 0, 0);

      if (notifDate.getTime() === today.getTime()) {
        todayNotifs.push(notif);
      } else if (notifDate.getTime() === yesterday.getTime()) {
        yesterdayNotifs.push(notif);
      } else {
        olderNotifs.push(notif);
      }
    });

    if (todayNotifs.length > 0) {
      groups.push({ label: tCommon("today"), notifications: todayNotifs });
    }
    if (yesterdayNotifs.length > 0) {
      groups.push({ label: t("yesterday"), notifications: yesterdayNotifs });
    }
    if (olderNotifs.length > 0) {
      groups.push({ label: t("older"), notifications: olderNotifs });
    }

    return groups;
  }, [notifications]);

  // Use shared theme from overlay-theme.ts
  const theme = getOverlayTheme(darkMode);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <m.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className={`absolute right-0 top-full mt-2 w-full max-w-[calc(100vw-16px)] md:w-80 rounded-xl border shadow-xl overflow-hidden z-50 ${theme.bg} ${theme.border}`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between px-4 py-3 border-b ${theme.border} ${theme.bgSubtle}`}
            >
              <div className="flex items-center gap-2">
                <Bell size={16} className={theme.textSecondary} />
                <h3 className={`text-sm font-medium ${theme.text}`}>Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-chart-xs font-medium rounded-full bg-primary text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {onSettingsClick && (
                  <button
                    onClick={onSettingsClick}
                    className={`p-1.5 rounded-lg ${theme.hoverBg} ${theme.textSecondary} transition-colors`}
                    title="Settings"
                  >
                    <Settings size={14} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className={`p-1.5 rounded-lg ${theme.hoverBg} ${theme.textSecondary} transition-colors`}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Actions bar */}
            {notifications.length > 0 && (
              <div
                className={`flex items-center justify-between px-4 py-2 border-b ${theme.border}`}
              >
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className={`flex items-center gap-1 text-chart-sm ${
                    unreadCount > 0
                      ? "text-primary hover:text-primary"
                      : theme.textMuted
                  } transition-colors disabled:opacity-50`}
                >
                  <CheckCheck size={12} />
                  {t("mark_all_read")}
                </button>
                <button
                  onClick={clearNotifications}
                  className={`flex items-center gap-1 text-chart-sm text-destructive hover:text-destructive transition-colors`}
                >
                  <Trash2 size={12} />
                  {tCommon("clear_all")}
                </button>
              </div>
            )}

            {/* Notifications list */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: `${maxHeight}px` }}
            >
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div
                    className={`p-4 rounded-full mb-3 ${
                      darkMode ? "bg-surface-2" : "bg-muted"
                    }`}
                  >
                    <Bell size={24} className={theme.textMuted} />
                  </div>
                  <p className={`text-sm ${theme.textSecondary}`}>{t("no_notifications")}</p>
                  <p className={`text-xs ${theme.textMuted} mt-1`}>
                    {t("trading_events_will_appear_here")}
                  </p>
                </div>
              ) : (
                groupedNotifications.map((group) => (
                  <div key={group.label}>
                    <div
                      className={`sticky top-0 px-3 py-1.5 text-chart-xs font-medium uppercase tracking-wider ${theme.textMuted} ${theme.bgSubtle}`}
                    >
                      {group.label}
                    </div>
                    {group.notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markAsRead}
                        onRemove={removeNotification}
                        darkMode={darkMode}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default NotificationCenter;
