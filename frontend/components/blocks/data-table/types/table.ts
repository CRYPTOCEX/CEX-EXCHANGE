// types/table.ts
import { TypeIcon as type, type LucideIcon } from "lucide-react";
import { AnalyticsConfig } from "./analytics";

export interface ChartConfig {
  id?: string;
  title: string;
  type?: "line" | "bar" | "pie" | "stackedArea";
  metrics?: string[];
  labels?: {
    [key: string]: string;
  };
}

export interface FormState {
  isSubmitting: boolean;
  isDirty: boolean;
  onSubmit: (() => void) | null;
  onCancel: (() => void) | null;
}

/**
 * Permission keys this table gates on, in the `<verb>.<domain>.<resource>` form
 * the seeder defines. Every field is optional and an omitted key is EXACTLY
 * equivalent to `""` — both are falsy, and every consumer tests truthiness
 * before calling `checkPermission`. Omit the ones that do not apply rather than
 * writing `""`.
 *
 * The two halves default in OPPOSITE directions, which is deliberate:
 *   - `access` / `view` absent  -> allowed (the table renders and fetches)
 *   - `create` / `edit` / `delete` absent -> denied (the button never renders)
 *
 * So leaving `create` off is how you say "this table has no create endpoint",
 * while leaving `access` off is how you say "this screen needs no role check"
 * (used by the user-facing dashboards, where the backend already scopes rows to
 * the caller).
 */
/**
 * Context handed to `extraRowActions` as its second argument.
 *
 * The permission verdicts are already resolved against the current user (so
 * Super Admin is true throughout). `canEdit`/`canDelete` are the same booleans
 * the built-in Edit and Delete menu items use, minus the per-row
 * `editCondition`, which a custom action is free to apply itself.
 *
 * `refresh` re-runs the table's fetch. Four call sites already declared a
 * `refresh?: () => void` second parameter and called `refresh?.()` after a
 * mutation, but nothing ever passed it — the optional call swallowed it and
 * those tables silently kept showing the pre-mutation row. It is part of this
 * object so there is one argument to thread and no way to declare it without
 * receiving it.
 */
export interface RowActionContext {
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  /** The raw key map, for an action that gates on a key of its own. */
  permissions: TablePermissions;
  /** Re-runs the table query. */
  refresh: () => void;
}

export interface TablePermissions {
  access?: string;
  view?: string;
  create?: string;
  edit?: string;
  delete?: string;
}

/** Context handed to a bulk action's onClick, scoped to the current selection. */
export interface BulkActionContext {
  /** IDs of the currently selected rows. */
  ids: string[];
  /** Re-fetches the table data (call after the action mutates rows). */
  refresh: () => Promise<void>;
  /** Clears the current row selection. */
  clearSelection: () => void;
}

/**
 * A custom bulk operation surfaced in the "N selected" actions dropdown.
 * Presence of at least one bulk action makes the row-select checkboxes appear,
 * even when the table is otherwise read-only (canCreate/canEdit/canDelete false).
 */
export interface BulkAction {
  /** Stable identifier (also used as the React key). */
  key: string;
  /** Dropdown label. */
  label: string;
  /** Optional leading icon. */
  icon?: LucideIcon;
  /** Destructive styling for dangerous actions (e.g. disable/deactivate). */
  variant?: "default" | "destructive";
  /** Runs the operation for the selected ids; owns its own API calls + toasts. */
  onClick: (ctx: BulkActionContext) => void | Promise<void>;
}

export interface TableConfig {
  // Optional fields used in DataTable
  pageSize?: number;
  title?: string;
  itemTitle?: string;
  description?: string;
  db?: "mysql" | "scylla";

