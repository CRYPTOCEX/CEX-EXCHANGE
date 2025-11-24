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
      const primaryKey = extractPrimaryKey(config.primary);
      if (primaryKey) {
        return column.disablePrefixSort
          ? primaryKey
          : `${column.key}.${primaryKey}`;
      }
    }
  }
  return column.key;
}

/**
 * Build sortable fields used for sorting dropdown options.
 * For non-compound columns, uses the explicit sortKey (if any) and applies prefixing if needed.
 * For compound columns, it extracts and prefixes the primary, secondary, and metadata fields.
 */
export function getSortableFields(
  columnDefs: ColumnDefinition[]
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
        label: column.title,
      });
    }

    // Handle compound columns:
    if (column.type === "compound" && column.render?.type === "compound") {
      const config = column.render.config;

      // 1) Primary field
      if (config.primary && config.primary.sortable !== false) {
        const primaryKey = extractPrimaryKey(config.primary) || column.key;
        const id = column.disablePrefixSort
          ? primaryKey
          : `${column.key}.${primaryKey}`;
        const primaryTitle = Array.isArray(config.primary.title)
          ? config.primary.title[0]
          : config.primary.title;
        fields.push({
          id,
          label: `${column.title} (${primaryTitle})`,
        });
      }

      // 2) Secondary field – prefixed with the compound column key.
      if (
        config.secondary &&
        config.secondary.sortable !== false &&
        config.secondary.key
      ) {
        fields.push({
          id: `${column.key}.${config.secondary.key}`,
          label: `${column.title} (${config.secondary.title})`,
        });
      }

      // 3) Metadata fields – also prefixed with the compound column key.
      if (config.metadata && Array.isArray(config.metadata)) {
        config.metadata.forEach((item) => {
          if (item.sortable !== false) {
            fields.push({
              id: `${column.key}.${item.key}`,
              label: `${column.title} (${item.title})`,
            });
          }
        });
      }
    }
  });

  return fields;
}
