import { cn } from "@/lib/utils";

export const getCellClasses = (
  columnId: string,
  isExpanded: boolean = false
) =>
  cn(
    // Responsive padding - smaller on mobile
    "py-2 px-2 sm:py-3 sm:px-4 border-none",
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
    // If the nested object exists, use it; otherwise fall back to ID
    if (nestedValue && typeof nestedValue === "object") {
      return { value: nestedValue, column: primaryColumn, useIdFallback: false };
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
