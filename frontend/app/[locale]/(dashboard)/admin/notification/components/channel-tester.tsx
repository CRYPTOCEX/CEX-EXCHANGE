"use client";

import { useState } from "react";
import { $fetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Smartphone, Inbox, Send, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useUserStore } from "@/store/user";

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
        body: "Did you see this notification popup? Click Yes or No below.",
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
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Local OS Notification Test</CardTitle>
              <CardDescription>
                Test if your browser can display notifications on this device
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This tests the local browser → OS notification pipeline. Due to browser limitations,
          we cannot automatically detect if Windows/macOS has blocked notifications for this browser.
          You'll need to confirm if you saw the test notification.
        </p>

        <Button onClick={handleTest} disabled={testing || awaitingConfirmation} className="w-full">
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending test notification...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Test Notification
            </>
          )}
        </Button>

        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.working === true
                ? "bg-green-500/10 border-green-500/20"
                : result.working === false
                ? "bg-red-500/10 border-red-500/20"
                : "bg-yellow-500/10 border-yellow-500/20"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.working === true ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              ) : result.working === false ? (
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <p className={`text-sm font-medium ${
                  result.working === true
                    ? "text-green-700 dark:text-green-400"
                    : result.working === false
                    ? "text-red-700 dark:text-red-400"
                    : "text-yellow-700 dark:text-yellow-400"
                }`}>
                  {result.working === true
                    ? "OS notifications are working!"
                    : result.working === false
                    ? "OS notifications are not working"
                    : "Did you see the notification?"}
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
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Yes, I saw it
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleConfirmation(false)}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      No, nothing appeared
                    </Button>
                  </div>
                )}

                {result.permission && !awaitingConfirmation && (
                  <Badge variant="outline" className="text-xs">
                    Permission: {result.permission}
                  </Badge>
                )}
                {result.working === false && !awaitingConfirmation && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      <strong>Windows:</strong> Settings → System → Notifications → Enable for your browser
                      <br />
                      <strong>macOS:</strong> System Preferences → Notifications → Select your browser
                      <br />
                      <strong>Also check:</strong> Focus Assist / Do Not Disturb mode
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
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      endpoint: "/api/admin/system/notification/test/in-app",
      description: "Send a test in-app notification",
      requiresUserId: true,
    },
    {
      id: "email",
      name: "Email",
      icon: Mail,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      endpoint: "/api/admin/system/notification/test/email",
      description: "Send a test email notification",
      requiresUserId: true,
      extraField: "email",
    },
    {
      id: "sms",
      name: "SMS",
      icon: MessageSquare,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      endpoint: "/api/admin/system/notification/test/sms",
      description: "Send a test SMS notification",
      requiresUserId: true,
      extraField: "phone",
    },
    {
      id: "push",
      name: "Push",
      icon: Smartphone,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      endpoint: "/api/admin/system/notification/test/push",
      description: "Send a test push notification",
      requiresUserId: true,
    },
  ];

  const handleTest = async (channel: typeof channels[0]) => {
    // Use current user if userId is empty
    const targetUserId = userId || user?.id;

    if (!targetUserId) {
      toast.error("Please log in or enter a User ID");
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
        const errorMessage = error || "Test failed";
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
      const errorMessage = err?.message || err?.error || "An unexpected error occurred";
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>Configure test parameters for all channels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  placeholder="Enter user ID or leave empty for your account"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Leave empty to use your own account</p>
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
                <p className="text-xs text-muted-foreground">Override for email test</p>
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
      </motion.div>

      {/* Channel Tests */}
      <div className="grid gap-6 md:grid-cols-2">
        {channels.map((channel, index) => (
          <motion.div
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
                  disabled={loading[channel.id]}
                >
                  {loading[channel.id] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Test {channel.name}
                    </>
                  )}
                </Button>

                {/* Test Result */}
                {testResults[channel.id] && (
                  <div
                    className={`p-4 rounded-lg border ${
                      testResults[channel.id].success
                        ? "bg-green-500/10 border-green-500/20"
                        : "bg-red-500/10 border-red-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {testResults[channel.id].success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-2">
                        <p className={`text-sm font-medium ${testResults[channel.id].success ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
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
                              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                                Delivered: {testResults[channel.id].channels!.delivered.join(", ")}
                              </Badge>
                            )}
                            {testResults[channel.id].channels!.failed.length > 0 && (
                              <Badge variant="destructive">
                                Failed: {testResults[channel.id].channels!.failed.join(", ")}
                              </Badge>
                            )}
                          </div>
                        )}
                        {/* Push-specific provider info */}
                        {channel.id === "push" && testResults[channel.id].providerInfo && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Provider Status:</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className={testResults[channel.id].providerInfo!.webPushAvailable
                                  ? "border-green-500/50 text-green-600"
                                  : "border-zinc-500/50 text-zinc-500"}
                              >
                                VAPID: {testResults[channel.id].providerInfo!.webPushAvailable ? "✓" : "✗"}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={testResults[channel.id].providerInfo!.fcmAvailable
                                  ? "border-green-500/50 text-green-600"
                                  : "border-zinc-500/50 text-zinc-500"}
                              >
                                FCM: {testResults[channel.id].providerInfo!.fcmAvailable ? "✓" : "✗"}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={testResults[channel.id].providerInfo!.userHasTokens
                                  ? "border-green-500/50 text-green-600"
                                  : "border-orange-500/50 text-orange-500"}
                              >
                                User Has Tokens: {testResults[channel.id].providerInfo!.userHasTokens ? "✓" : "✗"}
                              </Badge>
                            </div>
                            {!testResults[channel.id].providerInfo!.userHasTokens && (
                              <p className="text-xs text-orange-400 mt-2">
                                Note: The user must click "Enable" in Profile → Notifications to subscribe to push notifications.
                                Just having push: true in settings is not enough - the browser subscription must be saved.
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
          </motion.div>
        ))}
      </div>

      {/* Local OS Notification Test */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <LocalNotificationTest />
      </motion.div>

      {/* Testing Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Testing Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  <strong>User ID:</strong> Must be a valid user in your system. Leave empty to use your own
                  account.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  <strong>Email Override:</strong> Use this to test email delivery to a different address without
                  changing user data.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  <strong>Phone Override:</strong> Must be in E.164 format (e.g., +1234567890). Used for SMS
                  testing.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  <strong>In-App:</strong> Check your in-app notification panel to see the test message.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  <strong>Push:</strong> Requires either VAPID (Web Push) or FCM configured. User must have enabled
                  push notifications in their browser first (Profile → Notifications → Enable).
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
