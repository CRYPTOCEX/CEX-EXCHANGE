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

export interface TablePermissions {
  access: string;
  view: string;
  create: string;
  edit: string;
  delete: string;
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
  extraRowActions?: (row: any) => React.ReactNode;
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

export type DesignAnimation =
  | "orbs"           // Default floating gradient orbs
  | "waves"          // Animated wave patterns
  | "particles"      // Floating particle dots
  | "aurora"         // Northern lights effect
  | "mesh"           // Gradient mesh background
  | "spotlight"      // Moving spotlight effect
  | "ripples"        // Expanding ripple circles
  | "geometric"      // Animated geometric shapes
  | "glow"           // Pulsing glow effect
  | "prism";         // Prismatic light refraction

export interface DesignConfig {
  /** Animation style for the background */
  animation?: DesignAnimation;
  /** Primary color (CSS color value like 'emerald', 'cyan', 'purple') */
  primaryColor?: string;
  /** Secondary color (CSS color value) */
  secondaryColor?: string;
  /** Color intensity/opacity (5-50, default 20 for subtle effect like 500/20) */
  intensity?: number;
  /** Icon component to display next to the badge */
  icon?: LucideIcon;
  /** Badge text displayed above the title */
  badge?: string;
  /** Custom stats to display below the description */
  stats?: Array<{
    icon: LucideIcon;
    label: string;
    value: string | number;
    color?: string;
  }>;
  /** Vertical alignment for right-side content in detail views ('top' | 'center' | 'bottom') */
  detailsAlignment?: "top" | "center" | "bottom";
}

/** @deprecated Use DesignConfig instead */
export interface PremiumHeaderConfig extends DesignConfig {}

/** @deprecated Use DesignConfig instead */
export interface HeroConfig extends DesignConfig {}

export interface DataTableProps extends TableConfig {
  model: string;
  modelConfig?: Record<string, any>;
  apiEndpoint: string;
  userAnalytics?: boolean;
  permissions?: TablePermissions;
  columns: any[];
  /** Form configuration for create/edit views - defines field groups and form structure */
  formConfig?: FormConfig;
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
}

export type ColumnType =
  | "text"
  | "textarea"
  | "email"
  | "url"
  | "number"
  | "rating"
  | "date"
  | "boolean"
  | "toggle"
  | "select"
  | "multiselect"
  | "tags"
  | "image"
  | "actions"
  | "compound"
  | "customFields";

// Form configuration types for create/edit views
export interface FormFieldConfig {
  /** Column key - must match a key from columns array */
  key: string;
  /** Override column type for form (optional) */
  type?: ColumnType;
  /** Override field title/label for form */
  title?: string;
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
  variant: BadgeVariant | ((value: any) => BadgeVariant);
  withDot?: boolean;
  labels?: {
    true?: string;
    false?: string;
  };
}

export interface CompoundConfig {
  image?: {
    key: string;
    fallback?: string;
    title?: string;
    description?: string;
    editable?: boolean;
    usedInCreate?: boolean;
    size?: "gateway" | "sm" | "md" | "lg" | "xl";
  };
  primary?: {
    key: string | string[];
    title: string | string[];
    description?: string | string[];
    icon?: LucideIcon;
    sortable?: boolean;
    sortKey?: string;
    editable?: boolean;
    usedInCreate?: boolean;
    validation?: (value: any) => string | null;
  };
  secondary?: {
    key: string;
    title: string;
    description?: string;
    icon?: LucideIcon;
    sortable?: boolean;
    editable?: boolean;
    usedInCreate?: boolean;
  };
  metadata?: Array<{
    key: string;
    title: string;
    description?: string;
    icon?: LucideIcon;
    type?: "text" | "date" | "select";
    sortable?: boolean;
    editable?: boolean;
    usedInCreate?: boolean;
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
  | { type: "custom"; render: (value: any) => React.ReactNode };

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
}
