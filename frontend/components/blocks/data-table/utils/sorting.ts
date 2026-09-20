// utils/sorting.ts

/**
 * Helper to prefix sort keys.
 * For custom columns we always prefix.
 * For other columns, we respect disablePrefixSort.
 */
function getPrefixedSortKey(
  column: ColumnDefinition,
  sortKeys: string[]
): string {
  if (column.type === "custom" || !column.disablePrefixSort) {
    return sortKeys.map((key) => `${column.key}.${key}`).join(",");
  }
  return sortKeys.join(",");
}

/**
 * Resolve the sort key of a single field inside a compound column.
 *
 * The compound column key is only a real relation when the row actually nests
 * the data under it (e.g. an `author` association). When the column is a purely
 * visual grouping of the row's own fields, `disablePrefixSort` marks it and the
 * sub-keys must be sent unprefixed — otherwise the API receives e.g.
 * `user.email` for the user list itself, which is not a valid column path and
 * makes the backend query fail.
 */
function resolveSubFieldSortKey(
  column: ColumnDefinition,
  field: { key?: string | string[]; sortKey?: string | string[] }
): string | undefined {
  const key = extractPrimaryKey(field);
  if (!key) return undefined;
  if (column.disablePrefixSort) return key;
  // Guard against double-prefixing a sortKey that already carries the path.
  return key.startsWith(`${column.key}.`) ? key : `${column.key}.${key}`;
}

/**
 * Helper to extract the primary key from a column's primary config.
 */
function extractPrimaryKey(primaryConfig: {
  sortKey?: string | string[];
  key?: string | string[];
}): string | undefined {
  if (primaryConfig.sortKey) {
    return Array.isArray(primaryConfig.sortKey)
      ? primaryConfig.sortKey[0]
      : primaryConfig.sortKey;
  } else if (Array.isArray(primaryConfig.key) && primaryConfig.key.length > 0) {
    return primaryConfig.key[0];
  } else if (typeof primaryConfig.key === "string") {
    return primaryConfig.key;
  }
  return undefined;
}

/**
 * Resolve the sort key for a given column.
 * - Uses the explicit sortKey if provided.
 * - For arrays, it applies prefixing based on column type and disablePrefixSort.
 * - Falls back to the primary field for compound columns.
 */
export function resolveColumnSortKey(column: ColumnDefinition): string {
  if (column.sortKey) {
    return Array.isArray(column.sortKey)
      ? getPrefixedSortKey(column, column.sortKey)
      : column.sortKey;
  }

  // Fallback for compound columns
  if (column.type === "compound" && column.render?.type === "compound") {
    const config = column.render.config;
    if (config?.primary) {
      const primaryKey = resolveSubFieldSortKey(column, config.primary);
      if (primaryKey) return primaryKey;
    }
  }
  return column.key;
}

/**
 * Build sortable fields used for sorting dropdown options.
 * For non-compound columns, uses the explicit sortKey (if any) and applies prefixing if needed.
 * For compound columns, it extracts and prefixes the primary, secondary, and metadata fields.
 * @param columnDefs - The column definitions
 * @param _t - Deprecated parameter, kept for backwards compatibility. Labels are now human-readable.
 */
export function getSortableFields(
  columnDefs: ColumnDefinition[],
  _t?: any
): { id: string; label: string }[] {
  const fields: { id: string; label: string }[] = [];

  columnDefs.forEach((column) => {
    // Handle non-compound columns:
    if (column.sortable && column.type !== "compound") {
      const id = Array.isArray(column.sortKey)
        ? getPrefixedSortKey(column, column.sortKey)
        : column.sortKey || column.key;
      fields.push({
        id,
        label: column.title || "",
      });
    }

    // Handle compound columns:
    if (column.type === "compound" && column.render?.type === "compound") {
      const config = column.render.config;

      // 1) Primary field
      if (config.primary && config.primary.sortable !== false) {
        const id = resolveSubFieldSortKey(column, config.primary) || column.key;
        const primaryTitle = Array.isArray(config.primary.title)
          ? config.primary.title[0]
          : config.primary.title;
        fields.push({
          id,
          label: `${column.title || ""} (${primaryTitle || ""})`,
        });
      }

      // 2) Secondary field
      if (config.secondary && config.secondary.sortable !== false) {
        const id = resolveSubFieldSortKey(column, config.secondary);
        if (id) {
          fields.push({
            id,
            label: `${column.title || ""} (${config.secondary.title || ""})`,
          });
        }
      }

      // 3) Metadata fields
      if (config.metadata && Array.isArray(config.metadata)) {
        config.metadata.forEach((item) => {
          if (item.sortable !== false) {
            const id = resolveSubFieldSortKey(column, item);
            if (id) {
              fields.push({
                id,
                label: `${column.title || ""} (${item.title || ""})`,
              });
            }
          }
        });
      }
    }
  });

  return fields;
}
