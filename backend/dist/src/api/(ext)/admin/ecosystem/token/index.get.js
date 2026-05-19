"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all ecosystem tokens",
    description: "Retrieves a paginated list of all ecosystem tokens with optional filtering and sorting. Supports filtering by token properties and searching across multiple fields.",
    operationId: "listEcosystemTokens",
    tags: ["Admin", "Ecosystem", "Token"],
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_ECO",
    logTitle: "List tokens",
    responses: {
        200: {
            description: "Ecosystem tokens retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.ecosystemTokenSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecosystem Token"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.ecosystem.token",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching ecosystem tokens");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.ecosystemToken,
        query,
        sortField: query.sortField || "name",
        numericFields: ["decimals", "precision", "fee"],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Tokens retrieved successfully");
    return result;
};
