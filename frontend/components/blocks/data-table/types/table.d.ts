// types/table.ts
import { TypeIcon as type, type LucideIcon } from "lucide-react";
import { Sorting, PaginationSlice, FetchSlice } from "@/store/table";
// or from wherever they are
import { AnalyticsConfig } from "./analytics";

export interface ChartConfig {
  title: string;
  type: "line" | "bar" | "pie" | "stackedArea";
  metrics: string[];
  labels: {
    [key: string]: string;
  };
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

export interface TableStore {
  // Data / pagination
  data: userAttributes[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;

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
  isCreateDrawerOpen: boolean;
  isEditDrawerOpen: boolean;
  selectedRow: any | null;

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
  setCreateDrawerOpen: (isOpen: boolean) => void;
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
}

export interface DataTableProps extends TableConfig {
  model: string;
  modelConfig?: Record<string, any>;
  apiEndpoint: string;
  userAnalytics?: boolean;
  permissions?: TablePermissions;
  columns: any[];
  viewContent?: (row: any) => React.ReactNode;
  analytics?: AnalyticsConfig;
  db?: "mysql" | "scylla";
  keyspace?: string | null;
}

export type ColumnType =
  | "text"
  | "textarea"
  | "email"
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
    options?: Array<{ value: string; label: string; color?: BadgeVariant }>;
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

// Removed duplicate interface - already defined above at line 185
