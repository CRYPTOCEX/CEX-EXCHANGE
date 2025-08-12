"use client";

import { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TradingSettingsSection from "./components/trading";
import FeesSettingsSection from "./components/fees";
import PlatformSettingsSection from "./components/platform";
import SecuritySettingsSection from "./components/security";
import UISettingsSection from "./components/ui";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";

export default function SettingsConfiguration() {
  const t = useTranslations("ext");
  const { settings, setSettings } = useConfigStore();
  // settings is a flat object with keys like "p2pDefaultMakerFee", etc.
  const [localSettings, setLocalSettings] = useState(settings || {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(settings || {});
    setLoading(false);
  }, [settings]);

  // Extract a trading settings object from the flat settings.
  const tradingSettings = {
    DefaultEscrowTime: localSettings.p2pDefaultEscrowTime ?? 30,
    DefaultPaymentWindow: localSettings.p2pDefaultPaymentWindow ?? 15,
    AutoCancelUnpaidTrades: localSettings.p2pAutoCancelUnpaidTrades ?? true,
    MaximumTradeAmount: localSettings.p2pMaximumTradeAmount ?? 100000,
    MinimumTradeAmount: localSettings.p2pMinimumTradeAmount ?? 10,
  };

  // Extract a fees settings object from the flat settings.
  const feesSettings = {
    MakerFee: localSettings.p2pMakerFee ?? 0.1,
    TakerFee: localSettings.p2pTakerFee ?? 0.2,
    DisputeFeePercent: localSettings.p2pDisputeFeePercent ?? 1,
    EscrowReleaseTime: localSettings.p2pEscrowReleaseTime ?? "00:00",
  };

  // Extract platform settings
  const platformSettings = {
    Enabled: localSettings.p2pEnabled ?? true,
    MaintenanceMode: localSettings.p2pMaintenanceMode ?? false,
    AllowNewOffers: localSettings.p2pAllowNewOffers ?? true,
    AllowGuestBrowsing: localSettings.p2pAllowGuestBrowsing ?? true,
    AllowCustomPaymentMethods: localSettings.p2pAllowCustomPaymentMethods ?? false,
    MaxActiveOffersPerUser: localSettings.p2pMaxActiveOffersPerUser ?? 5,
    MaxActiveTrades: localSettings.p2pMaxActiveTrades ?? 10,
  };

  // Extract security settings
  const securitySettings = {
    EnableDisputeSystem: localSettings.p2pEnableDisputeSystem ?? true,
    EnableRatingSystem: localSettings.p2pEnableRatingSystem ?? true,
    EnableChatSystem: localSettings.p2pEnableChatSystem ?? true,
  };

  // Extract UI settings
  const uiSettings = {
    ShowRecentTrades: localSettings.p2pShowRecentTrades ?? true,
    ShowMarketTrends: localSettings.p2pShowMarketTrends ?? true,
  };

  // Update functions that automatically prefix the keys when updating the flat settings.
  const updateTradingSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      ["p2p" + key]: value,
    }));
  };

  const updateFeesSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      ["p2p" + key]: value,
    }));
  };

  const updatePlatformSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      ["p2p" + key]: value,
    }));
  };

  const updateSecuritySetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      ["p2p" + key]: value,
    }));
  };

  const updateUISetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      ["p2p" + key]: value,
    }));
  };

  // Revised handleSaveSettings that fills in missing settings using the defaults.
  const handleSaveSettings = async () => {
    setSaving(true);

    // Prepare default settings based on the computed values.
    const defaultSettings = {
      p2pDefaultEscrowTime: tradingSettings.DefaultEscrowTime,
      p2pDefaultPaymentWindow: tradingSettings.DefaultPaymentWindow,
      p2pAutoCancelUnpaidTrades: tradingSettings.AutoCancelUnpaidTrades,
      p2pMaximumTradeAmount: tradingSettings.MaximumTradeAmount,
      p2pMinimumTradeAmount: tradingSettings.MinimumTradeAmount,

      p2pMakerFee: feesSettings.MakerFee,
      p2pTakerFee: feesSettings.TakerFee,
      p2pDisputeFeePercent: feesSettings.DisputeFeePercent,
      p2pEscrowReleaseTime: feesSettings.EscrowReleaseTime,

      p2pEnabled: platformSettings.Enabled,
      p2pMaintenanceMode: platformSettings.MaintenanceMode,
      p2pAllowNewOffers: platformSettings.AllowNewOffers,
      p2pAllowGuestBrowsing: platformSettings.AllowGuestBrowsing,
      p2pAllowCustomPaymentMethods: platformSettings.AllowCustomPaymentMethods,
      p2pMaxActiveOffersPerUser: platformSettings.MaxActiveOffersPerUser,
      p2pMaxActiveTrades: platformSettings.MaxActiveTrades,

      p2pEnableDisputeSystem: securitySettings.EnableDisputeSystem,
      p2pEnableRatingSystem: securitySettings.EnableRatingSystem,
      p2pEnableChatSystem: securitySettings.EnableChatSystem,

      p2pShowRecentTrades: uiSettings.ShowRecentTrades,
      p2pShowMarketTrends: uiSettings.ShowMarketTrends,
    };

    // Merge localSettings into defaultSettings so that any changed keys override the defaults,
    // but missing keys are filled with default values.
    const updatedSettings = { ...defaultSettings, ...localSettings };

    const { error } = await $fetch({
      url: "/api/admin/system/settings",
      method: "PUT",
      body: updatedSettings,
    });
    if (!error) {
      setSettings(updatedSettings);
    }
    setSaving(false);
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
            {t("platform_settings")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("configure_your_trading_platform_settings")}
          </p>
        </div>
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {t("save_changes")}
        </Button>
      </div>

      <Tabs defaultValue="trading">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="trading">{t("Trading")}</TabsTrigger>
          <TabsTrigger value="fees">{t("fees_&_limits")}</TabsTrigger>
          <TabsTrigger value="platform">{t("Platform")}</TabsTrigger>
          <TabsTrigger value="security">{t("Security")}</TabsTrigger>
          <TabsTrigger value="ui">{t("ui_&_display")}</TabsTrigger>
        </TabsList>
        <TabsContent value="trading">
          <TradingSettingsSection
            settings={tradingSettings}
            onUpdate={updateTradingSetting}
          />
        </TabsContent>
        <TabsContent value="fees">
          <FeesSettingsSection
            settings={feesSettings}
            onUpdate={updateFeesSetting}
          />
        </TabsContent>
        <TabsContent value="platform">
          <PlatformSettingsSection
            settings={platformSettings}
            onUpdate={updatePlatformSetting}
          />
        </TabsContent>
        <TabsContent value="security">
          <SecuritySettingsSection
            settings={securitySettings}
            onUpdate={updateSecuritySetting}
          />
        </TabsContent>
        <TabsContent value="ui">
          <UISettingsSection settings={uiSettings} onUpdate={updateUISetting} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
