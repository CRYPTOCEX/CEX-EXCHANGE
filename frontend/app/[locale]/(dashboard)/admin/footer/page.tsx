/**
 * /admin/footer — the footer's CONTENT: brand, legal line, socials, links.
 *
 * Thin by design, matching /admin/appearance and /admin/design: the page owns
 * the route and nothing else, so the same editor can be mounted elsewhere (an
 * onboarding wizard, a tenant setup flow) without dragging a route along.
 *
 * FULL VIEWPORT, with no wrapper of its own. `StudioShell` is `h-dvh` and paints
 * its own ground, so padding here would put a border of page background around a
 * full-bleed tool. The route has to be listed in `excludedPaths` in
 * provider/dashboard.provider.tsx for that to be true — the dashboard header is
 * `fixed top-0 z-50` and would sit on top of this screen's own action bar, which
 * is precisely how /admin/design ended up with an unclickable Save.
 *
 * Gated by `access.design` — see permission.ts. That file is read by
 * tools/build-permission.js, which generates middlewares/permissions.json;
 * adding a page without re-running it leaves the route falling back to the
 * generic `access.admin` check.
 */

import React from "react";

import { FooterStudio } from "@/components/admin/studio/footer-studio";

export default function AdminFooterPage() {
  return <FooterStudio />;
}
