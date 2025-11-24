"use client";

import { useState, useEffect } from "react";
import { useConfigStore } from "@/store/config";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StakingPlatformSettingsSection from "./components/platform";
import StakingEarningsSettingsSection from "./components/earning";
import { useTranslations } from "next-intl";

export default function StakingSettingsConfiguration() {
  const t = useTranslations("ext");
  const { settings, setSettings } = useConfigStore();
  // settings is a flat object with keys like "stakingDefaultAdminFee", etc.
  const [localSettings, setLocalSettings] = useState(settings || {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    setLocalSettings(settings || {});
    setLoading(false);
  }, [settings]);

  // Extract a platform settings object from the flat settings.
  const platformSettings = {
    DefaultAdminFee: localSettings.stakingDefaultAdminFee ?? 0,
    DefaultEarlyWithdrawalFee:
      localSettings.stakingDefaultEarlyWithdrawalFee ?? 0,
    AutoCompoundDefault: localSettings.stakingAutoCompoundDefault ?? false,
  };

  // Extract an earnings settings object from the flat settings.
  const earningsSettings = {
    MinimumWithdrawalAmount: localSettings.stakingMinimumWithdrawalAmount ?? 0,
    AutomaticEarningsDistribution:
      localSettings.stakingAutomaticEarningsDistribution ?? false,
    RequireWithdrawalApproval:
      localSettings.stakingRequireWithdrawalApproval ?? false,
    DefaultAprCalculationMethod:
      localSettings.stakingDefaultAprCalculationMethod ?? "SIMPLE",
    EarningsDistributionTime:
      localSettings.stakingEarningsDistributionTime ?? "00:00",
  };

  // Update functions that automatically prefix the keys when updating the flat settings.
  const updatePlatformSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      ["staking" + key]: value,
    }));
  };

  const updateEarningsSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      ["staking" + key]: value,
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveError(null);
    setValidationErrors({});
    setHasSubmitted(true);

    try {
      const updatedSettings = { ...localSettings };
      const { data, error, validationErrors } = await $fetch({
        url: "/api/admin/system/settings",
        method: "PUT",
        body: updatedSettings,
      });

      if (error) {
        if (validationErrors) {
          setValidationErrors(validationErrors);
          setSaveError("Please fix the validation errors below.");
        } else {
          setSaveError(error);
        }
      } else {
        // Merge with existing settings to avoid overwriting other extensions' settings
        const mergedSettings = { ...settings, ...updatedSettings };
        setSettings(mergedSettings);
        setLocalSettings(mergedSettings);
        setHasSubmitted(false); // Reset on success
      }
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save settings"
      );
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

  if (!localSettings) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {t("failed_to_load_settings")}.{" "}
          {t("please_refresh_the_page_and_try_again")}.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("staking_settings")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("configure_your_staking_platform_settings")}
          </p>
        </div>
      </div>

      {(saveError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p>{saveError}</p>
        </div>
      )}

      <Tabs defaultValue="platform">
        <TabsList>
          <TabsTrigger value="platform">{t("platform_settings")}</TabsTrigger>
          <TabsTrigger value="earnings">{t("earnings_settings")}</TabsTrigger>
        </TabsList>
        <TabsContent value="platform">
          <StakingPlatformSettingsSection
            settings={platformSettings}
            onUpdate={updatePlatformSetting}
            validationErrors={validationErrors}
            hasSubmitted={hasSubmitted}
          />
        </TabsContent>
        <TabsContent value="earnings">
          <StakingEarningsSettingsSection
            settings={earningsSettings}
            onUpdate={updateEarningsSetting}
            validationErrors={validationErrors}
            hasSubmitted={hasSubmitted}
          />
        </TabsContent>
      </Tabs>
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("save_settings")}
        </Button>
      </div>
    </div>
  );
}
