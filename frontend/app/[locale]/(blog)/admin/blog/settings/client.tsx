"use client";

import React from "react";
import { Loader2, Users, FileText, Layout, Search } from "lucide-react";
import {
  SettingsPage,
  SettingsPageConfig,
} from "@/components/admin/settings";
import {
  BLOG_TABS,
  BLOG_TAB_COLORS,
  BLOG_FIELD_DEFINITIONS,
  BLOG_DEFAULT_SETTINGS,
} from "./settings";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const TAB_ICONS: Record<string, React.ElementType> = {
  authors: Users,
  content: FileText,
  display: Layout,
  seo: Search,
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  authors: "Configure author applications and limits",
  content: "Configure content creation and moderation",
  display: "Configure how content is displayed",
  seo: "Configure search engine optimization",
};

const BLOG_SETTINGS_CONFIG: SettingsPageConfig = {
  title: "Blog Settings",
  description: "Configure your blog settings and preferences",
  backUrl: "/admin/blog",
  apiEndpoint: "/api/admin/system/settings",
  tabs: BLOG_TABS,
  fields: BLOG_FIELD_DEFINITIONS,
  tabColors: BLOG_TAB_COLORS,
  defaultValues: BLOG_DEFAULT_SETTINGS,
};

export function SettingsClient() {
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
      config={BLOG_SETTINGS_CONFIG}
      settings={settings}
      onSettingsChange={setSettings}
      tabIcons={TAB_ICONS}
      tabDescriptions={TAB_DESCRIPTIONS}
    />
  );
}
