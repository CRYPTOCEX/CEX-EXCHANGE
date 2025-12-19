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
}
