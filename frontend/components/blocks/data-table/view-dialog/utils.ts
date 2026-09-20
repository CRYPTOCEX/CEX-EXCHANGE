import type {
  ColumnDefinition,
  FormConfig,
  ViewConfig,
  ViewDialogSize,
  ViewFieldConfig,
  ViewSectionConfig,
} from "../types/table";

/** Read a (possibly dotted) path off an object. */
export function getNestedValue(obj: any, key: string): any {
  if (!obj || !key) return undefined;
  return key.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
}

/** Keys that are table plumbing, never content. */
const STRUCTURAL_KEYS = new Set(["select", "actions"]);

/**
 * Panel widths.
 *
 * Plain `max-w-*`, deliberately — the shared Dialog uses `sm:max-w-*` and a
 * caller-supplied `max-w-*` loses to it above the `sm` breakpoint, which is why
 * `className="max-w-4xl"` on a <DialogContent> does nothing. This panel is not
 * a DialogContent: it owns its own width and nothing competes, so the unprefixed
 * utility is the one that applies at every width.
 */
const SIZE_CLASS: Record<ViewDialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-[96rem]",
};

export function viewDialogSizeClass(size: ViewDialogSize | undefined): string {
  return SIZE_CLASS[size ?? "2xl"] ?? SIZE_CLASS["2xl"];
}

/**
 * Width when the caller did not pick one.
 *
 * Derived from how much there is to show rather than fixed at 600px: a
 * four-field lookup table should not open a half-empty 900px panel, and a
 * 24-field user record should not be squeezed into one column. `hasCustom`
 * covers sections that bring their own JSX (order lines, ledgers, payload
 * dumps), which always want room.
 *
 * `weight` is a CONTENT count, not a tile count — six short enums and six JSON
 * payloads are not the same dialog, so a wide field counts double.
 */
export function autoViewDialogSize(
  weight: number,
  hasCustom: boolean
): ViewDialogSize {
  if (hasCustom) return weight > 12 ? "5xl" : "4xl";
  if (weight <= 4) return "lg";
  if (weight <= 8) return "2xl";
  if (weight <= 14) return "3xl";
  if (weight <= 24) return "4xl";
  return "5xl";
}

/** Types that occupy the full grid row, so they count double toward the width. */
const WIDE_TYPES = new Set(["textarea", "editor", "compound", "customFields", "image"]);

function columnWeight(column: ColumnDefinition): number {
  return WIDE_TYPES.has(column.type || "") ? 2 : 1;
}

/**
 * The record's own timestamps. They are real data but the lowest-signal data in
 * any panel, and in a derived section they interleave with the fields an
 * operator actually opened the dialog for.
 */
const TIMESTAMP_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "deletedAt",
  "lastLogin",
  "lastSeen",
  "verifiedAt",
  "completedAt",
  "processedAt",
  "expiresAt",
]);

/** Image-ish columns that belong in the header plate, not in a key/value tile. */
const MEDIA_KEY = /^(avatar|image|logo|icon|photo|picture|thumbnail|banner|cover)$/i;

function isMediaColumn(column: ColumnDefinition): boolean {
  return column.type === "image" && MEDIA_KEY.test(column.key.split(".").pop() || "");
}

export function evalCondition(
  condition: boolean | ((row: any) => boolean) | undefined,
  row: any
): boolean {
  if (condition === undefined) return true;
  if (typeof condition === "function") {
    try {
      return Boolean(condition(row));
    } catch {
      return true;
    }
  }
  return Boolean(condition);
}

/**
 * Build a column definition for a key that has no top-level column of its own
 * because it lives inside a compound column's config.
 *
 * The form layer does the same thing but only when the caller names the
 * compound (`{ key, compoundKey }`). The view has no such hint, so every
 * compound column is scanned. Without this a derived section silently dropped
 * fields that render perfectly well in the table.
 */
