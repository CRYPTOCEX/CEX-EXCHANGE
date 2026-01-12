"use client";

import { memo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, Bell, MessageSquare, Loader2, AlertCircle, Send, CheckCircle2, XCircle, RefreshCw, Smartphone, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";
import { useSettings } from "@/hooks/use-settings";
import { $fetch } from "@/lib/api";
import {
  isPushSupported,
  getPermissionStatus,
  enablePushNotifications,
  disablePushNotifications,
  isSubscribed as checkIsSubscribed,
  getPushSupportDetails,
  syncSubscriptionWithServer,
} from "@/lib/push-notifications";

const colorClasses = {
  amber: {
    bg: "bg-amber-500/10",
    icon: "text-amber-400",
    activeBg: "bg-amber-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    icon: "text-blue-400",
    activeBg: "bg-blue-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    icon: "text-emerald-400",
    activeBg: "bg-emerald-500/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    icon: "text-purple-400",
    activeBg: "bg-purple-500/20",
  },
};

const NotificationChannel = memo(function NotificationChannel({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  disabled,
  color = "amber",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  color?: "amber" | "blue" | "emerald" | "purple";
}) {
  const styles = colorClasses[color];

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
        enabled
          ? "bg-zinc-800/50 border-zinc-700"
          : "bg-zinc-900/50 border-zinc-800/50"
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-xl", enabled ? styles.activeBg : styles.bg)}>
          <Icon className={cn("h-5 w-5", styles.icon)} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white">{title}</h4>
            {enabled && (
              <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-xs">
                On
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="data-[state=checked]:bg-amber-500"
      />
    </div>
  );
});

// Push Notification Channel with browser permission handling
const PushNotificationChannel = memo(function PushNotificationChannel({
  userPushEnabled,
  onToggle,
  isUpdating,
}: {
  userPushEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  isUpdating: boolean;
}) {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const [mounted, setMounted] = useState(false);
  const [pushState, setPushState] = useState<{
    supported: boolean;
    permission: NotificationPermission | "unsupported";
    subscribed: boolean;
    loading: boolean;
    error: string | null;
    supportDetails?: ReturnType<typeof getPushSupportDetails>;
  }>({
    supported: true, // Assume supported initially, will check on mount
    permission: "default",
    subscribed: false,
    loading: true,
    error: null,
  });
  const [testState, setTestState] = useState<{
    sending: boolean;
    result: "success" | "error" | null;
    message: string | null;
  }>({
    sending: false,
    result: null,
    message: null,
  });

  // Check push notification status on mount (client-side only)
  useEffect(() => {
    setMounted(true);

    const checkPushStatus = async () => {
      // Give browser a moment to initialize on PWA/standalone mode
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get detailed support info for better error messages
      const supportDetails = getPushSupportDetails();
      const supported = supportDetails.supported;
      const permission = getPermissionStatus();
      let subscribed = false;

      if (supported && permission === "granted") {
        try {
          // Add timeout to prevent hanging if service worker isn't ready
          const timeoutPromise = new Promise<boolean>((resolve) => {
            setTimeout(() => resolve(false), 3000);
          });
          subscribed = await Promise.race([checkIsSubscribed(), timeoutPromise]);

          // If we have a local subscription, sync it with the server
          // This ensures the subscription is registered even if a previous
          // registration failed or if this is a different device
          if (subscribed) {
            console.log("[Push] Local subscription found, syncing with server...");
            const syncResult = await syncSubscriptionWithServer();
            if (syncResult.synced) {
              console.log("[Push] Subscription synced successfully");
            } else {
              console.warn("[Push] Subscription sync issue:", syncResult.error);
            }
          }
        } catch (err) {
          console.error("[Push] Error checking subscription:", err);
        }
      }

      setPushState({
        supported,
        permission,
        subscribed,
        loading: false,
        error: null,
        supportDetails,
      });
    };

    checkPushStatus();
  }, []);

  const handleEnablePush = async () => {
    setPushState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await enablePushNotifications();

      if (result.success) {
        setPushState((prev) => ({
          ...prev,
          permission: "granted",
          subscribed: true,
          loading: false,
        }));
        // Also update user preference
        onToggle(true);
      } else {
        // Provide more helpful error messages
        let errorMessage = result.error || "Failed to enable push notifications";

        // Check if it's a common mobile issue
        const details = getPushSupportDetails();
        if (
          errorMessage.includes("not supported") &&
          (details.isIOS || details.isAndroid) &&
          !details.isStandalone
        ) {
          errorMessage =
            "Please add this site to your Home Screen first, then try again.";
        }

        setPushState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          permission: getPermissionStatus(),
          supportDetails: details,
        }));
      }
    } catch (err: any) {
      setPushState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "An unexpected error occurred",
        permission: getPermissionStatus(),
      }));
    }
  };

  const handleDisablePush = async () => {
    setPushState((prev) => ({ ...prev, loading: true, error: null }));

    const result = await disablePushNotifications();

    if (result.success) {
      setPushState((prev) => ({
        ...prev,
        subscribed: false,
        loading: false,
      }));
      // Also update user preference
      onToggle(false);
    } else {
      setPushState((prev) => ({
        ...prev,
        loading: false,
        error: result.error || "Failed to disable push notifications",
      }));
    }
  };

  const handleTestPush = async () => {
    setTestState({ sending: true, result: null, message: null });

    try {
      const response = await $fetch<{
        success: boolean;
        message: string;
        delivered: boolean;
      }>({
        url: "/api/user/push/test",
        method: "POST",
        silent: true, // Don't show toast, we handle UI ourselves
      });

      // $fetch returns { data, error } - check data.success
      if (response.error) {
        setTestState({
          sending: false,
          result: "error",
          message: response.error,
        });
      } else if (response.data?.success) {
        setTestState({
          sending: false,
          result: "success",
          message: response.data.message || "Test notification sent!",
        });
      } else {
        setTestState({
          sending: false,
          result: "error",
          message: response.data?.message || "Failed to send test notification",
        });
      }
    } catch (err: any) {
      setTestState({
        sending: false,
        result: "error",
        message: err.message || "Failed to send test notification",
      });
    }

    // Clear result after 5 seconds
    setTimeout(() => {
      setTestState((prev) => ({ ...prev, result: null, message: null }));
    }, 5000);
  };

  const styles = colorClasses["purple"];
  const isEnabled = pushState.subscribed && userPushEnabled;
  const isLoading = pushState.loading || isUpdating;

  // Show loading state until mounted and checked
  if (!mounted || pushState.loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
          "bg-zinc-900/50 border-zinc-800/50"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl", styles.bg)}>
            <Bell className={cn("h-5 w-5", styles.icon)} />
          </div>
          <div>
            <h4 className="font-medium text-white">
              {tCommon("push_notifications")}
            </h4>
            <p className="text-sm text-zinc-500 mt-0.5">
              {t("receive_notifications_on_your_devices")}
            </p>
          </div>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  // Use support details from state for accurate device detection
  const details = pushState.supportDetails;

  // Not supported (only show after checking)
  if (!pushState.supported) {
    // Use the reason from diagnostics, or fallback to translation
    let notSupportedMessage = details?.reason || t("push_not_supported_in_browser");

    // Provide helpful instructions based on device - check HTTPS first as it's the most critical
    if (!details?.isSecureContext) {
      notSupportedMessage =
        "Push notifications require HTTPS. Please access this site using https:// instead of http://";
    } else if (details?.isIOS && !details?.isStandalone) {
      notSupportedMessage =
        "To enable push notifications on iOS, tap the Share button and select 'Add to Home Screen'. Then open the app from your Home Screen.";
    } else if (details?.isAndroid && !details?.isStandalone) {
      notSupportedMessage =
        "To enable push notifications, add this site to your Home Screen. Tap the menu (⋮) and select 'Add to Home Screen' or 'Install App'.";
    }

    return (
      <div
        className={cn(
          "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
          "bg-zinc-900/50 border-zinc-800/50 opacity-60"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl", styles.bg)}>
            <Bell className={cn("h-5 w-5", styles.icon)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-white">
                {tCommon("push_notifications")}
              </h4>
              <Badge className="bg-zinc-500/10 border-zinc-500/20 text-zinc-400 text-xs">
                {!details?.isSecureContext
                  ? "HTTPS Required"
                  : details?.isIOS || details?.isAndroid
                    ? "Requires Home Screen App"
                    : t("not_supported")}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">{notSupportedMessage}</p>
            {/* Debug info for mobile troubleshooting */}
            {(details?.isIOS || details?.isAndroid) && (
              <details className="mt-2">
                <summary className="text-xs text-zinc-600 cursor-pointer">
                  Debug Info
                </summary>
                <div className="mt-1 text-xs text-zinc-600 space-y-0.5">
                  <p>Device: {details?.isIOS ? "iOS" : "Android"}</p>
                  <p>Standalone: {details?.isStandalone ? "Yes" : "No"}</p>
                  <p>Secure: {details?.isSecureContext ? "Yes" : "No"}</p>
                  <p>ServiceWorker: {details?.hasServiceWorker ? "Yes" : "No"}</p>
                  <p>PushManager: {details?.hasPushManager ? "Yes" : "No"}</p>
                  <p>Notification: {details?.hasNotification ? "Yes" : "No"}</p>
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Permission denied
  if (pushState.permission === "denied") {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
          "bg-zinc-900/50 border-zinc-800/50"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl bg-red-500/10")}>
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-white">
                {tCommon("push_notifications")}
              </h4>
              <Badge className="bg-red-500/10 border-red-500/20 text-red-400 text-xs">
                {t("blocked")}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              {t("push_permission_denied")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not subscribed - show enable button
  if (!pushState.subscribed) {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
          "bg-zinc-900/50 border-zinc-800/50"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl", styles.bg)}>
            <Bell className={cn("h-5 w-5", styles.icon)} />
          </div>
          <div>
            <h4 className="font-medium text-white">
              {tCommon("push_notifications")}
            </h4>
            <p className="text-sm text-zinc-500 mt-0.5">
              {t("receive_notifications_on_your_devices")}
            </p>
            {pushState.error && (
              <p className="text-sm text-red-400 mt-1">{pushState.error}</p>
            )}
          </div>
        </div>
        <Button
          onClick={handleEnablePush}
          disabled={isLoading}
          size="sm"
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("enable")
          )}
        </Button>
      </div>
    );
  }

  // Subscribed - show toggle
  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
          isEnabled
            ? "bg-zinc-800/50 border-zinc-700"
            : "bg-zinc-900/50 border-zinc-800/50"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl", isEnabled ? styles.activeBg : styles.bg)}>
            <Bell className={cn("h-5 w-5", styles.icon)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-white">
                {tCommon("push_notifications")}
              </h4>
              {isEnabled && (
                <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-xs">
                  On
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              {t("receive_notifications_on_your_devices")}
            </p>
            {pushState.error && (
              <p className="text-sm text-red-400 mt-1">{pushState.error}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDisablePush}
            disabled={isLoading}
            size="sm"
            variant="ghost"
            className="text-zinc-400 hover:text-red-400"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("unsubscribe")
            )}
          </Button>
          <Switch
            checked={userPushEnabled}
            onCheckedChange={onToggle}
            disabled={isLoading}
            className="data-[state=checked]:bg-purple-500"
          />
        </div>
      </div>

      {/* Test Push Notification Button */}
      {isEnabled && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
            <Button
              onClick={handleTestPush}
              disabled={testState.sending}
              size="sm"
              variant="outline"
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
            >
              {testState.sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Test (Server)
                </>
              )}
            </Button>
            <Button
              onClick={async () => {
                // Direct push test - bypasses notification service
                setTestState({ sending: true, result: null, message: null });
                try {
                  const response = await $fetch<{
                    success: boolean;
                    message: string;
                    details?: any;
                  }>({
                    url: "/api/user/push/test-direct",
                    method: "POST",
                    silent: true,
                  });
                  if (response.data?.success) {
                    setTestState({
                      sending: false,
                      result: "success",
                      message: response.data.message || "Direct push sent!",
                    });
                  } else {
                    setTestState({
                      sending: false,
                      result: "error",
                      message: response.data?.message || response.error || "Direct test failed",
                    });
                  }
                } catch (err: any) {
                  setTestState({
                    sending: false,
                    result: "error",
                    message: err.message || "Direct test failed",
                  });
                }
                setTimeout(() => {
                  setTestState((prev) => ({ ...prev, result: null, message: null }));
                }, 5000);
              }}
              disabled={testState.sending}
              size="sm"
              variant="outline"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Direct Test
            </Button>
            <Button
              onClick={async () => {
                try {
                  // Test local notification via service worker
                  const registration = await navigator.serviceWorker.ready;
                  await registration.showNotification("Local Test", {
                    body: "This notification was triggered locally. If you see this, your device CAN show notifications!",
                    icon: "/img/logo/android-chrome-192x192.png",
                    tag: "local-test-" + Date.now(),
                    renotify: true,
                  });
                  setTestState({
                    sending: false,
                    result: "success",
                    message: "Local notification sent! Check your notifications.",
                  });
                  setTimeout(() => {
                    setTestState((prev) => ({ ...prev, result: null, message: null }));
                  }, 5000);
                } catch (err: any) {
                  setTestState({
                    sending: false,
                    result: "error",
                    message: err.message || "Local notification failed",
                  });
                  setTimeout(() => {
                    setTestState((prev) => ({ ...prev, result: null, message: null }));
                  }, 5000);
                }
              }}
              size="sm"
              variant="outline"
              className="border-zinc-600 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
            >
              <Bell className="h-4 w-4 mr-2" />
              Test (Local)
            </Button>
            {testState.result && (
              <div className="flex items-center gap-2 text-sm">
                {testState.result === "success" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-400">{testState.message}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400">{testState.message}</span>
                  </>
                )}
              </div>
            )}
            {!testState.result && !testState.sending && (
              <span className="text-xs text-zinc-500">
                Server = full flow | Direct = simple push | Local = device only
              </span>
            )}
          </div>

          {/* Mobile Troubleshooting Tips */}
          {details?.isAndroid && (
            <details className="px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <summary className="flex items-center gap-2 text-sm font-medium text-amber-400 cursor-pointer">
                <Smartphone className="h-4 w-4" />
                Not receiving notifications on mobile?
              </summary>
              <div className="mt-3 space-y-2 text-xs text-zinc-400">
                <p className="font-medium text-zinc-300">Android Troubleshooting:</p>
                <ol className="list-decimal list-inside space-y-1.5 ml-1">
                  <li>
                    <span className="font-medium">Disable Battery Optimization:</span>
                    <br />
                    <span className="text-zinc-500 ml-4">Settings → Apps → Chrome → Battery → Unrestricted</span>
                  </li>
                  <li>
                    <span className="font-medium">Check Notification Settings:</span>
                    <br />
                    <span className="text-zinc-500 ml-4">Settings → Apps → Chrome → Notifications → Enable All</span>
                  </li>
                  <li>
                    <span className="font-medium">For PWA (Home Screen App):</span>
                    <br />
                    <span className="text-zinc-500 ml-4">Settings → Apps → [Your App Name] → Notifications → Enable</span>
                  </li>
                  <li>
                    <span className="font-medium">Re-subscribe:</span>
                    <br />
                    <span className="text-zinc-500 ml-4">Click &quot;Unsubscribe&quot; above, then enable again</span>
                  </li>
                  <li>
                    <span className="font-medium">Clear App Data:</span>
                    <br />
                    <span className="text-zinc-500 ml-4">Uninstall the PWA, clear Chrome site data, reinstall</span>
                  </li>
                </ol>
                <div className="mt-3 p-2 rounded bg-zinc-800/50 text-zinc-400">
                  <Info className="h-3 w-3 inline mr-1" />
                  Some Android manufacturers (Samsung, Xiaomi, Huawei) have aggressive battery optimization. Check your phone&apos;s battery/power settings.
                </div>
              </div>
            </details>
          )}

          {details?.isIOS && (
            <details className="px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <summary className="flex items-center gap-2 text-sm font-medium text-amber-400 cursor-pointer">
                <Smartphone className="h-4 w-4" />
                Not receiving notifications on iOS?
              </summary>
              <div className="mt-3 space-y-2 text-xs text-zinc-400">
                <p className="font-medium text-zinc-300">iOS Troubleshooting:</p>
                <ol className="list-decimal list-inside space-y-1.5 ml-1">
                  <li>
                    <span className="font-medium">Ensure iOS 16.4+:</span>
                    <br />
                    <span className="text-zinc-500 ml-4">Web Push requires iOS 16.4 or later</span>
                  </li>
                  <li>
                    <span className="font-medium">Must be installed as PWA:</span>
                    <br />
                    <span className="text-zinc-500 ml-4">Safari → Share → Add to Home Screen</span>
                  </li>
                  <li>
                    <span className="font-medium">Check Notification Settings:</span>
                    <br />
                    <span className="text-zinc-500 ml-4">Settings → [App Name] → Notifications → Allow</span>
                  </li>
                  <li>
                    <span className="font-medium">Check Focus Mode:</span>
                    <br />
                    <span className="text-zinc-500 ml-4">Ensure Focus/Do Not Disturb isn&apos;t blocking notifications</span>
                  </li>
                </ol>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
});

export function NotificationsTab() {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const { user, updateUser } = useUserStore();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const { settings, settingsFetched } = useSettings();

  const emailEnabled =
    settings?.emailChannelStatus === true ||
    settings?.emailChannelStatus === "true";
  const smsEnabled =
    settings?.smsChannelStatus === true ||
    settings?.smsChannelStatus === "true";
  const pushEnabled =
    settings?.pushChannelStatus === true ||
    settings?.pushChannelStatus === "true";

  if (!user || !settingsFetched) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {t("notification_preferences")}
          </h1>
          <p className="text-zinc-500 mt-1">
            {t("choose_how_you_want_to_receive_notifications")}
          </p>
        </motion.div>

        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500/60" />
            <p className="text-zinc-500 mt-3">
              {t("loading_notification_settings")}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleUpdateNotifications = async (type: string, enabled: boolean) => {
    setIsUpdating(type);
    await updateUser({
      settings: {
        ...user.settings,
        [type]: enabled,
      },
    });
    setIsUpdating(null);
  };

  const noChannelsEnabled = !emailEnabled && !smsEnabled && !pushEnabled;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          {t("notification_preferences")}
        </h1>
        <p className="text-zinc-500 mt-1">
          {t("choose_how_you_want_to_receive_notifications")}
        </p>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <Bell className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {t("communication_channels")}
              </h3>
              <p className="text-sm text-zinc-500">
                Control how you receive notifications
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {noChannelsEnabled ? (
            <div className="text-center py-8">
              <div className="p-4 rounded-full bg-zinc-800/50 inline-flex mb-4">
                <MessageSquare className="h-8 w-8 text-zinc-500" />
              </div>
              <h4 className="text-lg font-medium text-white mb-2">
                No Channels Available
              </h4>
              <p className="text-zinc-500 max-w-md mx-auto">
                Notification channels are currently not configured. Contact
                support if you need assistance.
              </p>
            </div>
          ) : (
            <>
              {emailEnabled && (
                <NotificationChannel
                  icon={Mail}
                  title={tCommon("email_notifications")}
                  description={`${t("receive_notifications_via_email_at")} ${user.email}`}
                  enabled={user.settings?.email || false}
                  onToggle={(enabled) =>
                    handleUpdateNotifications("email", enabled)
                  }
                  disabled={isUpdating === "email"}
                  color="blue"
                />
              )}

              {smsEnabled && (
                <NotificationChannel
                  icon={Phone}
                  title={tCommon("sms_notifications")}
                  description={`${t("receive_notifications_via_sms_at")} ${user.phone || "Not set"}`}
                  enabled={user.settings?.sms || false}
                  onToggle={(enabled) =>
                    handleUpdateNotifications("sms", enabled)
                  }
                  disabled={isUpdating === "sms"}
                  color="emerald"
                />
              )}

              {pushEnabled && (
                <PushNotificationChannel
                  userPushEnabled={user.settings?.push || false}
                  onToggle={(enabled) =>
                    handleUpdateNotifications("push", enabled)
                  }
                  isUpdating={isUpdating === "push"}
                />
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
            <Bell className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">
              Stay Informed
            </h4>
            <p className="text-sm text-zinc-500">
              Enable notifications to receive important updates about your
              account, security alerts, and trading activity. You can customize
              which channels to use based on your preferences.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default NotificationsTab;
