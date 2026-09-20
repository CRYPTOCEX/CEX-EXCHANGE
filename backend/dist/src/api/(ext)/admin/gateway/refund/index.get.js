"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "List gateway refunds",
    description: "Retrieves a paginated list of all gateway refunds with filtering and sorting capabilities. Includes merchant and payment information for each refund.",
    operationId: "listGatewayRefunds",
    tags: ["Admin", "Gateway", "Refund"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Paginated list of refunds",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    description: "Refund with merchant and payment information",
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
    permission: "view.gateway.refund",
    demoMask: ["items.merchant.email"],
    logModule: "ADMIN_GATEWAY",
    logTitle: "List gateway refunds",
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching refunds list");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.gatewayRefund,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.gatewayMerchant,
                as: "merchant",
                attributes: ["id", "name", "email"],
            },
            {
                model: db_1.models.gatewayPayment,
                as: "payment",
                attributes: ["paymentIntentId", "merchantOrderId", "amount", "currency"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} refunds`);
    return result;
};
