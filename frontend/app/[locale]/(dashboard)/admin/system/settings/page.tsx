"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Settings, Zap, Shield, Wallet, Share2, Palette } from "lucide-react";
import {
  SettingsPage,
  SettingsPageConfig,
  DEFAULT_TAB_COLORS,
} from "@/components/admin/settings";
import { TABS, FIELD_DEFINITIONS, DEFAULT_SETTINGS } from "@/config/settings";
import { AddonAliasesField } from "@/components/admin/settings/AddonAliasesField";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { m } from "framer-motion";

/*
 * Both maps below are keyed by tab id and MUST cover every entry in `TABS`.
 *
 * They each carried five of the seven — `security` and `integrations` were in
 * `TABS` and in neither map — so those two tabs rendered with no description at
 * all and fell through to the generic `Settings` gear, which is also `general`'s
 * icon. Two of the seven tabs were visually indistinguishable from the first
 * one, on the screen an operator uses to find a setting by scanning.
 *
 * Nothing reports a gap here: the lookups at `SettingsPage.tsx` fall back
 * silently (`tabIcons[tab.id] || tab.icon || Settings`), which is right for a
 * caller that supplies no icons at all and wrong for one that supplies most.
 * If you add a tab to `TABS`, add it here too.
 */
const TAB_ICONS: Record<string, React.ElementType> = {
  general: Settings,
  features: Zap,
  security: Shield,
  wallet: Wallet,
  social: Share2,
  logos: Palette,
};

// Tab descriptions
const TAB_DESCRIPTIONS: Record<string, string> = {
  general: "Theme, layout, and content preferences",
  features: "Trading, verification, and platform features",
  security: "Sign-in, two-factor, and bot protection",
  wallet: "Deposits, withdrawals, and fee settings",
  social: "Social media links and app store URLs",
  logos: "Brand logos, favicons, and app icons",
};

// Inject customRender for addon_aliases field
const ENHANCED_FIELD_DEFINITIONS = FIELD_DEFINITIONS.map((field) => {
  if (field.key === "addon_aliases") {
    return { ...field, customRender: AddonAliasesField };
  }
  return field;
});

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
  fields: ENHANCED_FIELD_DEFINITIONS,
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
            <p className="text-lg font-medium">
              {tCommon("loading_settings")}…...
            </p>
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
      config={SYSTEM_SETTINGS_CONFIG}
      settings={configSettings}
      onSettingsChange={setSettings}
      tabIcons={TAB_ICONS}
      tabDescriptions={TAB_DESCRIPTIONS}
    />
  );
}
