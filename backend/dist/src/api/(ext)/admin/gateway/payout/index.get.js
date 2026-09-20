"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "List gateway payouts",
    description: "Retrieves a paginated list of all gateway merchant payouts with filtering and sorting capabilities. Includes merchant information for each payout. Returns both active and deleted records (paranoid: false).",
    operationId: "listGatewayPayouts",
    tags: ["Admin", "Gateway", "Payout"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Paginated list of payouts",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    description: "Payout with merchant information",
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
    permission: "view.gateway.payout",
    demoMask: ["items.merchant.email"],
    logModule: "ADMIN_GATEWAY",
    logTitle: "List gateway payouts",
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching payouts list");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.gatewayPayout,
        query,
        sortField: query.sortField || "createdAt",
        paranoid: false,
        includeModels: [
            {
                model: db_1.models.gatewayMerchant,
                as: "merchant",
                attributes: ["id", "name", "email"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} payouts`);
    return result;
};
