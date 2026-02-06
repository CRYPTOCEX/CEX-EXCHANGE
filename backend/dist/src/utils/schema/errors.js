"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseModelSchema = exports.commonFields = exports.singleItemResponse = exports.paginatedResponse = exports.paginationSchema = exports.statusUpdateResponses = exports.bulkDeleteResponses = exports.createResponses = exports.updateResponses = exports.deleteResponses = exports.successMessageResponse = exports.serviceUnavailableResponse = exports.badGatewayResponse = exports.serverErrorResponse = exports.rateLimitResponse = exports.unprocessableEntityResponse = exports.conflictResponse = exports.notFoundResponse = exports.forbiddenResponse = exports.adminUnauthorizedResponse = exports.unauthorizedResponse = exports.validationErrorResponse = exports.badRequestResponse = void 0;
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
exports.badRequestResponse = {
    description: "Bad request - Invalid or missing parameters",
    content: {
        "application/json": {
            schema: baseErrorSchema,
        },
    },
};
exports.validationErrorResponse = {
    description: "Validation error - One or more fields failed validation",
    content: {
        "application/json": {
            schema: validationErrorSchema,
        },
    },
};
exports.unauthorizedResponse = {
    description: "Unauthorized - Authentication required or invalid credentials",
    content: {
        "application/json": {
            schema: baseErrorSchema,
        },
    },
};
exports.adminUnauthorizedResponse = {
    description: "Unauthorized - Admin permission required",
    content: {
        "application/json": {
            schema: baseErrorSchema,
        },
    },
};
exports.forbiddenResponse = {
    description: "Forbidden - Insufficient permissions to perform this action",
    content: {
        "application/json": {
            schema: baseErrorSchema,
        },
    },
};
const notFoundResponse = (resource = "Resource") => ({
    description: `${resource} not found`,
    content: {
        "application/json": {
            schema: baseErrorSchema,
        },
    },
});
exports.notFoundResponse = notFoundResponse;
const conflictResponse = (resource = "Resource") => ({
    description: `Conflict - ${resource} already exists or is in a conflicting state`,
    content: {
        "application/json": {
            schema: baseErrorSchema,
        },
    },
});
exports.conflictResponse = conflictResponse;
exports.unprocessableEntityResponse = {
    description: "Unprocessable entity - Request understood but cannot be processed",
    content: {
        "application/json": {
            schema: extendedErrorSchema,
        },
    },
};
exports.rateLimitResponse = {
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
exports.serverErrorResponse = {
    description: "Internal server error - An unexpected error occurred",
    content: {
        "application/json": {
            schema: baseErrorSchema,
        },
    },
};
exports.badGatewayResponse = {
    description: "Bad gateway - Error communicating with upstream service",
    content: {
        "application/json": {
            schema: baseErrorSchema,
        },
    },
};
exports.serviceUnavailableResponse = {
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
const successMessageResponse = (description) => ({
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
exports.successMessageResponse = successMessageResponse;
const deleteResponses = (resource) => ({
    200: (0, exports.successMessageResponse)(`${resource} deleted successfully`),
    401: exports.unauthorizedResponse,
    404: (0, exports.notFoundResponse)(resource),
    500: exports.serverErrorResponse,
});
exports.deleteResponses = deleteResponses;
const updateResponses = (resource) => ({
    200: (0, exports.successMessageResponse)(`${resource} updated successfully`),
    400: exports.badRequestResponse,
    401: exports.unauthorizedResponse,
    404: (0, exports.notFoundResponse)(resource),
    500: exports.serverErrorResponse,
});
exports.updateResponses = updateResponses;
const createResponses = (resource) => ({
    200: (0, exports.successMessageResponse)(`${resource} created successfully`),
    400: exports.badRequestResponse,
    401: exports.unauthorizedResponse,
    409: (0, exports.conflictResponse)(resource),
    500: exports.serverErrorResponse,
});
exports.createResponses = createResponses;
const bulkDeleteResponses = (resource) => ({
    200: (0, exports.successMessageResponse)(`${resource} records deleted successfully`),
    400: exports.badRequestResponse,
    401: exports.unauthorizedResponse,
    404: (0, exports.notFoundResponse)(resource),
    500: exports.serverErrorResponse,
});
exports.bulkDeleteResponses = bulkDeleteResponses;
const statusUpdateResponses = (resource) => ({
    200: (0, exports.successMessageResponse)(`${resource} status updated successfully`),
    400: exports.badRequestResponse,
    401: exports.unauthorizedResponse,
    404: (0, exports.notFoundResponse)(resource),
    500: exports.serverErrorResponse,
});
exports.statusUpdateResponses = statusUpdateResponses;
exports.paginationSchema = {
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
const paginatedResponse = (itemSchema, description = "List retrieved successfully") => ({
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
                    pagination: exports.paginationSchema,
                },
                required: ["data", "pagination"],
            },
        },
    },
});
exports.paginatedResponse = paginatedResponse;
const singleItemResponse = (itemSchema, description = "Item retrieved successfully") => ({
    description,
    content: {
        "application/json": {
            schema: itemSchema,
        },
    },
});
exports.singleItemResponse = singleItemResponse;
exports.commonFields = {
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
const baseModelSchema = (additionalProperties) => ({
    type: "object",
    properties: {
        ...exports.commonFields,
        ...additionalProperties,
    },
});
exports.baseModelSchema = baseModelSchema;
