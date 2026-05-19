"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/finance/transaction/utils");
exports.metadata = { summary: "Lists transactions with optional filters",
    operationId: "listForexTransactions",
    tags: ["User", "Forex", "Transactions"],
    parameters: constants_1.crudParameters,
    responses: { 200: { description: "Paginated list of transactions retrieved successfully",
            content: { "application/json": { schema: { type: "object",
                        properties: { data: { type: "array",
                                items: { type: "object",
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
    logModule: "FOREX",
    logTitle: "Get Forex Transactions",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { filter, ...query } = data.query;
    let where = { userId: user.id };
    const typeParsed = filter === null || filter === void 0 ? void 0 : filter.includes("type");
    if (!typeParsed) {
        where = { ...where, type: ["FOREX_DEPOSIT", "FOREX_WITHDRAW"] };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return (0, query_1.getFiltered)({ model: db_1.models.transaction,
        query: data.query,
        where,
        sortField: query.sortField || "createdAt",
        numericFields: ["amount", "fee"],
        includeModels: [
            { model: db_1.models.wallet,
                as: "wallet",
                attributes: ["currency", "type"],
            },
        ],
    });
};