function extractFromCompoundColumns(
  columns: ColumnDefinition[],
  key: string
): ColumnDefinition | undefined {
  for (const col of columns) {
    const config: any = (col as any).render?.config;
    if (col.type !== "compound" || !config) continue;

    if (config.image?.key === key) {
      return {
        key,
        title: config.image.title || key,
        type: "image",
        description: config.image.description,
      } as ColumnDefinition;
    }

    if (config.primary) {
      const keys = Array.isArray(config.primary.key)
        ? config.primary.key
        : [config.primary.key];
      const titles = Array.isArray(config.primary.title)
        ? config.primary.title
        : [config.primary.title];
      const index = keys.indexOf(key);
      if (index !== -1) {
        return {
          key,
          title: titles[index] || titles[0] || key,
          type: "text",
          icon: config.primary.icon,
        } as ColumnDefinition;
      }
    }

    if (config.secondary?.key === key) {
      return {
        key,
        title: config.secondary.title || key,
        type: config.secondary.type === "email" ? "text" : config.secondary.type || "text",
        icon: config.secondary.icon,
      } as ColumnDefinition;
    }

    if (Array.isArray(config.metadata)) {
      const meta = config.metadata.find((m: any) => m.key === key);
      if (meta) {
        return {
          key,
          title: meta.title || key,
          type: meta.type || "text",
          icon: meta.icon,
          options: meta.options,
          // A metadata item's `render` takes the value only; CellRenderer's
          // custom form takes (value, row), so it is adapted rather than
          // passed straight through.
          render: meta.render
            ? { type: "custom", render: (value: any) => meta.render(value) }
            : undefined,
        } as ColumnDefinition;
      }
    }
  }
  return undefined;
}

/** Find the column backing a key, including keys that only exist inside a compound. */
export function resolveColumn(
  columns: ColumnDefinition[],
  key: string
): ColumnDefinition | undefined {
  return (
    columns.find((col) => col.key === key || (col as any).baseKey === key) ||
    extractFromCompoundColumns(columns, key)
  );
}

/** A field, once its column has been resolved and overrides merged in. */
export interface ResolvedViewField {
  key: string;
  title: string;
  icon?: any;
  column?: ColumnDefinition;
  config: ViewFieldConfig;
}

/** A section, once conditions ran and its fields resolved. */
export interface ResolvedViewSection {
  id: string;
  title?: string;
  description?: string;
  icon?: any;
  fields: ResolvedViewField[];
  render?: (row: any, ctx: any) => React.ReactNode;
  columns: 1 | 2 | 3 | 4;
  variant: "tiles" | "rows" | "plain";
  collapsible: boolean;
  defaultCollapsed: boolean;
  tab?: string;
}

function toFieldConfig(field: string | ViewFieldConfig): ViewFieldConfig {
  return typeof field === "string" ? { key: field } : field;
}

/**
 * Turn `formConfig` groups into view sections.
 *
 * Nearly every admin table in the product already declares a `formConfig` with
 * titled, iconed, prioritised groups for its create/edit form — the exact
 * grouping a details panel wants. Reusing it means a table gets a structured
 * dialog without its page being touched at all, which is what makes this
 * worth doing across ~200 tables instead of by hand.
 *
 * `edit` is preferred over `create` because it is the group set that describes
 * an EXISTING record (create forms sometimes omit read-only fields).
 */
function sectionsFromFormConfig(
  formConfig: FormConfig | undefined
): ViewSectionConfig[] {
  const groups = formConfig?.edit?.groups ?? formConfig?.create?.groups;
  if (!groups?.length) return [];

  return groups.map((group, index) => ({
    id: group.id || `form-group-${index}`,
    title: group.title,
    description: group.description,
    icon: group.icon,
    priority: group.priority ?? index + 1,
    // Group conditions take form VALUES; a row is the closest analogue and the
    // predicates in practice read plain fields, so they are applied as-is.
    condition: group.condition as any,
    fields: group.fields.map((field) =>
      typeof field === "string" ? field : field.key
    ),
  }));
}

export interface ResolveSectionsArgs {
  viewConfig?: ViewConfig;
  formConfig?: FormConfig;
  columns: ColumnDefinition[];
  row: any;
  /** Column shown in the dialog header; excluded from the body. */
  primaryKey?: string;
  /** Translated title for the catch-all section. */
  otherTitle: string;
  /** Translated title for the collapsed timestamp section. */
  timestampsTitle: string;
}

