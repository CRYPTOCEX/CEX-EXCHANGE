"use client";

import { useState, useEffect } from "react";
import { useConfigStore } from "@/store/config";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NFTTradingSettingsSection from "./components/trading";
import NFTFeesSettingsSection from "./components/fees";
import NFTVerificationSettingsSection from "./components/verification";
import NFTContentSettingsSection from "./components/content";
import NFTIntegrationSettingsSection from "./components/integrations";
import { useTranslations } from "next-intl";

export default function NFTSettingsConfiguration() {
  const t = useTranslations("ext");
  const { settings, setSettings } = useConfigStore();
  // settings is a flat object with keys like "nftMarketplaceFeePercentage", etc.
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

  // Extract trading settings object from the flat settings.
  const tradingSettings = {
    EnableFixedPriceSales: localSettings.nftEnableFixedPriceSales ?? true,
    EnableAuctions: localSettings.nftEnableAuctions ?? true,
    EnableOffers: localSettings.nftEnableOffers ?? true,
    MinAuctionDuration: localSettings.nftMinAuctionDuration ?? 3600,
    MaxAuctionDuration: localSettings.nftMaxAuctionDuration ?? 604800,
    BidIncrementPercentage: localSettings.nftBidIncrementPercentage ?? 5,
    EnableAntiSnipe: localSettings.nftEnableAntiSnipe ?? true,
    AntiSnipeExtension: localSettings.nftAntiSnipeExtension ?? 300,
  };

  // Extract fees settings object from the flat settings.
  const feesSettings = {
    MarketplaceFeePercentage: localSettings.nftMarketplaceFeePercentage ?? 2.5,
    MaxRoyaltyPercentage: localSettings.nftMaxRoyaltyPercentage ?? 10,
    ListingFee: localSettings.nftListingFee ?? 0,
    GasOptimizationEnabled: localSettings.nftGasOptimizationEnabled ?? true,
    FeeRecipientAddress: localSettings.nftFeeRecipientAddress ?? "",
  };

  // Extract verification settings object from the flat settings.
  const verificationSettings = {
    AutoVerifyCreators: localSettings.nftAutoVerifyCreators ?? false,
    RequireKycForCreators: localSettings.nftRequireKycForCreators ?? false,
    RequireKycForHighValue: localSettings.nftRequireKycForHighValue ?? true,
    HighValueThreshold: localSettings.nftHighValueThreshold ?? 1000,
    VerificationBadgeEnabled: localSettings.nftVerificationBadgeEnabled ?? true,
    ManualReviewRequired: localSettings.nftManualReviewRequired ?? true,
  };

  // Extract content settings object from the flat settings.
  const contentSettings = {
    EnableContentModeration: localSettings.nftEnableContentModeration ?? true,
    AllowExplicitContent: localSettings.nftAllowExplicitContent ?? false,
    MaxFileSize: localSettings.nftMaxFileSize ?? 100,
    SupportedFormats: localSettings.nftSupportedFormats ?? "jpg,jpeg,png,gif,mp4,mp3,webp",
    RequireMetadataValidation: localSettings.nftRequireMetadataValidation ?? true,
    EnableIpfsStorage: localSettings.nftEnableIpfsStorage ?? true,
  };

  // Extract integration settings object from the flat settings.
  const integrationSettings = {
    EnableCrossChain: localSettings.nftEnableCrossChain ?? true,
  };

  // Update functions that automatically prefix the keys when updating the flat settings.
  const updateTradingSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      ["nft" + key]: value,
    }));
  };

  const updateFeesSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      ["nft" + key]: value,
    }));
  };

  const updateVerificationSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      ["nft" + key]: value,
    }));
  };

  const updateContentSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      ["nft" + key]: value,
    }));
  };

  const updateIntegrationSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      ["nft" + key]: value,
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
            {t("nft_marketplace_settings")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("configure_your_nft_marketplace")}
          </p>
        </div>
      </div>

      {(saveError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p>{saveError}</p>
        </div>
      )}

      <Tabs defaultValue="trading">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="trading">{t("Trading")}</TabsTrigger>
          <TabsTrigger value="fees">{t("Fees")}</TabsTrigger>
          <TabsTrigger value="verification">{t("Verification")}</TabsTrigger>
          <TabsTrigger value="content">{t("Content")}</TabsTrigger>
          <TabsTrigger value="integrations">{t("Integrations")}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trading">
          <NFTTradingSettingsSection
            settings={tradingSettings}
            onUpdate={updateTradingSetting}
            validationErrors={validationErrors}
            hasSubmitted={hasSubmitted}
          />
        </TabsContent>
        
        <TabsContent value="fees">
          <NFTFeesSettingsSection
            settings={feesSettings}
            onUpdate={updateFeesSetting}
            validationErrors={validationErrors}
            hasSubmitted={hasSubmitted}
          />
        </TabsContent>
        
        <TabsContent value="verification">
          <NFTVerificationSettingsSection
            settings={verificationSettings}
            onUpdate={updateVerificationSetting}
            validationErrors={validationErrors}
            hasSubmitted={hasSubmitted}
          />
        </TabsContent>
        
        <TabsContent value="content">
          <NFTContentSettingsSection
            settings={contentSettings}
            onUpdate={updateContentSetting}
            validationErrors={validationErrors}
            hasSubmitted={hasSubmitted}
          />
        </TabsContent>
        
        <TabsContent value="integrations">
          <NFTIntegrationSettingsSection
            settings={integrationSettings}
            onUpdate={updateIntegrationSetting}
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