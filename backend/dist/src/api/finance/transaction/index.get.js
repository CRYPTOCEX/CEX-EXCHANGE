"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("./utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Lists transactions with optional filters",
    operationId: "listTransactions",
    tags: ["Finance", "Transactions"],
    parameters: [
        ...constants_1.crudParameters,
        {
            name: "walletType",
            in: "query",
            description: "Type of the wallet",
            schema: {
                type: "string",
            },
        },
        {
            name: "currency",
            in: "query",
            description: "Currency of the wallet",
            schema: {
                type: "string",
            },
        },
    ],
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
};
exports.default = async (data) => {
    const { user, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { walletType, currency, ...others } = query;
    const walletWhere = { userId: user.id };
    if (walletType)
        walletWhere.type = walletType;
    if (currency)
        walletWhere.currency = currency;
    let wallet = null;
    if (walletType || currency) {
        wallet = await db_1.models.wallet.findOne({ where: walletWhere });
        if (!wallet)
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Wallet not found",
            });
    }
    return (0, query_1.getFiltered)({
        model: db_1.models.transaction,
        query: others,
        where: {
            userId: user.id,
            ...(wallet ? { walletId: wallet.id } : {}),
        },
        sortField: others.sortField || "createdAt",
        numericFields: ["amount", "fee"],
        includeModels: [
            {
                model: db_1.models.wallet,
                as: "wallet",
                attributes: ["currency", "type"],
            },
        ],
    });
};
