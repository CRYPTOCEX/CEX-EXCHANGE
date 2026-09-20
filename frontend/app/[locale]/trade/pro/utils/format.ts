/**
 * Number formatting for the Pro trading workspace.
 *
 * Locale is pinned to en-US on purpose. These panels render during the first
 * paint, so a locale-dependent group separator would hydrate differently than
 * it was serialized and React would blow away the whole subtree.
 */

/** Fixed-precision with thousand separators: 190240.24 -> "190,240.24". */
export function formatNumber(value: number, precision = 2): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return (0).toFixed(precision);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

/**
 * Same, but abbreviates once a balance stops fitting its field.
 *
 * The threshold is a million, not a thousand: a trading form is read for exact
 * numbers, and "190.24K" hides four significant digits of a balance the user is
 * about to size an order against.
 */
export function formatCompact(value: number, precision = 2): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return (0).toFixed(precision);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  return formatNumber(n, precision);
}
