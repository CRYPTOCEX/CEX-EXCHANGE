/**
 * Centralized Error Response Schemas
 *
 * All API error responses should use these reusable schemas for consistency.
 * Import and use these in endpoint metadata.
 */

// Base error response schema
const baseErrorSchema = {
  type: "object",
  properties: {
    message: {
      type: "string",
      description: "Error message describing what went wrong",
    },
  },
  required: ["message"],
};

// Extended error schema with optional fields
const extendedErrorSchema = {
  type: "object",
  properties: {
    message: {
      type: "string",
      description: "Error message describing what went wrong",
    },
    code: {
      type: "string",
      description: "Error code for programmatic handling",
    },
    details: {
      type: "object",
      description: "Additional error details",
      additionalProperties: true,
    },
  },
  required: ["message"],
};

// Validation error schema
const validationErrorSchema = {
  type: "object",
  properties: {
    message: {
      type: "string",
      description: "Validation error message",
    },
    errors: {
      type: "array",
      description: "List of validation errors",
      items: {
        type: "object",
        properties: {
          field: {
            type: "string",
            description: "Field that failed validation",
          },
          message: {
            type: "string",
            description: "Validation error message for this field",
          },
          code: {
            type: "string",
            description: "Validation error code",
          },
        },
        required: ["field", "message"],
      },
    },
  },
  required: ["message"],
};

/**
 * 400 Bad Request - Invalid request parameters or body
 */
export const badRequestResponse = {
  description: "Bad request - Invalid or missing parameters",
  content: {
    "application/json": {
      schema: baseErrorSchema,
    },
  },
};

/**
 * 400 Validation Error - Detailed validation errors
 */
export const validationErrorResponse = {
  description: "Validation error - One or more fields failed validation",
  content: {
    "application/json": {
      schema: validationErrorSchema,
    },
  },
};

/**
 * 401 Unauthorized - Missing or invalid authentication
 */
export const unauthorizedResponse = {
  description: "Unauthorized - Authentication required or invalid credentials",
  content: {
    "application/json": {
      schema: baseErrorSchema,
    },
  },
};

/**
 * 401 Unauthorized - Admin permission required
 */
export const adminUnauthorizedResponse = {
  description: "Unauthorized - Admin permission required",
  content: {
    "application/json": {
      schema: baseErrorSchema,
    },
  },
};

/**
 * 403 Forbidden - Insufficient permissions
 */
export const forbiddenResponse = {
  description: "Forbidden - Insufficient permissions to perform this action",
  content: {
    "application/json": {
      schema: baseErrorSchema,
    },
  },
};

/**
 * 404 Not Found - Resource not found (generic)
 */
export const notFoundResponse = (resource: string = "Resource") => ({
  description: `${resource} not found`,
  content: {
    "application/json": {
      schema: baseErrorSchema,
    },
  },
});

/**
 * 409 Conflict - Resource already exists or conflicting state
 */
export const conflictResponse = (resource: string = "Resource") => ({
  description: `Conflict - ${resource} already exists or is in a conflicting state`,
  content: {
    "application/json": {
      schema: baseErrorSchema,
    },
  },
});

/**
 * 422 Unprocessable Entity - Request understood but cannot be processed
 */
export const unprocessableEntityResponse = {
  description:
    "Unprocessable entity - Request understood but cannot be processed",
  content: {
    "application/json": {
      schema: extendedErrorSchema,
    },
  },
};

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export const rateLimitResponse = {
  description: "Too many requests - Rate limit exceeded",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Rate limit error message",
          },
          retryAfter: {
            type: "integer",
            description: "Seconds until rate limit resets",
          },
        },
        required: ["message"],
      },
    },
  },
};

/**
 * 500 Internal Server Error - Unexpected server error
 */
export const serverErrorResponse = {
  description: "Internal server error - An unexpected error occurred",
  content: {
    "application/json": {
      schema: baseErrorSchema,
    },
  },
};

/**
 * 502 Bad Gateway - Upstream service error
 */
