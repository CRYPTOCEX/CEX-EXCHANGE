"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "Lists pool-backing settlements",
    description: "Every settlement the engine planned, dispatched, confirmed, settled, failed or parked for review, plus the movements the operator recorded by hand. Filterable by currency, direction, status and chain; the amounts are numeric.",
    operationId: "listPoolBackingSettlements",
    tags: ["Admin", "Finance", "Pool Backing"],
    parameters: constants_1.crudParameters,
    requiresAuth: true,
    permission: "view.pool.backing",
    responses: {
        200: {
            description: "Settlements with pagination",
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
        model: db_1.models.poolBackingSettlement,
        query,
        sortField: query.sortField || "createdAt",
        paranoid: false,
        numericFields: ["amountRequested", "amountSent", "amountReceived"],
    });
};
