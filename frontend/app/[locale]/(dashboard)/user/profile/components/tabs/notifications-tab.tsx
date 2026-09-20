"use client";

import { memo, useState, useEffect } from "react";
import { m } from "framer-motion";
import { Mail, Phone, Bell, MessageSquare, Loader2, AlertCircle, Send, CheckCircle2, XCircle, RefreshCw, Smartphone, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";
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

/**
 * How a tone is inked when it colours a line of copy rather than a pill. Which
 * tone a result gets is decided once, in `lib/status-tone.ts`.
 */
const TONE_TEXT: Record<BadgeTone, string> = {
  primary: "text-primary",
  secondary: "text-secondary-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
  neutral: "text-muted-foreground",
};

const colorClasses = {
  amber: {
    bg: "bg-warning/10",
    icon: "text-warning",
    activeBg: "bg-warning/20",
  },
  blue: {
    bg: "bg-primary/10",
    icon: "text-primary",
    activeBg: "bg-primary/20",
  },
  emerald: {
    bg: "bg-success/10",
    icon: "text-success",
    activeBg: "bg-success/20",
  },
  purple: {
    bg: "bg-primary/10",
    icon: "text-primary",
    activeBg: "bg-primary/20",
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
          ? "bg-muted/50 border-border-strong"
          : "bg-surface-2/50 border-border/50"
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-xl", enabled ? styles.activeBg : styles.bg)}>
          <Icon className={cn("h-5 w-5", styles.icon)} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground">{title}</h4>
            {enabled && (
              <Badge className="bg-success/10 border-success/20 text-success-ink text-xs">
                On
              </Badge>
            )}
          </div>
          <p className="text-sm text-subtle-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="data-[state=checked]:bg-warning"
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
        let errorMessage = result.error || t("failed_to_enable_push_notifications");

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
        error: err.message || tCommon("unexpected_error"),
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
        error: result.error || t("failed_to_disable_push_notifications"),
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
          message: response.data.message || t("test_notification_sent"),
        });
      } else {
        setTestState({
          sending: false,
          result: "error",
          message: response.data?.message || t("failed_to_send_test_notification"),
        });
      }
    } catch (err: any) {
      setTestState({
        sending: false,
        result: "error",
        message: err.message || t("failed_to_send_test_notification"),
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
          "bg-surface-2/50 border-border/50"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl", styles.bg)}>
            <Bell className={cn("h-5 w-5", styles.icon)} />
          </div>
          <div>
            <h4 className="font-medium text-foreground">
              {tCommon("push_notifications")}
            </h4>
            <p className="text-sm text-subtle-foreground mt-0.5">
              {t("receive_notifications_on_your_devices")}
            </p>
          </div>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-subtle-foreground" />
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
          "bg-surface-2/50 border-border/50 opacity-60"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl", styles.bg)}>
            <Bell className={cn("h-5 w-5", styles.icon)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground">
                {tCommon("push_notifications")}
              </h4>
              <Badge className="bg-muted/10 border-border/20 text-muted-foreground text-xs">
                {!details?.isSecureContext
                  ? t("https_required")
                  : details?.isIOS || details?.isAndroid
                    ? t("requires_home_screen_app")
                    : t("not_supported")}
              </Badge>
            </div>
            <p className="text-sm text-subtle-foreground mt-0.5">{notSupportedMessage}</p>
            {/* Debug info for mobile troubleshooting */}
            {(details?.isIOS || details?.isAndroid) && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  {t("debug_info")}
                </summary>
                <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                  <p>{t("device")}: {details?.isIOS ? "iOS" : "Android"}</p>
                  <p>{t("standalone")}: {details?.isStandalone ? tCommon("yes") : tCommon("no")}</p>
                  <p>{tCommon("secure")}: {details?.isSecureContext ? tCommon("yes") : tCommon("no")}</p>
                  <p>{t("serviceworker")}: {details?.hasServiceWorker ? tCommon("yes") : tCommon("no")}</p>
                  <p>{t("pushmanager")}: {details?.hasPushManager ? tCommon("yes") : tCommon("no")}</p>
                  <p>{t("notification")}: {details?.hasNotification ? tCommon("yes") : tCommon("no")}</p>
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
          "bg-surface-2/50 border-border/50"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl bg-destructive/10")}>
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {/* `bg-surface-2/50` row, not a `bg-destructive` fill. */}
              <h4 className="font-medium text-foreground">
                {tCommon("push_notifications")}
              </h4>
              <Badge className="bg-destructive/10 border-destructive/20 text-destructive-ink text-xs">
                {tCommon("blocked")}
              </Badge>
            </div>
            <p className="text-sm text-subtle-foreground mt-0.5">
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
          "bg-surface-2/50 border-border/50"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl", styles.bg)}>
            <Bell className={cn("h-5 w-5", styles.icon)} />
          </div>
          <div>
            <h4 className="font-medium text-foreground">
              {tCommon("push_notifications")}
            </h4>
            <p className="text-sm text-subtle-foreground mt-0.5">
              {t("receive_notifications_on_your_devices")}
            </p>
            {pushState.error && (
              <p className="text-sm text-destructive mt-1">{pushState.error}</p>
            )}
          </div>
        </div>
        <Button
          onClick={handleEnablePush}
          loading={isLoading}
          size="sm"
          className="bg-primary hover:bg-primary text-primary-foreground"
        >
          {!isLoading && tCommon("enable_1")}
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
            ? "bg-muted/50 border-border-strong"
            : "bg-surface-2/50 border-border/50"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl", isEnabled ? styles.activeBg : styles.bg)}>
            <Bell className={cn("h-5 w-5", styles.icon)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground">
                {tCommon("push_notifications")}
              </h4>
              {isEnabled && (
                <Badge className="bg-success/10 border-success/20 text-success-ink text-xs">
                  On
                </Badge>
              )}
            </div>
            <p className="text-sm text-subtle-foreground mt-0.5">
              {t("receive_notifications_on_your_devices")}
            </p>
            {pushState.error && (
              <p className="text-sm text-destructive mt-1">{pushState.error}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDisablePush}
            loading={isLoading}
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
          >
            {!isLoading && t("unsubscribe")}
          </Button>
          <Switch
            checked={userPushEnabled}
            onCheckedChange={onToggle}
            disabled={isLoading}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>

      {/* Test Push Notification Button */}
      {isEnabled && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg bg-muted/30 border border-border/50">
            <Button
              onClick={handleTestPush}
              loading={testState.sending}
              size="sm"
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            >
              {testState.sending ? (
                `${tCommon("sending")}…`
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
                      message: response.data.message || t("direct_push_sent"),
                    });
                  } else {
                    setTestState({
                      sending: false,
                      result: "error",
                      message: response.data?.message || response.error || t("direct_test_failed"),
                    });
                  }
                } catch (err: any) {
                  setTestState({
                    sending: false,
                    result: "error",
                    message: err.message || t("direct_test_failed"),
                  });
                }
                setTimeout(() => {
                  setTestState((prev) => ({ ...prev, result: null, message: null }));
                }, 5000);
              }}
              disabled={testState.sending}
              size="sm"
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("direct_test")}
            </Button>
            <Button
              onClick={async () => {
                try {
                  // Test local notification via service worker
                  const registration = await navigator.serviceWorker.ready;
                  await registration.showNotification("Local Test", {
                    body: t("this_notification_was_triggered_locally_if"),
                    icon: "/img/logo/android-chrome-192x192.png",
                    tag: "local-test-" + Date.now(),
                  });
                  setTestState({
                    sending: false,
                    result: "success",
                    message: t("local_notification_sent_check_your_notifications"),
                  });
                  setTimeout(() => {
                    setTestState((prev) => ({ ...prev, result: null, message: null }));
                  }, 5000);
                } catch (err: any) {
                  setTestState({
                    sending: false,
                    result: "error",
                    message: err.message || t("local_notification_failed"),
                  });
                  setTimeout(() => {
                    setTestState((prev) => ({ ...prev, result: null, message: null }));
                  }, 5000);
                }
              }}
              size="sm"
              variant="outline"
              className="border-border-strong text-muted-foreground hover:bg-muted hover:text-muted-foreground"
            >
              <Bell className="h-4 w-4 mr-2" />
              Test (Local)
            </Button>
            {testState.result && (
              <div
                className={cn(
                  "flex items-center gap-2 text-sm",
                  TONE_TEXT[statusTone(testState.result)]
                )}
              >
                {testState.result === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span>{testState.message}</span>
              </div>
            )}
            {!testState.result && !testState.sending && (
              <span className="text-xs text-subtle-foreground">
                {t("server_full_flow_direct_simple_push")}
              </span>
            )}
          </div>

          {/* Mobile Troubleshooting Tips */}
          {details?.isAndroid && (
            <details className="px-4 py-3 rounded-lg bg-warning/5 border border-warning/20">
              <summary className="flex items-center gap-2 text-sm font-medium text-warning cursor-pointer">
                <Smartphone className="h-4 w-4" />
                {t("not_receiving_notifications_on_mobile")}
              </summary>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p className="font-medium text-muted-foreground">{t("android_troubleshooting")}:</p>
                <ol className="list-decimal list-inside space-y-1.5 ml-1">
                  <li>
                    <span className="font-medium">{t("disable_battery_optimization")}:</span>
                    <br />
                    <span className="text-subtle-foreground ml-4">{t("settings_apps_chrome_battery_unrestricted")}</span>
                  </li>
                  <li>
                    <span className="font-medium">{t("check_notification_settings")}:</span>
                    <br />
                    <span className="text-subtle-foreground ml-4">{t("settings_apps_chrome_notifications_enable_all")}</span>
                  </li>
                  <li>
                    <span className="font-medium">{t("for_pwa_home_screen_app")}:</span>
                    <br />
                    <span className="text-subtle-foreground ml-4">{t("settings_apps_your_app_name_notifications_enable")}</span>
                  </li>
                  <li>
                    <span className="font-medium">{t("re_subscribe")}:</span>
                    <br />
                    <span className="text-subtle-foreground ml-4">{t("click_unsubscribe_above_then_enable_again")}</span>
                  </li>
                  <li>
                    <span className="font-medium">{t("clear_app_data")}:</span>
                    <br />
                    <span className="text-subtle-foreground ml-4">{t("uninstall_the_pwa_clear_chrome_site_data_reinstall")}</span>
                  </li>
                </ol>
                <div className="mt-3 p-2 rounded bg-muted/50 text-muted-foreground">
                  <Info className="h-3 w-3 inline mr-1" />
                  {t("some_android_manufacturers_samsung_xiaomi_huawei")}
                </div>
              </div>
            </details>
          )}

          {details?.isIOS && (
            <details className="px-4 py-3 rounded-lg bg-warning/5 border border-warning/20">
              <summary className="flex items-center gap-2 text-sm font-medium text-warning cursor-pointer">
                <Smartphone className="h-4 w-4" />
                {t("not_receiving_notifications_on_ios")}
              </summary>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p className="font-medium text-muted-foreground">{t("ios_troubleshooting")}:</p>
                <ol className="list-decimal list-inside space-y-1.5 ml-1">
                  <li>
                    <span className="font-medium">{t("ensure_ios_16_4")}:</span>
                    <br />
                    <span className="text-subtle-foreground ml-4">{t("web_push_requires_ios_16_4_or_later")}</span>
                  </li>
                  <li>
                    <span className="font-medium">{t("must_be_installed_as_pwa")}:</span>
                    <br />
                    <span className="text-subtle-foreground ml-4">{t("safari_share_add_to_home_screen")}</span>
                  </li>
                  <li>
                    <span className="font-medium">{t("check_notification_settings")}:</span>
                    <br />
                    <span className="text-subtle-foreground ml-4">{t("settings_app_name_notifications_allow")}</span>
                  </li>
                  <li>
                    <span className="font-medium">{t("check_focus_mode")}:</span>
                    <br />
                    <span className="text-subtle-foreground ml-4">{t("ensure_focus_do_not_disturb_isnt")}</span>
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
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {tCommon("notification_preferences")}
          </h1>
          <p className="text-subtle-foreground mt-1">
            {t("choose_how_you_want_to_receive_notifications")}
          </p>
        </m.div>

        <div className="rounded-2xl bg-surface-2/50 border border-border/50 p-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-warning/60" />
            <p className="text-subtle-foreground mt-3">
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
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          {tCommon("notification_preferences")}
        </h1>
        <p className="text-subtle-foreground mt-1">
          {t("choose_how_you_want_to_receive_notifications")}
        </p>
      </m.div>

      {/* Main Card */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-surface-2/50 border border-border/50 overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-warning/10">
              <Bell className="h-5 w-5 text-warning" />
            </div>
            <div>
              {/* The ground is the neutral `bg-surface-2/50` card, not a warning
                  fill — only the icon tile beside it is warning-tinted. As
                  --warning-foreground (white in light mode) this card title was
                  invisible on every light theme. */}
              <h3 className="text-lg font-semibold text-foreground">
                {t("communication_channels")}
              </h3>
              <p className="text-sm text-subtle-foreground">
                {t("control_how_you_receive_notifications")}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {noChannelsEnabled ? (
            <div className="text-center py-8">
              <div className="p-4 rounded-full bg-muted/50 inline-flex mb-4">
                <MessageSquare className="h-8 w-8 text-subtle-foreground" />
              </div>
              <h4 className="text-lg font-medium text-foreground mb-2">
                {t("no_channels_available")}
              </h4>
              <p className="text-subtle-foreground max-w-md mx-auto">
                {t("notification_channels_are_currently_not_configured")}
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
                  description={`${t("receive_notifications_via_sms_at")} ${user.phone || tCommon("not_set")}`}
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
      </m.div>

      {/* Info Card */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl bg-warning/5 border border-warning/10 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/10 shrink-0">
            <Bell className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-warning-ink mb-1">
              {t("stay_informed")}
            </h4>
            <p className="text-sm text-subtle-foreground">
              {t("enable_notifications_to_receive_important_updates")}
            </p>
          </div>
        </div>
      </m.div>
    </div>
  );
}

export default NotificationsTab;
