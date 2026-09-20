"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("../../../finance/transaction/utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Lists ICO transactions with optional filters",
    operationId: "listIcoTransactions",
    tags: ["User", "Ico", "Transaction"],
    logModule: "ICO",
    logTitle: "Get ICO Transactions",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Paginated list of ICO transactions retrieved successfully",
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
    const { user, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching get ico transactions");
    if (!user) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.icoTransaction,
        where: { userId: user.id },
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.icoTokenOffering,
                as: "offering",
                attributes: ["id", "name", "symbol", "tokenPrice", "targetAmount"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get ICO Transactions retrieved successfully");
    return result;
};
