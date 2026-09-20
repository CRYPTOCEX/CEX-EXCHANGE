/* `MenuItem` is the ambient global declared in `frontend/types/menu.d.ts`; the
   file is not a module and cannot be imported from. */

/**
 * The visibility gates a custom (addon) menu can carry, evaluated the way
 * `getMenu` evaluates them for the core menus.
 *
 * The core menus run `extension:`, `settings:` and `settingConditions:`
 * through `isItemVisible` inside `getMenu`. The addon menus — the trees each
 * `(ext)` layout hands to `<SiteHeader>` — ran through NO gate at all: an
 * entry declaring `settingConditions: { stakingMode: "REAL" }` rendered in
 * every mode, and the ecosystem console's `ecosystemCustodialMode: "drain"`
 * condition on its Custodial Wallets entry hid nothing. This is the one
 * missing step, applied before the operator's menu override so the override
 * keeps its place as the last transform and can still only subtract.
 *
 * Only the three declarative gates. Permission and auth are deliberately not
 * evaluated here: an addon's routes are guarded server-side, and those menus
 * never carried a `permission` in the first place.
 */
export interface MenuGateContext {
  settings: Record<string, unknown> | null | undefined;
  extensions: string[] | null | undefined;
}

const ENUM_DEFAULTS: Record<string, string> = {
  // Mirrors the special cases in `frontend/config/menu.ts` `getSetting`: an
  // install that never saved the row must still satisfy a condition that
  // names its default, or a default-mode entry vanishes on every fresh site.
  landingPageType: "DEFAULT",
  stakingMode: "SYNTHETIC",
};

/**
 * The values each enum setting is allowed to hold.
 *
 * An UNRECOGNISED value used to be returned as-is, so a `stakingMode` of
 * "BANANA" matched neither the SYNTHETIC entry nor the REAL one and BOTH
 * staking items vanished from the menu — the product disappeared from the site
 * because a row held a typo. D1 is explicit that an absent or unknown mode is
 * SYNTHETIC, and the backend reader already coerces that way; this is the same
 * rule on the menu side, so the two cannot disagree about what a corrupt row
 * means.
 */
const ENUM_VALUES: Record<string, string[]> = {
  landingPageType: ["DEFAULT", "CUSTOM"],
  stakingMode: ["SYNTHETIC", "REAL"],
};

export function readMenuSetting(
  settings: MenuGateContext["settings"],
  key: string
): string | null {
  const raw = settings?.[key];
  if (raw === undefined || raw === null || raw === "") {
    return ENUM_DEFAULTS[key] ?? null;
  }
  const value = String(raw);
  if (!(key in ENUM_DEFAULTS)) return value;
  const upper = value.toUpperCase();
  const allowed = ENUM_VALUES[key];
  return allowed && !allowed.includes(upper) ? ENUM_DEFAULTS[key] : upper;
}

function settingIsOn(settings: MenuGateContext["settings"], key: string): boolean {
  const raw = settings?.[key];
  if (raw === true) return true;
  const value = String(raw ?? "").trim().toLowerCase();
  return value === "true" || value === "1";
}

export function isCustomMenuItemVisible(item: MenuItem, ctx: MenuGateContext): boolean {
  if (item.extension && !(ctx.extensions ?? []).includes(item.extension)) return false;
  if (item.settings && !item.settings.every((key) => settingIsOn(ctx.settings, key))) return false;
  if (item.settingConditions) {
    for (const [key, expected] of Object.entries(item.settingConditions)) {
      const actual = readMenuSetting(ctx.settings, key);
      const wanted = key in ENUM_DEFAULTS ? String(expected).toUpperCase() : String(expected);
      if (actual !== wanted) return false;
    }
  }
  return true;
}

/** Filter an addon menu tree, recursing into children. */
export function filterCustomMenu(items: MenuItem[], ctx: MenuGateContext): MenuItem[] {
  return items
    .filter((item) => isCustomMenuItemVisible(item, ctx))
    .map((item) =>
      item.child ? { ...item, child: filterCustomMenu(item.child, ctx) } : item
    );
}
