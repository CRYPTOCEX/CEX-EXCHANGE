/**
 * Web Push Notifications Utility
 * Handles service worker registration and push subscription management
 */

// Detailed push support check with diagnostics
export function getPushSupportDetails(): {
  supported: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  isSecureContext: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  reason?: string;
} {
  if (typeof window === "undefined") {
    return {
      supported: false,
      hasServiceWorker: false,
      hasPushManager: false,
      hasNotification: false,
      isSecureContext: false,
      isStandalone: false,
      isIOS: false,
      isAndroid: false,
      reason: "Running on server (no window)",
    };
  }

  const hasServiceWorker = "serviceWorker" in navigator;
  const hasPushManager = "PushManager" in window;
  const hasNotification = "Notification" in window;
  const isSecureContext = window.isSecureContext;

  // Detect iOS
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Mac") && "ontouchend" in document);

  // Detect Android
  const isAndroid = /Android/i.test(navigator.userAgent);

  // Check if running as PWA/standalone (multiple detection methods)
  const isStandalone =
    // iOS Safari standalone mode
    (navigator as any).standalone === true ||
    // Standard PWA detection
    window.matchMedia("(display-mode: standalone)").matches ||
    // Fullscreen PWA
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // Minimal UI PWA
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    // Check URL params sometimes used for PWA detection
    window.location.search.includes("mode=pwa") ||
    // Check if launched from home screen on Android (referrer is empty)
    (document.referrer === "" && !window.opener && isAndroid);

  const supported =
    hasServiceWorker && hasPushManager && hasNotification && isSecureContext;

  let reason: string | undefined;
  if (!supported) {
    if (!isSecureContext) {
      reason = "Not a secure context (HTTPS required)";
    } else if (!hasServiceWorker) {
      reason = "Service Workers not supported";
    } else if (!hasPushManager) {
      if (isIOS && !isStandalone) {
        reason = "iOS requires adding this site to your Home Screen first";
      } else {
        reason = "Push Manager not available";
      }
    } else if (!hasNotification) {
      reason = "Notification API not available";
    }
  }

  return {
    supported,
    hasServiceWorker,
    hasPushManager,
    hasNotification,
    isSecureContext,
    isStandalone,
    isIOS,
    isAndroid,
    reason,
  };
}

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return getPushSupportDetails().supported;
}

/**
 * Test if OS-level notifications are working
 *
 * IMPORTANT: Due to browser limitations, we cannot programmatically detect
 * if Windows/macOS has disabled notifications for the browser. Chrome's
 * Notification API fires 'onshow' even when the OS silently blocks the notification.
 *
 * For OS-level blocks, users must manually verify by looking for the test notification.
 */
export async function testOSNotifications(): Promise<{
  working: boolean;
  reason?: string;
  needsUserConfirmation?: boolean;
}> {
  if (!isPushSupported()) {
    return { working: false, reason: "Push notifications not supported" };
  }

  if (Notification.permission !== "granted") {
    return { working: false, reason: "Notification permission not granted" };
  }

  return new Promise((resolve) => {
    try {
      // Create a VISIBLE test notification that the user should see
      const notification = new Notification("🔔 Notification Test", {
        body: "If you see this popup, notifications are working! Click to dismiss.",
        tag: "os-notification-test-" + Date.now(),
        icon: "/icon-192x192.png",
        requireInteraction: false,
      });

      let errorOccurred = false;

      notification.onerror = () => {
        errorOccurred = true;
        resolve({
          working: false,
          reason: "Notification failed - check Windows notification settings",
        });
      };

      notification.onclick = () => {
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Give it a moment for any error to fire
      setTimeout(() => {
        if (!errorOccurred) {
          resolve({
            working: true,
            needsUserConfirmation: true,
            reason: "A test notification was sent. Did you see a popup?",
          });
        }
      }, 500);
    } catch (error: any) {
      resolve({
        working: false,
        reason: error.message || "Failed to create test notification",
      });
    }
  });
}

// Get current notification permission status
export function getPermissionStatus(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) {
    return "unsupported";
  }
  return Notification.permission;
}

// Request notification permission
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser");
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported");
  }

  const registration = await navigator.serviceWorker.register("/sw-push.js", {
    scope: "/",
  });

  // Wait for the service worker to be ready
  await navigator.serviceWorker.ready;

  return registration;
}

// Get VAPID public key from server
export async function getVapidPublicKey(): Promise<{
  publicKey: string | null;
  fcmAvailable: boolean;
  webPushAvailable: boolean;
}> {
  const response = await fetch("/api/user/push/vapid-key", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get VAPID public key");
  }

  return response.json();
}

// Convert VAPID key to Uint8Array for subscription
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Generate a consistent device ID based on the push endpoint
 * This ensures the same device always uses the same ID
 */
