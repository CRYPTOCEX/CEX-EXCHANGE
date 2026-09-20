/**
 * /admin/menus — edit the menus the site renders, and nothing else.
 *
 * Split out of the /admin/appearance tab strip. Menus were one of three tabs
 * sharing a 400px control rail with a live preview, which is the wrong shape for
 * them twice over: 34 menus do not fit a dropdown, and a menu is a list that
 * gains nothing from being previewed at 81% scale in an iframe. Their own route
 * gets them the full width and their own search.
 *
 * Thin by design, matching /admin/design and /admin/appearance: the page owns
 * the route and everything else lives in components/admin/studio, so the same
 * editor can be embedded elsewhere (an onboarding wizard, a tenant setup flow)
 * without dragging a route along with it.
 *
 * NO WRAPPER, NO PADDING. `StudioShell` is `h-dvh` and full-bleed — it draws its
 * own top bar and owns the viewport. This route must therefore be listed in
 * `excludedPaths` in provider/dashboard.provider.tsx alongside /admin/design and
 * /admin/appearance; without that the `fixed z-50` dashboard header sits on top
 * of the studio's own bar and the Save button cannot be clicked.
 *
 * Gated by `access.design` — see permission.ts. That file is read by
 * tools/build-permission.js, which generates middlewares/permissions.json;
 * adding a page without re-running it leaves the route falling back to the
 * generic `access.admin` check.
 */

import React from "react";

import { MenusStudio } from "@/components/admin/studio/menus-studio";

export default function AdminMenusPage() {
  return <MenusStudio />;
}
