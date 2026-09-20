/**
 * Extension Menu Stub
 * ============================================================================
 *
 * Stands in for `app/[locale]/(ext)/<addon>/menu` on an install that does not
 * ship that addon.
 *
 * `lib/chrome/addon-menus.ts` is generated from the extension tree on a machine
 * where EVERY extension is present, and it imports each menu statically —
 * that is deliberate, because the admin menu editor is a client component and
 * cannot discover menus at runtime. The cost is that the committed file names
 * extensions a given licence may not include, and a missing one is a hard
 * "module not found" that kills the whole production build. `next.config.js`
 * aliases the absent ones here instead.
 *
 * An empty `menu` is the honest answer: the addon contributes no navigation
 * because it is not installed. `menus-catalog.ts` drops entries with no items
 * so the editor does not offer an addon that isn't there.
 *
 * NOTE: no `"use client"` here, unlike `ext-columns-stub`. Menus are plain data
 * imported into server components too, and a client-boundary module would hand
 * those a client reference proxy that throws the moment it is read.
 */

import type { MenuNodeLike } from "@/lib/chrome/menu-overrides";

export const menu: MenuNodeLike[] = [];

// Mark as stub for detection
(menu as any).__isStub = true;

export default menu;
