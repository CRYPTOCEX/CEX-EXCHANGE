/**
 * Trading Notifications System
 *
 * Complete notification system for the binary chart including:
 * - Toast notifications for trading events
 * - Notification center with history
 * - Sound effects
 * - Push notifications
 * - Customizable settings
 *
 * @example
 * ```tsx
 * import {
 *   ToastContainer,
 *   NotificationCenter,
 *   NotificationService,
 *   useTradingNotificationsStore,
 * } from "@/components/notifications";
 *
 * // Show a trade win notification
 * NotificationService.tradeWin({
 *   orderId: "123",
 *   symbol: "BTC/USDT",
 *   side: "RISE",
 *   amount: 100,
 *   profit: 85,
 *   profitPercentage: 85,
 * });
 * ```
 */

// Types
export type {
  TradingNotification,
  NotificationType,
  NotificationPriority,
  NotificationAction,
  NotificationSettings as NotificationSettingsType,
  NotificationState,
  CreateNotificationOptions,
  SoundType,
  SoundConfig,
} from "./types";

export {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_SOUND_CONFIG,
  NOTIFICATION_TYPE_INFO,
  NOTIFICATION_STORAGE_KEY,
  NOTIFICATION_SETTINGS_KEY,
  MAX_STORED_NOTIFICATIONS,
} from "./types";

// Core
export {
  // Store
  useTradingNotificationsStore,
  selectUnreadNotifications,
  selectNotificationsByType,
  selectRecentNotifications,
  // Sound Manager
  SoundManager,
  playNotificationSound,
  initializeSoundManager,
  updateSoundConfig,
  // Push Notifications
  PushNotificationService,
  requestNotificationPermission,
  areNotificationsEnabled,
  showPushNotification,
  showTradingPushNotification,
  // Notification Service
  NotificationService,
  notify,
  notifyTradeWin,
  notifyTradeLoss,
  notifyOrderPlaced,
  notifyPriceAlert,
} from "./core";

// Components
export {
  NotificationToast,
  type NotificationToastProps,
  ToastContainer,
  type ToastContainerProps,
  NotificationCenter,
  type NotificationCenterProps,
  NotificationSettings,
  type NotificationSettingsProps,
} from "./components";
