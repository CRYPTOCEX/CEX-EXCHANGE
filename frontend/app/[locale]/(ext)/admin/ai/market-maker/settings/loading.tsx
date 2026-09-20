"use client";

import { SettingsPageSkeleton } from "@/components/admin/settings";
import { AI_MARKET_MAKER_SETTINGS_CONFIG } from "./settings";

/**
 * Pending state for /admin/ai/market-maker/settings.
 * ============================================================================
 *
 * The original was a byte-for-byte copy of the binary-engine file next door —
 * the clearest possible demonstration of the duplicate-drift problem: two
 * routes with different titles, different tab sets and different field counts
 * shared one skeleton, so at most one of them could have been right.
 *
 * It drew `container ... pt-20 py-8` against the real `min-h-screen
 * bg-background pt-header`, omitted the ~105px hero band entirely, and added a
 * "System Status Banner" and a four-column tab strip that exist in neither
 * page. `pt-20` is 5rem frozen into a string, while `pt-header` resolves
 * through `--spacing-header` → `--header-height` and moves per chrome variant.
 *
 * The frame is now `components/admin/settings/layout.ts` and the pending state
 * `SettingsPageSkeleton`, which takes the SAME `SettingsPageConfig` the page
 * takes. Two routes sharing that component is correct precisely because each
 * passes its own config.
 *
 * `"use client"` is load-bearing: the config carries component references
 * (`TabDefinition.icon`) and functions (`FieldDefinition.showIf`), which cannot
 * cross the server-to-client boundary. As a server component this throws at
 * request time instead of rendering.
 *
 * The last duplicate is gone too: `title`, `description` and `backUrl` used to
 * be typed out here AND in `client.tsx` — the same two strings that, copied
 * once, produced the identical-twin file described above.
 * `AI_MARKET_MAKER_SETTINGS_CONFIG` now lives in `./settings` and both files
 * import it, so there is no second copy to drift. `client.tsx`'s local
 * `TAB_ICONS`/`TAB_DESCRIPTIONS` went the same way — every entry restated the
 * `icon`/`description` already on the matching `AI_MARKET_MAKER_TABS` entry,
 * which is what both the page and this skeleton fall back to.
 */
export default function MarketMakerSettingsLoading() {
  return <SettingsPageSkeleton config={AI_MARKET_MAKER_SETTINGS_CONFIG} />;
}
