"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Mail, Phone, Bell } from "lucide-react";
import { useUserStore } from "@/store/user";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function NotificationsTab() {
  const t = useTranslations("dashboard");
  const { user, updateUser } = useUserStore();
  const [isUpdating, setIsUpdating] = useState(false);

  // If profile is undefined, show a loading state
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold dark:text-zinc-100">
            {t("notification_preferences")}
          </h2>
        </div>
        <Card className="bg-white dark:bg-zinc-900 border-0 dark:border-zinc-800 shadow-sm">
          <CardHeader>
            <CardTitle className="dark:text-zinc-100">
              {t("communication_channels")}
            </CardTitle>
            <CardDescription className="dark:text-zinc-400">
              {t("loading_notification_preferences")}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground dark:text-zinc-400">
                {t("loading_notification_settings")}.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUpdateNotifications = async (type: string, enabled: boolean) => {
    setIsUpdating(true);
    await updateUser({
      settings: {
        ...user.settings,
        [type]: enabled,
      },
    });
    setIsUpdating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-zinc-100">
          {t("notification_preferences")}
        </h2>
      </div>

      <Card className="bg-white dark:bg-zinc-900 border-0 dark:border-zinc-800 shadow-sm">
        <CardHeader>
          <CardTitle className="dark:text-zinc-100">
            {t("communication_channels")}
          </CardTitle>
          <CardDescription className="dark:text-zinc-400">
            {t("choose_how_you_want_to_receive_notifications")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-950 p-2 rounded-full">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium dark:text-zinc-100">
                    {t("email_notifications")}
                  </div>
                  <div className="text-sm text-muted-foreground dark:text-zinc-400">
                    {t("receive_notifications_via_email_at")}
                    {user.email}
                  </div>
                </div>
              </div>
              <Switch
                checked={user.settings?.email || false}
                onCheckedChange={(checked) =>
                  handleUpdateNotifications("email", checked)
                }
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
              <div className="flex items-start gap-3">
                <div className="bg-green-100 dark:bg-green-950 p-2 rounded-full">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="font-medium dark:text-zinc-100">
                    {t("sms_notifications")}
                  </div>
                  <div className="text-sm text-muted-foreground dark:text-zinc-400">
                    {t("receive_notifications_via_sms_at")}
                    {user.phone || "Not set"}
                  </div>
                </div>
              </div>
              <Switch
                checked={user.settings?.sms || false}
                onCheckedChange={(checked) =>
                  handleUpdateNotifications("sms", checked)
                }
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 dark:bg-purple-950 p-2 rounded-full">
                  <Bell className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium dark:text-zinc-100">
                    {t("push_notifications")}
                  </div>
                  <div className="text-sm text-muted-foreground dark:text-zinc-400">
                    {t("receive_notifications_on_your_devices")}
                  </div>
                </div>
              </div>
              <Switch
                checked={user.settings?.push || false}
                onCheckedChange={(checked) =>
                  handleUpdateNotifications("push", checked)
                }
                disabled={isUpdating}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
