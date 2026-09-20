/**
 * How the brand mark is drawn — ONE resolver, for every surface that draws it.
 * ============================================================================
 *
 * `navbarLogoDisplay` is a settings key (`config/settings.ts`, "Appearance"),
 * and three surfaces read it: the navbar, the footer, and the sidebar. Each had
 * its own copy of the same three lines — the same string comparisons, the same
 * `|| "SQUARE_WITH_NAME"` fallback, written out again — which is three chances
 * to default it differently and three places to edit when a fourth value is
 * added.
 *
 * WHY THE FUNCTIONS ARE SEPARATE, AND WHY BOTH ARE EXPORTED
 *
 * `normalizeLogoDisplay` answers "is this a value we recognise?" and returns
 * `null` when it is not. That null is the whole point: settings are TEXT (an
 * admin can put anything in the column, and an older install can hold a value a
 * newer build has dropped), so "unrecognised" has to be distinguishable from
 * "the default", or a stale row would silently outrank a good one further down
 * the chain.
 *
 * `resolveLogoDisplay` is the precedence rule, and it exists because there are
 * now TWO sources — see `store/brand-boot.ts` for why the server one had to be
 * added.
 */

export type LogoDisplay = "SQUARE_WITH_NAME" | "FULL_LOGO_ONLY" | "ICON_ONLY";

/**
 * What the platform draws when nobody has chosen. It matches the `defaultValue`
 * in `config/settings.ts` — if that changes, change this WITH it, or a fresh
 * install renders one mark before its settings land and a different one after.
 */
export const DEFAULT_LOGO_DISPLAY: LogoDisplay = "SQUARE_WITH_NAME";

/** `null` for anything this build does not draw. See the note above. */
export function normalizeLogoDisplay(raw: unknown): LogoDisplay | null {
  return raw === "SQUARE_WITH_NAME" ||
    raw === "FULL_LOGO_ONLY" ||
    raw === "ICON_ONLY"
    ? raw
    : null;
}

export interface LogoDisplaySources {
  /**
   * The value the SERVER resolved for this request, from the settings the root
   * layout already fetched. Present in the server HTML and in the very first
   * client render, which is what makes the mark stable across a reload.
   */
  boot?: unknown;
  /** `settings.navbarLogoDisplay` from the config store. */
  stored?: unknown;
  /**
   * Has the config store FETCHED settings in this session, as opposed to merely
   * rehydrating them from localStorage? (`settingsFetched`, which the store
   * deliberately does not persist.)
   */
  storedIsFresh?: boolean;
}

/**
 * WHICH SOURCE WINS, and why it is not simply "the store".
 *
 * A freshly fetched store wins, because that is the only source that can carry
 * an edit made in THIS session — an admin changing the setting expects the mark
 * beside them to change, not to change on their next reload.
 *
 * Otherwise the server's answer wins. It was fetched `no-store` for this exact
 * request, so it is never staler than localStorage, and preferring it is what
 * removes the swap: the same value renders on the server, on the hydration
 * pass, and after the settings effect fires, so there is no frame in which the
 * brand is the coded default and no frame in which it changes.
 *
 * A merely-rehydrated store is the last resort, for a tree with no provider
 * above it (a portal, a test, a preview iframe) — better the value this browser
 * saw last than a default that is wrong on most installs.
 */
export function resolveLogoDisplay({
  boot,
  stored,
  storedIsFresh = false,
}: LogoDisplaySources): LogoDisplay {
  if (storedIsFresh) {
    const fresh = normalizeLogoDisplay(stored);
    if (fresh) return fresh;
  }
  return (
    normalizeLogoDisplay(boot) ??
    normalizeLogoDisplay(stored) ??
    DEFAULT_LOGO_DISPLAY
  );
}
