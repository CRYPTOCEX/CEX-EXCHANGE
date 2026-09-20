/**
 * The shapes `/api/admin/system/icon` returns, and the two lookup tables every
 * piece of this page shares.
 *
 * The report is a WORK QUEUE, not an inventory: `items` are the symbols the
 * scan found with no usable icon, so a row is something to fix and the outcome
 * says whether it can be. `totalSymbols` is the whole catalog behind it, which
 * is what makes a coverage figure meaningful.
 */

export type IconItem = {
  symbol: string;
  /** The symbol as the catalog row spells it, before normalisation. */
  raw: string;
  bucket: string;
  /** Why it is in the queue: absent | placeholder | overwrite. */
  reason: string;
  outcome: string;
  source: string | null;
  detail: string | null;
  bytes: number | null;
  /** Every resolver that could have supplied it, in chain order. */
  sources?: string[];
};

export type IconReport = {
  generatedAt: string;
  /** When the scan behind this answer actually ran — see the route's cache. */
  scannedAt?: string;
  fromCache?: boolean;
  applied: boolean;
  existingIcons: number;
  placeholderIcons: number;
  totalSymbols: number;
  missing: number;
  missingByBucket: Record<string, number>;
  inScope: number;
  stats: {
    written: number;
    wouldWrite: number;
    unresolved: number;
    ambiguous: number;
    failed: number;
  };
  bySource: Record<string, number>;
  byOutcome: Record<string, number>;
  byBucket: Record<string, number>;
  itemCount: number;
  filteredCount: number;
  page: number;
  perPage: number;
  pageCount: number;
  truncated: boolean;
  items: IconItem[];
  message?: string;
};

export const BUCKETS = ["cex", "eco", "fiat", "fx"] as const;

export const OUTCOMES = [
  "would-write",
  "unresolved",
  "ambiguous",
  "convert-failed",
  "written",
] as const;

/**
 * The four asset classes take fixed ramp slots because they are a CATEGORY —
 * the same class must be the same colour in the coverage meter, its legend and
 * the table chip, or the three stop being one reading of the same data.
 * `fx` sits on the last slot deliberately: it is the class this page counts and
 * never fetches, so it should not share a colour with one it can act on.
 */
export const BUCKET_SLOT: Record<string, string> = {
  cex: "bg-chart-1",
  eco: "bg-chart-2",
  fiat: "bg-chart-3",
  fx: "bg-chart-5",
};

/**
 * Outcome tone. `would-write` is the good news on this page — it means the icon
 * can be fetched right now — so it takes the accent rather than a status
 * colour, leaving success for work already done.
 */
export const OUTCOME_TONE: Record<
  string,
  "primary" | "success" | "warning" | "destructive" | "neutral"
> = {
  written: "success",
  "would-write": "primary",
  ambiguous: "warning",
  unresolved: "destructive",
  "convert-failed": "destructive",
};

/** A number an operator can scan. 5,412 rather than 5412. */
export const count = (n: number | null | undefined) => (n ?? 0).toLocaleString();
