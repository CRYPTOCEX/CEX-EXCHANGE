"use client";

import { SettingsPage, SettingsPageSkeleton } from "@/components/admin/settings";
/* The config is shared with `loading.tsx` - see the note on its declaration in
   `./settings`. Local `TAB_ICONS`/`TAB_DESCRIPTIONS` maps used to sit here and
   were passed as `tabIcons`/`tabDescriptions`; every entry was the `icon` and
   `description` already on the matching `AI_MARKET_MAKER_TABS` entry, and
   `SettingsPage` falls back to exactly those (`tabIcons[tab.id] || tab.icon`),
   so they were a second copy that could only ever disagree. */
import { AI_MARKET_MAKER_SETTINGS_CONFIG } from "./settings";
import { useConfigStore } from "@/store/config";

export default function SettingsClient() {
  const { settings, setSettings, settingsFetched } = useConfigStore();

  /**
   * THE PENDING STATE IS THE PAGE'S OWN SKELETON, NOT A SPINNER.
   * ==========================================================================
   *
   * This branch used to be a centred `h-[80vh]` column: a framer-motion
   * scale-in, a blurred orb behind a gradient plate, and a spinner over the word
   * "Loading". Three problems with that, in order of how much they cost:
   *
   *   1. `loading.tsx` in this very folder ALREADY renders
   *      `SettingsPageSkeleton` from the same `AI_MARKET_MAKER_SETTINGS_CONFIG`
   *      this page uses - a pending state measured from the real tab set and the
   *      real field count. So the route had two different pending states, and
   *      which one you saw depended on whether the settings store happened to be
   *      populated: the good one on a cold navigation, the spinner whenever the
   *      store was still filling. A second copy that can only disagree.
   *   2. R7 asks for a skeleton with the same box model as the content and rules
   *      out a top-level spinner explicitly. This one replaced the entire page,
   *      including its heading, so the whole screen jumped when settings landed.
   *   3. R12 caps motion at one entrance per page; this was an unconditional
   *      scale-in plus an infinite spin, neither of which called
   *      `useReducedMotion`.
   *
   * The condition is unchanged - `SettingsPage` reads `settings` directly and
   * would render every field empty before the store fills.
   */
  if (!settingsFetched || Object.keys(settings).length === 0) {
    return <SettingsPageSkeleton config={AI_MARKET_MAKER_SETTINGS_CONFIG} />;
  }

  return (
    <SettingsPage
      config={AI_MARKET_MAKER_SETTINGS_CONFIG}
      settings={settings}
      onSettingsChange={setSettings}
    />
  );
}
