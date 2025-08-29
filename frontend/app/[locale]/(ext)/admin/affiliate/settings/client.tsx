"use client";

import { useEffect, useState } from "react";
import { useConfigStore } from "@/store/config";
import { useSettings } from "@/hooks/use-settings";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AffiliateGeneralSettingsSection from "./components/general";
import AffiliateCommissionSettingsSection from "./components/commission";
import { useTranslations } from "next-intl";

export default function AffiliateSettingsClient() {
  const t = useTranslations("ext");
  const { settings, setSettings } = useConfigStore();
  const { fetchSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, any> = { ...(settings || {}) };

    // Referral approval
    initial.affiliateRequireApproval =
      initial.referralApprovalRequired === "true";

    // MLM system
    initial.affiliateMlmSystem = (initial.mlmSystem as string) || "DIRECT";

    // Level counts from flat settings
    initial.affiliateBinaryLevels =
      parseInt(initial.binaryLevels as string, 10) || 2;
    initial.affiliateUnilevelLevels =
      parseInt(initial.unilevelLevels as string, 10) || 2;

    // Individual level percentages
    for (let i = 1; i <= initial.affiliateBinaryLevels; i++) {
      initial[`affiliateBinaryLevel${i}`] =
        parseFloat(initial[`binaryLevel${i}`] as string) || 0;
    }
    for (let i = 1; i <= initial.affiliateUnilevelLevels; i++) {
      initial[`affiliateUnilevelLevel${i}`] =
        parseFloat(initial[`unilevelLevel${i}`] as string) || 0;
    }

    // Commission settings - ensure these are properly loaded from saved settings
    // Parse string values to numbers if they exist
    if (initial.affiliateDefaultCommissionRate !== undefined) {
      initial.affiliateDefaultCommissionRate = 
        typeof initial.affiliateDefaultCommissionRate === 'string' 
          ? parseFloat(initial.affiliateDefaultCommissionRate) 
          : initial.affiliateDefaultCommissionRate;
    }
    if (initial.affiliateMaxCommissionRate !== undefined) {
      initial.affiliateMaxCommissionRate = 
        typeof initial.affiliateMaxCommissionRate === 'string'
          ? parseFloat(initial.affiliateMaxCommissionRate)
          : initial.affiliateMaxCommissionRate;
    }
    if (initial.affiliatePayoutThreshold !== undefined) {
      initial.affiliatePayoutThreshold = 
        typeof initial.affiliatePayoutThreshold === 'string'
          ? parseFloat(initial.affiliatePayoutThreshold)
          : initial.affiliatePayoutThreshold;
    }

    setLocalSettings(initial);
    setLoading(false);
  }, [settings]);

  // General settings for form
  const generalSettings = {
    RequireApproval: localSettings.affiliateRequireApproval ?? false,
    MlmSystem: localSettings.affiliateMlmSystem ?? "DIRECT",
    BinaryLevels: localSettings.affiliateBinaryLevels ?? 2,
    UnilevelLevels: localSettings.affiliateUnilevelLevels ?? 2,
  } as Record<string, any>;
  for (let i = 1; i <= (localSettings.affiliateBinaryLevels || 2); i++) {
    generalSettings[`BinaryLevel${i}`] =
      localSettings[`affiliateBinaryLevel${i}`] ?? 0;
  }
  for (let i = 1; i <= (localSettings.affiliateUnilevelLevels || 2); i++) {
    generalSettings[`UnilevelLevel${i}`] =
      localSettings[`affiliateUnilevelLevel${i}`] ?? 0;
  }

  // Commission settings (unchanged)
  const commissionSettings = {
    DefaultCommissionRate: localSettings.affiliateDefaultCommissionRate ?? 10,
    MaxCommissionRate: localSettings.affiliateMaxCommissionRate ?? 30,
    // CommissionTiers: localSettings.affiliateCommissionTiers ?? false,
    PayoutThreshold: localSettings.affiliatePayoutThreshold ?? 50,
  };

  // Handlers for form fields
  const updateGeneralSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [`affiliate${key}`]: value }));
  };
  const updateCommissionSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [`affiliate${key}`]: value }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      // Build payload using raw setting keys
      const payload: Record<string, any> = {};
      payload.referralApprovalRequired = localSettings.affiliateRequireApproval
        ? "true"
        : "false";
      payload.mlmSystem = localSettings.affiliateMlmSystem;
      payload.binaryLevels = String(localSettings.affiliateBinaryLevels);
      payload.unilevelLevels = String(localSettings.affiliateUnilevelLevels);
      for (let i = 1; i <= (localSettings.affiliateBinaryLevels || 2); i++) {
        payload[`binaryLevel${i}`] = String(
          localSettings[`affiliateBinaryLevel${i}`]
        );
      }
      for (let i = 1; i <= (localSettings.affiliateUnilevelLevels || 2); i++) {
        payload[`unilevelLevel${i}`] = String(
          localSettings[`affiliateUnilevelLevel${i}`]
        );
      }
      // include commission settings if needed
      if (localSettings.affiliateDefaultCommissionRate !== undefined)
        payload.affiliateDefaultCommissionRate = String(
          localSettings.affiliateDefaultCommissionRate
        );
      if (localSettings.affiliateMaxCommissionRate !== undefined)
        payload.affiliateMaxCommissionRate = String(
          localSettings.affiliateMaxCommissionRate
        );
      // if (localSettings.affiliateCommissionTiers !== undefined)
      //   payload.affiliateCommissionTiers =
      //     localSettings.affiliateCommissionTiers;
      if (localSettings.affiliatePayoutThreshold !== undefined)
        payload.affiliatePayoutThreshold = String(
          localSettings.affiliatePayoutThreshold
        );

      const result = await $fetch({
        url: "/api/admin/system/settings",
        method: "PUT",
        body: payload,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        // Fetch fresh settings from backend to ensure cache is updated
        await fetchSettings();
        
        // reflect updated raw settings - merge with existing to avoid overwriting other extensions
        const mergedSettings = { ...settings, ...payload };
        setSettings(mergedSettings);
        
        // Update local settings with the new values properly
        // Need to ensure commission settings are included
        setLocalSettings(prev => {
          const updated = { ...prev };
          
          // Update commission settings in localSettings
          if (payload.affiliateDefaultCommissionRate !== undefined) {
            updated.affiliateDefaultCommissionRate = parseFloat(payload.affiliateDefaultCommissionRate);
          }
          if (payload.affiliateMaxCommissionRate !== undefined) {
            updated.affiliateMaxCommissionRate = parseFloat(payload.affiliateMaxCommissionRate);
          }
          if (payload.affiliatePayoutThreshold !== undefined) {
            updated.affiliatePayoutThreshold = parseFloat(payload.affiliatePayoutThreshold);
          }
          
          // Update other settings
          Object.keys(payload).forEach(key => {
            if (!key.includes('Commission') && !key.includes('Payout')) {
              updated[key] = payload[key];
            }
          });
          
          return updated;
        });
        
        // Show success message (optional, but good UX)
        setError(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("affiliate_settings")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("configure_your_affiliate_program_settings")}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">{t("General")}</TabsTrigger>
          <TabsTrigger value="commission">{t("Commission")}</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <AffiliateGeneralSettingsSection
            settings={generalSettings}
            onUpdate={updateGeneralSetting}
          />
        </TabsContent>
        <TabsContent value="commission">
          <AffiliateCommissionSettingsSection
            settings={commissionSettings}
            onUpdate={updateCommissionSetting}
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
