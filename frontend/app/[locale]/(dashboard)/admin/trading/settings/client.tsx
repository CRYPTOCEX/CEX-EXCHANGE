"use client";

import React from "react";
import { Loader2, Settings, Layout, TrendingUp } from "lucide-react";
import {
  SettingsPage,
  SettingsPageConfig,
} from "@/components/admin/settings";
import {
  TRADING_PRO_TABS,
  TRADING_PRO_TAB_COLORS,
  TRADING_PRO_FIELD_DEFINITIONS,
  TRADING_PRO_DEFAULT_SETTINGS,
} from "./settings";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { m } from "framer-motion";

const TAB_ICONS: Record<string, React.ElementType> = {
  general: Settings,
  features: Layout,
  trading: TrendingUp,
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  general: "Basic trading configuration",
  features: "Enable or disable features",
  trading: "Trading form and order settings",
};

const TRADING_SETTINGS_CONFIG: SettingsPageConfig = {
  title: "Trading Settings",
  description: "Configure your trading interface settings",
  backUrl: "/admin/finance",
  apiEndpoint: "/api/admin/system/settings",
  tabs: TRADING_PRO_TABS,
  fields: TRADING_PRO_FIELD_DEFINITIONS,
  tabColors: TRADING_PRO_TAB_COLORS,
  defaultValues: TRADING_PRO_DEFAULT_SETTINGS,
};

export default function TradingSettingsClient() {
  const tCommon = useTranslations("common");
  const { settings, setSettings, settingsFetched } = useConfigStore();

  if (!settingsFetched || Object.keys(settings).length === 0) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <div className="relative p-6 bg-linear-to-br from-primary/20 to-primary/5 rounded-2xl border">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">{tCommon("loading")}...</p>
            <p className="text-sm text-muted-foreground mt-1">
              {tCommon("please_wait_while_we_fetch_your_settings")}
            </p>
          </div>
        </m.div>
      </div>
    );
  }

  return (
    <SettingsPage
      config={TRADING_SETTINGS_CONFIG}
      settings={settings}
      onSettingsChange={setSettings}
      tabIcons={TAB_ICONS}
      tabDescriptions={TAB_DESCRIPTIONS}
    />
  );
}
