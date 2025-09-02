"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, InfoIcon } from "lucide-react";
import { toast } from "sonner";
import InvestmentLimitsSection from "./investment-limits-section";
import PlatformFeesSection from "./platform-fees-section";
import PlatformFeaturesSection from "./platform-features-section";
import AnnouncementSection from "./announcement-section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useConfigStore } from "@/store/config";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

export default function PlatformSettingsConfiguration() {
  const t = useTranslations("ext");
  const { settings, setSettings } = useConfigStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sync local settings with the store and immediately disable loading.
  useEffect(() => {
    setLocalSettings(settings);
    setLoading(false);
  }, [settings]);

  // Handler to update local settings state.
  const handleUpdateSettings = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Save updated settings via API and update the global store.
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updatedSettings = { ...localSettings };
      const { error } = await $fetch({
        url: "/api/admin/system/settings",
        method: "PUT",
        body: updatedSettings,
      });
      if (!error) {
        // Merge with existing settings to avoid overwriting other extensions' settings
        const mergedSettings = { ...settings, ...updatedSettings };
        setSettings(mergedSettings);
        setLocalSettings(mergedSettings);
        toast("Success", {
          description: "Platform settings saved successfully",
        });
      } else {
        throw new Error("API error");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast("Error", {
        description: "Failed to save platform settings",
        icon: <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>{t("important_note")}</AlertTitle>
        <AlertDescription>
          {t("some_settings_like_launch_plans")}.{" "}
          {t("configure_these_limits_in_the_launch_plans_tab")}.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{t("platform_settings")}</CardTitle>
          <CardDescription>
            {t("configure_global_platform_settings_and_limits")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="investment">
            <TabsList className="mb-4">
              <TabsTrigger value="investment">
                {t("investment_limits")}
              </TabsTrigger>
              <TabsTrigger value="fees">{t("platform_fees")}</TabsTrigger>
              <TabsTrigger value="features">{t("Features")}</TabsTrigger>
              <TabsTrigger value="announcement">
                {t("Announcement")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="investment">
              <InvestmentLimitsSection
                minAmount={localSettings["icoMinInvestmentAmount"]}
                maxAmount={localSettings["icoMaxInvestmentAmount"]}
                onUpdate={handleUpdateSettings}
              />
            </TabsContent>

            <TabsContent value="fees">
              <PlatformFeesSection
                feePercentage={localSettings["icoPlatformFeePercentage"]}
                onUpdate={handleUpdateSettings}
              />
            </TabsContent>

            <TabsContent value="features">
              <PlatformFeaturesSection
                kycRequired={localSettings["icoKycRequired"]}
                maintenanceMode={localSettings["icoMaintenanceMode"]}
                allowPublicOfferings={localSettings["icoAllowPublicOfferings"]}
                onUpdate={handleUpdateSettings}
              />
            </TabsContent>

            <TabsContent value="announcement">
              <AnnouncementSection
                message={localSettings["icoAnnouncementMessage"]}
                isActive={localSettings["icoAnnouncementActive"]}
                onUpdate={handleUpdateSettings}
              />
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("save_settings")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
