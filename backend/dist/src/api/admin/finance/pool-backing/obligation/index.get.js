"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "Lists pool-backing obligations",
    description: "Every database balance change that had no physical counterpart, one row each, filterable by currency, source, status and side. Amount is signed: positive means the exchange pool is short by it.",
    operationId: "listPoolBackingObligations",
    tags: ["Admin", "Finance", "Pool Backing"],
    parameters: constants_1.crudParameters,
    requiresAuth: true,
    permission: "view.pool.backing",
    responses: {
        200: {
            description: "Obligations with pagination",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: { type: "array", items: { type: "object" } },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    return (0, query_1.getFiltered)({
        model: db_1.models.poolBackingObligation,
        query,
        sortField: query.sortField || "createdAt",
        paranoid: false,
        numericFields: ["amount"],
    });
};
