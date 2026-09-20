import type { LucideIcon } from "lucide-react";

import { resolveIcon } from "@/components/ui/icon";

/**
 * Analytics configs send an icon NAME, not a component, so it has to be
 * resolved against a map.
 *
 * WHAT WAS WRONG. The map held 41 PascalCase Lucide names and returned
 * `undefined` for everything else, so `KpiCard` fell back to a generic
 * `Activity` glyph. But a census of the 632 KPI cards on the platform found
 * that 208 of the 210 distinct icon names in circulation are **Iconify**
 * names — `mdi:check-circle` (92 uses), `mdi:clock-outline` (54),
 * `mdi:close-circle` (47) — and not one of them was in the map. The practical
 * effect was that almost every KPI on every admin table drew the same icon, so
 * the icon carried no information at all.
 *
 * WHY THE TABLE IS GONE. The fix for that census was a 198-entry alias table
 * living here, in the data-table bundle. It was correct, and it was the THIRD
 * private copy of the same idea — `symbol-explorer.tsx` and `rail-icon.tsx` had
 * each worked out their own, and 141 other files had not, and so still fetched
 * their glyphs from `api.iconify.design` at runtime. That table is now the seed
 * of the shared registry in `components/ui/icon`, which every renderer resolves
 * against, and `pnpm gate:icons` fails the build on a name none of them knows.
 *
 * Every name this file used to answer still resolves — the 22 PascalCase names
 * and 59 aliases that existed only here were merged into the registry rather
 * than dropped, because analytics configs (including an addon's) can name a
 * glyph no file in this repo happens to write.
 *
 * `kpiIconMap` is no longer exported: nothing imported it, and it was the table
 * itself.
 */

/**
 * @returns the icon component for `name`, or `undefined` if unknown.
 *
 * The cast is safe and deliberate: the registry also serves the vendored brand
 * marks, which take the same `className`/`size`/SVG props as a Lucide icon but
 * are not literally `LucideIcon`. Callers only ever render the result.
 */
export function resolveKpiIcon(name?: string | null): LucideIcon | undefined {
  return resolveIcon(name) as LucideIcon | undefined;
}
