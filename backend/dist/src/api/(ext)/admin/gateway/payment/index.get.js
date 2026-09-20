"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "List gateway payments",
    description: "Retrieves a paginated list of all gateway payments with filtering and sorting capabilities. Supports filtering by mode (LIVE/TEST) and includes merchant and customer information for each payment.",
    operationId: "listGatewayPayments",
    tags: ["Admin", "Gateway", "Payment"],
    parameters: [
        ...constants_1.crudParameters,
        {
            name: "mode",
            in: "query",
            description: "Filter by mode (LIVE or TEST)",
            schema: {
                type: "string",
                enum: ["LIVE", "TEST"],
            },
        },
    ],
    responses: {
        200: {
            description: "Paginated list of payments",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    description: "Payment with merchant and customer information",
                                },
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    page: { type: "number" },
                                    perPage: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.gateway.payment",
    demoMask: ["items.customer.email", "items.merchant.email"],
    logModule: "ADMIN_GATEWAY",
    logTitle: "List gateway payments",
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    const mode = query === null || query === void 0 ? void 0 : query.mode;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching payments list${mode ? ` (mode: ${mode})` : ""}`);
    const where = {};
    if (mode) {
        where.testMode = mode === "TEST";
    }
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.gatewayPayment,
        query,
        where,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.gatewayMerchant,
                as: "merchant",
                attributes: ["id", "name", "slug", "email"],
            },
            {
                model: db_1.models.user,
                as: "customer",
                attributes: ["id", "firstName", "lastName", "email"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} payments`);
    return result;
};
