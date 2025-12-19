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
import { useSystemUpdateStore } from "@/store/update";
import { useTranslations } from "next-intl";

export function LicenseVerification() {
  const t = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const [purchaseCode, setPurchaseCode] = useState("");
  const [envatoUsername, setEnvatoUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { activateLicense } = useSystemUpdateStore();

  const handleActivateLicense = async () => {
    setIsSubmitting(true);
    await activateLicense(purchaseCode, envatoUsername);
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
        <div className="space-y-2">
          <label htmlFor="purchase-code" className="text-sm font-medium">
            {tDashboardAdmin("purchase_code")}
          </label>
          <Input
            id="purchase-code"
            value={purchaseCode}
            onChange={(e) => setPurchaseCode(e.target.value)}
            placeholder={t("enter_your_purchase_code")}
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
          />
        </div>
        <Button
          color="default"
          className="w-full"
          onClick={handleActivateLicense}
          disabled={isSubmitting}
          aria-disabled={isSubmitting}
        >
          {isSubmitting ? "Activating..." : "Activate License"}
        </Button>
      </CardContent>
    </Card>
  );
}
