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
  type: ColumnType;
  idKey?: string;
  labelKey?: string;
  baseKey?: string;
  expandedTitle?: (row: any) => string;
  description?: string;
  icon?: LucideIcon;
  sortable?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  usedInCreate?: boolean;
  required?: boolean;
  validation?: (value: any) => string | null;
  render?: CellRenderType;
  options?: Array<{ value: string; label: string; color?: BadgeVariant }>;
  dynamicSelect?: DynamicSelectConfig;
  min?: number;
  max?: number;
  priority?: number;
  apiEndpoint?: ApiEndpoint;
  expandedOnly?: boolean;
  sortKey?: string;
  condition?:
    | boolean
    | ((values: any) => boolean)
    | Array<boolean | ((values: any) => boolean)>;
  optional?: boolean;
  disablePrefixSort?: boolean;
  uploadDir?: string;
}
