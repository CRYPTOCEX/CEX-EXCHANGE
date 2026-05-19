/**
 * Notifications Core Module
 *
 * Core functionality for the trading notifications system.
 */

// Store
export {
  useTradingNotificationsStore,
  selectUnreadNotifications,
  selectNotificationsByType,
  selectRecentNotifications,
} from "./notification-store";

// Sound Manager
export {
  SoundManager,
  playNotificationSound,
  initializeSoundManager,
  updateSoundConfig,
} from "./sound-manager";

// Push Notifications
export {
  PushNotificationService,
  requestNotificationPermission,
  areNotificationsEnabled,
  showPushNotification,
  showTradingPushNotification,
} from "./push-notifications";

// Notification Service
export {
  NotificationService,
  notify,
  notifyTradeWin,
  notifyTradeLoss,
  notifyOrderPlaced,
  notifyPriceAlert,
} from "./notification-service";
