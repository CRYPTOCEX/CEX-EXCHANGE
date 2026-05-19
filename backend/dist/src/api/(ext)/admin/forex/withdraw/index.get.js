"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("@b/api/finance/transaction/utils");
exports.metadata = {
    summary: "Lists all Forex withdrawal transactions",
    description: "Retrieves a paginated list of all Forex withdrawal transactions with filtering and sorting options. Includes associated wallet and user details.",
    operationId: "listForexWithdrawals",
    tags: ["Admin", "Forex", "Withdraw"],
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_FOREX",
    logTitle: "Get Forex Withdrawals",
    responses: {
        200: {
            description: "Paginated list of forex_withdraw transactions retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.baseTransactionSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Transactions"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.forex.withdraw",
    demoMask: ["items.user.email"],
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching forex withdrawal transactions");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.transaction,
        where: {
            type: "FOREX_WITHDRAW",
        },
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.wallet,
                as: "wallet",
                attributes: ["id", "currency", "type"],
            },
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} forex withdrawals`);
    return result;
};
