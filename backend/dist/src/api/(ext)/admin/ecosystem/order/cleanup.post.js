"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const cleanup_1 = require("@b/api/(ext)/ecosystem/utils/scylla/cleanup");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Cleanup corrupted ecosystem orders",
    description: "Removes corrupted ecosystem orders with null essential fields. These are ghost records created by ScyllaDB's upsert behavior. Supports dry-run mode to preview what would be deleted.",
    operationId: "cleanupCorruptedEcosystemOrders",
    tags: ["Admin", "Ecosystem", "Order", "Maintenance"],
    logModule: "ADMIN_ECO",
    logTitle: "Cleanup corrupted orders",
    requestBody: {
        description: "Cleanup options",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        dryRun: {
                            type: "boolean",
                            description: "If true, only count corrupted orders without deleting them",
                            default: false,
                        },
                        limit: {
                            type: "number",
                            description: "Maximum number of orders to scan",
                            default: 10000,
                            minimum: 1,
                            maximum: 100000,
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Cleanup operation completed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            totalScanned: {
                                type: "number",
                                description: "Total number of orders scanned",
                            },
                            corruptedFound: {
                                type: "number",
                                description: "Number of corrupted orders found",
                            },
                            deleted: {
                                type: "number",
                                description: "Number of orders deleted (0 in dry-run mode)",
                            },
                            errors: {
                                type: "number",
                                description: "Number of errors encountered during deletion",
                            },
                            dryRun: {
                                type: "boolean",
                                description: "Whether this was a dry-run operation",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    permission: "manage.ecosystem.order",
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b;
    const { body, ctx } = data;
    const dryRun = (_a = body === null || body === void 0 ? void 0 : body.dryRun) !== null && _a !== void 0 ? _a : false;
    const limit = (_b = body === null || body === void 0 ? void 0 : body.limit) !== null && _b !== void 0 ? _b : 10000;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating cleanup parameters");
    if (limit < 1 || limit > 100000) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Limit must be between 1 and 100,000" });
    }
    if (dryRun) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Performing dry-run cleanup scan (limit: ${limit})`);
    }
    else {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Performing cleanup operation (limit: ${limit})`);
    }
    const stats = await (0, cleanup_1.cleanupCorruptedOrders)(dryRun, limit);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(dryRun
        ? `Dry-run complete: found ${stats.corruptedFound} corrupted orders out of ${stats.totalScanned} scanned`
        : `Cleanup complete: deleted ${stats.deleted} corrupted orders out of ${stats.corruptedFound} found`);
    return {
        ...stats,
        dryRun,
    };
};
