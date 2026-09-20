/**
 * The catalogue of editable menus, and the arithmetic the Menus studio counts with.
 * ============================================================================
 *
 * WHY THE SCOPE IS NOT WRITTEN DOWN HERE
 *
 * Every scope string goes through `getExtensionMenuNamespace` + `menuScopeFor`
 * — the same two functions `site-header.tsx` calls when it RENDERS. An editor
 * that computes the key even slightly differently produces the worst failure
 * this feature has: the PUT succeeds, the screen says "Saved", and the site does
 * not change. There is no error anywhere to follow, and it is indistinguishable
 * from the override engine being broken. So the derivation is borrowed, never
 * restated, and a typo becomes a compile error instead of a silent no-op.
 *
 * NOT FILTERED BY WHICH EXTENSIONS ARE INSTALLED. The registry keys addons by
 * directory (`ai/market-maker`) and the settings list keys them by extension
 * name; they do not reliably match, so filtering would sometimes hide a menu the
 * owner wants with no way to reach it. An extra row in a searchable list costs
 * nothing — a missing one costs the feature. Editing the menu of a disabled
 * addon is harmless anyway: the override is inert until the addon renders.
 *
 * Computed once at module scope. The shipped menus are static imports, so this
 * is a single pass over ~34 arrays for the life of the bundle rather than work
 * repeated on every keystroke in the filter box.
 */

import { getExtensionMenuNamespace } from "@/components/partials/menu-translator";
import { adminMenu, userMenu } from "@/config/menu";
import { ADDON_MENUS } from "@/lib/chrome/addon-menus";
import { menuScopeFor } from "@/lib/chrome/menu-scope";
import {
  flattenMenu,
  isEmptyMenuOverride,
  type MenuNodeLike,
  type MenuOverride,
  type MenuOverrides,
} from "@/lib/chrome/menu-overrides";

/** Which rail section a menu belongs to. */
export type MenuGroupId = "core" | "extensions";

/** Where the menu is rendered — a chip in the list, not part of the scope. */
export type MenuSurface = "Admin" | "Site";

export interface EditableMenu {
  /** Must be byte-identical to the scope the renderer computes. */
  scope: string;
  label: string;
  group: MenuGroupId;
  surface: MenuSurface;
  items: MenuNodeLike[];
  /** Shipped rows, flattened — what the editor will list. */
  itemCount: number;
  /**
   * Lowercase haystack for the filter box, precomputed.
   *
   * It carries the RAW id as well as the display label, so `market-maker`
   * finds "AI Market Maker" — the title-casing is for reading, and a filter
   * that only matched the prettified form would fail the one query an admin
   * who knows the extension's directory name would actually type.
   */
  haystack: string;
}

/**
 * `ai/market-maker` -> `AI Market Maker`. DISPLAY ONLY — nothing downstream
 * parses it, so the acronym table is free to grow.
 */
const ACRONYMS: Record<string, string> = {
  ai: "AI",
  nft: "NFT",
  ico: "ICO",
  p2p: "P2P",
  faq: "FAQ",
  kyc: "KYC",
  hb: "Hummingbot",
};

