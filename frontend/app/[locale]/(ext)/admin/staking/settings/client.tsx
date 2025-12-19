"use client";

import React from "react";
import { Loader2, Settings, DollarSign } from "lucide-react";
import {
  SettingsPage,
  SettingsPageConfig,
} from "@/components/admin/settings";
import {
  STAKING_TABS,
  STAKING_TAB_COLORS,
  STAKING_FIELD_DEFINITIONS,
  STAKING_DEFAULT_SETTINGS,
} from "./settings";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const TAB_ICONS: Record<string, React.ElementType> = {
  platform: Settings,
  earnings: DollarSign,
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  platform: "Configure core staking platform settings",
  earnings: "Configure earnings and distribution settings",
};

const STAKING_SETTINGS_CONFIG: SettingsPageConfig = {
  title: "Staking Settings",
  description: "Configure your staking platform settings and preferences",
  backUrl: "/admin/staking",
  apiEndpoint: "/api/admin/system/settings",
  tabs: STAKING_TABS,
  fields: STAKING_FIELD_DEFINITIONS,
  tabColors: STAKING_TAB_COLORS,
  defaultValues: STAKING_DEFAULT_SETTINGS,
};

export default function StakingSettingsConfiguration() {
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
            <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full" />
            <div className="relative p-6 bg-linear-to-br from-violet-500/20 to-violet-500/5 rounded-2xl border">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
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
      config={STAKING_SETTINGS_CONFIG}
      settings={settings}
      onSettingsChange={setSettings}
      tabIcons={TAB_ICONS}
      tabDescriptions={TAB_DESCRIPTIONS}
    />
  );
}
