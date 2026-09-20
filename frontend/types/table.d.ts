interface ApiEndpoint {
  url: string;
  method?: any;
  params?: Record<string, any>;
  body?: Record<string, any>;
}

interface DynamicSelectConfig {
  refreshOn: string;
  endpointBuilder: (dependentValue: any) => ApiEndpoint | null;
  disableWhenEmpty?: boolean;
}

interface ColumnDefinition {
  key: string;
  title: string;
  type?: ColumnType;
  idKey?: string;
  labelKey?: string;
  baseKey?: string;
  expandedTitle?: (row: any) => string;
  description?: string;
  icon?: LucideIcon;
  sortable?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  /**
   * Overrides which control the filter panel draws for this column, without
   * touching `type` — `type` also drives cell rendering, form fields and value
   * coercion, so a column whose CELL is a single badge but whose FILTER should
   * accept several values at once had no way to say so. `"multiselect"` emits
   * `{value: string[], operator: "in"}`.
   *
   * Kept in step with the exported `ColumnDefinition` in
   * components/blocks/data-table/types/table.ts — the DataTable's own files see
   * THIS global declaration, the pages that build columns see that one.
   */
  filterType?: "multiselect";
  /**
   * The field name a filter on this column sends to the API, when the column's
   * own `key` is not one (a relation column keyed by its association alias).
   * Resolution order is `filterKey` -> `baseKey` -> `key`.
   *
   * Kept in step with the exported `ColumnDefinition` in
   * components/blocks/data-table/types/table.ts — the DataTable's own files see
   * THIS global declaration, the pages that build columns see that one.
   */
  filterKey?: string;
  /** @deprecated Use formConfig instead - will be removed in future versions */
  editable?: boolean;
  /** @deprecated Use formConfig instead - will be removed in future versions */
  usedInCreate?: boolean;
  /** @deprecated Use formConfig.groups[].fields[].required instead */
  required?: boolean;
  /** @deprecated Use formConfig.groups[].fields[].validation instead */
  validation?: (value: any) => string | null;
  render?: CellRenderType;
  /** @deprecated Use formConfig.groups[].fields[].options instead */
  options?: Array<{ value: string | boolean | number; label: string; color?: BadgeVariant }>;
  getOptions?: (formValues: any) => Array<{ value: string; label: string; color?: BadgeVariant }>;
  /** @deprecated Use formConfig.groups[].fields[].onChange instead */
  onChange?: (value: any, form: any) => void;
  /** @deprecated Use formConfig.groups[].fields[].dynamicSelect instead */
  dynamicSelect?: DynamicSelectConfig;
  /** @deprecated Use formConfig.groups[].fields[].min instead */
  min?: number;
  /** @deprecated Use formConfig.groups[].fields[].max instead */
  max?: number;
  priority?: number;
  /** @deprecated Use formConfig.groups[].fields[].apiEndpoint instead */
  apiEndpoint?: ApiEndpoint;
  expandedOnly?: boolean;
  sortKey?: string;
  /** @deprecated Use formConfig.groups[].fields[].condition instead */
  condition?:
    | boolean
    | ((values: any) => boolean)
    | Array<boolean | ((values: any) => boolean)>;
  optional?: boolean;
  disablePrefixSort?: boolean;
  /** @deprecated Use formConfig.groups[].fields[].uploadDir instead */
  uploadDir?: string;
  /** If true, column spans full width in expanded/view modal */
  fullWidth?: boolean;
  /**
   * The box an uploaded image is downscaled into (sharp `fit: "inside"`), for
   * `image` and `gallery` columns. Defaults are 1024x728 for a single image and
   * 1600x1600 for a gallery, whose images are the ones a customer zooms into.
   */
  maxWidth?: number;
  maxHeight?: number;
  /** How many slots a `gallery` column offers. Must not exceed whatever cap the
   *  model's setter enforces, or the form would accept images the save drops. */
  maxImages?: number;
}
