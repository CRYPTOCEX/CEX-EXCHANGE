"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List ICO Blockchain Configurations",
    description: "Retrieves all blockchain configurations available for ICO token offerings. Supports optional filtering by status to retrieve only active blockchains.",
    operationId: "getIcoBlockchains",
    tags: ["Admin", "ICO", "Settings"],
    requiresAuth: true,
    parameters: [
        {
            name: "status",
            in: "query",
            description: "Filter by status - set to 'true' to retrieve only active blockchains",
            required: false,
            schema: { type: "string", enum: ["true", "false"] },
        },
    ],
    responses: {
        200: {
            description: "Blockchain configurations retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string", format: "uuid" },
                                name: { type: "string", description: "Display name of the blockchain" },
                                value: { type: "string", description: "Unique identifier value for the blockchain" },
                                status: { type: "boolean", description: "Whether the blockchain is active" },
                                createdAt: { type: "string", format: "date-time" },
                                updatedAt: { type: "string", format: "date-time" },
                                deletedAt: { type: "string", format: "date-time", nullable: true },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "view.ico.settings",
    logModule: "ADMIN_ICO",
    logTitle: "Get blockchain configurations",
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user permissions");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized access");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: Admin privileges required.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Building query filters");
    const statusOnly = (query === null || query === void 0 ? void 0 : query.status) === "true";
    const whereClause = statusOnly ? { status: true } : {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching blockchain configurations");
    const blockchains = await db_1.models.icoBlockchain.findAll({
        where: whereClause,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${blockchains.length} blockchain configurations`);
    return blockchains;
};
