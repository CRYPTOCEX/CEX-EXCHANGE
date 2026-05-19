"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("../../../finance/transaction/utils");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Lists transactions with optional filters",
    operationId: "listWalletTransactions",
    tags: ["Admin", "Wallets"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Paginated list of transactions retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
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
    permission: "view.transaction",
    demoMask: ["data.user.email"],
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.transaction,
        where: {
            type: {
                [sequelize_1.Op.notIn]: [
                    "DEPOSIT",
                    "WITHDRAW",
                    "INCOMING_TRANSFER",
                    "BINARY_ORDER",
                    "EXCHANGE_ORDER",
                    "FOREX_DEPOSIT",
                    "FOREX_WITHDRAW",
                    "ICO_CONTRIBUTION",
                ],
            },
        },
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.wallet,
                as: "wallet",
                attributes: ["currency", "type"],
            },
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
    });
};
