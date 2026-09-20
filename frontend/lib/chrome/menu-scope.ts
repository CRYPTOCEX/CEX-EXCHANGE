/**
 * Which stored override belongs to which rendered menu — the SCOPE KEY.
 * ============================================================================
 *
 * `menu-overrides.ts` resolves ONE menu against ONE patch. It has no opinion on
 * which patch that is, and it cannot: a `MenuOverrides` is keyed by scope, and
 * the scope is a fact about where the menu is mounted, not about its contents.
 * This module owns that mapping, and it is the ONLY place it is written down.
 *
 * WHY IT IS A SHARED HELPER AND NOT AN INLINE STRING
 *
 * Two independent pieces of code compute this key: the editor, when it saves,
 * and the renderer, when it reads. If they ever disagree the edit SAVES — the
 * PUT succeeds, the row updates, the editor says "Saved" — and then nothing
 * changes on the site, with no error anywhere to say why. That failure is
 * indistinguishable from "the override engine is broken", which is the bug class
 * this whole feature exists to remove. So both sides call this function; a typo
 * becomes a compile error instead of a silent no-op.
 *
 * THE RULE
 *
 *   Core menus     -> `admin` | `user`   (the two trees in `config/menu.ts`)
 *   Addon menus    -> the addon's i18n namespace: `ext_staking`,
 *                     `ext_admin_staking`, `ext_admin_ai_market-maker`, …
 *   Anything else  -> `null`, i.e. not overridable.
 *
 * WHY THE NAMESPACE IS THE ADDON KEY. Addon menu item keys COLLIDE, and not
 * marginally: grep the extension tree and there are 21 items keyed `dashboard`,
 * 14 keyed `settings`, 7 keyed `home`. Scoping by anything shared would make
 * "hide Staking's dashboard" hide Forex's and NFT's too — one click, twenty
 * menus, and the admin has no way to tell which edit did it. All 32 namespaces
 * in the app are distinct (verified: each appears exactly once), so the scope is
 * one menu wide. The namespace is unique per menu because `getExtensionMenuNamespace`
 * (components/partials/menu-translator.tsx) derives it as `ext_{id}` for the user
 * side and `ext_admin_{id}` for the admin side — so an addon's two menus, which
 * genuinely are two different menus with two different item sets, get two
 * different scopes rather than sharing one. Every one of the 32 addon layouts
 * passes it to `SiteHeader` already; nothing new has to be threaded anywhere.
 *
 * WHY `null` RATHER THAN A FALLBACK. A handful of non-addon call sites pass a
 * custom `menu` array WITHOUT declaring a namespace (finance, support, KYC, the
 * blog nav), so they inherit the default `"menu"`. Bucketing them under one
 * shared scope would recreate exactly the collision above: they all contain an
 * item keyed `dashboard` or `overview`, and hiding one would hide the others.
 * There is nothing else at those call sites that identifies the menu, so the
 * honest answer is that they are not editable yet — an editor listing them would
 * be offering an edit that quietly hits four other menus. Giving one of them a
 * namespace is all it takes to opt it in.
 */

import { applyMenuOverride, type MenuNodeLike, type MenuOverrides } from "./menu-overrides";

/**
 * The namespace `SiteHeader` falls back to when a caller declares none.
 *
 * It is also the namespace the CORE menus translate against, which is why it
 * cannot double as a scope key: `menu` would mean "the core menus" and "every
 * undeclared custom menu" at the same time.
 */
export const DEFAULT_MENU_NAMESPACE = "menu";

/** The two menus that live in `config/menu.ts`. */
export const CORE_MENU_SCOPES = ["admin", "user"] as const;
export type CoreMenuScope = (typeof CORE_MENU_SCOPES)[number];