function generateDeviceId(endpoint: string): string {
  // Use a hash of the endpoint to create a consistent device ID
  let hash = 0;
  for (let i = 0; i < endpoint.length; i++) {
    const char = endpoint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hashStr = Math.abs(hash).toString(36);

  // Also include some browser/platform info for clarity in logs
  const platform = /Android/i.test(navigator.userAgent) ? "android"
    : /iPad|iPhone|iPod/.test(navigator.userAgent) ? "ios"
    : "web";

  return `webpush-${platform}-${hashStr}`;
}

// Subscribe to push notifications
export async function subscribeToPush(
  registration?: ServiceWorkerRegistration
): Promise<PushSubscription> {
  // Get or create service worker registration
  const swRegistration =
    registration || (await navigator.serviceWorker.ready);

  // Get VAPID public key
  const vapidResponse = await getVapidPublicKey();
  const { publicKey, webPushAvailable } = vapidResponse;

  if (!webPushAvailable || !publicKey) {
    throw new Error("Web Push is not configured on this server");
  }

  // Subscribe to push
  const subscription = await swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // Generate a consistent device ID based on the endpoint
  const deviceId = generateDeviceId(subscription.endpoint);
  console.log("[Push] Subscribing with device ID:", deviceId);
  console.log("[Push] Endpoint:", subscription.endpoint.substring(0, 80) + "...");

  // Send subscription to server
  const response = await fetch("/api/user/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "webpush",
      subscription: subscription.toJSON(),
      deviceId: deviceId,
      platform: /Android/i.test(navigator.userAgent) ? "android"
        : /iPad|iPhone|iPod/.test(navigator.userAgent) ? "ios"
        : "web",
    }),
    credentials: "include",
  });

  if (!response.ok) {
    // Unsubscribe if server save failed
    const errorText = await response.text();
    console.error("[Push] Server subscribe failed:", response.status, errorText);
    await subscription.unsubscribe();
    throw new Error(`Failed to save subscription on server: ${response.status}`);
  }

  const result = await response.json();
  console.log("[Push] Subscription saved with device ID:", result.deviceId);

  return subscription;
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  const swRegistration = await navigator.serviceWorker.ready;
  const subscription = await swRegistration.pushManager.getSubscription();

  if (!subscription) {
    return false;
  }

  // Unsubscribe from push manager
  const success = await subscription.unsubscribe();

  if (success) {
    // Notify server
    await fetch("/api/user/push/unsubscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
      credentials: "include",
    });
  }

  return success;
}

// Get current push subscription
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null;
  }

  try {
    // Check if there's an active service worker first
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration || !registration.active) {
      return null;
    }

    return await registration.pushManager.getSubscription();
  } catch (err) {
    return null;
  }
}

// Check if user is subscribed to push notifications
export async function isSubscribed(): Promise<boolean> {
  const subscription = await getCurrentSubscription();
  return subscription !== null;
}

/**
 * Sync local subscription with server
 * If there's a local subscription but server doesn't have it, re-register it
 * Returns true if subscription is properly synced with server
 */
export async function syncSubscriptionWithServer(): Promise<{
  synced: boolean;
  error?: string;
}> {
  try {
    const subscription = await getCurrentSubscription();

    if (!subscription) {
      console.log("[Push] No local subscription to sync");
      return { synced: false, error: "No local subscription" };
    }

    // Generate device ID for this subscription
    const deviceId = generateDeviceId(subscription.endpoint);
    const platform = /Android/i.test(navigator.userAgent) ? "android"
      : /iPad|iPhone|iPod/.test(navigator.userAgent) ? "ios"
      : "web";

    console.log("[Push] Syncing subscription with server...");
    console.log("[Push] Device ID:", deviceId);
    console.log("[Push] Endpoint:", subscription.endpoint.substring(0, 80) + "...");

    // Send subscription to server (it will handle duplicates)
    const response = await fetch("/api/user/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "webpush",
        subscription: subscription.toJSON(),
        deviceId: deviceId,
        platform: platform,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Push] Sync failed:", response.status, errorText);
      return { synced: false, error: `Server error: ${response.status}` };
    }

    const result = await response.json();
    console.log("[Push] Sync successful, device ID:", result.deviceId);
    return { synced: true };
  } catch (err: any) {
    console.error("[Push] Sync error:", err);
    return { synced: false, error: err.message };
  }
}

// Full initialization flow
export async function initializePushNotifications(): Promise<{
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  subscription: PushSubscription | null;
}> {
  const result = {
    supported: isPushSupported(),
    permission: getPermissionStatus(),
    subscribed: false,
    subscription: null as PushSubscription | null,
  };

  if (!result.supported) {
    return result;
  }

  try {
    // Register service worker
    await registerServiceWorker();

    // Check current subscription
    result.subscription = await getCurrentSubscription();
    result.subscribed = result.subscription !== null;
  } catch (error) {
    console.error("[Push] Initialization error:", error);
  }

  return result;
}

// Enable push notifications (request permission + subscribe)
export async function enablePushNotifications(): Promise<{
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
}> {
  try {
    // Check support
    if (!isPushSupported()) {
      return {
        success: false,
        error: "Push notifications are not supported in this browser",
      };
    }

    // Request permission if not granted
    if (Notification.permission !== "granted") {
      const permission = await requestPermission();
      if (permission !== "granted") {
        return {
          success: false,
          error:
            permission === "denied"
              ? "Notification permission was denied"
              : "Notification permission was not granted",
        };
      }
    }

    // Register service worker
    const registration = await registerServiceWorker();

    // Subscribe to push
    const subscription = await subscribeToPush(registration);

    return {
      success: true,
      subscription,
    };
  } catch (error: any) {
    console.error("[Push] Enable error:", error);
    return {
      success: false,
      error: error.message || "Failed to enable push notifications",
    };
  }
}

// Disable push notifications
export async function disablePushNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const success = await unsubscribeFromPush();
    return { success };
  } catch (error: any) {
    console.error("[Push] Disable error:", error);
    return {
      success: false,
      error: error.message || "Failed to disable push notifications",
    };
  }
}
