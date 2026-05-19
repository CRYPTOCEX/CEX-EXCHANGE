/**
 * Trading Notifications Types
 *
 * Type definitions for the in-app notification system.
 * Handles trading events like order placement, wins, losses, alerts, etc.
 */

import type { OrderSide } from "@/types/binary-trading";

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "trade_win"
  | "trade_loss"
  | "order_placed"
  | "order_cancelled"
  | "alert_triggered"
  | "price_alert"
  | "signal";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

// ============================================================================
// NOTIFICATION INTERFACE
// ============================================================================

export interface TradingNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  priority: NotificationPriority;
  // Optional metadata for different notification types
  data?: {
    // Trade-related
    orderId?: string;
    symbol?: string;
    amount?: number;
    profit?: number;
    profitPercentage?: number;
    side?: OrderSide;
    // Alert-related
    alertId?: string;
    targetPrice?: number;
    currentPrice?: number;
    // Signal-related
    signalType?: "buy" | "sell";
    indicator?: string;
    strength?: number;
  };
  // Auto-dismiss timing (ms), 0 = persistent
  duration?: number;
  // Whether to show as toast
  showToast?: boolean;
  // Whether to play sound
  playSound?: boolean;
  // Sound to play (custom sound key)
  soundKey?: SoundType;
  // Actions available on this notification
  actions?: NotificationAction[];
}

// ============================================================================
// NOTIFICATION ACTIONS
// ============================================================================

export interface NotificationAction {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  onClick?: () => void;
}

// ============================================================================
// SOUND TYPES
// ============================================================================

export type SoundType =
  | "order_placed"
  | "trade_win"
  | "trade_loss"
  | "alert_triggered"
  | "notification"
  | "error"
  | "success"
  | "click";

export interface SoundConfig {
  enabled: boolean;
  volume: number; // 0-1
  sounds: Record<SoundType, boolean>;
}

export const DEFAULT_SOUND_CONFIG: SoundConfig = {
  enabled: true,
  volume: 0.5,
  sounds: {
    order_placed: true,
    trade_win: true,
    trade_loss: true,
    alert_triggered: true,
    notification: true,
    error: true,
    success: true,
    click: false,
  },
};

// ============================================================================
// NOTIFICATION SETTINGS
// ============================================================================

export interface NotificationSettings {
  // Master enable/disable
  enabled: boolean;
  // In-app toast notifications
  toastEnabled: boolean;
  toastPosition: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  toastDuration: number; // Default duration in ms
  maxToasts: number; // Maximum toasts to show at once
  // Push notifications
  pushEnabled: boolean;
  pushPermission: NotificationPermission | "unsupported";
  // Sound settings
  sound: SoundConfig;
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
  // Notification type preferences
  typePreferences: Record<NotificationType, {
    enabled: boolean;
    showToast: boolean;
    playSound: boolean;
    pushNotification: boolean;
  }>;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  toastEnabled: true,
  toastPosition: "top-right",
  toastDuration: 5000,
  maxToasts: 5,
  pushEnabled: false,
  pushPermission: "default",
  sound: DEFAULT_SOUND_CONFIG,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  typePreferences: {
    success: { enabled: true, showToast: true, playSound: true, pushNotification: false },
    warning: { enabled: true, showToast: true, playSound: true, pushNotification: false },
    error: { enabled: true, showToast: true, playSound: true, pushNotification: false },
    info: { enabled: true, showToast: true, playSound: false, pushNotification: false },
    trade_win: { enabled: true, showToast: true, playSound: true, pushNotification: true },
    trade_loss: { enabled: true, showToast: true, playSound: true, pushNotification: true },
    order_placed: { enabled: true, showToast: true, playSound: true, pushNotification: false },
    order_cancelled: { enabled: true, showToast: true, playSound: false, pushNotification: false },
    alert_triggered: { enabled: true, showToast: true, playSound: true, pushNotification: true },
    price_alert: { enabled: true, showToast: true, playSound: true, pushNotification: true },
    signal: { enabled: true, showToast: true, playSound: false, pushNotification: false },
  },
};

// ============================================================================
// NOTIFICATION STORE STATE
// ============================================================================

export interface NotificationState {
  notifications: TradingNotification[];
  unreadCount: number;
  settings: NotificationSettings;
}

// ============================================================================
// NOTIFICATION EVENTS
// ============================================================================

export interface NotificationEventMap {
  add: TradingNotification;
  remove: string; // notification id
  markRead: string; // notification id
  markAllRead: void;
  clear: void;
  settingsChange: Partial<NotificationSettings>;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type CreateNotificationOptions = Omit<TradingNotification, "id" | "timestamp" | "read">;

// ============================================================================
// CONSTANTS
// ============================================================================

export const NOTIFICATION_STORAGE_KEY = "binary_chart_notifications";
export const NOTIFICATION_SETTINGS_KEY = "binary_chart_notification_settings";
export const MAX_STORED_NOTIFICATIONS = 100;

// Notification type display info
export const NOTIFICATION_TYPE_INFO: Record<NotificationType, {
  label: string;
  icon: string;
  color: string;
}> = {
  success: { label: "Success", icon: "check-circle", color: "emerald" },
  warning: { label: "Warning", icon: "alert-triangle", color: "amber" },
  error: { label: "Error", icon: "x-circle", color: "red" },
  info: { label: "Info", icon: "info", color: "blue" },
  trade_win: { label: "Trade Won", icon: "trending-up", color: "emerald" },
  trade_loss: { label: "Trade Lost", icon: "trending-down", color: "red" },
  order_placed: { label: "Order Placed", icon: "check", color: "blue" },
  order_cancelled: { label: "Order Cancelled", icon: "x", color: "gray" },
  alert_triggered: { label: "Alert Triggered", icon: "bell-ring", color: "amber" },
  price_alert: { label: "Price Alert", icon: "bell", color: "amber" },
  signal: { label: "Signal", icon: "zap", color: "purple" },
};
