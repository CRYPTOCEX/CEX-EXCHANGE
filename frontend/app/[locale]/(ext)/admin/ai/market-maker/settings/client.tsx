"use client";

import { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TradingSettingsSection from "./components/trading";
import BotSettingsSection from "./components/bots";
import RiskSettingsSection from "./components/risk";
import EmergencySettingsSection from "./components/emergency";
import { useConfigStore } from "@/store/config";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function SettingsClient() {
  const t = useTranslations("ext");
  const { settings, setSettings } = useConfigStore();

  const [localSettings, setLocalSettings] = useState(settings || {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemStatus, setSystemStatus] = useState<{
    activeMarkets: number;
    activeBots: number;
    isOperational: boolean;
  } | null>(null);

  useEffect(() => {
    setLocalSettings(settings || {});
    setLoading(false);
  }, [settings]);

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await $fetch({
        url: "/api/admin/ai/market-maker/analytics/overview",
        silent: true,
      });
      if (response.data) {
        const isOperational =
          (localSettings.aiMarketMakerEnabled !== false) &&
          !localSettings.aiMarketMakerMaintenanceMode &&
          !localSettings.aiMarketMakerGlobalPauseEnabled;
        setSystemStatus({
          activeMarkets: response.data.activeMarkets || 0,
          activeBots: response.data.activeBots || 0,
          isOperational,
        });
      }
    } catch (err) {
      console.error("Failed to fetch system status", err);
    }
  };

  // Extract trading settings from global settings store
  const tradingSettings = {
    TradingEnabled: localSettings.aiMarketMakerEnabled ?? true,
    GlobalPauseEnabled: localSettings.aiMarketMakerGlobalPauseEnabled ?? false,
    MaintenanceMode: localSettings.aiMarketMakerMaintenanceMode ?? false,
  };

  // Extract bot settings
  const botSettings = {
    MaxConcurrentBots: localSettings.aiMarketMakerMaxConcurrentBots ?? 50,
  };

  // Extract risk settings
  const riskSettings = {
    MinLiquidity: localSettings.aiMarketMakerMinLiquidity ?? 100,
    MaxDailyLossPercent: localSettings.aiMarketMakerMaxDailyLossPercent ?? 5,
    DefaultVolatilityThreshold: localSettings.aiMarketMakerDefaultVolatilityThreshold ?? 10,
    StopLossEnabled: localSettings.aiMarketMakerStopLossEnabled ?? true,
  };

  // Update functions
  const updateTradingSetting = (key: string, value: any) => {
    setLocalSettings((prev: any) => ({
      ...prev,
      ["aiMarketMaker" + key]: value,
    }));
  };

  const updateBotSetting = (key: string, value: any) => {
    setLocalSettings((prev: any) => ({
      ...prev,
      ["aiMarketMaker" + key]: value,
    }));
  };

  const updateRiskSetting = (key: string, value: any) => {
    setLocalSettings((prev: any) => ({
      ...prev,
      ["aiMarketMaker" + key]: value,
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);

    // Prepare default settings
    const defaultSettings = {
      aiMarketMakerEnabled: tradingSettings.TradingEnabled,
      aiMarketMakerGlobalPauseEnabled: tradingSettings.GlobalPauseEnabled,
      aiMarketMakerMaintenanceMode: tradingSettings.MaintenanceMode,
      aiMarketMakerMaxConcurrentBots: botSettings.MaxConcurrentBots,
      aiMarketMakerMinLiquidity: riskSettings.MinLiquidity,
      aiMarketMakerMaxDailyLossPercent: riskSettings.MaxDailyLossPercent,
      aiMarketMakerDefaultVolatilityThreshold: riskSettings.DefaultVolatilityThreshold,
      aiMarketMakerStopLossEnabled: riskSettings.StopLossEnabled,
    };

    // Only use aiMarketMaker settings from localSettings
    const aiMarketMakerLocalSettings = Object.entries(localSettings)
      .filter(([key]) => key.startsWith("aiMarketMaker"))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    const updatedSettings = { ...defaultSettings, ...aiMarketMakerLocalSettings };

    const { error } = await $fetch({
      url: "/api/admin/system/settings",
      method: "PUT",
      body: updatedSettings,
    });

    if (!error) {
      const mergedSettings = { ...settings, ...updatedSettings };
      setSettings(mergedSettings);
      setLocalSettings(mergedSettings);
      toast.success("Settings saved successfully");
      // Refresh system status
      fetchSystemStatus();
    } else {
      toast.error("Failed to save settings");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!localSettings) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {t("failed_to_load_settings_please_refresh")}
        </AlertDescription>
      </Alert>
    );
  }

  const isOperational = tradingSettings.TradingEnabled &&
    !tradingSettings.MaintenanceMode &&
    !tradingSettings.GlobalPauseEnabled;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-muted-800 dark:text-muted-100">
            AI Trading Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("configure_your_ai_market_maker_settings")}
          </p>
        </div>
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving && <Icon icon="mdi:loading" className="mr-2 h-4 w-4 animate-spin" />}
          <Icon icon="mdi:content-save" className="mr-2 h-4 w-4" />
          {t("save_changes")}
        </Button>
      </div>

      {/* System Status Banner */}
      {systemStatus && (
        <div className={`p-4 rounded-lg border ${isOperational ? "border-success-500/20 bg-success-500/5" : "border-warning-500/20 bg-warning-500/5"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${isOperational ? "bg-success-500/10" : "bg-warning-500/10"} flex items-center justify-center`}>
                <Icon
                  icon={isOperational ? "mdi:check-circle" : "mdi:alert-circle"}
                  className={`w-5 h-5 ${isOperational ? "text-success-500" : "text-warning-500"}`}
                />
              </div>
              <div>
                <h3 className={`font-semibold ${isOperational ? "text-success-600 dark:text-success-400" : "text-warning-600 dark:text-warning-400"}`}>
                  System {isOperational ? "Operational" : "Paused"}
                </h3>
                <p className="text-sm text-muted-500">
                  {systemStatus.activeMarkets} {t("active_markets")}, {systemStatus.activeBots} {t("active_bots")}
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${isOperational ? "bg-success-500/10 text-success-500" : "bg-warning-500/10 text-warning-500"}`}>
              {isOperational ? "ONLINE" : "OFFLINE"}
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="trading">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="trading">
            <Icon icon="mdi:chart-line" className="w-4 h-4 mr-2" />
            Trading
          </TabsTrigger>
          <TabsTrigger value="bots">
            <Icon icon="mdi:robot" className="w-4 h-4 mr-2" />
            Bots
          </TabsTrigger>
          <TabsTrigger value="risk">
            <Icon icon="mdi:shield-alert" className="w-4 h-4 mr-2" />
            Risk
          </TabsTrigger>
          <TabsTrigger value="emergency">
            <Icon icon="mdi:alert-octagon" className="w-4 h-4 mr-2" />
            Emergency
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trading">
          <TradingSettingsSection
            settings={tradingSettings}
            onUpdate={updateTradingSetting}
          />
        </TabsContent>

        <TabsContent value="bots">
          <BotSettingsSection
            settings={botSettings}
            onUpdate={updateBotSetting}
          />
        </TabsContent>

        <TabsContent value="risk">
          <RiskSettingsSection
            settings={riskSettings}
            onUpdate={updateRiskSetting}
          />
        </TabsContent>

        <TabsContent value="emergency">
          <EmergencySettingsSection onStatusChange={fetchSystemStatus} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
