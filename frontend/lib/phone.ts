// Shared phone-number helpers — the single source of truth for phone handling
// across the app. Canonical format is E.164: a single leading "+" followed by
// 7–15 digits (e.g. +254711972926). Every phone input/validation should go
// through these helpers so formatting is identical everywhere.

/** Canonical E.164 validation: "+" then 7–15 digits. */
export const E164_REGEX = /^\+\d{7,15}$/;

/**
 * Normalize an arbitrary user-typed value toward E.164:
 * keep a single leading "+" (if present), strip every other non-digit, and cap
 * the digit count at 15. Returns "" for empty input and a lone "+" while the
 * user is still typing the country code.
 */
export function normalizePhoneE164(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "").slice(0, 15);
  if (!digits) return hasPlus ? "+" : "";
  return hasPlus ? `+${digits}` : digits;
}

/** True only for a fully-qualified E.164 number: "+" then 7–15 digits. */
export function isValidPhoneE164(value: string): boolean {
  return E164_REGEX.test((value || "").trim());
}

/**
 * Display helper. Returns the E.164 value unchanged when present; tolerates
 * legacy rows that were stored as bare digits by prefixing a "+".
 */
export function formatPhoneForDisplay(value?: string | null): string {
  const v = (value || "").trim();
  if (!v) return "";
  if (v.startsWith("+")) return v;
  return /^\d+$/.test(v) ? `+${v}` : v;
}
