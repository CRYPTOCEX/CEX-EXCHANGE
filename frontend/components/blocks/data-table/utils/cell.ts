import { cn } from "@/lib/utils";

/**
 * DENSITY IS A TOKEN NOW — see plans/COMPONENT-SYSTEM.md.
 *
 * This one function classes every body cell in every table, for real rows AND
 * for the loading skeleton (`rows/skeleton/index.tsx` imports it too), which is
 * why the retrofit lands here rather than in twenty call sites — and why the
 * skeleton cannot drift out of step with the rows it stands in for.
 *
 * WHAT REPLACED WHAT, AND WHY IT STILL MEASURES THE SAME
 *
 *   px-2 sm:px-4  ->  the padding token, halved below `sm`.
 *       The token defaults to 1rem, so `sm:` is unchanged; the `calc(/2)` gives
 *       0.5rem on mobile, which is what `px-2` was. Halving rather than
 *       dropping the token on mobile means a density choice still reaches a
 *       phone — proportionally, since a phone has no room for a desktop gutter.
 *
 *   py-3          ->  a cell HEIGHT plus a smaller fixed pad.
 *       A body row had no height at all: it measured `py-3` (24px) plus a 20px
 *       line = 44px, purely emergent. That is unreachable from a token, because
 *       there is no single declaration to point one at. So the cell now carries
 *       `h-[--table-row-height]` (2.75rem = the same 44px) and keeps `py-1.5`
 *       as the floor under the text.
 *
 *       `height` on a `<td>` behaves as a MINIMUM — content that needs more
 *       gets more. That is the correct failure mode: a compact setting that
 *       clipped a wrapped cell would be a data-loss bug wearing a density
 *       control's clothes. It also means the shortest useful row is bounded by
 *       the line box, not by the slider, which is why the panel's range stops
 *       where it does.
 */
export const getCellClasses = (
  columnId: string,
  isExpanded: boolean = false
) =>
  cn(
    /* `border-none` was here and is deliberately gone. It was redundant —
       `TableCell` ships no border — but it is a UTILITY, so it outranked the
       components layer and would have made the row-separator token draw
       nothing at any width. Removing it changes no pixels today, because the
       token ships at 0px. */
    "py-2 px-[calc(var(--table-cell-padding-x)/2)]",
    "sm:py-1.5 sm:h-[var(--table-row-height)] sm:px-[var(--table-cell-padding-x)]",
    /* Text SIZE, striping, hover strength, row separators and the frame's own
       corners are not here — they are in the `[data-dt-frame]` block in
       globals.css. Two reasons, and neither is taste:

       `text-` and `font-` are AMBIGUOUS Tailwind prefixes (size vs colour,
       family vs weight). Disambiguating them needs a type hint this codebase
       uses nowhere else, and a hint that does not compile produces a class that
       silently never reaches the browser — the exact failure `design:debt`
       calls a dead class and does NOT catch for lengths.

       Striping and hover strength need `:nth-child` and a colour-mix against a
       token, which is not expressible as a utility at all. */
    isExpanded
      ? "first:rounded-tl-lg last:rounded-tr-lg"
      : "first:rounded-l-lg last:rounded-r-lg",
    // Responsive column widths - narrower on mobile
    // Select column has fixed width to prevent layout shift
    columnId === "select" && "w-[40px] min-w-[40px] max-w-[40px] sm:w-[48px] sm:min-w-[48px] sm:max-w-[48px]",
    columnId === "id" && "w-[80px] sm:w-[120px] min-w-[80px] sm:min-w-[120px] max-w-[80px] sm:max-w-[120px]",
    columnId === "email" && "w-[150px] sm:w-[250px]",
    !["id", "email", "select", "actions"].includes(columnId) && "w-[120px] sm:w-[180px]",
    columnId === "actions" && "w-[50px] sm:w-[80px]",
    "align-middle",
    "ltr:text-left rtl:text-right"
  );

export const getCellContentClasses = (isActionsColumn: boolean) =>
  cn(
    "flex items-center space-x-2",
    isActionsColumn ? "justify-center" : "truncate",
    "ltr:flex-row rtl:flex-row-reverse"
  );

export const processEndpointLink = (link: string, row: any): string => {
  return link.replace(/\[(\w+)\]/g, (_, key) => row[key] || "");
};