  // Standard fields
  canCreate?: boolean;
  canEdit?: boolean;
  editCondition?: (row: any) => boolean;
  canDelete?: boolean;
  canView?: boolean;
  isParanoid?: boolean;
  createLink?: string;
  editLink?: string;
  viewLink?: string;
  viewButton?: (row: any) => React.ReactNode;
  onCreateClick?: () => void;
  onEditClick?: (row: any) => void;
  onViewClick?: (row: any) => void;
  expandedButtons?: (row: any, refresh?: () => void) => React.ReactNode;
  extraTopButtons?: (refresh?: () => void) => React.ReactNode;
  /**
   * Custom per-row operations (approve, disable, roll back, close…).
   *
   * The second argument carries the SAME permission verdicts the built-in
   * view/edit/delete items are gated on. It exists because these actions render
   * unconditionally — for a table whose operations are all custom, the
   * `permissions` prop would otherwise decide nothing and the only gate left is
   * the backend 403. Guard anything that mutates:
   *
   *     extraRowActions={(row, p) => (
   *       <>{p.canEdit && <DropdownMenuItem …>Approve</DropdownMenuItem>}</>
   *     )}
   *
   * `can*` is the resolved answer (Super Admin included); `permissions` is the
   * raw key map, for the rare action that needs a key of its own; `refresh`
   * re-runs the table query after a mutation.
   */
  extraRowActions?: (row: any, ctx: RowActionContext) => React.ReactNode;
  /** Custom bulk operations shown in the selected-items actions dropdown. */
  bulkActions?: BulkAction[];
  createDialog?: React.ReactNode;
  dialogSize?:
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "full"
    | undefined;
}

export interface TableState {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: string;
  filters?: Record<string, any>;
  showDeleted?: boolean;
}

export interface Sorting {
  id: string;
  desc: boolean;
}

export interface KpiConfig {
  metric: string;
  label?: string;
}

// View types for create/edit views (alternative to drawers)
export type DataTableView = "overview" | "analytics" | "create" | "edit";

/**
 * A destructive table action awaiting confirmation.
 *
 * Declared here rather than in `store/actionsSlice.ts` because that slice
 * imports `TableStore` from this file; defining it there and importing it back
 * would make the two modules import each other.
 */
export interface PendingAction {
  kind: "delete" | "permanentDelete" | "bulkDelete" | "bulkPermanentDelete";
  /** The row for a single action, or the selected id list for a bulk one. */
  rows: any[];
  /** How many records the operator is about to affect. */
  count: number;
  /** True for `force: true` purges, which the bin cannot recover. */
  permanent: boolean;
}

/**
 * A queue decision awaiting confirmation and a reason.
 *
 * Separate from `PendingAction` on purpose. That one models DELETE — its whole
 * vocabulary is "permanent", "restore", "type the word delete". A decision is a
 * different verb with a different obligation: the reason is REQUIRED, because it
 * is what reaches the customer, and it is the thing the audit row is worth
 * reading for. Folding the two into one union would have made every field
 * optional and every branch a conditional.
 */
export interface PendingDecision {
  /** Stable key for the verb: "approve" | "reject" | "close" | "assign" | … */
  verb: string;
  /** What the confirm button says, e.g. "Reject 3 withdrawals". */
  label: string;
  /** Rows being decided. */
  ids: string[];
  /** What the operator is agreeing to. Shown above the reason field. */
  description?: string;
  /** Defaults to the table's own `apiEndpoint`. */
  endpoint?: string;
  method?: "PUT" | "POST" | "PATCH";
  /** Merged into the request body alongside `{ ids, reason }`. */
  body?: Record<string, any>;
  /**
   * Defaults to TRUE. A decision the customer is told about must carry a reason
   * the operator actually typed — a pre-filled default is how "Please provide a
   * reason for rejection." ended up being emailed to real users as the reason.
   */
  reasonRequired?: boolean;
  /** Defaults to 3. */
  minReasonLength?: number;
  tone?: "default" | "destructive";
}

export interface TableStore {
  // Data / pagination
  data: userAttributes[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number, shouldFetch?: boolean) => void;
  setTotalItems: (totalItems: number) => void;
  setTotalPages: (totalPages: number) => void;
  gotoPage: (page: number) => void;

  // Sorting / filters / selection
  sorting: Sorting[];
  filters: Record<string, any>;
  selectedRows: string[];
  showDeleted: boolean;
  showDeletedLoading: boolean;

  // Columns
  columns: ColumnDefinition[];
  visibleColumns: string[];
  getVisibleColumns: () => ColumnDefinition[];
  getHiddenColumns: () => string[];
  getSortKeyForColumn: (column: ColumnDefinition) => string;

  // Permissions
  permissions: TablePermissions;
  hasAccessPermission: boolean;
  hasViewPermission: boolean;
  hasCreatePermission: boolean;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
  initialized: boolean;

