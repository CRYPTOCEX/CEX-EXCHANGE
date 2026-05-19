/**
 * Push Notifications Service
 *
 * Handles browser push notifications for trading events.
 * Uses the Web Notifications API.
 */

import type { TradingNotification, NotificationType, NotificationAction as TradingNotificationAction } from "../types";

// ============================================================================
// TYPES
// ============================================================================

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  silent?: boolean;
  actions?: TradingNotificationAction[];
}

// ============================================================================
// PUSH NOTIFICATION SERVICE CLASS
// ============================================================================

class PushNotificationServiceClass {
  private permission: NotificationPermission | "unsupported" = "default";
  private initialized = false;

  constructor() {
    // Don't check support in constructor - it runs on server side
    // Instead, lazily initialize on first use
  }

  // Check if browser supports notifications (called lazily)
  private checkSupport(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Check if we're in a browser environment
    if (typeof window === "undefined") {
      this.permission = "unsupported";
      return;
    }

    if (!("Notification" in window)) {
      this.permission = "unsupported";
    } else {
      this.permission = Notification.permission;
    }
  }

  // Get current permission status
  getPermission(): NotificationPermission | "unsupported" {
    this.checkSupport();
    return this.permission;
  }

  // Check if notifications are supported
  isSupported(): boolean {
    if (typeof window === "undefined") return false;
    return "Notification" in window;
  }

  // Check if notifications are granted
  isGranted(): boolean {
    this.checkSupport();
    return this.permission === "granted";
  }

  // Request permission
  async requestPermission(): Promise<NotificationPermission | "unsupported"> {
    this.checkSupport();

    if (!this.isSupported()) {
      return "unsupported";
    }

    if (this.permission === "granted") {
      return "granted";
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result;
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      return "denied";
    }
  }

  // Show a notification
  async show(options: PushNotificationOptions): Promise<Notification | null> {
    this.checkSupport();

    if (!this.isGranted()) {
      console.warn("Notifications not granted");
      return null;
    }

    if (typeof window === "undefined") return null;

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || "/favicon.ico",
        badge: options.badge,
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction ?? false,
        silent: options.silent ?? false,
      });

      // Handle click
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error("Failed to show notification:", error);
      return null;
    }
  }

  // Show a trading notification as push
  async showTradingNotification(
    notification: TradingNotification
  ): Promise<Notification | null> {
    const typeConfig = this.getNotificationConfig(notification.type);

    return this.show({
      title: notification.title,
      body: notification.message,
      icon: typeConfig.icon,
      tag: notification.id,
      data: notification.data,
      requireInteraction: notification.priority === "urgent",
      silent: false,
    });
  }

  // Get notification config based on type
  private getNotificationConfig(type: NotificationType): {
    icon: string;
    badge?: string;
  } {
    const configs: Record<NotificationType, { icon: string; badge?: string }> = {
      success: { icon: "/icons/success.png" },
      warning: { icon: "/icons/warning.png" },
      error: { icon: "/icons/error.png" },
      info: { icon: "/icons/info.png" },
      trade_win: { icon: "/icons/trade-win.png", badge: "/icons/badge-win.png" },
      trade_loss: { icon: "/icons/trade-loss.png", badge: "/icons/badge-loss.png" },
      order_placed: { icon: "/icons/order.png" },
      order_cancelled: { icon: "/icons/order-cancelled.png" },
      alert_triggered: { icon: "/icons/alert.png" },
      price_alert: { icon: "/icons/price-alert.png" },
      signal: { icon: "/icons/signal.png" },
    };

    return configs[type] || { icon: "/favicon.ico" };
  }

  // Close all notifications with a specific tag
  closeByTag(tag: string): void {
    // Note: Web API doesn't provide a way to close by tag
    // This would require service worker integration for full control
    console.log(`Would close notifications with tag: ${tag}`);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const PushNotificationService = new PushNotificationServiceClass();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  return PushNotificationService.requestPermission();
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  return PushNotificationService.isGranted();
}

/**
 * Show a push notification
 */
export async function showPushNotification(
  options: PushNotificationOptions
): Promise<Notification | null> {
  return PushNotificationService.show(options);
}

/**
 * Show a trading notification as push
 */
export async function showTradingPushNotification(
  notification: TradingNotification
): Promise<Notification | null> {
  return PushNotificationService.showTradingNotification(notification);
}
