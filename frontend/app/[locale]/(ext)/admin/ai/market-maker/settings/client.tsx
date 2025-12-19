"use client";

import React from "react";
import { Loader2, TrendingUp, Bot, Shield, AlertTriangle } from "lucide-react";
import {
  SettingsPage,
  SettingsPageConfig,
} from "@/components/admin/settings";
import {
  AI_MARKET_MAKER_TABS,
  AI_MARKET_MAKER_TAB_COLORS,
  AI_MARKET_MAKER_FIELD_DEFINITIONS,
  AI_MARKET_MAKER_DEFAULT_SETTINGS,
} from "./settings";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const TAB_ICONS: Record<string, React.ElementType> = {
  trading: TrendingUp,
  bots: Bot,
  risk: Shield,
  emergency: AlertTriangle,
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  trading: "Core trading configuration",
  bots: "Bot limits and configuration",
  risk: "Risk management settings",
  emergency: "Emergency controls and actions",
};

const AI_MARKET_MAKER_SETTINGS_CONFIG: SettingsPageConfig = {
  title: "AI Market Maker Settings",
  description: "Configure your AI market maker settings and preferences",
  backUrl: "/admin/ai/market-maker",
  apiEndpoint: "/api/admin/system/settings",
  tabs: AI_MARKET_MAKER_TABS,
  fields: AI_MARKET_MAKER_FIELD_DEFINITIONS,
  tabColors: AI_MARKET_MAKER_TAB_COLORS,
  defaultValues: AI_MARKET_MAKER_DEFAULT_SETTINGS,
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
            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
            <div className="relative p-6 bg-linear-to-br from-cyan-500/20 to-cyan-500/5 rounded-2xl border">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
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
      config={AI_MARKET_MAKER_SETTINGS_CONFIG}
      settings={settings}
      onSettingsChange={setSettings}
      tabIcons={TAB_ICONS}
      tabDescriptions={TAB_DESCRIPTIONS}
    />
  );
}
