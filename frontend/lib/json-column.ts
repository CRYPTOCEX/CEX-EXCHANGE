/**
 * Read a value that may arrive as JSON, a JSON string, or nothing at all.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * A `DataTypes.JSON` column does not reach the browser in one shape.
 *
 *   - The model getters parse it, so an endpoint that returns a row hands over
 *     an ARRAY (`withdrawMethod.customFields`, `depositMethod.customFields`).
 *   - Some endpoints build the same field by hand and `JSON.stringify` it
 *     first, so the very same property arrives as a STRING. On this tree that
 *     is the CRYPTO branch of
 *     `backend/src/api/finance/currency/[type]/[code]/index.get.ts` (:422 and
 *     :487) while the FIAT branches (:227-239, :363-367) send arrays.
 *
 * So `JSON.parse(value)` is wrong for one caller and right for the other, and
 * every consumer that picked a side broke the other one. `JSON.parse` of an
 * array throws — `JSON.parse("[object Object]")` — and the FIAT withdrawal form
 * caught that and returned "Invalid method configuration", which BLOCKED THE
 * WITHDRAWAL. The deposit form caught it and rendered
 * "error_loading_form_fields" in place of the fields.
 *
 * Quietest of all: `ManualDepositForm.tsx` had one parse whose catch was a bare
 * `console.error`, so the required-field loop never ran and a manual deposit
 * could be submitted with no payment reference on it.
 *
 * Accepting BOTH shapes is deliberate rather than a step toward making the
 * backend consistent. The string branch is load-bearing today; a consumer that
 * demanded arrays would break SPOT and ECO withdrawals the moment it shipped.
 */
export function asJsonArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value == null) return [];
  if (typeof value !== "string") return [];

  const text = value.trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    // A malformed value is "no fields", never an exception: every caller here
    // renders a form off it, and throwing takes the whole screen down.
    return [];
  }
}

/** The object-shaped sibling. Same contract, `{}` instead of `[]`. */
export function asJsonObject<T extends object = Record<string, any>>(
  value: unknown
): T {
  if (value == null) return {} as T;
  if (typeof value === "object" && !Array.isArray(value)) return value as T;
  if (typeof value !== "string") return {} as T;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as T)
      : ({} as T);
  } catch {
    return {} as T;
  }
}