export const badGatewayResponse = {
  description: "Bad gateway - Error communicating with upstream service",
  content: {
    "application/json": {
      schema: baseErrorSchema,
    },
  },
};

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export const serviceUnavailableResponse = {
  description: "Service unavailable - Service is temporarily unavailable",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Service unavailable message",
          },
          retryAfter: {
            type: "integer",
            description: "Estimated seconds until service is available",
          },
        },
        required: ["message"],
      },
    },
  },
};

// ============================================================================
// CRUD Operation Response Helpers
// ============================================================================

/**
 * Standard success message response
 */
export const successMessageResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Success message",
          },
        },
        required: ["message"],
      },
    },
  },
});

/**
 * Standard DELETE operation responses
 */
export const deleteResponses = (resource: string) => ({
  200: successMessageResponse(`${resource} deleted successfully`),
  401: unauthorizedResponse,
  404: notFoundResponse(resource),
  500: serverErrorResponse,
});

/**
 * Standard UPDATE operation responses
 */
export const updateResponses = (resource: string) => ({
  200: successMessageResponse(`${resource} updated successfully`),
  400: badRequestResponse,
  401: unauthorizedResponse,
  404: notFoundResponse(resource),
  500: serverErrorResponse,
});

/**
 * Standard CREATE operation responses
 */
export const createResponses = (resource: string) => ({
  200: successMessageResponse(`${resource} created successfully`),
  400: badRequestResponse,
  401: unauthorizedResponse,
  409: conflictResponse(resource),
  500: serverErrorResponse,
});

/**
 * Standard BULK DELETE operation responses
 */
export const bulkDeleteResponses = (resource: string) => ({
  200: successMessageResponse(`${resource} records deleted successfully`),
  400: badRequestResponse,
  401: unauthorizedResponse,
  404: notFoundResponse(resource),
  500: serverErrorResponse,
});

/**
 * Standard STATUS UPDATE operation responses
 */
export const statusUpdateResponses = (resource: string) => ({
  200: successMessageResponse(`${resource} status updated successfully`),
  400: badRequestResponse,
  401: unauthorizedResponse,
  404: notFoundResponse(resource),
  500: serverErrorResponse,
});

// ============================================================================
// Pagination Schema
// ============================================================================

export const paginationSchema = {
  type: "object",
  properties: {
    totalItems: {
      type: "integer",
      description: "Total number of items across all pages",
    },
    currentPage: {
      type: "integer",
      description: "Current page number (1-indexed)",
    },
    perPage: {
      type: "integer",
      description: "Number of items per page",
    },
    totalPages: {
      type: "integer",
      description: "Total number of pages",
    },
  },
  required: ["totalItems", "currentPage", "perPage", "totalPages"],
};

/**
 * Create a paginated list response schema
 */
export const paginatedResponse = (
  itemSchema: object,
  description: string = "List retrieved successfully"
) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: itemSchema,
          },
          pagination: paginationSchema,
        },
        required: ["data", "pagination"],
      },
    },
  },
});

/**
 * Create a single item response schema
 */
export const singleItemResponse = (
  itemSchema: object,
  description: string = "Item retrieved successfully"
) => ({
  description,
  content: {
    "application/json": {
      schema: itemSchema,
    },
  },
});

// ============================================================================
// Common Field Schemas for Reuse
// ============================================================================

export const commonFields = {
  id: {
    type: "string",
    format: "uuid",
    description: "Unique identifier",
  },
  createdAt: {
    type: "string",
    format: "date-time",
    description: "Timestamp when the record was created",
  },
  updatedAt: {
    type: "string",
    format: "date-time",
    description: "Timestamp when the record was last updated",
  },
  deletedAt: {
    type: "string",
    format: "date-time",
    nullable: true,
    description: "Timestamp when the record was soft deleted",
  },
  status: {
    type: "boolean",
    description: "Whether the record is active",
  },
};

/**
 * Base model schema with common fields
 */
export const baseModelSchema = (additionalProperties: object) => ({
  type: "object",
  properties: {
    ...commonFields,
    ...additionalProperties,
  },
});
