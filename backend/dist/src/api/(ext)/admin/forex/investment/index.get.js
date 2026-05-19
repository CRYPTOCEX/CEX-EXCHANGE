"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all Forex investments",
    description: "Retrieves a paginated list of all Forex investments with filtering and sorting options. Includes user, plan, and duration details for each investment.",
    operationId: "listForexInvestments",
    tags: ["Admin", "Forex", "Investment"],
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_FOREX",
    logTitle: "Get Forex Investments",
    responses: {
        200: {
            description: "List of Forex Investments with pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.forexInvestmentSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Investments"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.forex.investment",
    demoMask: ["items.user.email"],
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching forex investments");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.forexInvestment,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.forexPlan,
                as: "plan",
                attributes: ["id", "title"],
            },
            {
                model: db_1.models.forexDuration,
                as: "duration",
                attributes: ["id", "duration", "timeframe"],
            },
        ],
        numericFields: ["amount", "profit"],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} forex investments`);
    return result;
};
