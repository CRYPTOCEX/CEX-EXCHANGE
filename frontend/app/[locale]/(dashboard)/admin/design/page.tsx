"use client";

/**
 * /admin/design — the site's whole visual identity, in one screen.
 *
 * Thin by design: the page owns the route and the loading gate, everything else
 * lives in components/admin/studio so the same editor can be embedded elsewhere
 * (an onboarding wizard, a tenant setup flow) without dragging a route along.
 *
 * This absorbed the old /admin/appearance, which owned the navbar and footer
 * LAYOUT. Picking a navbar and picking the colour it is painted in is one
 * decision, and it was being taken across two pages. Menu content and footer
 * content did NOT come with it — they are lists that need no live preview, and
 * they have their own screens at /admin/menus and /admin/footer.
 *
 * Gated by `access.design` — see permission.ts. That file is read by
 * tools/build-permission.js, which generates middlewares/permissions.json;
 * adding a page without re-running it leaves the route falling back to the
 * generic `access.admin` check.
 */

import React from "react";
import { Loader2 } from "lucide-react";

import { useConfigStore } from "@/store/config";
import { DesignStudio } from "@/components/admin/studio/design-studio";

export default function AdminDesignPage() {
  const settingsFetched = useConfigStore((s) => s.settingsFetched);

  /* Wait for settings before mounting. Without this the draft seeds itself from
     an empty store and the owner's saved theme appears to have been lost until
     they reload. */
  if (!settingsFetched) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface-2">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Loading site design</span>
      </div>
    );
  }

  /* No wrapper: `StudioShell` is the full-viewport frame. This route is in
     `excludedPaths` in dashboard.provider, so there is no dashboard header or
     sidebar to leave room for — deliberately, because a control rail beside a
     live preview wants every pixel, and sharing the top strip with the `fixed
     z-50` dashboard header made this page's own Save button unclickable. */
  return <DesignStudio />;
}
