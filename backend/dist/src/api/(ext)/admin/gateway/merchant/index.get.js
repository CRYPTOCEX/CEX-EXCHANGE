"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "List gateway merchants",
    description: "Retrieves a paginated list of all gateway merchant accounts with filtering and sorting capabilities. Includes user information for each merchant.",
    operationId: "listGatewayMerchants",
    tags: ["Admin", "Gateway", "Merchant"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Paginated list of merchants",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    description: "Gateway merchant with associated user information",
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
    permission: "view.gateway.merchant",
    demoMask: ["items.user.email", "items.email", "items.phone"],
    logModule: "ADMIN_GATEWAY",
    logTitle: "List gateway merchants",
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching merchants list");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.gatewayMerchant,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} merchants`);
    return result;
};