export interface MenuScopeSource {
  /**
   * The core menu selector — `activeMenuType` / `SiteHeader`'s `menu` when it is
   * a string. Present means "this header renders a core menu".
   */
  coreMenu?: string | null;
  /** `translationNamespace`, for a menu supplied as an array of items. */
  namespace?: string | null;
  /**
   * An extension id (`staking`, `ai/market-maker`) plus which of its two menus.
   *
   * This is the EDITOR's way in. It enumerates addon menus as `{ id, isAdmin }`
   * pairs (see `addon-menus.ts`) and has no namespace string to hand, while the
   * renderer has the namespace and not the id. Both arrive at the same key
   * because the id form is resolved through the same derivation the namespace
   * registry uses — which is the entire reason this is one function and not two.
   */
  extensionId?: string | null;
  isAdmin?: boolean;
}

/**
 * The namespace an extension's menu translates against.
 *
 * MUST match `getExtensionMenuNamespace` in
 * `components/partials/menu-translator.tsx`, which is the definition — a nested
 * id like `ai/market-maker` becomes `ext_admin_ai_market-maker`, and the layouts
 * hardcode exactly that string. It is restated here rather than imported because
 * that module is a `"use client"` file pulling in `next-intl`, and `getMenu`
 * runs on the server. `menu-scope.test.ts` asserts the two agree, so the copy
 * cannot drift silently.
 */
function extensionNamespace(id: string, isAdmin: boolean): string {
  const slug = id.replace(/\//g, "_");
  return isAdmin ? `ext_admin_${slug}` : `ext_${slug}`;
}

/**
 * The scope key for one rendered menu, or `null` when it has no stable identity.
 *
 * Callers pass whichever fact they have. `coreMenu` wins, because a header
 * rendering a core menu also carries the default `"menu"` namespace and must not
 * be read as an addon.
 */
export function menuScopeFor(source: MenuScopeSource): string | null {
  const core = source.coreMenu;
  if (typeof core === "string" && core.length > 0) {
    /* Mirrors `getMenu`'s own selection — `activeMenuType === "admin" ? adminMenu
       : userMenu`. Any other value (`"guest"`) renders the USER tree, so it must
       resolve to the user scope; returning `"guest"` instead would file the
       override under a scope nothing ever reads, and the guest header would
       silently ignore edits made to the very menu it is displaying. */
    return core === "admin" ? "admin" : "user";
  }

  const id = typeof source.extensionId === "string" ? source.extensionId.trim() : "";
  if (id) return extensionNamespace(id, source.isAdmin === true);

  const ns = typeof source.namespace === "string" ? source.namespace.trim() : "";
  if (!ns || ns === DEFAULT_MENU_NAMESPACE) return null;
  return ns;
}

/**
 * Resolve a `MenuItem[]` against the stored overrides for `scope`.
 *
 * ORDER IS A CORRECTNESS PROPERTY, not a preference: `items` must ALREADY have
 * been through the permission and extension filters. An override applied first
 * could resurrect an entry the filter was about to drop — `order` re-lists a key,
 * `custom` adds a link into a group the role cannot reach — and the menu would
 * start advertising pages the API will refuse. Overrides are cosmetic; they run
 * last, over whatever survived.
 *
 * THE CAST, since it looks like a smell and is not one. `MenuNodeLike` closes
 * with `[extra: string]: unknown` so the engine can carry unknown fields through
 * untouched. `MenuItem` is an INTERFACE, and TypeScript grants implicit index
 * signatures to type aliases only — interfaces are open to declaration merging,
 * so it refuses, even though every field the engine touches (`key`, `title`,
 * `icon`, `child`, `megaMenu`) is declared on `MenuItem` with a compatible type.
 * Doing it here once keeps that cast out of the four call sites.
 */
export function applyMenuOverrideForScope(
  items: MenuItem[],
  overrides: MenuOverrides | undefined,
  scope: string | null
): MenuItem[] {
  if (!scope || !overrides) return items;
  const override = overrides[scope];
  if (!override) return items;
  return applyMenuOverride(items as unknown as MenuNodeLike[], override) as unknown as MenuItem[];
}
