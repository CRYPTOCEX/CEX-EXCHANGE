/**
 * Format price with correct precision
 */
export function formatPrice(price: number, metadata: any): string {
  if (!price) return "0";
  const precision = metadata?.precision?.price || 2;
  return price.toFixed(precision);
}

/**
 * Format volume for display (K, M, B)
 */
export function formatVolume(volume: number): string {
  if (!volume) return "0";
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(1)}B`;
  } else if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`;
  } else if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return `${volume.toFixed(0)}`;
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