export function titleCaseId(id: string): string {
  return id
    .split(/[/\-_]/)
    .filter(Boolean)
    .map((part) => ACRONYMS[part.toLowerCase()] ?? part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function buildEditableMenus(): EditableMenu[] {
  const core: EditableMenu[] = [
    entry({
      scope: menuScopeFor({ coreMenu: "admin" }) ?? "admin",
      label: "Admin sidebar",
      group: "core",
      surface: "Admin",
      items: adminMenu as MenuNodeLike[],
      id: "admin dashboard sidebar",
    }),
    entry({
      scope: menuScopeFor({ coreMenu: "user" }) ?? "user",
      label: "Site navigation",
      group: "core",
      surface: "Site",
      items: userMenu as MenuNodeLike[],
      id: "user site navigation header signed in",
    }),
  ];

  const addons: EditableMenu[] = [];
  for (const addon of ADDON_MENUS) {
    const { namespace } = getExtensionMenuNamespace(addon.id, addon.isAdmin);
    const scope = menuScopeFor({ namespace });
    /* `menuScopeFor` returns null for a menu with no stable identity. Such a
       menu cannot be addressed by an override, so listing it would be offering
       an edit that does nothing. */
    if (!scope) continue;
    /* `addon-menus.ts` is generated where every extension is present, so on an
       install that ships without one, its import is aliased to a stub whose
       menu is empty (see next.config.js). Listing it would offer an edit to
       navigation the site does not have. */
    if (addon.items.length === 0) continue;
    addons.push(
      entry({
        scope,
        label: titleCaseId(addon.id),
        group: "extensions",
        surface: addon.isAdmin ? "Admin" : "Site",
        items: addon.items,
        id: addon.id,
      })
    );
  }

  /* Sorted by label then surface, so an addon's two menus sit together and the
     admin one is never a screen away from the site one. */
  addons.sort((a, b) => a.label.localeCompare(b.label) || a.surface.localeCompare(b.surface));

  return [...core, ...addons];
}

function entry(input: {
  scope: string;
  label: string;
  group: MenuGroupId;
  surface: MenuSurface;
  items: MenuNodeLike[];
  id: string;
}): EditableMenu {
  return {
    scope: input.scope,
    label: input.label,
    group: input.group,
    surface: input.surface,
    items: input.items,
    itemCount: flattenMenu(input.items).length,
    haystack: `${input.label} ${input.id} ${input.scope} ${input.surface}`.toLowerCase(),
  };
}

export const EDITABLE_MENUS: readonly EditableMenu[] = Object.freeze(buildEditableMenus());

/**
 * Match a menu against what was typed.
 *
 * Whitespace-separated terms, ALL of which must appear somewhere in the
 * haystack. `stak` finds Staking in one keystroke run; `staking admin` narrows
 * to one of its two menus without the admin having to know that the list writes
 * that word last.
 */
export function matchesQuery(menu: EditableMenu, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  return terms.every((term) => menu.haystack.includes(term));
}

/**
 * Is this menu customised at all?
 *
 * `isEmptyMenuOverride` is THE test, everywhere — the list marker, the
 * "N customised" summary, the Reset button's visibility and the studio's
 * delete-when-empty rule all ask this one function. A second opinion about
 * what "customised" means is how a screen ends up badging a menu that has
 * nothing to reset.
 */
export function isMenuCustomised(override: MenuOverride | undefined): boolean {
  return !isEmptyMenuOverride(override);
}

/**
 * How many separate customisations one menu carries.
 *
 * Deliberately the same set of fields `isEmptyMenuOverride` tests, so a menu
 * badged "customised" can never report zero changes — a count that disagrees
 * with the marker beside it is worse than no count at all.
 */
export function countMenuChanges(override: MenuOverride | undefined): number {
  if (!override) return 0;
  return (
    override.hidden.length +
    Object.keys(override.labels).length +
    Object.keys(override.descriptions ?? {}).length +
    Object.keys(override.icons).length +
    Object.keys(override.order).length +
    override.custom.length
  );
}

/** The count broken into words, for the workspace header. */
export function describeMenuChanges(override: MenuOverride | undefined): string[] {
  if (!override) return [];
  const parts: string[] = [];
  if (override.hidden.length) parts.push(`${override.hidden.length} hidden`);
  const renamed = Object.keys(override.labels).length;
  if (renamed) parts.push(`${renamed} renamed`);
  const described = Object.keys(override.descriptions ?? {}).length;
  if (described) parts.push(`${described} described`);
  const icons = Object.keys(override.icons).length;
  if (icons) parts.push(`${icons} re-iconed`);
  if (override.custom.length) parts.push(`${override.custom.length} added`);
  /* Levels, not items — an admin who moved three siblings within one group made
     one reordering, and "3 reordered" would be a number they cannot map onto
     anything they did. */
  if (Object.keys(override.order).length) parts.push("reordered");
  return parts;
}

/** How many of the catalogue's menus are customised right now. */
export function countCustomisedMenus(overrides: MenuOverrides): number {
  let n = 0;
  for (const menu of EDITABLE_MENUS) {
    if (isMenuCustomised(overrides[menu.scope])) n += 1;
  }
  return n;
}
