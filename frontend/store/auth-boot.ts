"use client";

import { createContext, useContext } from "react";

/**
 * The session the SERVER resolved for THIS request.
 * =============================================================================
 *
 * WHY THIS EXISTS AT ALL — the bug it removes
 * -------------------------------------------
 * `useUserStore` starts at `user: null` and nothing wrote to it until
 * `ConfigInitializer`'s `useEffect` ran, which is *after* hydration, which is
 * *after* first paint. So for the entire boot window every consumer in the app
 * — 118 files — asked "is anyone signed in?" and got back `null`.
 *
 * `null` is not an answer. It is the same value for "nobody is signed in" and
 * for "we have not asked yet", and every call site read it as the first. That
 * single conflation is the whole defect:
 *
 *   - the header rendered Log in / Sign up to signed-in users, then swapped;
 *   - `/en/admin`'s queue tiles, QuickActions and product filters are
 *     `checkPermission(user, …)` over `null`, so they rendered EMPTY on the
 *     server and appeared only at hydration — a measured **+777px** document
 *     growth and CLS 0.1872 on that one route;
 *   - `dynamic-menu.tsx` short-circuits with `if (!user) return "Please login
 *     to view this page."`, so the entire dashboard menu was that one string in
 *     the server HTML;
 *   - every DataTable row-action menu server-rendered as permission-denied;
 *   - `useCheckout` never fired its balance fetch for a signed-in customer
 *     arriving from a merchant redirect, and showed "sign in to pay" over a
 *     funded account.
 *
 * The information was never missing. `app/[locale]/layout.tsx` already calls
 * `getUserProfile()` on every request (reads the `accessToken` cookie, verifies
 * it, fetches `/api/user/profile` over loopback in 4-19ms), already passes the
 * result to `<Providers profile={…}>`, and the profile is already serialised
 * into the RSC flight payload of every page. The answer was computed, shipped
 * to the browser, and then thrown away until an effect fired.
 *
 * WHY A CONTEXT AND NOT JUST WRITING THE STORE ON THE SERVER
 * ----------------------------------------------------------
 * `useUserStore` is a module-scope `create()` — in the SSR bundle that is ONE
 * object shared by every concurrent render in the Node process. A render-phase
 * write on the server is visible to every other in-flight request, so user A's
 * name, role and permission list would surface in user B's — or a guest's —
 * HTML. That is a cross-request data leak, not a staleness bug, and it is the
 * reason this seeding was never done.
 *
 * A React context is per-render-tree by construction, so it is the only
 * mechanism that is safe here. The server reads THIS; the client reads the
 * module store (one browser tab = one user, so the singleton is correct there).
 * See `store/user.ts` for how the two halves are kept in agreement.
 */
export interface AuthBoot {
  /**
   * The resolved session, or `null` for "resolved, and nobody is signed in".
   * Only meaningful when `resolved` is true.
   */
  profile: User | null;
  /**
   * Has boot-time auth resolution HAPPENED? This is the distinction that did
   * not exist before: `profile === null && resolved === true` is a guest, and
   * `resolved === false` is "we have not asked yet". They used to be the same
   * value and every consumer guessed wrong.
   *
   * False only outside the provider — i.e. in a tree that never went through
   * the root layout. Inside the app it is always true, because the root layout
   * always runs the resolution before it renders anything.
   */
  resolved: boolean;
}

/**
 * The value seen by any tree rendered outside `<AuthBootProvider>`. It says
 * "unresolved" rather than "guest" on purpose — an unwrapped tree genuinely
 * does not know, and must not claim otherwise.
 */
export const AUTH_BOOT_UNRESOLVED: AuthBoot = { profile: null, resolved: false };

const AuthBootContext = createContext<AuthBoot>(AUTH_BOOT_UNRESOLVED);

export const AuthBootProvider = AuthBootContext.Provider;

export function useAuthBoot(): AuthBoot {
  return useContext(AuthBootContext);
}
