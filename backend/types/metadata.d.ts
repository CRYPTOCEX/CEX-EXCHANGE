// Info Object
interface InfoObject {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

// Schema Object
interface SchemaObject {
  type: string;
  format?: string;
  items?: SchemaObject | { $ref: string }; // Allow items to reference other schemas
  properties?: Record<string, SchemaObject>;
  additionalProperties?: SchemaObject | boolean;
  required?: string[];
  description?: string;
  enum?: any[];
  $ref?: string; // Already present, correctly allows referencing other schemas
  nullable?: boolean; // Allow indicating that the value can be null
  default?: any; // Allow setting a default value
  example?: any; // Allow setting an example value
}

// Parameter Object
interface ParameterObject {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  schema: SchemaObject;
  index?: number;
}

// RequestBody Object
interface RequestBodyObject {
  description?: string;
  content: {
    [mediaType: string]: {
      schema: SchemaObject;
    };
  };
  required?: boolean;
}

// Response Object
interface ResponseObject {
  description: string;
  content?: {
    [mediaType: string]: {
      schema: SchemaObject;
    };
  };
}

/**
 * Demo mask field specification for masking confidential data in demo mode.
 * Supports both simple paths and nested object paths.
 *
 * @example
 * // Simple field masking
 * demoMask: ["email", "phone"]
 *
 * // Nested field masking (for included models)
 * demoMask: ["user.email", "user.phone", "referrer.email"]
 *
 * // Array items with nested paths (items.* means each item in the array)
 * demoMask: ["items.user.email", "items.referrer.email"]
 */
type DemoMaskField = string;

// Operation Object
interface OperationObject {
  tags?: string[];
  summary: string;
  description?: string;
  operationId?: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses?: Record<string, ResponseObject>;
  deprecated?: boolean;
  security?: Array<Record<string, string[]>>;
  requiresAuth?: boolean;
  requiresApi?: boolean;
  permission?: string | string[];
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  responseType?: "json" | "binary"; // For binary file downloads
  middleware?: string[]; // Array of middleware names to apply (e.g., rate limiters)
  logModule?: string; // Module name for logging (e.g., "USER", "KYC", "EMAIL")
  logTitle?: string; // Title/description for logging (e.g., "Delete account", "Upload KYC document")
  /**
   * Array of field paths to mask in demo mode (when NEXT_PUBLIC_DEMO_STATUS=true).
   * Used to hide confidential data like emails, phones, and other PII in responses.
   *
   * Supports dot notation for nested fields:
   * - "email" - masks the email field at root level
   * - "user.email" - masks email within user object
   * - "items.user.email" - masks email within user object for each item in items array
   */
  demoMask?: DemoMaskField[];
}

// Paths Object
interface PathsObject {
  [path: string]: {
    [method in
      | "get"
      | "put"
      | "post"
      | "delete"
      | "options"
      | "head"
      | "patch"
      | "trace"]?: OperationObject;
  };
}

// Components Object
interface ComponentsObject {
  schemas?: Record<string, SchemaObject>;
  responses?: Record<string, ResponseObject>;
  parameters?: Record<string, ParameterObject>;
  requestBodies?: Record<string, RequestBodyObject>;
  securitySchemes?: Record<string, SecuritySchemeObject>;
  // Add other components as needed
}

// Define the SecuritySchemeObject type according to the OpenAPI Specification
interface SecuritySchemeObject {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  description?: string;
  name?: string; // Required only for apiKey
  in?: "query" | "header" | "cookie"; // Required only for apiKey
  scheme?: string; // Required only for http
  bearerFormat?: string; // Optional for http ("bearer")
  flows?: OAuthFlowsObject; // Required only for oauth2
  openIdConnectUrl?: string; // Required only for openIdConnect
}

// Define OAuthFlowsObject if you're using OAuth 2.0 in your API
interface OAuthFlowsObject {
  implicit?: OAuthFlowObject;
  password?: OAuthFlowObject;
  clientCredentials?: OAuthFlowObject;
  authorizationCode?: OAuthFlowObject;
}

interface OAuthFlowObject {
  authorizationUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

// OpenAPI Object
interface OpenAPIObject {
  openapi: string;
  info: InfoObject;
  servers?: Array<{ url: string; description?: string }>;
  paths: PathsObject;
  components?: ComponentsObject;
  security?: Array<Record<string, string[]>>;
  tags?: Array<{ name: string; description?: string }>;
}
