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
import { Loader2 } from "lucide-react";

export function LicenseVerification() {
  const t = useTranslations("dashboard");
  const [purchaseCode, setPurchaseCode] = useState("");
  const [envatoUsername, setEnvatoUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { activateLicense, error } = useExtensionStore();

  const handleActivateLicense = async () => {
    if (!purchaseCode.trim() || !envatoUsername.trim()) {
      return;
    }

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
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="purchase-code" className="text-sm font-medium">
            {t("purchase_code")}
          </label>
          <Input
            id="purchase-code"
            value={purchaseCode}
            onChange={(e) => setPurchaseCode(e.target.value)}
            placeholder="Enter your purchase code"
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="envato-username" className="text-sm font-medium">
            {t("envato_username")}
          </label>
          <Input
            id="envato-username"
            value={envatoUsername}
            onChange={(e) => setEnvatoUsername(e.target.value)}
            placeholder="Enter your Envato username"
            disabled={isSubmitting}
          />
        </div>
        <Button
          className="w-full"
          onClick={handleActivateLicense}
          disabled={isSubmitting || !purchaseCode.trim() || !envatoUsername.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("Activating")}...
            </>
          ) : (
            t("activate_license")
          )}
        </Button>
      </CardContent>
    </Card>
  );
} 