  // Table config
  tableConfig: TableConfig;

  // Analytics
  kpis: KpiConfig[];

  // Loading states
  loading: boolean;
  paginationLoading: boolean;
  totalItemsLoading: boolean;
  error: string | null;

  // UI states
  selectedRow: any | null;
  isCreateDrawerOpen: boolean;
  isEditDrawerOpen: boolean;
  setCreateDrawerOpen: (open: boolean) => void;
  setEditDrawerOpen: (open: boolean) => void;

  /**
   * Destructive-action confirmation. Non-null while a delete is awaiting the
   * operator's confirmation — see the header note in `store/actionsSlice.ts`.
   */
  pendingAction: PendingAction | null;
  isActionPending: boolean;
  cancelPendingAction: () => void;
  confirmPendingAction: (reason?: string) => Promise<void>;

  /** Queue decision awaiting confirmation — see `PendingDecision`. */
  pendingDecision: PendingDecision | null;
  requestDecision: (decision: PendingDecision) => void;
  cancelPendingDecision: () => void;
  confirmPendingDecision: (reason: string) => Promise<void>;

  /** From SelectionSlice. Was missing from this hand-maintained interface. */
  deselectAllRows: () => void;

  // View states
  currentView: DataTableView;
  previousView: DataTableView;
  editingRowId: string | null;
  formState: FormState;

  // View actions
  setView: (view: DataTableView) => void;
  goToCreate: () => void;
  goToEdit: (rowId: string) => void;
  goToOverview: () => void;
  goToAnalytics: () => void;
  goBack: () => void;
  resetView: () => void;
  setFormState: (state: Partial<FormState>) => void;
  resetFormState: () => void;

  // Sorting
  availableSortingOptions: { id: string; label: string }[];
  currentSortLabel: string | null;

