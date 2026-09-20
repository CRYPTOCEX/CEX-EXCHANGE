"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Lists ICO transactions with optional filters",
    operationId: "listIcoTransactions",
    tags: ["Admin", "Ico", "Transaction"],
    parameters: constants_1.crudParameters,
    responses: {
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Transactions"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_ICO",
    logTitle: "Get ICO Transactions",
    permission: "view.ico.transaction",
    demoMask: ["items.user.email"],
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!user) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get ICO Transactions retrieved successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.icoTransaction,
        query: query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.icoTokenOffering,
                as: "offering",
                attributes: ["id", "name", "symbol", "tokenPrice", "targetAmount"],
            },
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "email", "firstName", "lastName", "avatar"],
            },
        ],
    });
};
