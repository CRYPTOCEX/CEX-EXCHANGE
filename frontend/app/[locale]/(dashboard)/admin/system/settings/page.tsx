"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Settings, Zap, Wallet, Share2, Palette } from "lucide-react";
import {
  SettingsPage,
  SettingsPageConfig,
  DEFAULT_TAB_COLORS,
} from "@/components/admin/settings";
import { TABS, FIELD_DEFINITIONS, DEFAULT_SETTINGS } from "@/config/settings";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

// Tab icons mapping
const TAB_ICONS: Record<string, React.ElementType> = {
  general: Settings,
  features: Zap,
  wallet: Wallet,
  social: Share2,
  logos: Palette,
};

// Tab descriptions
const TAB_DESCRIPTIONS: Record<string, string> = {
  general: "Theme, layout, and content preferences",
  features: "Trading, verification, and platform features",
  wallet: "Deposits, withdrawals, and fee settings",
  social: "Social media links and app store URLs",
  logos: "Brand logos, favicons, and app icons",
};

// Settings page configuration
const SYSTEM_SETTINGS_CONFIG: SettingsPageConfig = {
  title: "System Settings",
  description: "Configure your platform settings and preferences",
  backUrl: "/admin",
  apiEndpoint: "/api/admin/system/settings",
  tabs: TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    icon: TAB_ICONS[tab.id],
  })),
  fields: FIELD_DEFINITIONS,
  tabColors: DEFAULT_TAB_COLORS,
  defaultValues: DEFAULT_SETTINGS,
};

export default function SystemSettingsPage() {
  const tCommon = useTranslations("common");
  const {
    settings: configSettings,
    setSettings,
    settingsFetched,
  } = useConfigStore();

  if (!settingsFetched || Object.keys(configSettings).length === 0) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <div className="relative p-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">
              {tCommon("loading_settings_ellipsis")}...
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Please wait while we fetch your settings
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <SettingsPage
      config={SYSTEM_SETTINGS_CONFIG}
      settings={configSettings}
      onSettingsChange={setSettings}
      tabIcons={TAB_ICONS}
      tabDescriptions={TAB_DESCRIPTIONS}
    />
  );
}
