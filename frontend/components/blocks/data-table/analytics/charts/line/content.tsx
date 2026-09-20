/**
 * The DataTable analytics config shape -> the shared chart kit.
 *
 * This file, plus bar/, stacked-bar/ and area/content.tsx, used to be four
 * copies of the same 120 lines — same axes, same grid, same hand-rolled tooltip
 * — and they had drifted apart in the two places that matter: the line and bar
 * charts assigned series colour with `variants[index === 0 ? "info" : "success"]`
 * (STATUS tokens used as identity, and a hard cap of two distinguishable
 * series), and all four ran the TOOLTIP value through the compact formatter, so
 * hovering a bar of 12,483 read "12K".
 *
 * All four now render through `SeriesChart`. The other three files are gone and
 * this is the only thing left of them: the mapping.
 */
export function seriesFromConfig(config: any) {
  return (config?.metrics ?? []).map((metric: string) => ({
    key: metric,
    label: config?.labels?.[metric] || metric,
  }));
}
