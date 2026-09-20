import { toNum } from "@/lib/precision-utils";

/**
 * Format price with correct precision.
 * Coerces via toNum first: ticker/market values can arrive as strings, and a
 * bare `price.toFixed()` on a string throws "toFixed is not a function".
 */
export function formatPrice(price: number | string, metadata: any): string {
  const n = toNum(price);
  if (!n) return "0";
  const precision = metadata?.precision?.price || 2;
  return n.toFixed(precision);
}

/**
 * Format volume for display (K, M, B)
 */
export function formatVolume(volume: number | string): string {
  const n = toNum(volume);
  if (!n) return "0";
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)}B`;
  } else if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  } else if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return `${n.toFixed(0)}`;
}

/**
 * Parse volume string back to number for sorting
 */
export function parseVolume(volumeStr: string): number {
  if (!volumeStr) return 0;

  const multiplier = volumeStr.endsWith("B")
    ? 1_000_000_000
    : volumeStr.endsWith("M")
      ? 1_000_000
      : volumeStr.endsWith("K")
        ? 1_000
        : 1;

  const numericPart = Number.parseFloat(volumeStr.replace(/[KMB]/g, ""));
  return isNaN(numericPart) ? 0 : numericPart * multiplier;
}
