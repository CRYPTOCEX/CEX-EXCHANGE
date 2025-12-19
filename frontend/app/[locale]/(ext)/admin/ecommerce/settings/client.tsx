"use client";

import React from "react";
import { Loader2, Settings, Monitor } from "lucide-react";
import {
  SettingsPage,
  SettingsPageConfig,
} from "@/components/admin/settings";
import {
  ECOMMERCE_TABS,
  ECOMMERCE_TAB_COLORS,
  ECOMMERCE_FIELD_DEFINITIONS,
  ECOMMERCE_DEFAULT_SETTINGS,
} from "./settings";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const TAB_ICONS: Record<string, React.ElementType> = {
  general: Settings,
  display: Monitor,
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  general: "Configure tax, shipping, and general store settings",
  display: "Configure product display and layout settings",
};

const ECOMMERCE_SETTINGS_CONFIG: SettingsPageConfig = {
  title: "E-Commerce Settings",
  description: "Configure your e-commerce store settings and preferences",
  backUrl: "/admin/ecommerce",
  apiEndpoint: "/api/admin/system/settings",
  tabs: ECOMMERCE_TABS,
  fields: ECOMMERCE_FIELD_DEFINITIONS,
  tabColors: ECOMMERCE_TAB_COLORS,
  defaultValues: ECOMMERCE_DEFAULT_SETTINGS,
};

export default function SettingsConfiguration() {
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
            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
            <div className="relative p-6 bg-gradient-to-br from-orange-500/20 to-orange-500/5 rounded-2xl border">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
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
      config={ECOMMERCE_SETTINGS_CONFIG}
      settings={settings}
      onSettingsChange={setSettings}
      tabIcons={TAB_ICONS}
      tabDescriptions={TAB_DESCRIPTIONS}
    />
  );
}
