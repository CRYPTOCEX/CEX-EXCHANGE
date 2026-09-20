/**
 * TURNING WHAT THE API SENT INTO A NUMBER, WITHOUT INVENTING ONE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS.
 *
 * Every money formatter in this frontend opens with the same two lines:
 *
 *     const num = typeof value === "string" ? parseFloat(value) : value;
 *     if (isNaN(num)) return "0";
 *
 * `parseFloat` is the wrong tool for the job, and the reason is specific to this
 * backend. Every Sequelize DECIMAL arrives over the wire as a STRING, so the
 * single most common wrong-number defect in this product is `a + b` on two of
 * them — which concatenates instead of adding. What reaches the formatter is
 * then a string like `"25.0000000010.00000000"`, and:
 *
 *     parseFloat("25.0000000010.00000000")  ->  25.000000001
 *     Number     ("25.0000000010.00000000") ->  NaN
 *
 * `parseFloat` stops at the second decimal point and returns a PLAUSIBLE WRONG
 * NUMBER. The customer is shown `$25.00` where they hold `$35.00`, the figure
 * looks entirely ordinary, and nothing anywhere reports a problem. That is
 * strictly worse than the raw defect: `2510` on a screen gets a support ticket
 * within the hour, `$25.00` does not.
 *
 * The second laundering shape is an already-formatted figure making a second
 * trip through a formatter:
 *
 *     parseFloat("1,234")  ->  1
 *
 * A thousand two hundred and thirty-four rendered as one.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS ACCEPTS, AND WHY EXACTLY THAT.
 *
 * ACCEPTED — everything a raw value from this API actually looks like:
 *   "25.00000000"   a DECIMAL column, the overwhelmingly common case
 *   "-1.5"  ".5"  "1e-8"  "1E+3"      ordinary numeric literals
 *   "  100  "                          whitespace, including the NBSP and
 *                                      narrow-NBSP `Intl` emits and JS `\s`
 *                                      does not match
 *   "$100"  "100₦"                     ONE currency SYMBOL, leading or
 *                                      trailing. A symbol is not a letter, so
 *                                      it cannot be confused with prose.
 *
 * REFUSED — returns NaN, so the caller's existing not-a-number branch runs:
 *   "25.0000000010.0"  two decimal points: a concatenated DECIMAL pair
 *   "1,234"            grouped: a figure that has already been formatted once
 *   "100 USD"          an alphabetic code: also already-formatted output, and
 *                      allowing it is what made an earlier cut return 12 for
 *                      "12abc" — parseFloat's behaviour, reintroduced
 *   "12abc"  "abc"  ""  null  undefined
 *
 * The grouping refusal is the one that deserves defending, because `parseFloat`
 * "handles" it. It does not: it returns 1 for 1,234. A screen printing 0 is a
 * visible defect that gets reported; a screen printing 1 is a number the reader
 * believes. Between two wrong renderings, the loud one is correct.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS DOES NOT DECIDE.
 *
 * It does not decide what a screen shows when the value is absent. That is a
 * product question — `$0.00` and `—` say different things to someone checking
 * their balance — and every existing formatter already answers it. This only
 * makes sure the answer is reached when the input is not a number, rather than
 * being stepped over by a parser that guesses.
 *
 * `isMisparsedNumeric` exists for the callers that want to tell the two apart:
 * an ABSENT value and a MALFORMED one are different defects with different
 * owners, and a formatter that wants to log or badge the second can.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Whitespace `Intl` emits that JS `\s` does not match. U+202F (narrow no-break
 * space) is the one that bites: `Intl.NumberFormat("fr")` uses it as a group
 * separator, and a naive `.trim()` leaves it in place so the whole figure reads
 * as NaN.
 */
const INTL_SPACE = /[\s   ]/g;

/**
 * A plain numeric literal, and nothing else. No grouping, no second decimal
 * point, no trailing units.
 */
const PLAIN_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * ONE CURRENCY SYMBOL, AND NEVER AN ALPHABETIC CODE.
 *
 * `"$100"` is a plain figure someone put a symbol in front of; `"100 USD"` is
 * FORMATTER OUTPUT, and formatter output going back into a formatter is the
 * second laundering shape this module refuses. Allowing an alphabetic affix
 * also cannot be made safe: the first cut accepted a trailing `[A-Za-z]{1,10}`
 * so that `"1.5 BTC"` would parse, and that made `toNumber("12abc")` return 12 —
 * the exact `parseFloat` behaviour being replaced, reintroduced by the
 * tolerance. Symbols are not letters, so there is no such ambiguity here.
 */
const SYMBOL_AFFIX = /^([$€£¥₹₦₽¢₩₪₫₴₺]?)\s*([+-]?[\d.eE+-]*)\s*([$€£¥₹₦₽¢₩₪₫₴₺]?)$/;

/**
 * Parse a value that is supposed to be a number, returning NaN when it is not.
 *
 * Use this instead of `parseFloat` at every boundary where a value arrives from
 * the API, a store, or a URL. It is a drop-in for the
 * `typeof v === "string" ? parseFloat(v) : v` line every formatter opens with.
 */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value === null || value === undefined) return NaN;
  if (typeof value !== "string") return NaN;

  const compact = value.replace(INTL_SPACE, "");
  if (!compact) return NaN;

  if (PLAIN_NUMBER.test(compact)) return Number(compact);

  /* One symbol, then the SAME strict test on what is left. Two dots still lose,
     which is the whole point — "$25.0000000010.0" is a concatenated pair
     wearing a dollar sign. */
  const parts = SYMBOL_AFFIX.exec(compact);
  if (parts) {
    const [, lead, digits, trail] = parts;
    // A symbol on both ends is not a shape any caller produces.
    if (lead && trail) return NaN;
    if ((lead || trail) && digits && PLAIN_NUMBER.test(digits)) return Number(digits);
  }

  return NaN;
}

/**
 * The value is present but is not a number — i.e. something upstream is broken,
 * as opposed to the value simply not having arrived yet.
 *
 * `formatCurrency(undefined)` on a page that is still loading and
 * `formatCurrency("25.0000000010.0")` on a page whose component adds two
 * DECIMAL strings both render the same "no number" branch today. They are not
 * the same event and a caller that wants to treat them differently needs this.
 */
export function isMisparsedNumeric(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value !== "string") return true;
  return Number.isNaN(toNumber(value));
}

/**
 * `toNumber` with a floor, for the many call sites that genuinely want "0 when
 * absent" and do not need to distinguish the cases. Named so the choice is
 * visible at the call site rather than hidden in a formatter.
 */
export function toNumberOr(value: unknown, fallback: number): number {
  const parsed = toNumber(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
