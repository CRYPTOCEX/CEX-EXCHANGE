"use client";

import React from "react";
import { Loader2, Settings, Users, UserCheck, TrendingUp, Shield } from "lucide-react";
import {
  SettingsPage,
  SettingsPageConfig,
} from "@/components/admin/settings";
import {
  COPY_TRADING_TABS,
  COPY_TRADING_TAB_COLORS,
  COPY_TRADING_FIELD_DEFINITIONS,
  COPY_TRADING_DEFAULT_SETTINGS,
} from "./settings";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const TAB_ICONS: Record<string, React.ElementType> = {
  platform: Settings,
  leader: UserCheck,
  follower: Users,
  trading: TrendingUp,
  risk: Shield,
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  platform: "Core platform configuration",
  leader: "Leader requirements and limits",
  follower: "Follower settings and allocation",
  trading: "Trading fees and order types",
  risk: "Risk management defaults",
};

const COPY_TRADING_SETTINGS_CONFIG: SettingsPageConfig = {
  title: "Copy Trading Settings",
  description: "Configure your copy trading platform settings and preferences",
  backUrl: "/admin/copy-trading",
  apiEndpoint: "/api/admin/system/settings",
  tabs: COPY_TRADING_TABS,
  fields: COPY_TRADING_FIELD_DEFINITIONS,
  tabColors: COPY_TRADING_TAB_COLORS,
  defaultValues: COPY_TRADING_DEFAULT_SETTINGS,
};

export default function SettingsClient() {
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
            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
            <div className="relative p-6 bg-linear-to-br from-indigo-500/20 to-indigo-500/5 rounded-2xl border">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
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
      config={COPY_TRADING_SETTINGS_CONFIG}
      settings={settings}
      onSettingsChange={setSettings}
      tabIcons={TAB_ICONS}
      tabDescriptions={TAB_DESCRIPTIONS}
    />
  );
}
