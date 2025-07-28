"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  MessageSquare,
  AlertCircle,
  Bell,
  Mail,
  Smartphone,
  Globe,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

export function NotificationsSettings() {
  const t = useTranslations("dashboard");
  const { toast } = useToast();
  const [emailSettings, setEmailSettings] = useState({
    investment: true,
    message: true,
    alert: true,
    system: false,
    digest: true,
  });

  const [pushSettings, setPushSettings] = useState({
    investment: true,
    message: true,
    alert: true,
    system: true,
    digest: false,
  });

  const [webSettings, setWebSettings] = useState({
    investment: true,
    message: true,
    alert: true,
    system: true,
    digest: false,
  });

  const handleSaveSettings = () => {
    // In a real app, this would save to an API
    toast({
      title: "Settings saved",
      description: "Your notification preferences have been updated.",
    });
  };

  return (
    <div className="space-y-6">
        <Tabs defaultValue="email">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t("Email")}
            </TabsTrigger>
            <TabsTrigger
              value="push"
              className="flex items-center gap-2"
              disabled
            >
              <Smartphone className="h-4 w-4" />
              {t("Push")}
            </TabsTrigger>
            <TabsTrigger
              value="web"
              className="flex items-center gap-2"
              disabled
            >
              <Globe className="h-4 w-4" />
              {t("Web")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {t("investment_notifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("receive_emails_about_your_tokens")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailSettings.investment}
                  onCheckedChange={(checked) =>
                    setEmailSettings({ ...emailSettings, investment: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {t("message_notifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("receive_emails_when_someone_sends_you_a_message")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailSettings.message}
                  onCheckedChange={(checked) =>
                    setEmailSettings({ ...emailSettings, message: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {t("alert_notifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("receive_emails_about_important_alerts_and_updates")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailSettings.alert}
                  onCheckedChange={(checked) =>
                    setEmailSettings({ ...emailSettings, alert: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-gray-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {t("system_notifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("receive_emails_about_and_maintenance")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailSettings.system}
                  onCheckedChange={(checked) =>
                    setEmailSettings({ ...emailSettings, system: checked })
                  }
                />
              </div>

              {/* <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Daily Digest</p>
                    <p className="text-xs text-muted-foreground">
                      Receive a daily summary of all your notifications
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailSettings.digest}
                  onCheckedChange={(checked) =>
                    setEmailSettings({ ...emailSettings, digest: checked })
                  }
                />
              </div> */}
            </div>
          </TabsContent>

          <TabsContent value="push" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {t("investment_notifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("receive_push_notifications_about_new_investments")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={pushSettings.investment}
                  onCheckedChange={(checked) =>
                    setPushSettings({ ...pushSettings, investment: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {t("message_notifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("receive_push_notifications_for_new_messages")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={pushSettings.message}
                  onCheckedChange={(checked) =>
                    setPushSettings({ ...pushSettings, message: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {t("alert_notifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("receive_push_notifications_for_important_alerts")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={pushSettings.alert}
                  onCheckedChange={(checked) =>
                    setPushSettings({ ...pushSettings, alert: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-gray-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {t("system_notifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("receive_push_notifications_for_system_updates")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={pushSettings.system}
                  onCheckedChange={(checked) =>
                    setPushSettings({ ...pushSettings, system: checked })
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="web" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {t("investment_notifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("show_in-app_notifications_for_new_investments")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={webSettings.investment}
                  onCheckedChange={(checked) =>
                    setWebSettings({ ...webSettings, investment: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {t("message_notifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("show_in-app_notifications_for_new_messages")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={webSettings.message}
                  onCheckedChange={(checked) =>
                    setWebSettings({ ...webSettings, message: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {t("alert_notifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("show_in-app_notifications_for_important_alerts")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={webSettings.alert}
                  onCheckedChange={(checked) =>
                    setWebSettings({ ...webSettings, alert: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-gray-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {t("system_notifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("show_in-app_notifications_for_system_updates")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={webSettings.system}
                  onCheckedChange={(checked) =>
                    setWebSettings({ ...webSettings, system: checked })
                  }
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSaveSettings} className="gap-2">
          <Save className="h-4 w-4" />
          {t("save_preferences")}
        </Button>
      </div>
    </div>
  );
}
