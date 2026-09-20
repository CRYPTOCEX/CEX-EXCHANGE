"use client";

/**
 * Adds the admin-only menu scopes back, inside the dashboard.
 * ============================================================================
 *
 * WHY THIS EXISTS
 *
 * The chrome the site renders is fetched during SSR from an UNAUTHENTICATED
 * endpoint (`/api/content/chrome`), because the root layout has no session and
 * the navbar has to be correct in the first paint for anonymous visitors too.
 *
 * That endpoint deliberately withholds the `admin` and `ext_admin_*` menu
 * scopes. Those documents contain whatever an owner typed into the menu editor
 * for their back office — renamed items, hidden items, and custom links with
 * URLs they chose — and none of it is any of an anonymous visitor's business.
 * The shipped admin routes are already discoverable in the client bundle, but
 * an owner's own additions are not, and shipping them to the public is a leak
 * we would have introduced ourselves.
 *
 * So the dashboard, which DOES have a session, fetches the full document and
 * re-provides it. Public scopes still come from SSR and are unaffected; this
 * only merges the admin ones on top.
 *
 * WHY A FLASH IS ACCEPTABLE HERE, when it was not for the navbar variant:
 * this changes LABELS AND ORDER in the admin sidebar, not which component tree
 * renders. The sidebar is client-rendered from a store already, so there is no
 * server HTML for it to disagree with. Rendering the shipped labels for one
 * tick and then the owner's is a much smaller sin than shipping their back
 * office layout to everyone who loads the marketing page.
 *
 * FAILURE MODE IS "NO OVERRIDES", NEVER "NO MENU". Any failure leaves the base
 * chrome in place, so the sidebar renders exactly what it renders today.
 */

import * as React from "react";
import { usePathname } from "@/i18n/routing";

import { $fetch } from "@/lib/api";
import { ChromeValueProvider, useChrome } from "@/components/chrome/chrome-provider";
import { normalizeMenuOverrides, type MenuOverrides } from "@/lib/chrome/menu-overrides";
import type { ChromeConfig } from "@/lib/chrome/variants";

const ADMIN_CHROME_URL = "/api/admin/content/chrome";

/**
 * Is this an admin surface?
 *
 * Deliberately a PATH test and not a role test. It decides whether to make the
 * request at all, and the server decides whether to answer it — so a wrong
 * answer here costs one refused request, never access. The path is matched
 * anywhere in the pathname because admin lives under two different route
 * groups: `/{locale}/admin/...` for the core dashboard and
 * `/{locale}/admin/{ext}/...` for the 19 extension back offices. Mounting per
 * layout instead would have meant touching every one of them, and missing one
 * would silently drop that addon's menu customisations.
 */
export function isAdminSurface(pathname: string | null): boolean {
  if (!pathname) return false;
  return /(^|\/)admin(\/|$)/.test(pathname);
}

export function AdminChromeProvider({ children }: { children: React.ReactNode }) {
  const base = useChrome();
  const pathname = usePathname();
  const wanted = isAdminSurface(pathname);
  const [adminScopes, setAdminScopes] = React.useState<MenuOverrides | null>(null);

  React.useEffect(() => {
    /* Nothing is fetched on public pages — this component is mounted globally
       so that both admin route groups are covered, and on every other page it
       must cost exactly nothing. */
    if (!wanted) return;
    let alive = true;

    void (async () => {
      /* `silent` because a signed-in non-admin will legitimately be refused
         here, and that is not worth a toast. `$fetch` never throws — it always
         resolves to `{ data, error }` — so there is nothing to catch. */
      const { data } = await $fetch<{ menuOverrides?: unknown }>({
        url: ADMIN_CHROME_URL,
        silent: true,
      });
      if (!alive || !data) return;
      setAdminScopes(normalizeMenuOverrides(data.menuOverrides));
    })();

    return () => {
      alive = false;
    };
  }, [wanted]);

  const value = React.useMemo<ChromeConfig>(() => {
    if (!adminScopes) return base;
    /* Admin scopes are merged ON TOP of the public ones rather than replacing
       them: the admin response is the full document, but the SSR value may
       already carry a preview override pushed in by the chrome editor, and
       clobbering that would make the editor's live preview stop responding
       inside the dashboard. */
    return { ...base, menuOverrides: { ...base.menuOverrides, ...adminScopes } };
  }, [adminScopes, base]);

  return <ChromeValueProvider value={value}>{children}</ChromeValueProvider>;
}
