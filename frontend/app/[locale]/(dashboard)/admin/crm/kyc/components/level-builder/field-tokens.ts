/**
 * One place for "what does a KYC field look like".
 *
 * This replaces four separate colour helpers that all answered the same
 * question differently: `getFieldTypeColor` existed three times keyed on the
 * field type (returning a bare hue name), and a fourth time keyed on the
 * category (returning a status token). See DESIGN-SYSTEM.md §4a and §8a.
 *
 * TWO THINGS ARE LOAD-BEARING HERE.
 *
 * 1. Every class string below is written out in full. Tailwind v4 scans source
 *    text and has no config to safelist against, so a class name that only
 *    exists after JavaScript runs is never emitted into the stylesheet and
 *    paints nothing at all. That is what the old helpers were doing: the hue
 *    name came back from a function and was pasted into a template literal, so
 *    those chips, badges and panels have never had a colour. Anything added
 *    here must stay a complete literal — never a fragment plus a variable.
 *
 * 2. Field types do not get a hue each. Every surface that paints a field also
 *    draws a distinct icon for it, prints its type name, and prints its
 *    category on its own badge; the library groups by category under headed
 *    sections. An eight-hue ramp on top of that encoded nothing that was not
 *    already legible, and the old map had already collapsed on itself — two of
 *    the four categories resolved to the same value. Status tokens are absent
 *    on purpose (R2): a field being an email field is not a success, and a date
 *    field is not a warning. What is left is the neutral surface ramp for
 *    identity and the accent for the one field actually in play.
 */

export type FieldCategory =
  | "basic"
  | "choice"
  | "special"
  | "contact"
  | "other";

const CATEGORY_BY_TYPE: Record<string, FieldCategory> = {
  TEXT: "basic",
  TEXTAREA: "basic",
  NUMBER: "basic",
  SELECT: "choice",
  MULTISELECT: "choice",
  CHECKBOX: "choice",
  RADIO: "choice",
  DATE: "special",
  FILE: "special",
  EMAIL: "contact",
  PHONE: "contact",
  ADDRESS: "contact",
};

/** Canonical field type -> category. The single source of this mapping. */
export const getFieldCategory = (type: string): FieldCategory =>
  CATEGORY_BY_TYPE[type] ?? "other";

const CATEGORY_LABEL: Record<FieldCategory, string> = {
  basic: "Basic",
  choice: "Choice",
  special: "Special",
  contact: "Contact",
  other: "Other",
};

/** Display name for a field type's category, e.g. "Contact". */
export const getFieldCategoryLabel = (type: string): string =>
  CATEGORY_LABEL[getFieldCategory(type)];

/**
 * Presentation tokens for field chrome. Keyed by the role the element plays,
 * not by which field it happens to describe.
 */
export const FIELD_TONE = {
  /** Icon chip beside a field name, sitting on a `card` ground. */
  chip: "bg-surface-3 text-muted-foreground",
  /** The same chip when it sits on the summary strip, which is `surface-3`. */
  chipOnStrip: "bg-card text-muted-foreground",
  /** Ground + hairline for the summary strip above the field editor. */
  strip: "bg-surface-3 border-border",
  /** Outline badge naming a field type or its category, on the strip. */
  badge: "bg-card text-muted-foreground border-border",
  /** Metadata bullet in the summary strip. */
  dot: "bg-border-strong",
  /** Rail down the left edge of a field-library card. */
  rail: "bg-border-strong",
  /** Ground + hairline for the ghost card previewing an incoming field. */
  preview: "bg-primary/5 border-primary/40",
} as const;
