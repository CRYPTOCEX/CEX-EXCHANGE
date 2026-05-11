"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves a specific Forex account by ID",
    description: "Fetches a specific Forex account by its ID for the currently authenticated user.",
    operationId: "getForexAccountById",
    tags: ["Forex", "Accounts"],
    logModule: "FOREX",
    logTitle: "Get Forex Account",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", description: "Account ID" },
        },
    ],
    responses: {
        200: {
            description: "Forex account retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseForexAccountSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Account"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Forex Account");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const account = await db_1.models.forexAccount.findOne({
        where: { id: params.id, userId: user.id },
    });
    if (!account) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Forex account not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Forex Account fetched successfully");
    return account;
};
