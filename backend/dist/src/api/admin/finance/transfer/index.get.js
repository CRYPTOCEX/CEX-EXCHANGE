"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("@b/api/finance/transaction/utils");
exports.metadata = {
    summary: "Lists incoming_transfer transactions only",
    operationId: "listINCOMING_TRANSFERTransactions",
    tags: ["Admin", "Wallets"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Paginated list of incoming_transfer transactions retrieved successfully",
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
    permission: "view.transfer",
    demoMask: ["data.user.email"],
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.transaction,
        where: {
            type: "INCOMING_TRANSFER",
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
};
