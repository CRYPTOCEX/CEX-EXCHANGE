"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useExtensionStore } from "@/store/extension";
import { useTranslations } from "next-intl";
import { Loader2, Mail } from "lucide-react";

export function LicenseVerification() {
  const t = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const [purchaseCode, setPurchaseCode] = useState("");
  const [envatoUsername, setEnvatoUsername] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { activateLicense, error } = useExtensionStore();

  const handleActivateLicense = async () => {
    if (!purchaseCode.trim() || !envatoUsername.trim()) {
      return;
    }

    setIsSubmitting(true);
    await activateLicense(purchaseCode, envatoUsername, notificationEmail.trim() || undefined);
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("license_verification")}</CardTitle>
        <CardDescription>
          {t("please_enter_your_your_license")}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="purchase-code" className="text-sm font-medium">
            {tDashboardAdmin("purchase_code")}
          </label>
          <Input
            id="purchase-code"
            value={purchaseCode}
            onChange={(e) => setPurchaseCode(e.target.value)}
            placeholder={t("enter_your_purchase_code")}
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="envato-username" className="text-sm font-medium">
            {tDashboardAdmin("envato_username")}
          </label>
          <Input
            id="envato-username"
            value={envatoUsername}
            onChange={(e) => setEnvatoUsername(e.target.value)}
            placeholder={t("enter_your_envato_username")}
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="notification-email" className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {tDashboardAdmin("notification_email")}
            <span className="text-xs text-muted-foreground font-normal">({t("optional")})</span>
          </label>
          <Input
            id="notification-email"
            type="email"
            value={notificationEmail}
            onChange={(e) => setNotificationEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            {tDashboardAdmin("receive_update_notifications")}
          </p>
        </div>
        <Button
          className="w-full"
          onClick={handleActivateLicense}
          disabled={isSubmitting || !purchaseCode.trim() || !envatoUsername.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('enable')}...
            </>
          ) : (
            t("activate_license")
          )}
        </Button>
      </CardContent>
    </Card>
  );
} 