export interface ResolvedView {
  sections: ResolvedViewSection[];
  /**
   * How wide this table's dialog should be, weighted from its COLUMNS rather
   * than from the fields this particular row resolved to.
   *
   * Per-row counting looked correct and read as a bug: field `condition`s run
   * per row, so a fully-populated record opened at one width and the next row
   * down opened narrower, and the panel appeared to jump around as an operator
   * paged through. A table has one width.
   */
  fieldCount: number;
  hasCustomSection: boolean;
  /** Image column promoted to the header plate, if any. */
  mediaColumn?: ColumnDefinition;
}

/**
 * Resolve the dialog body: explicit sections, else derived from `formConfig`,
 * else one flat section of every column (the historic behaviour).
 */
export function resolveViewSections({
  viewConfig,
  formConfig,
  columns,
  row,
  primaryKey,
  otherTitle,
  timestampsTitle,
}: ResolveSectionsArgs): ResolvedView {
  const exclude = new Set(viewConfig?.excludeFields ?? []);

  let contentColumns = columns.filter(
    (col) =>
      !STRUCTURAL_KEYS.has(col.key) &&
      !exclude.has(col.key) &&
      col.key !== primaryKey
  );

  /* An avatar/logo column is promoted to the header plate rather than becoming
     a tile. "AVATAR / No Image" — a caption where a face should be — was the
     most conspicuous artefact in the default dialog, and it is not a key/value
     pair in the first place. Only for the zero-config path: a hand-written
     `sections` list that names the image column means it there deliberately. */
  const mediaColumn = viewConfig?.sections?.length
    ? undefined
    : contentColumns.find(isMediaColumn);
  if (mediaColumn) {
    contentColumns = contentColumns.filter((col) => col.key !== mediaColumn.key);
  }

  let source: ViewSectionConfig[] = [];
  let derived = false;

  if (viewConfig?.sections?.length) {
    source = viewConfig.sections;
  } else if (viewConfig?.deriveFromForm !== false) {
    source = sectionsFromFormConfig(formConfig);
    derived = source.length > 0;
  }

  const showDefault =
    viewConfig?.showDefaultFields ??
    (!viewConfig?.sections?.length && !viewConfig?.render && !derived);

  /* Timestamps are swept out of the zero-config body and into their own
     collapsed section at the end. They are real data, but four low-signal
     tiles sitting between the fields an operator opened the dialog for is
     noise — and on a derived set they land in the middle of "Other details". */
  const timestampColumns = viewConfig?.sections?.length
    ? []
    : contentColumns.filter((col) => TIMESTAMP_KEYS.has(col.key));
  const timestampKeys = new Set(timestampColumns.map((col) => col.key));
  const bodyColumns = contentColumns.filter((col) => !timestampKeys.has(col.key));

  if (!source.length && showDefault) {
    source = [
      {
        id: "default",
        fields: bodyColumns.map((col) => col.key),
        variant: "tiles",
      },
    ];
  }

  const ordered = [...source].sort(
    (a, b) => (a.priority ?? 999) - (b.priority ?? 999)
  );

  const used = new Set<string>();
  const resolved: ResolvedViewSection[] = [];

  ordered.forEach((section, index) => {
    if (!evalCondition(section.condition, row)) return;

    const fields: ResolvedViewField[] = [];

    (section.fields ?? []).forEach((entry) => {
      const config = toFieldConfig(entry);
      if (exclude.has(config.key)) return;
      if (config.key === primaryKey) return;
      if (used.has(config.key)) return;
      if (!evalCondition(config.condition, row)) return;

      const column = resolveColumn(columns, config.key);

      /* A key with no column can still be perfectly renderable: `DetailField`
         reads the value straight off the row by path, so `sale.blockNumber`
         works whether or not a table column happens to declare it. The guard
         exists only to drop the write-only fields a FORM names and the API
         never returns (`confirmPassword`, `newRecord`).

         So it drops a field only when nothing about it was stated explicitly.
         Naming a `title`, an `emptyText` or a `render` IS the author saying
         "I mean this one" — and requiring a dummy pass-through `render` just
         to keep an `emptyText` field alive (which is what callers were forced
         into) made the API lie about what it needs. */
      const explicit =
        Boolean(config.render) ||
        Boolean(config.title) ||
        config.emptyText !== undefined ||
        Boolean(config.hideEmpty);

      if (!column && !explicit) {
        if (process.env.NODE_ENV !== "production" && viewConfig?.sections?.length) {
          // Only warn for HAND-WRITTEN sections. Derived ones legitimately name
          // password/confirm fields that no column backs, and warning on those
          // would be noise on every table that has a form.
          console.warn(
            `[DataTable viewConfig] field "${config.key}" matches no column and states no title/emptyText/render; it will not appear in the view dialog.`
          );
        }
        return;
      }

      used.add(config.key);
      fields.push({
        key: config.key,
        title: config.title || column?.title || config.key,
        icon: config.icon || column?.icon,
        column,
        config,
      });
    });

    if (!fields.length && !section.render) return;

    resolved.push({
      id: section.id || `section-${index}`,
      title: section.title,
      description: section.description,
      icon: section.icon,
      fields,
      render: section.render,
      columns: section.columns ?? 2,
      variant: section.variant ?? (section.render ? "plain" : "tiles"),
      collapsible: section.collapsible ?? false,
      defaultCollapsed: section.defaultCollapsed ?? false,
      tab: section.tab,
    });
  });

  /* Anything the groups did not name still has to appear somewhere. A derived
     section set comes from a FORM, so it covers only editable fields — status,
     computed KYC state, timestamps and the like would silently vanish from a
     panel whose whole job is to show the record. */
  if (derived) {
    const leftovers = bodyColumns.filter((col) => !used.has(col.key));
    if (leftovers.length) {
      resolved.push({
        id: "other",
        title: otherTitle,
        fields: leftovers.map((column) => toResolvedField(column)),
        columns: 2,
        variant: "tiles",
        collapsible: false,
        defaultCollapsed: false,
      });
    }
  }

  /* The timestamp tail, last and collapsed. */
  if (timestampColumns.length) {
    resolved.push({
      id: "timestamps",
      title: timestampsTitle,
      icon: undefined,
      fields: timestampColumns.map((column) => toResolvedField(column)),
      columns: 2,
      variant: "tiles",
      collapsible: true,
      defaultCollapsed: true,
    });
  }

  /* Empty tiles sort LAST within each auto-built section. The dash is right
     per-tile and wrong in bulk: a 16-column forensic table opened as a wall of
     em dashes with the two populated fields buried somewhere inside it. */
  for (const section of resolved) {
    if (section.id !== "default" && section.id !== "other") continue;
    section.fields.sort((a, b) => {
      const aEmpty = isEmptyForSort(getNestedValue(row, a.key));
      const bEmpty = isEmptyForSort(getNestedValue(row, b.key));
      return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
    });
  }

  return {
    sections: resolved,
    // Row-independent on purpose — see the note on ResolvedView.fieldCount.
    fieldCount: contentColumns.reduce((sum, col) => sum + columnWeight(col), 0),
    hasCustomSection: resolved.some((section) => Boolean(section.render)),
    mediaColumn,
  };
}

function toResolvedField(column: ColumnDefinition): ResolvedViewField {
  return {
    key: column.key,
    title: column.title,
    icon: column.icon,
    column,
    config: { key: column.key },
  };
}

/**
 * The one definition of "this field has nothing in it", shared by the
 * empty-last sort, the `hideEmpty` filter and `DetailField`'s placeholder.
 */
export function isFieldValueEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function isEmptyForSort(value: any): boolean {
  return isFieldValueEmpty(value);
}

/** Resolve a `string | (row) => node` config entry. */
export function resolveDynamic<T>(
  value: T | ((row: any) => T) | undefined,
  row: any
): T | undefined {
  if (value === undefined) return undefined;
  return typeof value === "function" ? (value as (row: any) => T)(row) : value;
}
