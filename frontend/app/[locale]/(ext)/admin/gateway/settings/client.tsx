"use client";

import React from "react";
import { Loader2, Settings, DollarSign, Shield, Clock, Wallet } from "lucide-react";
import {
  SettingsPage,
  SettingsPageConfig,
} from "@/components/admin/settings";
import {
  GATEWAY_TABS,
  GATEWAY_TAB_COLORS,
  GATEWAY_FIELD_DEFINITIONS,
  GATEWAY_DEFAULT_SETTINGS,
} from "./settings";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const TAB_ICONS: Record<string, React.ElementType> = {
  general: Settings,
  wallets: Wallet,
  fees: DollarSign,
  security: Shield,
  webhooks: Clock,
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  general: "Basic gateway configuration options",
  wallets: "Supported wallet types and currencies",
  fees: "Configure fees and transaction limits",
  security: "Merchant verification and approval",
  webhooks: "Configure webhook retry behavior",
};

const GATEWAY_SETTINGS_CONFIG: SettingsPageConfig = {
  title: "Gateway Settings",
  description: "Configure payment gateway settings and defaults",
  backUrl: "/admin/gateway",
  apiEndpoint: "/api/admin/system/settings",
  tabs: GATEWAY_TABS,
  fields: GATEWAY_FIELD_DEFINITIONS,
  tabColors: GATEWAY_TAB_COLORS,
  defaultValues: GATEWAY_DEFAULT_SETTINGS,
};

export default function AdminGatewaySettingsPage() {
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
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
            <div className="relative p-6 bg-linear-to-br from-blue-500/20 to-blue-500/5 rounded-2xl border">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
      config={GATEWAY_SETTINGS_CONFIG}
      settings={settings}
      onSettingsChange={setSettings}
      tabIcons={TAB_ICONS}
      tabDescriptions={TAB_DESCRIPTIONS}
    />
  );
}
