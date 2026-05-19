"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all Forex accounts",
    operationId: "listForexAccounts",
    tags: ["Admin", "Forex", "Account"],
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_FOREX",
    logTitle: "Get Forex Accounts",
    responses: {
        200: {
            description: "List of Forex accounts",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.forexAccountSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Accounts"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.forex.account",
    demoMask: ["items.user.email", "items.accountId", "items.password", "items.broker"],
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching forex accounts");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.forexAccount,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
        numericFields: ["balance", "leverage", "mt"],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} forex accounts`);
    return result;
};
