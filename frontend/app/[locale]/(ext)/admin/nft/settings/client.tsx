"use client";

import React from "react";
import { Loader2, TrendingUp, DollarSign, Shield, FileText, Link as LinkIcon } from "lucide-react";
import {
  SettingsPage,
  SettingsPageConfig,
} from "@/components/admin/settings";
import {
  NFT_TABS,
  NFT_TAB_COLORS,
  NFT_FIELD_DEFINITIONS,
  NFT_DEFAULT_SETTINGS,
} from "./settings";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const TAB_ICONS: Record<string, React.ElementType> = {
  trading: TrendingUp,
  fees: DollarSign,
  verification: Shield,
  content: FileText,
  integrations: LinkIcon,
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  trading: "Configure trading options and auctions",
  fees: "Configure marketplace fees and royalties",
  verification: "KYC and verification requirements",
  content: "Content and metadata settings",
  integrations: "Cross-chain and external integrations",
};

const NFT_SETTINGS_CONFIG: SettingsPageConfig = {
  title: "NFT Marketplace Settings",
  description: "Configure your NFT marketplace settings and preferences",
  backUrl: "/admin/nft",
  apiEndpoint: "/api/admin/system/settings",
  tabs: NFT_TABS,
  fields: NFT_FIELD_DEFINITIONS,
  tabColors: NFT_TAB_COLORS,
  defaultValues: NFT_DEFAULT_SETTINGS,
};

export default function NFTSettingsConfiguration() {
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
            <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
            <div className="relative p-6 bg-linear-to-br from-purple-500/20 to-purple-500/5 rounded-2xl border">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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
      config={NFT_SETTINGS_CONFIG}
      settings={settings}
      onSettingsChange={setSettings}
      tabIcons={TAB_ICONS}
      tabDescriptions={TAB_DESCRIPTIONS}
    />
  );
}
