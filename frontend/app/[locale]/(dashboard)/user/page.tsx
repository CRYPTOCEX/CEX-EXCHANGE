import { UserDashboardClient } from "./client";

/**
 * `/user` — the signed-in landing.
 *
 * IT DID NOT EXIST. `public/manifest.json` ships a PWA shortcut whose `url` is
 * `/user`, and `components/partials/dashboard/dynamic-menu.tsx` carries an
 * active-state branch for `normalizedPath === "/user"`, but this directory held
 * only `kyc/`, `notification/` and `profile/` — so the shortcut 404'd and the
 * menu's own base-route branch was unreachable from a URL.
 *
 * A server page over a client body, the shape every sibling here uses
 * (`user/kyc/page.tsx`, `user/notification/page.tsx`). Nothing on this landing
 * can be rendered on the server: every figure comes from the signed-in
 * session's own stores and fetches.
 *
 * NO `layout.tsx` IS ADDED FOR IT, DELIBERATELY. `(dashboard)/layout.tsx` draws
 * no chrome for non-admin routes (`provider/dashboard.provider.tsx` returns
 * children bare), so each `/user` screen brings its own — `kyc/layout.tsx`
 * mounts `SiteHeader` + `Footer` and `profile/layout.tsx` paints its own shell.
 * A `user/layout.tsx` with a header would nest ABOVE those and give `/user/kyc`
 * two headers, so the chrome lives in this route's own client instead.
 */
export default function UserDashboardPage() {
  return <UserDashboardClient />;
}
