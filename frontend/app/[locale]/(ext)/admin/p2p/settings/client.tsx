"use client";

import React from "react";
import { Loader2, Settings, DollarSign, Shield, LayoutDashboard, Eye } from "lucide-react";
import {
  SettingsPage,
  SettingsPageConfig,
} from "@/components/admin/settings";
import {
  P2P_TABS,
  P2P_TAB_COLORS,
  P2P_FIELD_DEFINITIONS,
  P2P_DEFAULT_SETTINGS,
} from "./settings";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const TAB_ICONS: Record<string, React.ElementType> = {
  trading: Settings,
  fees: DollarSign,
  platform: LayoutDashboard,
  security: Shield,
  ui: Eye,
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  trading: "Configure trading parameters and limits",
  fees: "Configure fees and transaction limits",
  platform: "Platform-wide settings and controls",
  security: "Security and verification settings",
  ui: "User interface display options",
};

const P2P_SETTINGS_CONFIG: SettingsPageConfig = {
  title: "P2P Settings",
  description: "Configure your P2P trading platform settings",
  backUrl: "/admin/p2p",
  apiEndpoint: "/api/admin/system/settings",
  tabs: P2P_TABS,
  fields: P2P_FIELD_DEFINITIONS,
  tabColors: P2P_TAB_COLORS,
  defaultValues: P2P_DEFAULT_SETTINGS,
};

export default function AdminP2PSettingsPage() {
  const tCommon = useTranslations("common");
  const { settings, setSettings, settingsFetched } = useConfigStore();

  if (!settingsFetched || Object.keys(settings).length === 0) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
            <div className="relative p-6 bg-linear-to-br from-green-500/20 to-green-500/5 rounded-2xl border">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">{tCommon("loading")}...</p>
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
      config={P2P_SETTINGS_CONFIG}
      settings={settings}
      onSettingsChange={setSettings}
      tabIcons={TAB_ICONS}
      tabDescriptions={TAB_DESCRIPTIONS}
    />
  );
}
