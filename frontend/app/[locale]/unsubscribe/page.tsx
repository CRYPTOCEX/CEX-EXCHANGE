"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import {
  AlertTriangle,
  Mail,
  MessageSquare,
  Bell,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { $fetch } from "@/lib/api";

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

export default function UnsubscribePage() {
  const t = useTranslations("common");
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    sms: true,
    push: true,
  });

  useEffect(() => {
    const unsubscribeToken = searchParams?.get("token");

    if (unsubscribeToken) {
      setToken(unsubscribeToken);
      fetchPreferences(unsubscribeToken);
    } else {
      setToken(null);
      setLoading(false);
    }
  }, [searchParams]);

  const fetchPreferences = async (tokenValue: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await $fetch({
        url: `/api/user/unsubscribe?token=${encodeURIComponent(tokenValue)}`,
        method: "GET",
        silent: true,
      });

      if (fetchError) {
        setError(fetchError.message || t("invalid_or_expired_token"));
        setToken(null);
      } else if (data) {
        setPreferences({
          email: data.email ?? true,
          sms: data.sms ?? true,
          push: data.push ?? true,
        });
      }
    } catch (err: any) {
      setError(err.message || t("failed_to_load_preferences"));
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;

    setSaving(true);
    setError(null);
    try {
      const { data, error: saveError } = await $fetch({
        url: `/api/user/unsubscribe?token=${encodeURIComponent(token)}`,
        method: "POST",
        body: preferences,
        silent: true,
      });

      if (saveError) {
        setError(saveError.message || t("failed_to_save_preferences"));
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || t("failed_to_save_preferences"));
    } finally {
      setSaving(false);
    }
  };

  const handleUnsubscribeAll = async () => {
    if (!token) return;

    const newPreferences = { email: false, sms: false, push: false };
    setPreferences(newPreferences);

    setSaving(true);
    setError(null);
    try {
      const { data, error: saveError } = await $fetch({
        url: `/api/user/unsubscribe?token=${encodeURIComponent(token)}`,
        method: "POST",
        body: newPreferences,
        silent: true,
      });

      if (saveError) {
        setError(saveError.message || t("failed_to_save_preferences"));
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || t("failed_to_save_preferences"));
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/50 to-muted/30 p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  // No token provided
  if (token === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/50 to-muted/30 p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="space-y-2">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-amber-500" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-amber-500">
              {t("invalid_unsubscribe_link")}
            </h1>
            <p className="text-muted-foreground">
              {error || t("the_unsubscribe_link_is_invalid")}
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t("please_use_the_link_from")}
              </p>
            </div>
          </div>

          <Link href="/">
            <Button variant="outline" className="w-full py-6 px-8">
              {t("return_to_home")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/50 to-muted/30 p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="space-y-2">
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-500">
              {t("preferences_updated")}
            </h1>
            <p className="text-muted-foreground">
              {t("your_notification_preferences_have")}
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span>{t("email_notifications")}</span>
              </div>
              <span
                className={
                  preferences.email ? "text-green-500" : "text-muted-foreground"
                }
              >
                {preferences.email ? t("enabled") : t("disabled")}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <span>{t("sms_notifications")}</span>
              </div>
              <span
                className={
                  preferences.sms ? "text-green-500" : "text-muted-foreground"
                }
              >
                {preferences.sms ? t("enabled") : t("disabled")}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span>{t("push_notifications")}</span>
              </div>
              <span
                className={
                  preferences.push ? "text-green-500" : "text-muted-foreground"
                }
              >
                {preferences.push ? t("enabled") : t("disabled")}
              </span>
            </div>
          </div>

          <Link href="/">
            <Button variant="outline" className="w-full py-6 px-8">
              {t("return_to_home")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Preferences form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/50 to-muted/30 p-4">
      <div className="max-w-md w-full">
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <Mail className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                {t("notification_preferences")}
              </h1>
              <p className="text-muted-foreground">
                {t("manage_how_you_receive_notifications")}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <Label
                    htmlFor="email-notifications"
                    className="text-base cursor-pointer"
                  >
                    {t("email_notifications")}
                  </Label>
                </div>
                <Switch
                  id="email-notifications"
                  checked={preferences.email}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, email: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <Label
                    htmlFor="sms-notifications"
                    className="text-base cursor-pointer"
                  >
                    {t("sms_notifications")}
                  </Label>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={preferences.sms}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, sms: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <Label
                    htmlFor="push-notifications"
                    className="text-base cursor-pointer"
                  >
                    {t("push_notifications")}
                  </Label>
                </div>
                <Switch
                  id="push-notifications"
                  checked={preferences.push}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, push: checked }))
                  }
                />
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-6 px-8 relative overflow-hidden transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  t("save_preferences")
                )}
              </Button>

              <Button
                onClick={handleUnsubscribeAll}
                disabled={saving}
                variant="outline"
                className="w-full py-6 px-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {t("unsubscribe_from_all")}
              </Button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/">
            <Button
              variant="link"
              className="p-0 h-auto text-sm text-muted-foreground hover:text-primary"
            >
              {t("return_to_home")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