  // Additional methods or fields
  setShowDeleted: (showDeleted: boolean) => Promise<void>;
  setPermissions: (permissions: TablePermissions) => void;
  reset: () => void;
  setTableConfig: (config: TableConfig) => void;
  setPaginationLoading: (loading: boolean) => void;
  setTotalItemsLoading: (loading: boolean) => void;
  setShowDeletedLoading: (loading: boolean) => void;
  setColumns: (newColumns: ColumnDefinition[]) => void;
  setKpis: (kpis: KpiConfig[]) => void;
  getCurrentSortLabel: () => string | null;
  setData: (data: userAttributes[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // From FetchSlice
  fetchData: () => Promise<void>;

  model: string;
  setModel: (model: string) => void;
  modelConfig: Record<string, any>;
  setModelConfig: (config?: Record<string, any>) => void;

  // If you want an "apiEndpoint" in the store:
  apiEndpoint: string;
  setApiEndpoint: (endpoint: string) => void;

  // Caller-supplied rows; see FetchSlice and the `staticRows` prop.
  staticRows: any[] | null;
  setStaticRows: (rows: any[] | null) => void;

  db: "mysql" | "scylla";
  setDb: (db: "mysql" | "scylla") => void;

  keyspace: string | null;
  setKeyspace: (keyspace: string | null) => void;

  // Analytics fields
  analyticsTab: "overview" | "analytics";
  analyticsConfig: AnalyticsConfig | null;
  analyticsData: Record<string, any> | null;
  analyticsLoading: boolean;
  analyticsError: string | null;

  // Cache logic fields for analytics
  lastFetchTime: number | null;
  cacheExpiration: number | null;
  cacheTimeframe: string | null;

  userAnalytics: boolean;
  setUserAnalytics: (userAnalytics: boolean) => void;

  // View mode
  viewMode: "table" | "card";
  autoSwitchViewMode: boolean;
  setViewMode: (mode: "table" | "card") => void;
  toggleViewMode: () => void;
  setAutoSwitchViewMode: (enabled: boolean) => void;
  getPageSizeOptions: () => number[];

  // Design config
  designConfig: DesignConfig | null;
  setDesignConfig: (config: DesignConfig | null) => void;
}

/**
 * The heading band's config. IT HAS NO COLOUR AXIS, BY REMOVAL.
 *
 * `animation` (ten variants: orbs, aurora, mesh, prism, …), `primaryColor`,
 * `secondaryColor`, `intensity` and a per-stat `color` all used to live here.
 * They were the last colour decisions in the product a page could make for
 * itself, and they were invisible to the design-system ratchet because a hue
 * passed as DATA is not a class name — which is how ~120 admin tables shipped
 * heading bands in hues nobody chose, several of them STATUS hues on pages that
 * report no status.
 *
 * The band is transparent now and the page draws `WorkspaceGround` behind it.
 * See `header/hero.tsx` for the whole argument, and `data-table/index.tsx` for
 * where the ground is mounted. Passing any of the removed keys is a type error
 * on purpose: a silently-ignored prop is how the old maps survived two
 * migrations.
 */
export interface DesignConfig {
  /** Icon component to display next to the badge */
  icon?: LucideIcon;
  /** Badge text displayed above the title */
  badge?: string;
  /** Custom stats to display below the description */
  stats?: Array<{
    icon: LucideIcon;
    label: string;
    value: string | number;
  }>;
  /** Vertical alignment for right-side content in detail views ('top' | 'center' | 'bottom') */
  detailsAlignment?: "top" | "center" | "bottom";
}

/** @deprecated Use DesignConfig instead */
export interface PremiumHeaderConfig extends DesignConfig {}

/** @deprecated Use DesignConfig instead */
export interface HeroConfig extends DesignConfig {}

/* ------------------------------------------------------------------------ *
 * View dialog (the expanded row/card panel)
 *
 * The panel used to be a fixed 600px box that dumped every column into one
 * flat 2-column grid, with `viewContent` appended underneath as the only
 * escape hatch — it could neither replace that grid nor widen the panel. A
 * 24-column table like admin/crm/user therefore rendered 24 undifferentiated
 * tiles ("AVATAR / No Image", "ROLE / 1") in a 600px column.
 *
 * `viewConfig` replaces that with three levels of control, each optional:
 *   1. nothing        — sections are DERIVED from `formConfig` groups (which
 *                       nearly every admin table already declares), and the
 *                       width is derived from how much there is to show.
 *   2. `sections`     — declare view groups explicitly, no JSX required.
 *   3. `render` /
 *      `renderDialog` — take over the body, or the whole panel.
 * ------------------------------------------------------------------------ */

/**
 * Width of the view dialog. Mirrors the shared Dialog `size` scale so the two
 * read as one system; `full` is the viewport-wide variant for dense panels
 * (order lines, ledgers, JSON payloads).
 */
export type ViewDialogSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "7xl"
  | "full";

/** Everything a custom view renderer needs, so it never has to reach for the store. */
export interface ViewRenderContext {
  /** The live row (kept in sync with the table's data, so toggles update in place). */
  row: any;
  /** Close the dialog. */
  close: () => void;
  /** Re-fetch the table. */
  refresh: () => Promise<void> | void;
  /** Close the dialog and open the edit view for this row. */
  edit: () => void;
  /** The table's column definitions. */
  columns: ColumnDefinition[];
  /**
   * Render a column's value using the table's own cell renderer, so a custom
   * section keeps badge tones, date formats and compound layouts for free.
   */
  renderCell: (columnKey: string) => React.ReactNode;
  /** Read a (possibly dotted) path off the row. */
  getValue: (path: string) => any;
}

export interface ViewFieldConfig {
  /** Column key, dotted paths allowed (`profile.location.city`). */
  key: string;
  /** Overrides the column's title. */
  title?: string;
  /** Overrides the column's icon. */
  icon?: LucideIcon;
  /** Span the full width of the section grid. */
  fullWidth?: boolean;
  /** Drop the tile entirely when the value is empty (default: show a dash). */
  hideEmpty?: boolean;
  /** Placeholder for an empty value. Default: an em dash. */
  emptyText?: string;
  /** Show a copy-to-clipboard affordance (ids, hashes, addresses). */
  copyable?: boolean;
  /** Bypass the column's renderer entirely. */
  render?: (value: any, row: any) => React.ReactNode;
  /** Hide conditionally. */
  condition?: boolean | ((row: any) => boolean);
}

export interface ViewSectionConfig {
  /** Stable id (also the React key). Falls back to the index. */
  id?: string;
  /** Section heading. Omit for an unlabelled block. */
  title?: string;
  description?: string;
  icon?: LucideIcon;
  /** Fields by column key, or inline overrides. Ignored when `render` is set. */
  fields?: (string | ViewFieldConfig)[];
  /** Free-form content for this section, replacing `fields`. */
  render?: (row: any, ctx: ViewRenderContext) => React.ReactNode;
  /** Grid density. Default: 2 (or 1 on a narrow dialog). */
  columns?: 1 | 2 | 3 | 4;
  /**
   * `tiles` — bordered key/value tiles (the default, good for scannable data)
   * `rows`  — compact label-left/value-right list (good for many short fields)
   * `plain` — no card chrome at all (for `render` sections that bring their own)
   */
  variant?: "tiles" | "rows" | "plain";
  /** Lower sorts first. Default 999. */
  priority?: number;
  condition?: boolean | ((row: any) => boolean);
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** Id of the tab this section belongs to. Requires `tabs`. */
  tab?: string;
}

export interface ViewTabConfig {
  id: string;
  title: string;
  icon?: LucideIcon;
  condition?: boolean | ((row: any) => boolean);
}

/** A headline figure in the strip under the dialog header. */
export interface ViewStatConfig {
  label: string;
  value: (row: any) => React.ReactNode;
  icon?: LucideIcon;
  /** Ink tone for the value. Resolves to the semantic token of the same name. */
  tone?: "default" | "success" | "warning" | "destructive" | "info" | "primary";
  condition?: boolean | ((row: any) => boolean);
}

export interface ViewConfig {
  /**
   * Panel width. Omit and it is derived from how many fields the dialog ends up
   * rendering, so a 4-field table stays compact and a 24-field one gets room.
   */
  size?: ViewDialogSize;
  /** Header title. Defaults to the table's primary column for the row. */
  title?: string | ((row: any) => React.ReactNode);
  /** Line under the title. */
  subtitle?: string | ((row: any) => React.ReactNode);
  /** Status pills etc. rendered beside the title. */
  badges?: (row: any) => React.ReactNode;
  /** Headline figures under the header. */
  stats?: ViewStatConfig[] | ((row: any) => React.ReactNode);
  /** Explicit sections. When omitted they are derived (see `deriveFromForm`). */
  sections?: ViewSectionConfig[];
  /** Tab bar. Sections opt in with `tab: "<id>"`; untabbed sections show always. */
  tabs?: ViewTabConfig[];
  /** Replace the dialog BODY (header, stats and footer are kept). */
  render?: (row: any, ctx: ViewRenderContext) => React.ReactNode;
  /** Replace the ENTIRE panel — chrome, header and footer included. */
  renderDialog?: (row: any, ctx: ViewRenderContext) => React.ReactNode;
  /** Extra content directly under the header, above the sections. */
  header?: (row: any, ctx: ViewRenderContext) => React.ReactNode;
  /** Extra content at the end of the body, above the action bar. */
  footer?: (row: any, ctx: ViewRenderContext) => React.ReactNode;
  /**
   * Render the generic every-column grid.
   * Default: `true` only when nothing else describes the body (no `sections`,
   * no `render`, and nothing derivable from `formConfig`).
   */
  showDefaultFields?: boolean;
  /**
   * Derive sections from `formConfig` groups when `sections` is omitted.
   * Default `true` — this is what makes ~every existing admin table look
   * grouped without touching the page.
   */
  deriveFromForm?: boolean;
  /** Column keys to omit from derived/default sections. */
  excludeFields?: string[];
  /** Extra classes on the panel. */
  className?: string;
  /** Hide the standard View/Edit/Delete action bar. */
  hideActions?: boolean;
}

export interface DataTableProps extends TableConfig {
  model: string;
  modelConfig?: Record<string, any>;
  apiEndpoint: string;
  /**
   * Render these rows instead of calling `apiEndpoint`.
   *
   * For fixtures — today only the component specimen at `/admin/design/specimen`,
   * which has to draw a populated table with no database behind it. `apiEndpoint`
   * stays REQUIRED even when this is set: making it conditional would mean a
   * discriminated union across 100+ existing call sites to serve one caller, and
   * the endpoint is simply never read. Pagination is applied in memory; sorting
   * and filtering are not. See the short-circuit in `store/fetchSlice.ts`.
   */
  staticRows?: any[];
  userAnalytics?: boolean;
  permissions?: TablePermissions;
  columns: any[];
  /** Form configuration for create/edit views - defines field groups and form structure */
  formConfig?: FormConfig;
  /**
   * Configuration for the expanded row/card "view" dialog: size, sections,
   * tabs, or a complete custom renderer. See {@link ViewConfig}.
   */
  viewConfig?: ViewConfig;
  /**
   * Custom content appended below the dialog's fields.
   * Still supported; `viewConfig.render` is the richer replacement (it can
   * replace the fields rather than append to them, and set the panel width).
   */
  viewContent?: (row: any) => React.ReactNode;
  analytics?: AnalyticsConfig;
  db?: "mysql" | "scylla";
  keyspace?: string | null;
  /** Enable premium design. Pass true for defaults or config object for customization */
  design?: boolean | DesignConfig;
  /** @deprecated Use design instead */
  hero?: boolean | HeroConfig;
  /** Alert content to display below the hero section (inside the DataTable container) */
  alertContent?: React.ReactNode;
  /**
   * The sort the table OPENS on, before the operator touches anything.
   *
   * Without this the store starts `sorting: []`, `fetchSlice` omits
   * `sortField`/`sortOrder` entirely, and `getFiltered` falls back to
   * `createdAt DESC` — which for a work queue is exactly backwards. A queue
   * opens oldest-first, because the row that has waited longest is the one that
   * should be decided next.
   */
  initialSort?: Sorting[];
  /**
   * The filter the table OPENS on. A queue opens on its actionable status
   * rather than on years of settled rows: `{ status: "PENDING" }`.
   *
   * Merges over `modelConfig`; the operator can still clear or change it. This
   * is a starting position, not a lock.
   */
  initialFilters?: Record<string, any>;
  /**
   * The HEADING LEVEL the table's own `title` is drawn at. `"h1"` — the
   * default, and the right answer for the ~100 pages where the table IS the
   * page — or `"h2"` for the handful that already draw their own `<h1>` above
   * it.
   *
   * IT EXISTS BECAUSE THE DUPLICATE WAS MEASURED, NOT IMAGINED.
   * `/en/finance/history` draws `PageHeader title={t("transactions_history")}`
   * as an `<h1>` and then hands the DataTable the SAME string, which drew a
   * second one: the browser read back exactly
   * `["Transactions History", "Transactions History"]`, so a screen reader
   * announced the page title twice and the document outline had two roots.
   * Demoting the table's copy keeps the text and the type scale (h1 and h2
   * carry identical classes here) and leaves one page title.
   *
   * NOT a knob for taste: a page has exactly one `<h1>`, so this says which
   * element owns it. Pass `"h2"` only when something above the table already
   * does.
   */
  titleAs?: "h1" | "h2";
}

export type ColumnType =
  | "text"
  | "textarea"
  | "email"
  | "url"
  /**
   * A masked text input with a reveal toggle. Form-only: nothing sensible
   * renders in a table cell, so a `password` column belongs behind
   * `expandedOnly` and outside the view dialog's sections.
   */
  | "password"
  | "number"
  | "rating"
  | "date"
  | "boolean"
  | "toggle"
  | "select"
  | "multiselect"
  | "tags"
  | "image"
  /**
   * A LIST of images for one record — a product gallery, a property's photos.
   *
   * It is a separate type from `image` rather than a flag on it because every
   * stage of the form pipeline branches on the type: the value is an array
   * (`(File | string)[]`, mixing files not yet uploaded with paths already
   * stored), `processImageUploads` has to walk it rather than test the value
   * for `instanceof File`, and the empty value that must reach the API is `[]`,
   * not the `""` an untouched image field carries.
   */
  | "gallery"
  | "actions"
  | "compound"
  | "customFields";

// Form configuration types for create/edit views
export interface FormFieldConfig {
  /** Column key - must match a key from columns array or a field inside a compound column */
  key: string;
  /**
   * If this field exists inside a compound column, specify the compound column's key here.
   * The form will extract the field config from the compound column's render.config.
   * Example: { key: "title", compoundKey: "depositCompound" } extracts "title" from the compound column.
   */
  compoundKey?: string;
  /** Override column type for form (optional) */
  type?: ColumnType;
  /** Override field title/label for form */
  title?: string;
  /** Label for the form field (alias for title) */
  label?: string;
  /** Field description shown below the input */
  description?: string;
  /** Whether field is required in form */
  required?: boolean;
  /** Custom validation function */
  validation?: (value: any) => string | null;
  /** API endpoint for fetching options (select/multiselect) */
  apiEndpoint?: ApiEndpoint;
  /** Static options for select/multiselect */
  options?: Array<{ value: string | boolean | number; label: string; color?: BadgeVariant }>;
  /** Dynamic select configuration */
  dynamicSelect?: DynamicSelectConfig;
  /** Condition for showing field */
  condition?: boolean | ((values: any) => boolean) | Array<boolean | ((values: any) => boolean)>;
  /** Callback when field value changes */
  onChange?: (value: any, form: any) => void;
  /** Upload directory for image fields */
  uploadDir?: string;
  /** Min value for number fields */
  min?: number;
  /** Max value for number fields */
  max?: number;
  /** Step value for number fields */
  step?: number;
  /** Max length for text fields */
  maxLength?: number;
  /** Min length for text fields */
  minLength?: number;
  /** Default value for the field */
  defaultValue?: any;
  /** Fallback value when field is empty */
  fallback?: any;
  /** Regex pattern for validation */
  pattern?: string | RegExp;
}

export interface FormGroupConfig {
  /** Group identifier */
  id?: string;
  /** Group display title */
  title: string;
  /** Group description */
  description?: string;
  /** Icon for the group header */
  icon?: LucideIcon;
  /** Fields in this group (by column key) */
  fields: (string | FormFieldConfig)[];
  /** Display priority (lower = higher priority) */
  priority?: number;
  /** Condition for showing entire group */
  condition?: boolean | ((values: any) => boolean);
}

export interface FormConfig {
  /** Configuration for create form */
  create?: {
    /** Custom title for create view (overrides default "Create {itemTitle}") */
    title?: string;
    /** Custom description for create view (overrides default "Add new {itemTitle}") */
    description?: string;
    /** Groups of fields for create form */
    groups: FormGroupConfig[];
  };
  /** Configuration for edit form */
  edit?: {
    /** Custom title for edit view (overrides default "Edit {itemTitle}") */
    title?: string;
    /** Custom description for edit view (overrides default "Edit {itemTitle}") */
    description?: string;
    /** Groups of fields for edit form */
    groups: FormGroupConfig[];
  };
}

export type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "danger"
  | "info"
  | "muted";

export interface BadgeConfig {
  /**
   * Optional HUE OVERRIDE. Omit it and BadgeCell resolves the tone centrally
   * through `statusTone()`, which is the preferred form — an override is only
   * for values that are not statuses. The type used to require it while the
   * component has always handled its absence, so the correct call (`config={{}}`)
   * was the one that failed to compile.
   */
  variant?: BadgeVariant | ((value: any) => BadgeVariant);
  /**
   * Opt into a DOMAIN override in lib/status-tone.ts. Only needed where a status
   * word is a homonym: OPEN means a live position platform-wide (success) but an
   * unanswered support ticket (info). Without this the domain map had exactly one
   * reachable call site and admin tables could not use it at all.
   */
  domain?: string;
  withDot?: boolean;
  labels?: {
    true?: string;
    false?: string;
  };
  options?: Array<{ value: string | boolean | number; label: string; color?: BadgeVariant }>;
}

export interface CompoundConfig {
  image?: {
    key: string;
    /**
     * What to show when the image is missing or fails to load.
     *
     * A string containing "/" or "." is treated as an asset URL; any other
     * string is drawn as literal text (initials, a short code). The function
     * form receives the row, so a column can derive that text per record —
     * `(row) => initialsOf(row)` for people, where the generic placeholder
     * plate is unreadable at avatar size.
     *
     * Not honoured by `size: "gateway"`, which only accepts a URL.
     */
    fallback?: string | ((row: any) => string);
    /** @deprecated Use FormConfig instead - title shown in table/view only */
    title?: string;
    /** @deprecated Use FormConfig instead - description shown in table/view only */
    description?: string;
    size?: "gateway" | "sm" | "md" | "lg" | "xl";
  };
  primary?: {
    key: string | string[];
    title: string | string[];
    description?: string | string[];
    icon?: LucideIcon;
    sortable?: boolean;
    sortKey?: string;
    validation?: (value: any) => string | null;
  };
  secondary?: {
    key: string;
    title: string;
    description?: string;
    icon?: LucideIcon;
    sortable?: boolean;
  };
  metadata?: Array<{
    key: string;
    title: string;
    description?: string;
    icon?: LucideIcon;
    type?: "text" | "date" | "select";
    sortable?: boolean;
    render?: (value: any) => React.ReactNode;
    options?: Array<{ value: string | boolean | number; label: string; color?: BadgeVariant }>;
  }>;
}

export type CellRenderType =
  | { type: "text" }
  | { type: "number"; format?: Intl.NumberFormatOptions }
  | { type: "date"; format?: string }
  | { type: "badge"; config: BadgeConfig }
  | { type: "tags"; config: { maxDisplay?: number } }
  | { type: "boolean"; labels?: { true: string; false: string } }
  | { type: "select" }
  | { type: "compound"; config: CompoundConfig }
  /* `row` is the second argument because `CellRenderer` has always passed it
     (`content/rows/cells/index.tsx`, `case "custom"` → `renderType.render(value,
     row)`), and its own copy of this union has always declared it. Only this
     declaration — the one `ColumnDefinition.render` is typed against — was
     narrower, so a cell that needed a sibling field of the same row could not be
     written without a type error, even though the value was already being
     handed to it. Widening a callback's parameter list is backwards compatible:
     every existing one-argument renderer still satisfies it. */
  | { type: "custom"; render: (value: any, row: any) => React.ReactNode };

/** Column definition for data table columns */
export interface ColumnDefinition {
  /** Unique key identifying this column */
  key: string;
  /** Display title for the column header */
  title: string;
  /** Column data type */
  type?: ColumnType;
  /** Description shown in tooltips or expanded views */
  description?: string;
  /** Icon to display with the column */
  icon?: LucideIcon;
  /** Whether this column can be sorted */
  sortable?: boolean;
  /** Whether this column is searchable */
  searchable?: boolean;
  /** Whether this column can be filtered */
  filterable?: boolean;
  /**
   * Overrides which control the filter panel draws for this column, without
   * touching `type` — `type` also drives cell rendering, form fields and value
   * coercion, so a column whose CELL is a single badge but whose FILTER should
   * accept several values at once had no way to say so. `"multiselect"` emits
   * `{value: string[], operator: "in"}`.
   */
  filterType?: "multiselect";
  /**
   * The field name a filter on this column should send to the API, when the
   * column's own `key` is not one.
   *
   * A relation column is keyed by its association alias — `category`, `plan`,
   * `referrer` — because that is what the row carries and what the cell
   * renders. The API filters on the underlying foreign key, so sending the
   * alias produces `Unknown column 'post.category' in 'where clause'`: a 500,
   * not an empty result. This never surfaced while such filters had no options
   * to pick from.
   *
   * Resolution order is `filterKey` -> `baseKey` -> `key`, so a column that
   * already declares `baseKey` needs nothing. Declare `filterKey` only when
   * the two must differ — `baseKey` is also applied to the SUBMIT payload, so
   * adding one purely to satisfy a filter would change what the form writes.
   */
  filterKey?: string;
  /** Display priority (1 = highest, shown on mobile; 5 = lowest) */
  priority?: number;
  /** If true, column only shows in expanded view */
  expandedOnly?: boolean;
  /** Options for select/multiselect columns */
  options?: Array<{ value: string | boolean | number; label: string; color?: BadgeVariant }>;
  /** Custom render function */
  render?: CellRenderType;
  /** Badges configuration for status columns */
  badges?: Record<string, { label: string; variant: BadgeVariant }>;
  /** Custom value getter */
  getValue?: (row: any) => any;
  /** Nested columns for compound types */
  nestedColumns?: ColumnDefinition[];
  /** Format string for date/number columns */
  format?: string;
  /** If true, column spans full width in expanded/view modal */
  fullWidth?: boolean;
  /**
   * The box an uploaded image is downscaled into (sharp `fit: "inside"`), for
   * `image` and `gallery` columns.
   */
  maxWidth?: number;
  maxHeight?: number;
  /** How many slots a `gallery` column offers. */
  maxImages?: number;
}

export type RowAction<T = any> = {
  label: string;
  onClick: (row: T) => void;
  icon?: any;
};
