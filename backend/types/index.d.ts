interface Handler {
  params: { [key: string]: string };
  query: { [key: string]: string };
  body: any;
  user?: userAttributes;
  headers: { [key: string]: string };
  sessionId?: string;
  remoteAddress?: string;
  req?: {
    ip?: string;
    headers?: { [key: string]: string | string[] | undefined };
  };
}

type NextFunction = () => void;

interface BodyExtract {
  params: { [key: string]: string };
  query?: { [key: string]: string };
  body: any;
  error?: any;
}

interface QueryParameter {
  type: "string" | "integer" | "boolean";
  minimum?: number;
  maximum?: number;
  description: string;
  default?: any;
}

interface BodySchema {
  description?: string;
  required?: string[];
  properties: Record<
    string,
    {
      type: "string" | "integer" | "boolean" | "object" | "array";
      minLength?: number;
      maxLength?: number;
      format?: string;
      description?: string;
      items?: any;
    }
  >;
}

type Pagination = {
  totalItems: number;
  currentPage: number;
  perPage: number;
  totalPages: number;
};

type FilterOption = {
  value: string | number | boolean | null;
  label: string;
  color:
    | "default"
    | "contrast"
    | "muted"
    | "primary"
    | "success"
    | "info"
    | "warning"
    | "danger"
    | "yellow";
  icon: string;
  path?: string;
};

type AvailableFilters = Record<string, FilterOption[]>;

interface CustomStatusConfig {
  key: string;
  true: string;
  false: string;
}

interface CustomWebSocket {
  send: (
    message: string | ArrayBuffer,
    isBinary?: boolean,
    compress?: boolean
  ) => void;
  end: (data: any) => void;
}

interface ProviderUser {
  id: string;
  provider: "GOOGLE";
  providerUserId: string;
  userId: string;
}

interface JSONResponse {
  status: "success" | "fail";
  data?: any;
  error?: any;
}

interface TokensSession {
  accessToken: string;
  refreshToken: string;
  sid?: string;
}

type ClientPlatforms = "app" | "browser" | "browser-dev";

interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

interface RefreshToken {
  id: string;
  tokenId: string;
  userId: string;
  isActive: boolean;
  dateCreated: Date;
}

type RefreshTokens = Array<RefreshToken>;

interface Session {
  id: string;
  userId: string;
  sid: string;
  accessToken: string;
  csrfToken: string;
  isActive: boolean;
  ipAddress: string;
}

interface RequestContext {
  originalReq: any;
  user?: any;
  tokens?: any;
  headers?: any;
  platform?: string;
  url?: string;
  method?: string;
}

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type Attribute = string | [string, string]; // Supports simple attribute name or tuple for aliasing

type includeModel = {
  model: ModelStatic<Model<any, any>>;
  as: string;
  attributes?: Attribute[];
  where?: WhereOptions;
  
  includeModels?: includeModel[];
  through?: {
    model?: ModelStatic<Model<any, any>>;
    attributes: string[];
  };
  required?: boolean;
  paranoid?: boolean;
};

type WhereOptions = {
  [key: string]: any;
};

interface ExtendedIncludeOptions extends IncludeOptions {
  includeModels?: ExtendedIncludeOptions[];
}

interface FetchParams {
  model: ModelStatic<Model<any, any>>;
  query: {
    page?: number;
    perPage?: number;
    filter?: string | string[];
    sortOrder?: string;
    showDeleted?: string;
  };
  where?: WhereOptions;
  customFilterHandler?: (filter: { [key: string]: any }) => WhereOptions;
  customStatus?: CustomStatusConfig[]; // Now an array of custom status configurations
  sortField?: string;
  timestamps?: boolean;
  paranoid?: boolean;
  numericFields?: string[];
  includeModels?: includeModel[];
  excludeFields?: string[];
  excludeRecords?: {
    model?: ModelStatic<Model<any, any>>;
    key: string;
    value: any;
  }[];
  compute?: any[];
}

interface ChatMessage {
  type: string;
  text: string;
  time: Date;
  userId: string;
  attachment?: string;
}

type CustomField = {
  title: string;
  type: string;
  required: boolean;
};
