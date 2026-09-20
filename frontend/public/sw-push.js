/**
 * Service Worker for Web Push Notifications
 * This service worker handles push notifications from the server
 * Updated for better mobile/Android PWA compatibility
 */

// Cache name for notification assets
const CACHE_NAME = "push-notification-cache-v2";

// Install event - cache notification assets
self.addEventListener("install", (event) => {
  console.log("[SW-Push] Service Worker installing");
  // Take control immediately
  self.skipWaiting();
});

// Activate event - clean up old caches and take control
self.addEventListener("activate", (event) => {
  console.log("[SW-Push] Service Worker activating");
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith("push-notification-cache-") && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      }),
      // Take control of all clients immediately
      self.clients.claim(),
    ])
  );
});

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("[SW-Push] Push notification received");
  console.log("[SW-Push] Has data:", !!event.data);

  let data = {
    title: "New Notification",
    body: "You have a new notification",
    icon: "/img/logo/android-chrome-192x192.png",
    badge: "/img/logo/android-icon-96x96.png",
    data: {},
  };

  // Try to parse push data
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log("[SW-Push] Parsed payload:", JSON.stringify(payload));

      // Generate unique tag to ensure notification shows even if same tag exists
      const uniqueTag = (payload.tag || "notification") + "-" + Date.now();

      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        image: payload.image,
        tag: uniqueTag,
        data: payload.data || {},
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        vibrate: payload.vibrate || [200, 100, 200],
        renotify: true, // Always renotify to ensure notification shows
      };
    } catch (e) {
      console.error("[SW-Push] Error parsing push data:", e);
      // Try as text
      try {
        const textData = event.data.text();
        console.log("[SW-Push] Raw text data:", textData);
        data.body = textData || data.body;
        data.tag = "text-notification-" + Date.now();
      } catch (textError) {
        console.error("[SW-Push] Error reading text data:", textError);
      }
    }
  } else {
    // No data, use unique tag
    data.tag = "empty-notification-" + Date.now();
  }

  console.log("[SW-Push] Final notification data:", JSON.stringify(data));

  // Build options - be careful with mobile compatibility
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    renotify: true, // Critical for showing duplicate notifications
    requireInteraction: false, // Don't require interaction on mobile
  };

  // Only add optional properties if they have valid values
  if (data.image) {
    options.image = data.image;
  }

  // Add vibration for non-silent notifications
  if (!data.silent && data.vibrate) {
    options.vibrate = data.vibrate;
  }

  // Note: actions may not be supported on all platforms
  // Skip actions for better compatibility - they can cause issues on some Android versions

  console.log("[SW-Push] Showing notification with options:", JSON.stringify(options));

  // Create the notification promise
  const showNotification = async () => {
    try {
      await self.registration.showNotification(data.title, options);
      console.log("[SW-Push] Notification shown successfully");

      // Notify open clients
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => {
        client.postMessage({
          type: "PUSH_RECEIVED",
          payload: data,
        });
      });
    } catch (err) {
      console.error("[SW-Push] Failed to show notification:", err);

      // Try simplified notification as fallback
      try {
        await self.registration.showNotification(data.title, {
          body: data.body,
          icon: data.icon,
          tag: "fallback-" + Date.now(),
          renotify: true,
        });
        console.log("[SW-Push] Fallback notification shown");
      } catch (fallbackErr) {
        console.error("[SW-Push] Fallback notification also failed:", fallbackErr);
      }
    }
  };

  // CRITICAL: waitUntil keeps the service worker alive until notification is shown
  event.waitUntil(showNotification());
});

// Notification click event - handle user interaction
self.addEventListener("notificationclick", (event) => {
  console.log("[SW-Push] Notification clicked", event.action);

  // Close the notification
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const url = data.url || data.link || "/";

  // Handle dismiss action
  if (action === "dismiss") {
    return;
  }

  // Default action or "open" action - open/focus the app
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus().then((focusedClient) => {
            // Navigate to the URL if different
            if (focusedClient && "navigate" in focusedClient) {
              return focusedClient.navigate(url);
            }
          });
        }
      }

      // No existing window, open new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Notification close event - track notification dismissals
self.addEventListener("notificationclose", (event) => {
  console.log("[SW-Push] Notification closed");

  const data = event.notification.data || {};

  if (data.notificationId) {
    console.log("[SW-Push] Notification dismissed:", data.notificationId);
  }
});

// Push subscription change event - handle subscription updates
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[SW-Push] Push subscription changed");

  event.waitUntil(
    (async () => {
      try {
        // Try to resubscribe
        const newSubscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
        });

        // Send new subscription to server
        await fetch("/api/user/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "webpush",
            subscription: newSubscription.toJSON(),
          }),
          credentials: "include",
        });

        console.log("[SW-Push] Re-subscribed successfully");
      } catch (error) {
        console.error("[SW-Push] Failed to re-subscribe:", error);
      }
    })()
  );
});

// Message event - handle messages from main thread
self.addEventListener("message", (event) => {
  console.log("[SW-Push] Message received:", event.data);

  if (event.data) {
    if (event.data.type === "SKIP_WAITING") {
      self.skipWaiting();
    }

    // Debug: Test notification from main thread
    if (event.data.type === "TEST_NOTIFICATION") {
      self.registration.showNotification("Test from Main Thread", {
        body: "Service worker is active and can show notifications",
        icon: "/img/logo/android-chrome-192x192.png",
        badge: "/img/logo/android-icon-96x96.png",
        tag: "test-" + Date.now(),
        renotify: true,
      });
    }
  }
});

// Log when service worker is ready
console.log("[SW-Push] Service Worker script loaded");
