"use client";

import { Loader2 } from "lucide-react";
import { SettingsPage } from "@/components/admin/settings";
/* The config is shared with `loading.tsx` — see the note on its declaration in
   `./settings`. Local `TAB_ICONS`/`TAB_DESCRIPTIONS` maps used to sit here and
   were passed as `tabIcons`/`tabDescriptions`; every entry was the `icon` and
   `description` already on the matching `BLOG_TABS` entry, and `SettingsPage`
   falls back to exactly those (`tabIcons[tab.id] || tab.icon`), so they were a
   second copy that could only ever disagree. */
import { BLOG_SETTINGS_CONFIG } from "./settings";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { m } from "framer-motion";

export function SettingsClient() {
  const tCommon = useTranslations("common");
  const { settings, setSettings, settingsFetched } = useConfigStore();

  if (!settingsFetched || Object.keys(settings).length === 0) {
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
            <p className="text-lg font-medium">{tCommon("loading")}...</p>
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
      config={BLOG_SETTINGS_CONFIG}
      settings={settings}
      onSettingsChange={setSettings}
    />
  );
}