/**
 * Find the best primary column for card display.
 * Priority: compound column > name-like fields > description/text fields > first string column > first non-ID column
 */
export const getPrimaryColumn = (
  columns: ColumnDefinition[]
): ColumnDefinition | undefined => {
  if (!columns || columns.length === 0) return undefined;

  // Priority 1: Compound column (usually contains avatar + name)
  const compoundCol = columns.find(
    (col) => col.type === "compound" || col.render?.type === "compound"
  );
  if (compoundCol) return compoundCol;

  // Priority 2: Common "name" fields that make good primary display
  const nameFields = ["name", "title", "label", "username", "firstName", "fullName"];
  const nameCol = columns.find((col) =>
    nameFields.some((field) => col.key.toLowerCase().includes(field))
  );
  if (nameCol) return nameCol;

  // Priority 3: Description or text-like fields that typically have readable content
  const descFields = ["description", "subject", "message", "content", "summary", "note"];
  const descCol = columns.find((col) =>
    descFields.some((field) => col.key.toLowerCase().includes(field))
  );
  if (descCol) return descCol;

  // Priority 4: Email field (common identifier)
  const emailCol = columns.find((col) => col.key.toLowerCase().includes("email"));
  if (emailCol) return emailCol;

  // Priority 5: String type columns (avoid badge/select/date types as primary)
  const badgeTypes = ["select", "badge", "switch", "boolean", "date", "datetime", "number"];
  const stringCol = columns.find(
    (col) =>
      col.key !== "id" &&
      col.key !== "select" &&
      col.key !== "actions" &&
      !badgeTypes.includes(col.type) &&
      !badgeTypes.includes(col.render?.type || "")
  );
  if (stringCol) return stringCol;

  // Priority 6: First non-ID column
  const nonIdCol = columns.find(
    (col) => col.key !== "id" && col.key !== "select" && col.key !== "actions"
  );
  if (nonIdCol) return nonIdCol;

  // Fallback: First column
  return columns[0];
};

/**
 * Get a display value for the primary column, with fallback to ID
 */
export const getPrimaryDisplayValue = (
  row: any,
  primaryColumn: ColumnDefinition | undefined,
  getNestedValue: (obj: any, key: string) => any
): { value: any; column: ColumnDefinition | undefined; useIdFallback: boolean } => {
  if (!primaryColumn) {
    return { value: row.id, column: undefined, useIdFallback: true };
  }

  // Compound columns need the nested object (e.g., row.user, row.agent)
  // Extract the nested value using the column key
  const isCompound = primaryColumn.type === "compound" || primaryColumn.render?.type === "compound";
  if (isCompound) {
    const nestedValue = getNestedValue(row, primaryColumn.key);
    // If the nested object exists, use it
    if (nestedValue && typeof nestedValue === "object") {
      return { value: nestedValue, column: primaryColumn, useIdFallback: false };
    }

    /* A compound column whose key does NOT name a nested object is the common
       case, not the broken one: admin/crm/user declares `key: "user"` while the
       row carries firstName/lastName/email at the top level. `CompoundCell`
       already handles that — it falls back to `row` when `value` is not an
       object — so returning the row here renders the same header the table cell
       renders. Falling straight through to the id is what made every expanded
       user dialog title itself "#ec22deb0-1dbe-45e2-…" instead of the person's
       name.

       The id fallback still applies when the config resolves to NOTHING on the
       row, which is the case it was written for. */
    const config: any = (primaryColumn.render as any)?.config;
    const primaryKeys: string[] = config?.primary?.key
      ? Array.isArray(config.primary.key)
        ? config.primary.key
        : [config.primary.key]
      : [];
    const resolvesOnRow = primaryKeys.some((k) => {
      const v = getNestedValue(row, k);
      return v !== null && v !== undefined && v !== "";
    });

    if (resolvesOnRow) {
      return { value: row, column: primaryColumn, useIdFallback: false };
    }
    return { value: row.id, column: undefined, useIdFallback: true };
  }

  const value = getNestedValue(row, primaryColumn.key);

  // Check if value is empty/null/undefined - only for non-compound columns
  if (value === null || value === undefined || value === "" || value === "N/A") {
    return { value: row.id, column: undefined, useIdFallback: true };
  }

  return { value, column: primaryColumn, useIdFallback: false };
};
