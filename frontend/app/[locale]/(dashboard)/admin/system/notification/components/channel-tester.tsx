"use client";

import { useState } from "react";
import { $fetch } from "@/lib/api";
import { m } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Smartphone, Inbox, Send, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";

interface TestResult {
  success: boolean;
  message: string;
  notificationId?: string;
  delivered: boolean;
  error?: string;
  channels?: {
    delivered: string[];
    failed: string[];
  };
  providerInfo?: {
    fcmAvailable?: boolean;
    webPushAvailable?: boolean;
    userHasTokens?: boolean;
  };
  errors?: Record<string, string>;
}

// Local OS Notification Test Component
function LocalNotificationTest() {
  const t = useTranslations("dashboard_admin");
  const [testing, setTesting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [result, setResult] = useState<{
    tested: boolean;
    working: boolean | null; // null = awaiting user confirmation
    reason?: string;
    permission?: string;
  } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    setAwaitingConfirmation(false);

    try {
      // Check if notifications are supported
      if (typeof window === "undefined" || !("Notification" in window)) {
        setResult({
          tested: true,
          working: false,
          reason: "Notifications are not supported in this browser",
        });
        setTesting(false);
        return;
      }

      // Check permission
      const permission = Notification.permission;
      if (permission === "denied") {
        setResult({
          tested: true,
          working: false,
          reason: "Notification permission was denied. Reset in browser settings.",
          permission,
        });
        setTesting(false);
        return;
      }

      // Request permission if needed
      if (permission === "default") {
        const newPermission = await Notification.requestPermission();
        if (newPermission !== "granted") {
          setResult({
            tested: true,
            working: false,
            reason: "Notification permission was not granted",
            permission: newPermission,
          });
          setTesting(false);
          return;
        }
      }

      // Create a VISIBLE test notification
      const notification = new Notification("🔔 OS Notification Test", {
        body: t("did_you_see_this_notification_popup"),
        icon: "/icon-192x192.png",
        tag: "admin-os-test-" + Date.now(),
        requireInteraction: false,
      });

      notification.onclick = () => {
        notification.close();
      };

      // Auto-close after 8 seconds
      setTimeout(() => {
        notification.close();
      }, 8000);

      notification.onerror = () => {
        setResult({
          tested: true,
          working: false,
          reason: "Notification failed - check OS notification settings",
          permission: "granted",
        });
        setTesting(false);
      };

      // After sending, ask for user confirmation
      setTimeout(() => {
        setAwaitingConfirmation(true);
        setResult({
          tested: true,
          working: null, // Awaiting user confirmation
          reason: "A test notification was sent. Did you see a popup appear?",
          permission: "granted",
        });
        setTesting(false);
      }, 500);
    } catch (error: any) {
      setResult({
        tested: true,
        working: false,
        reason: error.message || "Failed to test notifications",
      });
      setTesting(false);
    }
  };

  const handleConfirmation = (sawNotification: boolean) => {
    setAwaitingConfirmation(false);
    setResult({
      tested: true,
      working: sawNotification,
      reason: sawNotification
        ? "Great! OS notifications are working correctly."
        : "Notifications are blocked at the OS level. Check your system settings.",
      permission: "granted",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("local_os_notification_test")}</CardTitle>
              <CardDescription>
                {t("test_if_your_browser_can_display")}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("this_tests_the_local_browser_os")}
        </p>

        <Button onClick={handleTest} loading={testing} disabled={awaitingConfirmation} className="w-full">
          {testing ? (
            <>{t("sending_test_notification")}…</>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {t("send_test_notification")}
            </>
          )}
        </Button>

        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.working === true
                ? "bg-success/10 border-success/20"
                : result.working === false
                ? "bg-destructive/10 border-destructive/20"
                : "bg-warning/10 border-warning/20"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.working === true ? (
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              ) : result.working === false ? (
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <p className={`text-sm font-medium ${
                  result.working === true
                    ? "text-success"
                    : result.working === false
                    ? "text-destructive"
                    : "text-warning"
                }`}>
                  {result.working === true
                    ? t("os_notifications_are_working")
                    : result.working === false
                    ? t("os_notifications_are_not_working")
                    : t("did_you_see_the_notification")}
                </p>
                {result.reason && (
                  <p className="text-xs text-muted-foreground">{result.reason}</p>
                )}

                {/* User confirmation buttons */}
                {awaitingConfirmation && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleConfirmation(true)}
                      className="bg-success hover:bg-success"
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      {t("yes_i_saw_it")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleConfirmation(false)}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      {t("no_nothing_appeared")}
                    </Button>
                  </div>
                )}

                {result.permission && !awaitingConfirmation && (
                  <Badge variant="outline" className="text-xs">
                    {t("permission")}: {result.permission}
                  </Badge>
                )}
                {result.working === false && !awaitingConfirmation && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      <strong>Windows:</strong> {t("settings_system_notifications_enable_for_your")}
                      <br />
                      <strong>macOS:</strong> {t("system_preferences_notifications_select_your_brows")}
                      <br />
                      <strong>{t("also_check")}:</strong> {t("focus_assist_do_not_disturb_mode")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ChannelTester() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const { user } = useUserStore();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const channels = [
    {
      id: "in-app",
      name: "In-App",
      icon: Inbox,
      color: "text-primary",
      bgColor: "bg-primary/10",
      endpoint: "/api/admin/system/notification/test/in-app",
      description: t("send_a_test_in_app_notification"),
      requiresUserId: true,
    },
    {
      id: "email",
      name: "Email",
      icon: Mail,
      color: "text-success",
      bgColor: "bg-success/10",
      endpoint: "/api/admin/system/notification/test/email",
      description: t("send_a_test_email_notification"),
      requiresUserId: true,
      extraField: "email",
    },
    {
      id: "sms",
      name: "SMS",
      icon: MessageSquare,
      color: "text-warning",
      bgColor: "bg-warning/10",
      endpoint: "/api/admin/system/notification/test/sms",
      description: t("send_a_test_sms_notification"),
      requiresUserId: true,
      extraField: "phone",
    },
    {
      id: "push",
      name: "Push",
      icon: Smartphone,
      color: "text-primary",
      bgColor: "bg-primary/10",
      endpoint: "/api/admin/system/notification/test/push",
      description: t("send_a_test_push_notification"),
      requiresUserId: true,
    },
  ];

  const handleTest = async (channel: typeof channels[0]) => {
    // Use current user if userId is empty
    const targetUserId = userId || user?.id;

    if (!targetUserId) {
      toast.error(t("please_log_in_or_enter_a_user_id"));
      return;
    }

    setLoading((prev) => ({ ...prev, [channel.id]: true }));

    try {
      const body: any = { userId: targetUserId };
      if (channel.extraField === "email" && email) {
        body.email = email;
      }
      if (channel.extraField === "phone" && phone) {
        body.phone = phone;
      }

      const { data, error } = await $fetch({
        url: channel.endpoint,
        method: "POST",
        body,
        silent: true,
      });

      if (error) {
        const errorMessage = error || t("test_failed");
        setTestResults((prev) => ({
          ...prev,
          [channel.id]: {
            success: false,
            message: errorMessage,
            delivered: false,
            error: errorMessage,
          },
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          [channel.id]: data,
        }));
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.error || tCommon("unexpected_error");
      console.error(`${channel.name} test error:`, err);
      setTestResults((prev) => ({
        ...prev,
        [channel.id]: {
          success: false,
          message: errorMessage,
          delivered: false,
          error: errorMessage,
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [channel.id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Configuration */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("test_configuration")}</CardTitle>
            <CardDescription>{t("configure_test_parameters_for_all_channels")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="userId">{tCommon("user_id")}</Label>
                <Input
                  id="userId"
                  placeholder={t("enter_user_id_or_leave_empty_for_your_account")}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("leave_empty_to_use_your_own_account")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="test@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("override_for_email_test")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Override for SMS test (E.164 format)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </m.div>

      {/* Channel Tests */}
      <div className="grid gap-6 md:grid-cols-2">
        {channels.map((channel, index) => (
          <m.div
            key={channel.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${channel.bgColor}`}>
                      <channel.icon className={`h-5 w-5 ${channel.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{channel.name}</CardTitle>
                      <CardDescription>{channel.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Test Button */}
                <Button
                  className="w-full"
                  onClick={() => handleTest(channel)}
                  loading={loading[channel.id]}
                >
                  {loading[channel.id] ? (
                    <>{tCommon("sending")}…</>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {t("send_test")} {channel.name}
                    </>
                  )}
                </Button>

                {/* Test Result */}
                {testResults[channel.id] && (
                  <div
                    className={`p-4 rounded-lg border ${
                      testResults[channel.id].success
                        ? "bg-success/10 border-success/20"
                        : "bg-destructive/10 border-destructive/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {testResults[channel.id].success ? (
                        <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                      )}
                      <div className="flex-1 space-y-2">
                        <p className={`text-sm font-medium ${testResults[channel.id].success ? "text-success" : "text-destructive"}`}>
                          {testResults[channel.id].message}
                        </p>
                        {testResults[channel.id].notificationId && (
                          <p className="text-xs text-muted-foreground">
                            ID: {testResults[channel.id].notificationId}
                          </p>
                        )}
                        {testResults[channel.id].channels && (
                          <div className="flex gap-2 mt-2">
                            {testResults[channel.id].channels!.delivered.length > 0 && (
                              <Badge className="bg-success/10 text-success-ink hover:bg-success/15">
                                {tCommon("delivered")}: {testResults[channel.id].channels!.delivered.join(", ")}
                              </Badge>
                            )}
                            {testResults[channel.id].channels!.failed.length > 0 && (
                              <Badge variant="destructive">
                                {tCommon("failed")}: {testResults[channel.id].channels!.failed.join(", ")}
                              </Badge>
                            )}
                          </div>
                        )}
                        {/* Push-specific provider info */}
                        {channel.id === "push" && testResults[channel.id].providerInfo && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-2">{t("provider_status")}:</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className={testResults[channel.id].providerInfo!.webPushAvailable
                                  ? "border-success/50 text-success"
                                  : "border-border/50 text-subtle-foreground"}
                              >
                                {t("vapid")}: {testResults[channel.id].providerInfo!.webPushAvailable ? "✓" : "✗"}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={testResults[channel.id].providerInfo!.fcmAvailable
                                  ? "border-success/50 text-success"
                                  : "border-border/50 text-subtle-foreground"}
                              >
                                {t("fcm")}: {testResults[channel.id].providerInfo!.fcmAvailable ? "✓" : "✗"}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={testResults[channel.id].providerInfo!.userHasTokens
                                  ? "border-success/50 text-success"
                                  : "border-warning/50 text-warning"}
                              >
                                {t("user_has_tokens")}: {testResults[channel.id].providerInfo!.userHasTokens ? "✓" : "✗"}
                              </Badge>
                            </div>
                            {!testResults[channel.id].providerInfo!.userHasTokens && (
                              <p className="text-xs text-warning mt-2">
                                {tCommon("note")}:: {t("the_user_must_click_enable_in")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </m.div>
        ))}
      </div>

      {/* Local OS Notification Test */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <LocalNotificationTest />
      </m.div>

      {/* Testing Tips */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("testing_tips")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  <strong>{tCommon("user_id")}:</strong> {t("must_be_a_valid_user_in")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  <strong>{t("email_override")}:</strong> {t("use_this_to_test_email_delivery")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  <strong>{t("phone_override")}:</strong> {t("must_be_in_e_164_format")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  <strong>{t("in_app")}:</strong> {t("check_your_in_app_notification_panel")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  <strong>{t("push")}:</strong> {t("requires_either_vapid_web_push_or")}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </m.div>
    </div>
  );
}
