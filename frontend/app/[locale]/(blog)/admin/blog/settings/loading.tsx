"use client";

import { SettingsPageSkeleton } from "@/components/admin/settings";
import { BLOG_SETTINGS_CONFIG } from "./settings";

/**
 * Pending state for /admin/blog/settings.
 * ============================================================================
 *
 * The original had no frame AT ALL — four grey rectangles in a `space-y-6`,
 * with no root, no hero band, no container and no padding. It inherited
 * whatever box its parent happened to give it, so the settled page's
 * `min-h-screen bg-background pt-header` root, its full-bleed `border-b
 * border-border bg-card` band (~105px) and BOTH of its `container mx-auto px-4
 * py-6 lg:py-8` boxes arrived as pure shift. The `md:grid-cols-2` pair of
 * `h-64` blocks it drew has no counterpart in `SettingsPage` either; the real
 * body is `flex-col lg:flex-row gap-6` around a `w-72` sidebar.
 *
 * Replacing it with a hand-written copy of the frame only moved the problem.
 * The frame is now `components/admin/settings/layout.ts` and the pending state
 * `SettingsPageSkeleton`, which takes the SAME `SettingsPageConfig` the page
 * takes, so tab labels, icons, descriptions and field counts come from
 * `./settings` — the page's own module — and cannot drift.
 *
 * `"use client"` is load-bearing: the config carries component references
 * (`TabDefinition.icon`) and functions (`FieldDefinition.showIf`), which cannot
 * cross the server-to-client boundary. As a server component this throws at
 * request time instead of rendering.
 *
 * The last duplicate is gone too: `title`, `description` and `backUrl` used to
 * be typed out here AND in `client.tsx`. `BLOG_SETTINGS_CONFIG` now lives in
 * `./settings` and both files import it, so there is no second copy to drift.
 * `client.tsx`'s local `TAB_ICONS`/`TAB_DESCRIPTIONS` went the same way — every
 * entry restated the `icon`/`description` already on the matching `BLOG_TABS`
 * entry, which is what both the page and this skeleton fall back to.
 */
export default function BlogSettingsLoading() {
  return <SettingsPageSkeleton config={BLOG_SETTINGS_CONFIG} />;
}
